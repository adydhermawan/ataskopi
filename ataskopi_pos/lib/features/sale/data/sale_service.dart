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

  Future<void> addPayments(LocalOrder order, List<LocalPayment> payments) async {
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
