import '../../../core/api/api_client.dart';
import '../../../core/db/local_db.dart';
import '../../catalog/data/catalog.dart';
import '../../sale/domain/local_order.dart';
import '../../shift/data/local_shift.dart';

const shiftKey = 'shift';
const catalogKey = 'catalog';

class SyncReport {
  const SyncReport({this.online = true, this.sessionExpired = false, this.shiftError});

  final bool online;
  final bool sessionExpired;
  final String? shiftError;
}

class InboxPage {
  const InboxPage(this.orders, this.nextSince);

  final List<Map<String, dynamic>> orders;
  final String nextSince;
}

final _currentStatus = RegExp(r'berstatus (\w+)');

/// Pushes local work to the server. Every request here is safe to repeat, so a
/// reply lost to a bad connection only costs a retry.
class SyncEngine {
  SyncEngine(this._db, this._api);

  final LocalDb _db;
  final ApiClient _api;
  bool _running = false;

  /// Returns null when another run is already in progress.
  Future<SyncReport?> run() async {
    if (_running) return null;
    _running = true;

    try {
      final shiftError = await _pushShift();
      if (shiftError != null) return SyncReport(shiftError: shiftError);

      await _pushOrders();
      await _pushStatuses();
      return const SyncReport();
    } on OfflineException {
      return const SyncReport(online: false);
    } on ApiException catch (error) {
      if (error.isUnauthorized) return const SyncReport(sessionExpired: true);
      rethrow;
    } finally {
      _running = false;
    }
  }

  Future<String?> _pushShift() async {
    final saved = await _db.readJson(shiftKey);
    if (saved == null) return null;

    final shift = LocalShift.fromJson(saved);
    if (shift.isSynced) return null;

    try {
      final data = await _api.post('/api/pos/shifts', {
        'outletId': shift.outletId,
        'clientShiftId': shift.clientShiftId,
        'openingCash': shift.openingCash,
        'openedAt': shift.openedAt.toUtc().toIso8601String(),
      }) as Map<String, dynamic>;

      // Reread so a queue number taken during the request is not lost.
      final latest = LocalShift.fromJson((await _db.readJson(shiftKey))!);
      latest
        ..serverId = data['id'] as String
        ..lastError = null;
      await _db.writeJson(shiftKey, latest.toJson());
      return null;
    } on ApiException catch (error) {
      if (error.isUnauthorized) rethrow;
      shift.lastError = error.message;
      await _db.writeJson(shiftKey, shift.toJson());
      return error.message;
    }
  }

  Future<void> _pushOrders() async {
    for (final order in await _db.unsyncedOrders()) {
      final sentVersion = order.version;
      final outletId = LocalShift.fromJson((await _db.readJson(shiftKey))!).outletId;

      Map<String, dynamic> result;
      try {
        final data = await _api.post('/api/pos/orders/sync', {
          'outletId': outletId,
          'orders': [order.toSyncJson()],
        }) as Map<String, dynamic>;
        result = (data['results'] as List).first as Map<String, dynamic>;
      } on ApiException catch (error) {
        if (error.isUnauthorized) rethrow;
        result = {'status': 'rejected', 'error': error.message};
      }

      if (result['status'] == 'rejected') {
        order
          ..syncState = SyncState.rejected
          ..lastError = result['error'] as String?;
      } else {
        order
          ..syncState = SyncState.synced
          ..serverId = result['orderId'] as String?
          ..orderNumber = result['orderNumber'] as String?
          ..lastError = null;
      }
      await _db.saveIfUnchanged(order, sentVersion);
    }
  }

  Future<void> _pushStatuses() async {
    for (final order in await _db.ordersWithPendingStatus()) {
      final sentVersion = order.version;
      try {
        await _api.patch('/api/pos/orders/${order.clientOrderId}/status', {
          'status': order.orderStatus,
          'expectedStatus': order.serverStatus,
        });
        order
          ..serverStatus = order.orderStatus
          ..lastError = null;
      } on ApiException catch (error) {
        if (error.isUnauthorized) rethrow;

        // A repeat after a lost reply, or a change from the web board, shows
        // up as a conflict that names the status the server holds.
        final current = _currentStatus.firstMatch(error.message)?.group(1);
        if (current != null) {
          order
            ..orderStatus = current
            ..serverStatus = current
            ..lastError = null;
        } else {
          order
            ..orderStatus = order.serverStatus
            ..lastError = error.message;
        }
      }
      await _db.saveIfUnchanged(order, sentVersion);
    }
  }

  /// Sends a rejected order again after the cause has been fixed.
  Future<void> retry(LocalOrder order) async {
    order
      ..syncState = SyncState.pending
      ..lastError = null
      ..version += 1;
    await _db.saveOrder(order);
  }

  Future<Catalog> refreshCatalog(String outletId) async {
    final data = await _api.get('/api/pos/catalog?outletId=$outletId') as Map<String, dynamic>;
    await _db.writeJson(catalogKey, data);
    return Catalog.fromJson(data);
  }

  Future<InboxPage> pollInbox(String outletId, String? since) async {
    final query = since == null ? '' : '&since=${Uri.encodeQueryComponent(since)}';
    final data = await _api.get('/api/pos/inbox?outletId=$outletId$query') as Map<String, dynamic>;
    return InboxPage(
      (data['orders'] as List).cast<Map<String, dynamic>>(),
      data['nextSince'] as String,
    );
  }
}
