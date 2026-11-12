// Runs against a local dev server, only when POS_E2E_URL is set. It leaves test
// rows behind and prints their shift id, so never point it at production.
import 'dart:io';

import 'package:ataskopi_pos/core/api/api_client.dart';
import 'package:ataskopi_pos/core/db/local_db.dart';
import 'package:ataskopi_pos/features/catalog/data/catalog.dart';
import 'package:ataskopi_pos/features/sale/data/sale_service.dart';
import 'package:ataskopi_pos/features/sale/domain/cart.dart';
import 'package:ataskopi_pos/features/sale/domain/local_order.dart';
import 'package:ataskopi_pos/features/shift/data/local_shift.dart';
import 'package:ataskopi_pos/features/sync/data/sync_engine.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:uuid/uuid.dart';

void main() {
  final url = Platform.environment['POS_E2E_URL'];
  final isLocal = url != null && RegExp(r'^http://(localhost|127\.0\.0\.1)[:/]').hasMatch(url);

  group('selling offline, then syncing', () {
    late LocalDb db;
    late ApiClient api;
    late ApiClient deadApi;
    late SyncEngine engine;
    late SaleService sales;
    late Catalog catalog;
    late String outletId;

    Cart cartOf(int quantity) {
      final product = catalog.products.firstWhere((p) => p.isAvailable);
      return const Cart().add(buildLine(
        product,
        channel: 'walk_in',
        options: defaultOptions(product),
        quantity: quantity,
      ));
    }

    setUpAll(() async {
      sqfliteFfiInit();
      db = await LocalDb.open(inMemoryDatabasePath, factory: databaseFactoryFfi);
      api = ApiClient(baseUrl: url!);
      deadApi = ApiClient(baseUrl: 'http://127.0.0.1:9');

      final login = await api.post('/api/auth/login', {
        'phone': Platform.environment['POS_E2E_PHONE'],
        'pin': Platform.environment['POS_E2E_PIN'],
      }) as Map<String, dynamic>;
      api.token = login['token'] as String;
      deadApi.token = api.token;
      outletId = login['user']['outletId'] as String;

      engine = SyncEngine(db, api);
      sales = SaleService(db);
      catalog = await engine.refreshCatalog(outletId);
    });

    test('an offline sale stays on the phone until the server is back', () async {
      final shift = LocalShift(
        clientShiftId: const Uuid().v4(),
        outletId: outletId,
        openingCash: 100000,
        openedAt: DateTime.now(),
        menuOrder: catalog.bestSellerOrder(),
      );
      await db.writeJson(shiftKey, shift.toJson());

      final cart = cartOf(2);
      final order = await sales.checkout(
        cart,
        [newPayment('cash', cart.total(catalog.taxEnabled))],
        taxEnabled: catalog.taxEnabled,
      );
      expect(order.queueNumber, 'A-001');

      final report = await SyncEngine(db, deadApi).run();
      expect(report!.online, isFalse);
      expect(await db.countUnsettled(), 1);

      expect((await engine.run())!.online, isTrue);
      expect(await db.countUnsettled(), 0);

      final synced = (await db.findOrder(order.clientOrderId))!;
      expect(synced.syncState, SyncState.synced);
      expect(synced.orderNumber, isNotNull);

      final savedShift = LocalShift.fromJson((await db.readJson(shiftKey))!);
      expect(savedShift.isSynced, isTrue);
      // ignore: avoid_print
      print('E2E_SHIFT_ID=${savedShift.serverId}');
    });

    test('resending the same order does not create a second one', () async {
      final order = (await db.ordersForShift(
        LocalShift.fromJson((await db.readJson(shiftKey))!).clientShiftId,
      ))
          .first;
      await engine.retry(order);
      await engine.run();

      final again = (await db.findOrder(order.clientOrderId))!;
      expect(again.syncState, SyncState.synced);
      expect(again.serverId, order.serverId);
    });

    test('an open bill can be paid and finished later', () async {
      final cart = cartOf(1);
      final order = await sales.checkout(cart, const [], taxEnabled: catalog.taxEnabled);
      expect(order.queueNumber, 'A-002');
      await engine.run();

      await sales.setStatus(order, 'completed');
      await engine.run();
      final refused = (await db.findOrder(order.clientOrderId))!;
      expect(refused.orderStatus, 'preparing', reason: 'server refuses finishing an unpaid order');
      expect(refused.lastError, contains('PAID'));

      await sales.addPayments(refused, [newPayment('qris', refused.total)]);
      await sales.setStatus(refused, 'completed');
      await engine.run();

      final done = (await db.findOrder(order.clientOrderId))!;
      expect(done.serverStatus, 'completed');
      expect(done.syncState, SyncState.synced);
    });

    test('a status repeated after a lost reply settles instead of failing', () async {
      final cart = cartOf(1);
      final order = await sales.checkout(
        cart,
        [newPayment('cash', cart.total(catalog.taxEnabled))],
        taxEnabled: catalog.taxEnabled,
      );
      await engine.run();
      await api.patch('/api/pos/orders/${order.clientOrderId}/status', {
        'status': 'ready',
        'expectedStatus': 'preparing',
      });

      final local = (await db.findOrder(order.clientOrderId))!;
      await sales.setStatus(local, 'ready');
      await engine.run();

      final settled = (await db.findOrder(order.clientOrderId))!;
      expect(settled.serverStatus, 'ready');
      expect(settled.lastError, isNull);
    });

    test('a shift closes with the cash the server expects', () async {
      final shift = LocalShift.fromJson((await db.readJson(shiftKey))!);
      final orders = await db.ordersForShift(shift.clientShiftId);
      final cash = orders
          .expand((order) => order.payments)
          .where((payment) => payment.method == 'cash')
          .fold(0, (sum, payment) => sum + payment.amount);

      final closed = await api.patch('/api/pos/shifts/${shift.serverId}', {
        'actualCash': shift.openingCash + cash,
      }) as Map<String, dynamic>;
      expect(closed['status'], 'closed');
      expect((closed['expectedCash'] as num).round(), shift.openingCash + cash);
    });
  }, skip: isLocal ? false : 'POS_E2E_URL must point at a local server');
}
