import 'dart:io';
import 'dart:typed_data';

import 'package:ataskopi_pos/core/db/local_db.dart';
import 'package:ataskopi_pos/features/sale/data/sale_service.dart';
import 'package:ataskopi_pos/features/sale/domain/cart.dart';
import 'package:ataskopi_pos/features/sale/domain/local_order.dart';
import 'package:ataskopi_pos/features/selfie/data/selfie_store.dart';
import 'package:ataskopi_pos/features/shift/data/local_shift.dart';
import 'package:ataskopi_pos/features/sync/data/sync_engine.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

const _kopsu = CartLine(productId: 'kopsu', name: 'Kopsu', quantity: 1, unitPrice: 20000);
const _latte = CartLine(productId: 'latte', name: 'Latte', quantity: 1, unitPrice: 25000);

void main() {
  sqfliteFfiInit();

  group('adding items to an unpaid order', () {
    late LocalDb db;
    late SaleService sales;

    setUp(() async {
      db = await LocalDb.open(inMemoryDatabasePath, factory: databaseFactoryFfi);
      await db.writeJson(
        shiftKey,
        LocalShift(
          clientShiftId: 'shift-1',
          outletId: 'outlet-1',
          openingCash: 0,
          openedAt: DateTime(2026, 11, 12, 8),
          menuOrder: const [],
        ).toJson(),
      );
      sales = SaleService(db);
    });

    test('stacks the same drink, adds new ones, and sends a newer revision', () async {
      final order = await sales.checkout(const Cart(lines: [_kopsu]), const [], taxEnabled: false);
      expect(order.toSyncJson()['revision'], 0);

      await sales.appendItems(order, const Cart(lines: [_kopsu, _latte]), taxEnabled: false, guestName: 'Budi');

      final saved = (await db.findOrder(order.clientOrderId))!;
      expect(saved.lines.map((line) => (line.productId, line.quantity)), [('kopsu', 2), ('latte', 1)]);
      expect(saved.subtotal, 65000);
      expect(saved.total, 65000);
      expect(saved.remaining, 65000);
      expect(saved.guestName, 'Budi');
      expect(saved.syncState, SyncState.pending);
      expect(saved.toSyncJson()['revision'], 1);
    });

    test('keeps what was already paid and the old name when none is typed', () async {
      final order = await sales.checkout(
        const Cart(lines: [_kopsu], guestName: 'Sari', discount: 5000),
        [newPayment('cash', 10000)],
        taxEnabled: false,
      );
      await sales.appendItems(order, const Cart(lines: [_latte]), taxEnabled: false);

      final saved = (await db.findOrder(order.clientOrderId))!;
      expect(saved.total, 40000);
      expect(saved.remaining, 30000);
      expect(saved.guestName, 'Sari');
    });

    test('a name typed while paying goes on the order', () async {
      final order = await sales.checkout(const Cart(lines: [_kopsu]), const [], taxEnabled: false);
      await sales.addPayments(order, [newPayment('qris', 20000)], guestName: 'Rina');

      final saved = (await db.findOrder(order.clientOrderId))!;
      expect(saved.guestName, 'Rina');
      expect(saved.isPaid, isTrue);
      expect(saved.revision, 1);
    });
  });

  group('saved selfies', () {
    late Directory dir;

    setUp(() async => dir = await Directory.systemTemp.createTemp('selfies'));
    tearDown(() async => dir.delete(recursive: true));

    final shot = SelfieShot(
      raster: Uint8List.fromList([1, 2, 3]),
      social: Uint8List.fromList([4]),
      preview: Uint8List.fromList([5, 6]),
      caption: 'Ngopi dulu',
    );

    test('a photo survives a restart', () async {
      await (await SelfieStore.open(dir.path)).save('order-1', shot);

      final reopened = await SelfieStore.open(dir.path);
      expect(reopened.ids, {'order-1'});
      final loaded = (await reopened.load('order-1'))!;
      expect(loaded.raster, shot.raster);
      expect(loaded.caption, 'Ngopi dulu');
    });

    test('old photos are deleted', () async {
      await (await SelfieStore.open(dir.path)).save('order-1', shot);

      final later = DateTime.now().add(SelfieStore.keepFor + const Duration(days: 1));
      final reopened = await SelfieStore.open(dir.path, now: later);
      expect(reopened.ids, isEmpty);
      expect(await reopened.load('order-1'), isNull);
    });
  });
}
