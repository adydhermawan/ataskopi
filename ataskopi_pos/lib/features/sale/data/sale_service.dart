import 'dart:math' as math;

import 'package:uuid/uuid.dart';

import '../../../core/db/local_db.dart';
import '../../shift/data/local_shift.dart';
import '../../sync/data/sync_engine.dart';
import '../domain/cart.dart';
import '../domain/local_order.dart';

const _uuid = Uuid();

String formatQueueNumber(int number) => 'A-${number.toString().padLeft(3, '0')}';

LocalPayment newPayment(String method, int amount, {int? tendered}) => LocalPayment(
      clientPaymentId: _uuid.v4(),
      method: method,
      amount: amount,
      tenderedAmount: tendered,
      paidAt: DateTime.now(),
    );

/// Sells without the network: an order is final once it is on the phone.
class SaleService {
  SaleService(this._db);

  final LocalDb _db;

  Future<LocalOrder> checkout(Cart cart, List<LocalPayment> payments, {required bool taxEnabled}) async {
    final shift = LocalShift.fromJson((await _db.readJson(shiftKey))!);
    final number = shift.nextQueue;
    shift.nextQueue = number + 1;
    await _db.writeJson(shiftKey, shift.toJson());

    final order = LocalOrder(
      clientOrderId: _uuid.v4(),
      shiftRef: shift.clientShiftId,
      queueNumber: formatQueueNumber(number),
      orderType: cart.orderType,
      channel: cart.channel,
      lines: cart.lines,
      subtotal: cart.subtotal,
      discount: cart.discount,
      tax: cart.tax(taxEnabled),
      total: cart.total(taxEnabled),
      createdAt: DateTime.now(),
      guestName: (cart.guestName?.trim().isEmpty ?? true) ? null : cart.guestName!.trim(),
      payments: payments,
    );
    await _db.saveOrder(order);
    return order;
  }

  /// Adds what the customer ordered on top of an unpaid order, stacking a
  /// drink that is already on it. A [guestName] given replaces the old one.
  Future<void> appendItems(
    LocalOrder order,
    Cart extra, {
    required bool taxEnabled,
    String? guestName,
  }) async {
    var merged = Cart(lines: order.lines);
    for (final line in extra.lines) {
      merged = merged.add(line);
    }
    final subtotal = merged.subtotal;
    final discount = math.min(order.discount + extra.discount, subtotal);
    final tax = merged.tax(taxEnabled);
    final name = guestName?.trim();

    order
      ..lines = merged.lines
      ..subtotal = subtotal
      ..discount = discount
      ..tax = tax
      ..total = subtotal - discount + tax
      ..guestName = (name == null || name.isEmpty) ? order.guestName : name
      ..revision += 1
      ..syncState = SyncState.pending
      ..version += 1;
    await _db.saveOrder(order);
  }

  /// Payments for an existing order. A name typed while paying goes on the
  /// order too.
  Future<void> addPayments(LocalOrder order, List<LocalPayment> payments, {String? guestName}) async {
    final name = guestName?.trim();
    if (name != null && name.isNotEmpty && name != order.guestName) {
      order
        ..guestName = name
        ..revision += 1;
    }
    order
      ..payments = [...order.payments, ...payments]
      ..syncState = SyncState.pending
      ..version += 1;
    await _db.saveOrder(order);
  }

  Future<void> setStatus(LocalOrder order, String status) async {
    order
      ..orderStatus = status
      ..version += 1;
    await _db.saveOrder(order);
  }
}
