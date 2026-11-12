import 'dart:convert';

import 'package:sqflite/sqflite.dart';

import '../../features/sale/domain/local_order.dart';

/// Everything the app must keep through a crash or a dead battery.
class LocalDb {
  LocalDb(this._db);

  final Database _db;

  static Future<LocalDb> open(String path, {DatabaseFactory? factory}) async {
    final db = await (factory ?? databaseFactory).openDatabase(
      path,
      options: OpenDatabaseOptions(
        version: 1,
        onCreate: (db, version) async {
          await db.execute('CREATE TABLE kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
          await db.execute('''
            CREATE TABLE orders (
              client_order_id TEXT PRIMARY KEY,
              shift_ref TEXT NOT NULL,
              sync_state TEXT NOT NULL,
              created_at TEXT NOT NULL,
              data TEXT NOT NULL
            )
          ''');
          await db.execute('CREATE INDEX orders_shift ON orders (shift_ref, created_at)');
          await db.execute('CREATE INDEX orders_sync ON orders (sync_state, created_at)');
        },
      ),
    );
    return LocalDb(db);
  }

  Future<Map<String, dynamic>?> readJson(String key) async {
    final rows = await _db.query('kv', where: 'key = ?', whereArgs: [key]);
    if (rows.isEmpty) return null;
    return jsonDecode(rows.first['value'] as String) as Map<String, dynamic>;
  }

  Future<void> writeJson(String key, Map<String, dynamic> value) => _db.insert(
        'kv',
        {'key': key, 'value': jsonEncode(value)},
        conflictAlgorithm: ConflictAlgorithm.replace,
      );

  Future<void> remove(String key) => _db.delete('kv', where: 'key = ?', whereArgs: [key]);

  Future<void> saveOrder(LocalOrder order) => _db.insert(
        'orders',
        {
          'client_order_id': order.clientOrderId,
          'shift_ref': order.shiftRef,
          'sync_state': order.syncState.name,
          'created_at': order.createdAt.toUtc().toIso8601String(),
          'data': jsonEncode(order.toJson()),
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );

  /// Writes a sync result only if the cashier has not changed the order since
  /// it was sent. Returns false when newer local work must go out again.
  Future<bool> saveIfUnchanged(LocalOrder order, int sentVersion) async {
    return _db.transaction((txn) async {
      final rows = await txn.query(
        'orders',
        columns: ['data'],
        where: 'client_order_id = ?',
        whereArgs: [order.clientOrderId],
      );
      if (rows.isEmpty) return false;

      final current = LocalOrder.fromJson(
        jsonDecode(rows.first['data'] as String) as Map<String, dynamic>,
      );
      if (current.version != sentVersion) return false;

      await txn.update(
        'orders',
        {'sync_state': order.syncState.name, 'data': jsonEncode(order.toJson())},
        where: 'client_order_id = ?',
        whereArgs: [order.clientOrderId],
      );
      return true;
    });
  }

  Future<LocalOrder?> findOrder(String clientOrderId) async {
    final rows = await _db.query(
      'orders',
      where: 'client_order_id = ?',
      whereArgs: [clientOrderId],
    );
    return rows.isEmpty ? null : _toOrder(rows.first);
  }

  Future<List<LocalOrder>> ordersForShift(String shiftRef) async {
    final rows = await _db.query(
      'orders',
      where: 'shift_ref = ?',
      whereArgs: [shiftRef],
      orderBy: 'created_at ASC',
    );
    return rows.map(_toOrder).toList();
  }

  /// Oldest first, so the server records orders in the order they were sold.
  Future<List<LocalOrder>> unsyncedOrders() async {
    final rows = await _db.query(
      'orders',
      where: 'sync_state = ?',
      whereArgs: [SyncState.pending.name],
      orderBy: 'created_at ASC',
    );
    return rows.map(_toOrder).toList();
  }

  Future<List<LocalOrder>> ordersWithPendingStatus() async {
    final rows = await _db.query(
      'orders',
      where: 'sync_state = ?',
      whereArgs: [SyncState.synced.name],
      orderBy: 'created_at ASC',
    );
    return rows.map(_toOrder).where((order) => order.hasPendingStatus).toList();
  }

  /// Orders that still block closing the shift, including rejected ones.
  Future<int> countUnsettled() async {
    final rows = await _db.rawQuery(
      'SELECT count(*) AS total FROM orders WHERE sync_state != ?',
      [SyncState.synced.name],
    );
    final waiting = rows.first['total'] as int;
    return waiting + (await ordersWithPendingStatus()).length;
  }

  LocalOrder _toOrder(Map<String, Object?> row) =>
      LocalOrder.fromJson(jsonDecode(row['data'] as String) as Map<String, dynamic>);
}
