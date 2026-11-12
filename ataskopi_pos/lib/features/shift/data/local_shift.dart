class LocalShift {
  LocalShift({
    required this.clientShiftId,
    required this.outletId,
    required this.openingCash,
    required this.openedAt,
    required this.menuOrder,
    this.serverId,
    this.nextQueue = 1,
    this.lastError,
  });

  LocalShift.fromJson(Map<String, dynamic> json)
      : clientShiftId = json['clientShiftId'] as String,
        outletId = json['outletId'] as String,
        openingCash = json['openingCash'] as int,
        openedAt = DateTime.parse(json['openedAt'] as String),
        menuOrder = (json['menuOrder'] as List).cast<String>(),
        serverId = json['serverId'] as String?,
        nextQueue = json['nextQueue'] as int,
        lastError = json['lastError'] as String?;

  final String clientShiftId;
  final String outletId;
  final int openingCash;
  final DateTime openedAt;

  /// Frozen at opening, so tiles do not move under the cashier during a shift.
  final List<String> menuOrder;
  String? serverId;
  int nextQueue;
  String? lastError;

  bool get isSynced => serverId != null;

  Map<String, dynamic> toJson() => {
        'clientShiftId': clientShiftId,
        'outletId': outletId,
        'openingCash': openingCash,
        'openedAt': openedAt.toUtc().toIso8601String(),
        'menuOrder': menuOrder,
        'serverId': serverId,
        'nextQueue': nextQueue,
        'lastError': lastError,
      };
}
