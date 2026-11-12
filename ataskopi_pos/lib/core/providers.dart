import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show ProviderListenable;

import '../features/auth/data/session.dart';
import '../features/catalog/data/catalog.dart';
import '../features/printer/data/logo.dart';
import '../features/printer/data/printer_service.dart';
import '../features/printer/data/receipt.dart';
import '../features/sale/data/sale_service.dart';
import '../features/sale/domain/cart.dart';
import '../features/sale/domain/local_order.dart';
import '../features/selfie/data/selfie_settings.dart';
import '../features/selfie/data/selfie_store.dart';
import '../features/shift/data/local_shift.dart';
import '../features/sync/data/sync_engine.dart';
import 'api/api_client.dart';
import 'db/local_db.dart';

const cartKey = 'cart';
const printerKey = 'printer';
const lastPhoneKey = 'last_phone';
const selfieKey = 'selfie';
const appendKey = 'append';

const _pollInterval = Duration(seconds: 5);
const _catalogInterval = Duration(minutes: 5);

/// What was saved on the phone, loaded once before the first frame.
class BootState {
  const BootState({
    required this.db,
    required this.api,
    required this.auth,
    this.session,
    this.catalog,
    this.shift,
    this.cart = const Cart(),
    this.printerMac,
    this.lastPhone,
    this.selfie = const SelfieSettings(),
    required this.selfies,
    this.append,
  });

  final LocalDb db;
  final ApiClient api;
  final AuthService auth;
  final Session? session;
  final Catalog? catalog;
  final LocalShift? shift;
  final Cart cart;
  final String? printerMac;
  final String? lastPhone;
  final SelfieSettings selfie;
  final SelfieStore selfies;
  final AppendTarget? append;
}

final bootProvider = Provider<BootState>((ref) => throw UnimplementedError());

final dbProvider = Provider((ref) => ref.watch(bootProvider).db);
final apiProvider = Provider((ref) => ref.watch(bootProvider).api);
final authProvider = Provider((ref) => ref.watch(bootProvider).auth);
final engineProvider = Provider((ref) => SyncEngine(ref.watch(dbProvider), ref.watch(apiProvider)));
final salesProvider = Provider((ref) => SaleService(ref.watch(dbProvider)));
final printerProvider = Provider((ref) => PrinterService());

class SessionNotifier extends Notifier<Session?> {
  @override
  Session? build() => ref.read(bootProvider).session;

  void set(Session? session) => state = session;
}

final sessionProvider = NotifierProvider<SessionNotifier, Session?>(SessionNotifier.new);

class CatalogNotifier extends Notifier<Catalog?> {
  @override
  Catalog? build() => ref.read(bootProvider).catalog;

  void set(Catalog catalog) => state = catalog;
}

final catalogProvider = NotifierProvider<CatalogNotifier, Catalog?>(CatalogNotifier.new);

class ShiftNotifier extends Notifier<LocalShift?> {
  @override
  LocalShift? build() => ref.read(bootProvider).shift;

  Future<void> open(LocalShift shift) async {
    await ref.read(dbProvider).writeJson(shiftKey, shift.toJson());
    state = shift;
  }

  Future<void> reload() async {
    final saved = await ref.read(dbProvider).readJson(shiftKey);
    state = saved == null ? null : LocalShift.fromJson(saved);
  }

  Future<void> clear() async {
    await ref.read(dbProvider).remove(shiftKey);
    state = null;
  }
}

final shiftProvider = NotifierProvider<ShiftNotifier, LocalShift?>(ShiftNotifier.new);

/// Saved on every change, so a crash or a dead phone never loses a cart.
class CartNotifier extends Notifier<Cart> {
  @override
  Cart build() => ref.read(bootProvider).cart;

  void update(Cart cart) {
    state = cart;
    unawaited(ref.read(dbProvider).writeJson(cartKey, cart.toJson()));
  }

  void clear() {
    final previous = state;
    update(Cart(channel: previous.channel, orderType: previous.orderType));
  }
}

final cartProvider = NotifierProvider<CartNotifier, Cart>(CartNotifier.new);

/// An unpaid order getting more items. The cart the cashier was building is
/// put aside meanwhile and comes back afterwards.
class AppendTarget {
  const AppendTarget({required this.clientOrderId, required this.queueNumber, required this.stash});

  AppendTarget.fromJson(Map<String, dynamic> json)
      : clientOrderId = json['clientOrderId'] as String,
        queueNumber = json['queueNumber'] as String,
        stash = Cart.fromJson(json['stash'] as Map<String, dynamic>);

  final String clientOrderId;
  final String queueNumber;
  final Cart stash;

  Map<String, dynamic> toJson() => {'clientOrderId': clientOrderId, 'queueNumber': queueNumber, 'stash': stash.toJson()};
}

class AppendNotifier extends Notifier<AppendTarget?> {
  @override
  AppendTarget? build() => ref.read(bootProvider).append;

  Future<void> start(LocalOrder order) async {
    // Starting again from another order keeps the cart put aside first.
    final current = state;
    final Cart stash = current == null ? ref.read(cartProvider) : current.stash;
    final target = AppendTarget(clientOrderId: order.clientOrderId, queueNumber: order.queueNumber, stash: stash);
    await ref.read(dbProvider).writeJson(appendKey, target.toJson());
    state = target;
    ref.read(cartProvider.notifier).update(
          Cart(channel: order.channel, orderType: order.orderType, guestName: order.guestName),
        );
  }

  /// Back to the cart that was put aside. With [keepLines], what was picked
  /// for the order stays in the cart as a new sale instead.
  Future<void> finish({bool keepLines = false}) async {
    final target = state;
    if (target == null) return;
    final picked = ref.read(cartProvider);
    var cart = target.stash;
    if (keepLines && picked.channel == cart.channel) {
      for (final line in picked.lines) {
        cart = cart.add(line);
      }
    } else if (keepLines) {
      cart = Cart(channel: picked.channel, orderType: picked.orderType, lines: picked.lines);
    }
    ref.read(cartProvider.notifier).update(cart);
    await ref.read(dbProvider).remove(appendKey);
    state = null;
  }
}

final appendProvider = NotifierProvider<AppendNotifier, AppendTarget?>(AppendNotifier.new);

class TabNotifier extends Notifier<int> {
  @override
  int build() => 0;

  void select(int index) => state = index;
}

/// The bottom tab, so a screen can send the cashier to another one.
final tabProvider = NotifierProvider<TabNotifier, int>(TabNotifier.new);

class OrdersNotifier extends Notifier<List<LocalOrder>> {
  @override
  List<LocalOrder> build() => const [];

  Future<void> reload() async {
    final shift = ref.read(shiftProvider);
    state = shift == null ? const [] : await ref.read(dbProvider).ordersForShift(shift.clientShiftId);
  }
}

final ordersProvider = NotifierProvider<OrdersNotifier, List<LocalOrder>>(OrdersNotifier.new);

class SyncStatus {
  const SyncStatus({this.online = true, this.unsettled = 0, this.sessionExpired = false, this.shiftError});

  final bool online;
  final int unsettled;
  final bool sessionExpired;
  final String? shiftError;
}

class SyncStatusNotifier extends Notifier<SyncStatus> {
  @override
  SyncStatus build() => const SyncStatus();

  void set(SyncStatus status) => state = status;
}

final syncStatusProvider = NotifierProvider<SyncStatusNotifier, SyncStatus>(SyncStatusNotifier.new);

class InboxNotifier extends Notifier<List<Map<String, dynamic>>> {
  final _orders = <String, Map<String, dynamic>>{};
  String? _since;

  @override
  List<Map<String, dynamic>> build() => const [];

  void merge(InboxPage page) {
    for (final order in page.orders) {
      final status = order['orderStatus'];
      if (status == 'completed' || status == 'cancelled' || status == 'rejected') {
        _orders.remove(order['id']);
      } else {
        _orders[order['id'] as String] = order;
      }
    }
    _since = page.nextSince;
    state = _orders.values.toList()
      ..sort((a, b) => (a['createdAt'] as String).compareTo(b['createdAt'] as String));
  }

  String? get since => _since;

  int get waiting => state.where((order) => order['orderStatus'] == 'pending').length;
}

final inboxProvider = NotifierProvider<InboxNotifier, List<Map<String, dynamic>>>(InboxNotifier.new);

class PrinterMacNotifier extends Notifier<String?> {
  @override
  String? build() => ref.read(bootProvider).printerMac;

  Future<void> set(String mac) async {
    await ref.read(dbProvider).writeJson(printerKey, {'mac': mac});
    state = mac;
  }
}

final printerMacProvider = NotifierProvider<PrinterMacNotifier, String?>(PrinterMacNotifier.new);

class SelfieSettingsNotifier extends Notifier<SelfieSettings> {
  @override
  SelfieSettings build() => ref.read(bootProvider).selfie;

  Future<void> update(SelfieSettings settings) async {
    state = settings;
    await ref.read(dbProvider).writeJson(selfieKey, settings.toJson());
  }
}

final selfieProvider = NotifierProvider<SelfieSettingsNotifier, SelfieSettings>(SelfieSettingsNotifier.new);

/// Orders whose selfie is saved on the phone.
class SavedSelfiesNotifier extends Notifier<Set<String>> {
  SelfieStore get _store => ref.read(bootProvider).selfies;

  @override
  Set<String> build() => {..._store.ids};

  Future<void> save(String clientOrderId, SelfieShot shot) async {
    await _store.save(clientOrderId, shot);
    state = {..._store.ids};
  }

  Future<SelfieShot?> load(String clientOrderId) async {
    final shot = await _store.load(clientOrderId);
    if (shot == null) state = {..._store.ids};
    return shot;
  }
}

final savedSelfiesProvider = NotifierProvider<SavedSelfiesNotifier, Set<String>>(SavedSelfiesNotifier.new);

/// Keeps the phone and the server in step for as long as a shift is open.
class SyncLoop {
  SyncLoop(this._ref);

  final Ref _ref;
  Timer? _timer;
  DateTime? _catalogFetchedAt;

  void start() {
    _timer ??= Timer.periodic(_pollInterval, (_) => kick());
    unawaited(kick());
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  Future<void> kick() async {
    final session = _ref.read(sessionProvider);
    if (session == null) return;

    final engine = _ref.read(engineProvider);
    final db = _ref.read(dbProvider);
    var status = const SyncStatus();

    try {
      final report = await engine.run();
      if (report != null) {
        status = SyncStatus(
          online: report.online,
          sessionExpired: report.sessionExpired,
          shiftError: report.shiftError,
        );
      }
      if (status.online && !status.sessionExpired) {
        await _pollServer(engine, session.outletId);
      }
    } on OfflineException {
      status = const SyncStatus(online: false);
    } on ApiException catch (error) {
      status = SyncStatus(sessionExpired: error.isUnauthorized);
      debugPrint('Sync gagal: $error');
    }

    await _ref.read(shiftProvider.notifier).reload();
    await _ref.read(ordersProvider.notifier).reload();
    _ref.read(syncStatusProvider.notifier).set(SyncStatus(
          online: status.online,
          sessionExpired: status.sessionExpired,
          shiftError: status.shiftError,
          unsettled: await db.countUnsettled(),
        ));
  }

  Future<void> _pollServer(SyncEngine engine, String outletId) async {
    final inbox = _ref.read(inboxProvider.notifier);
    inbox.merge(await engine.pollInbox(outletId, inbox.since));

    final fetched = _catalogFetchedAt;
    if (fetched == null || DateTime.now().difference(fetched) > _catalogInterval) {
      _ref.read(catalogProvider.notifier).set(await engine.refreshCatalog(outletId));
      _catalogFetchedAt = DateTime.now();
    }
  }
}

final syncLoopProvider = Provider((ref) => SyncLoop(ref));

/// Saves first, then prints, so a printer problem can never cost an order.
Future<LocalOrder> completeSale(WidgetRef ref, Cart cart, List<LocalPayment> payments) async {
  final catalog = ref.read(catalogProvider)!;
  final order = await ref.read(salesProvider).checkout(cart, payments, taxEnabled: catalog.taxEnabled);
  ref.read(cartProvider.notifier).clear();

  await ref.read(ordersProvider.notifier).reload();
  unawaited(ref.read(syncLoopProvider).kick());
  return order;
}

/// `ref.read` of a widget or a container, so a print that finishes after its
/// screen is gone can still read the printer.
typedef Reader = T Function<T>(ProviderListenable<T> provider);

/// Receipt first, so the cashier hands it over, then the bar ticket, for
/// orders that skip the selfie.
Future<bool> printOrder(Reader read, LocalOrder order, {bool ticket = true}) async {
  final printed = await printReceipt(read, order);
  return (!ticket || await printTicket(read, order)) && printed;
}

Future<bool> printTicket(Reader read, LocalOrder order) =>
    read(printerProvider).print(read(printerMacProvider), buildOrderTicket(order), priority: PrintPriority.ticket);

Future<bool> printReceipt(Reader read, LocalOrder order) async {
  // A receipt without the logo still beats no receipt.
  List<int> logo = const [];
  try {
    logo = await receiptLogo();
  } catch (error) {
    debugPrint('Logo struk gagal: $error');
  }
  final receipt = buildReceipt(
    order,
    outletName: read(catalogProvider)?.outletName ?? 'AtasKopi',
    cashierName: read(sessionProvider)?.name ?? '',
    logo: logo,
  );
  return read(printerProvider).print(read(printerMacProvider), receipt);
}

/// A ticket with only the items added to an order, for the bar.
Future<bool> printAddedTicket(Reader read, LocalOrder order, List<CartLine> added) => read(printerProvider).print(
      read(printerMacProvider),
      buildTicket(
        number: order.queueNumber,
        heading: 'TAMBAHAN',
        lines: [
          for (final line in added) TicketLine(line.quantity, line.name, extras: line.requests, notes: line.notes),
        ],
        time: DateTime.now(),
        name: order.guestName,
      ),
      priority: PrintPriority.ticket,
    );

/// The strip is built from the order as it is now, so a reprint after more
/// items were added shows them too.
Future<bool> printStrip(Reader read, LocalOrder order, SelfieShot shot) => read(printerProvider).print(
      read(printerMacProvider),
      buildStrip(
        order,
        raster: shot.raster,
        caption: shot.caption,
        social: shot.social,
        outletName: read(catalogProvider)?.outletName ?? 'AtasKopi',
      ),
    );
