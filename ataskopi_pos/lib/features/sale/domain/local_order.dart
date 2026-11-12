import 'cart.dart';

enum SyncState { pending, synced, rejected }

class LocalPayment {
  const LocalPayment({
    required this.clientPaymentId,
    required this.method,
    required this.amount,
    this.tenderedAmount,
    required this.paidAt,
  });

  LocalPayment.fromJson(Map<String, dynamic> json)
      : clientPaymentId = json['clientPaymentId'] as String,
        method = json['method'] as String,
        amount = json['amount'] as int,
        tenderedAmount = json['tenderedAmount'] as int?,
        paidAt = DateTime.parse(json['paidAt'] as String);

  final String clientPaymentId;
  final String method;
  final int amount;
  final int? tenderedAmount;
  final DateTime paidAt;

  Map<String, dynamic> toJson() => {
        'clientPaymentId': clientPaymentId,
        'method': method,
        'amount': amount,
        if (tenderedAmount != null) 'tenderedAmount': tenderedAmount,
        'paidAt': paidAt.toUtc().toIso8601String(),
      };
}

/// An order as the phone knows it. It is complete on its own, so selling never
/// waits for the server.
class LocalOrder {
  LocalOrder({
    required this.clientOrderId,
    required this.shiftRef,
    required this.queueNumber,
    required this.orderType,
    required this.channel,
    required this.lines,
    required this.subtotal,
    required this.discount,
    required this.tax,
    required this.total,
    required this.createdAt,
    this.guestName,
    this.payments = const [],
    this.orderStatus = 'preparing',
    this.serverStatus = 'preparing',
    this.syncState = SyncState.pending,
    this.version = 1,
    this.serverId,
    this.orderNumber,
    this.lastError,
    this.revision = 0,
  });

  LocalOrder.fromJson(Map<String, dynamic> json)
      : clientOrderId = json['clientOrderId'] as String,
        shiftRef = json['shiftRef'] as String,
        queueNumber = json['queueNumber'] as String,
        orderType = json['orderType'] as String,
        channel = json['channel'] as String,
        lines = (json['lines'] as List)
            .map((line) => CartLine.fromJson(line as Map<String, dynamic>))
            .toList(),
        subtotal = json['subtotal'] as int,
        discount = json['discount'] as int,
        tax = json['tax'] as int,
        total = json['total'] as int,
        createdAt = DateTime.parse(json['createdAt'] as String),
        guestName = json['guestName'] as String?,
        payments = (json['payments'] as List)
            .map((payment) => LocalPayment.fromJson(payment as Map<String, dynamic>))
            .toList(),
        orderStatus = json['orderStatus'] as String,
        serverStatus = json['serverStatus'] as String,
        syncState = SyncState.values.byName(json['syncState'] as String),
        version = json['version'] as int,
        serverId = json['serverId'] as String?,
        orderNumber = json['orderNumber'] as String?,
        lastError = json['lastError'] as String?,
        revision = json['revision'] as int? ?? 0;

  final String clientOrderId;
  final String shiftRef;
  final String queueNumber;
  final String orderType;
  final String channel;

  /// Items can still grow while the order is unpaid; each change raises
  /// [revision] so the server replaces its items.
  List<CartLine> lines;
  int subtotal;
  int discount;
  int tax;
  int total;
  final DateTime createdAt;
  String? guestName;
  List<LocalPayment> payments;
  int revision;

  /// What the cashier wants, and what the server last confirmed.
  String orderStatus;
  String serverStatus;

  SyncState syncState;

  /// Raised on every local change, so a sync reply never overwrites newer work.
  int version;
  String? serverId;
  String? orderNumber;
  String? lastError;

  int get paid => payments.fold(0, (sum, payment) => sum + payment.amount);

  int get remaining => total - paid > 0 ? total - paid : 0;

  bool get isPaid => remaining == 0;

  bool get isActive => orderStatus != 'completed' && orderStatus != 'cancelled';

  bool get hasPendingStatus => orderStatus != serverStatus;

  Map<String, dynamic> toJson() => {
        'clientOrderId': clientOrderId,
        'shiftRef': shiftRef,
        'queueNumber': queueNumber,
        'orderType': orderType,
        'channel': channel,
        'lines': lines.map((line) => line.toJson()).toList(),
        'subtotal': subtotal,
        'discount': discount,
        'tax': tax,
        'total': total,
        'createdAt': createdAt.toUtc().toIso8601String(),
        'guestName': guestName,
        'payments': payments.map((payment) => payment.toJson()).toList(),
        'orderStatus': orderStatus,
        'serverStatus': serverStatus,
        'syncState': syncState.name,
        'version': version,
        'serverId': serverId,
        'orderNumber': orderNumber,
        'lastError': lastError,
        'revision': revision,
      };

  /// Payments are added on every sync; the items are replaced only when
  /// [revision] is newer than the one the server holds.
  Map<String, dynamic> toSyncJson() => {
        'clientOrderId': clientOrderId,
        'revision': revision,
        'orderType': orderType,
        'channel': channel,
        'queueNumber': queueNumber,
        'guestName': guestName,
        'shiftId': shiftRef,
        'createdAt': createdAt.toUtc().toIso8601String(),
        'items': lines.map((line) => line.toSyncJson()).toList(),
        'subtotal': subtotal,
        'discount': discount,
        'tax': tax,
        'total': total,
        'payments': payments.map((payment) => payment.toJson()).toList(),
      };
}
