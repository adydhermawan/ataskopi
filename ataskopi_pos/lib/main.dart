import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

import 'app.dart';
import 'core/api/api_client.dart';
import 'core/db/local_db.dart';
import 'core/providers.dart';
import 'features/auth/data/session.dart';
import 'features/catalog/data/catalog.dart';
import 'features/sale/domain/cart.dart';
import 'features/selfie/data/selfie_settings.dart';
import 'features/selfie/data/selfie_store.dart';
import 'features/shift/data/local_shift.dart';
import 'features/sync/data/sync_engine.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final dataDir = await getDatabasesPath();
  final db = await LocalDb.open(p.join(dataDir, 'ataskopi_pos.db'));
  final api = ApiClient();
  final auth = AuthService(api);

  final catalog = await db.readJson(catalogKey);
  final shift = await db.readJson(shiftKey);
  final cart = await db.readJson(cartKey);
  final selfie = await db.readJson(selfieKey);
  final append = await db.readJson(appendKey);

  final boot = BootState(
    db: db,
    api: api,
    auth: auth,
    session: await auth.restore(),
    catalog: catalog == null ? null : Catalog.fromJson(catalog),
    shift: shift == null ? null : LocalShift.fromJson(shift),
    cart: cart == null ? const Cart() : Cart.fromJson(cart),
    printerMac: (await db.readJson(printerKey))?['mac'] as String?,
    lastPhone: (await db.readJson(lastPhoneKey))?['phone'] as String?,
    selfie: selfie == null ? const SelfieSettings() : SelfieSettings.fromJson(selfie),
    selfies: await SelfieStore.open(p.join(dataDir, 'selfies')),
    append: append == null ? null : AppendTarget.fromJson(append),
  );

  runApp(ProviderScope(
    overrides: [bootProvider.overrideWithValue(boot)],
    child: const PosApp(),
  ));
}
