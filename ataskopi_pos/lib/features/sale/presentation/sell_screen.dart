import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/providers.dart';
import '../../../core/theme/brand.dart';
import '../../../core/ui/atas_ui.dart';
import '../../../core/utils/format.dart';
import '../../catalog/data/catalog.dart';
import '../../printer/data/receipt.dart';
import '../../printer/presentation/print_sheet.dart';
import '../../selfie/presentation/selfie_flow.dart';
import '../domain/cart.dart';
import '../domain/local_order.dart';
import 'item_sheet.dart';
import 'payment_sheet.dart';

const _channels = {'walk_in': 'Walk-in', 'shopeefood': 'ShopeeFood', 'grab': 'Grab'};

class SellScreen extends ConsumerStatefulWidget {
  const SellScreen({super.key});

  @override
  ConsumerState<SellScreen> createState() => _SellScreenState();
}

class _SellScreenState extends ConsumerState<SellScreen> {
  final _search = TextEditingController();
  String? _categoryId;
  bool _paying = false;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<Product> _visibleProducts(Catalog catalog) {
    final order = ref.read(shiftProvider)?.menuOrder ?? const <String>[];
    final rank = {for (var i = 0; i < order.length; i++) order[i]: i};
    final query = _search.text.trim();

    return catalog.products
        .where((product) => _categoryId == null || product.categoryId == _categoryId)
        .where((product) => matchesMenuSearch(product.name, query))
        .toList()
      ..sort((a, b) => (rank[a.id] ?? order.length).compareTo(rank[b.id] ?? order.length));
  }

  void _addDefault(Product product) {
    final cart = ref.read(cartProvider);
    HapticFeedback.selectionClick();
    ref.read(cartProvider.notifier).update(
          cart.add(buildLine(product, channel: cart.channel, options: defaultOptions(product))),
        );
  }

  Future<void> _addCustom(Product product) async {
    final cart = ref.read(cartProvider);
    final line = await showItemSheet(context, product, cart.channel);
    if (line != null) ref.read(cartProvider.notifier).update(ref.read(cartProvider).add(line));
  }

  void _setChannel(String channel) {
    final cart = ref.read(cartProvider);
    if (ref.read(appendProvider) != null) {
      _toast('Kanal mengikuti order yang sedang ditambah.');
      return;
    }
    if (!cart.isEmpty) {
      _toast('Kosongkan keranjang dulu sebelum ganti kanal, karena harganya berbeda.');
      return;
    }
    ref.read(cartProvider.notifier).update(cart.copyWith(channel: channel));
  }

  Future<void> _pay() async {
    if (_paying) return;
    if (ref.read(appendProvider) != null) return _append();
    final cart = ref.read(cartProvider);
    final catalog = ref.read(catalogProvider)!;
    if (cart.isEmpty) return;

    setState(() => _paying = true);
    try {
      final choice = await showPaymentSheet(
        context,
        due: cart.total(catalog.taxEnabled),
        channel: cart.channel,
        offerSelfie: cart.channel == 'walk_in' && !ref.read(selfieProvider).rush,
        guestName: cart.guestName,
      );
      if (choice == null || !mounted) return;

      final named = ref.read(cartProvider).copyWith(guestName: choice.guestName);
      final order = await completeSale(ref, named, choice.payments);
      if (mounted) _announce(order, selfie: choice.selfie);
    } finally {
      if (mounted) setState(() => _paying = false);
    }
  }

  /// Puts the picked items on the unpaid order, then offers to settle it.
  Future<void> _append() async {
    final target = ref.read(appendProvider)!;
    final cart = ref.read(cartProvider);
    final catalog = ref.read(catalogProvider)!;
    if (cart.isEmpty) return;

    setState(() => _paying = true);
    try {
      final order = await ref.read(dbProvider).findOrder(target.clientOrderId);
      if (order == null || order.isPaid || !order.isActive) {
        await ref.read(appendProvider.notifier).finish(keepLines: true);
        _toast('${target.queueNumber} sudah lunas atau selesai. Item tetap di keranjang sebagai order baru.');
        return;
      }

      await ref.read(salesProvider).appendItems(order, cart, taxEnabled: catalog.taxEnabled, guestName: cart.guestName);
      await ref.read(appendProvider.notifier).finish();
      await ref.read(ordersProvider.notifier).reload();
      unawaited(ref.read(syncLoopProvider).kick());
      if (!mounted) return;

      final choice = await showPaymentSheet(
        context,
        due: order.remaining,
        channel: order.channel,
        offerSelfie: offersSelfie(readerOf(context), order),
        guestName: order.guestName,
      );
      if (choice != null && (choice.payments.isNotEmpty || choice.guestName != (order.guestName ?? ''))) {
        await ref.read(salesProvider).addPayments(order, choice.payments, guestName: choice.guestName);
        await ref.read(ordersProvider.notifier).reload();
        unawaited(ref.read(syncLoopProvider).kick());
      }
      if (mounted) _announce(order, selfie: choice?.selfie ?? false, added: cart.lines);
    } finally {
      if (mounted) setState(() => _paying = false);
    }
  }

  Future<void> _cancelAppend() async {
    await ref.read(appendProvider.notifier).finish();
    ref.read(tabProvider.notifier).select(1);
  }

  /// Nothing prints on its own. The cashier taps Print, or the camera opens
  /// when a selfie strip was picked while paying.
  void _announce(LocalOrder order, {bool selfie = false, List<CartLine> added = const []}) {
    final cash = order.payments.where((payment) => payment.tenderedAmount != null);
    final change = cash.fold(0, (sum, payment) => sum + payment.tenderedAmount! - payment.amount);
    final summary = [
      added.isEmpty ? '${order.queueNumber} tersimpan' : 'Ditambahkan ke ${order.queueNumber}',
      if (change > 0) 'Kembali ${rupiah(change)}',
      if (!order.isPaid) 'BELUM LUNAS',
    ].join(' · ');

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(
        content: Text(summary),
        duration: const Duration(seconds: 6),
        action: SnackBarAction(label: 'Print', onPressed: () => showPrintSheet(context, order, added: added)),
      ));

    if (selfie && order.isPaid && offersSelfie(readerOf(context), order)) unawaited(takeSelfie(context, order));
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message), duration: const Duration(seconds: 3)));
  }

  @override
  Widget build(BuildContext context) {
    final catalog = ref.watch(catalogProvider);
    final cart = ref.watch(cartProvider);
    final append = ref.watch(appendProvider);
    ref.watch(shiftProvider);
    if (catalog == null) {
      return const EmptyState(icon: LucideIcons.coffee, title: 'Menu belum tersedia');
    }

    final products = _visibleProducts(catalog);
    final navInset = MediaQuery.paddingOf(context).bottom;
    final ojol = cart.channel != 'walk_in';

    return Stack(
      children: [
        Column(
          children: [
            if (append != null) _AppendBanner(queueNumber: append.queueNumber, onCancel: _cancelAppend),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _search,
                      decoration: InputDecoration(
                        hintText: 'Cari menu, contoh: kopsu',
                        prefixIcon: const Icon(LucideIcons.search, size: 20),
                        contentPadding: const EdgeInsets.symmetric(vertical: 14),
                        suffixIcon: _search.text.isEmpty
                            ? null
                            : IconButton(
                                icon: const Icon(LucideIcons.x, size: 18),
                                onPressed: () => setState(_search.clear),
                              ),
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                  const SizedBox(width: 10),
                  PopupMenuButton<String>(
                    initialValue: cart.channel,
                    onSelected: _setChannel,
                    offset: const Offset(0, 56),
                    itemBuilder: (_) => [
                      for (final entry in _channels.entries)
                        PopupMenuItem(value: entry.key, child: Text(entry.value)),
                    ],
                    child: Container(
                      height: 52,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: ojol ? AtasColors.sun : Colors.white,
                        borderRadius: BorderRadius.circular(AtasRadius.md),
                        border: Border.all(color: ojol ? AtasColors.sun : AtasColors.line),
                      ),
                      child: Row(
                        children: [
                          Icon(ojol ? LucideIcons.bike : LucideIcons.store, size: 18, color: AtasColors.ink),
                          const SizedBox(width: 8),
                          Text(_channels[cart.channel]!, style: const TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(width: 4),
                          const Icon(LucideIcons.chevronDown, size: 16, color: AtasColors.inkMuted),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(
              height: 56,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
                children: [
                  _CategoryPill(
                    label: 'Semua',
                    selected: _categoryId == null,
                    onTap: () => setState(() => _categoryId = null),
                  ),
                  for (final category in catalog.categories)
                    _CategoryPill(
                      label: category.name,
                      selected: _categoryId == category.id,
                      onTap: () => setState(() => _categoryId = category.id),
                    ),
                ],
              ),
            ),
            Expanded(
              child: products.isEmpty
                  ? const EmptyState(icon: LucideIcons.search, title: 'Menu tidak ditemukan')
                  : GridView.builder(
                      padding: EdgeInsets.fromLTRB(16, 10, 16, navInset + (cart.isEmpty ? 16 : 100)),
                      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                        maxCrossAxisExtent: 150,
                        mainAxisExtent: 112,
                        crossAxisSpacing: 10,
                        mainAxisSpacing: 10,
                      ),
                      itemCount: products.length,
                      itemBuilder: (_, index) {
                        final product = products[index];
                        final inCart = cart.lines
                            .where((line) => line.productId == product.id)
                            .fold(0, (sum, line) => sum + line.quantity);
                        return _ProductTile(
                          product: product,
                          price: product.priceFor(cart.channel),
                          inCart: inCart,
                          onTap: product.isAvailable ? () => _addDefault(product) : null,
                          onLongPress: product.isAvailable ? () => _addCustom(product) : null,
                          onCustomize: product.isAvailable && product.hasChoices ? () => _addCustom(product) : null,
                        );
                      },
                    ),
            ),
          ],
        ),
        Positioned(
          left: 16,
          right: 16,
          bottom: navInset + 8,
          child: AnimatedSlide(
            offset: cart.isEmpty ? const Offset(0, 0.4) : Offset.zero,
            duration: const Duration(milliseconds: 260),
            curve: Curves.easeOutCubic,
            child: AnimatedOpacity(
              opacity: cart.isEmpty ? 0 : 1,
              duration: const Duration(milliseconds: 200),
              child: IgnorePointer(
                ignoring: cart.isEmpty,
                child: _CartBar(
                  cart: cart,
                  taxEnabled: catalog.taxEnabled,
                  paying: _paying,
                  onPay: _pay,
                  appendTo: append?.queueNumber,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _CategoryPill extends StatelessWidget {
  const _CategoryPill({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? AtasColors.ink : Colors.white.withValues(alpha: 0.75),
            borderRadius: BorderRadius.circular(99),
            border: Border.all(color: selected ? AtasColors.ink : AtasColors.line),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.w700,
              color: selected ? Colors.white : AtasColors.inkMuted,
            ),
          ),
        ),
      ),
    );
  }
}

class _ProductTile extends StatelessWidget {
  const _ProductTile({
    required this.product,
    required this.price,
    required this.inCart,
    this.onTap,
    this.onLongPress,
    this.onCustomize,
  });

  final Product product;
  final int price;
  final int inCart;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;

  /// Opens the choices, so less sugar or an extra shot is one tap away.
  final VoidCallback? onCustomize;

  @override
  Widget build(BuildContext context) {
    final soldOut = !product.isAvailable;
    final picked = inCart > 0;

    final card = SurfaceCard(
      padding: EdgeInsets.zero,
      radius: 18,
      color: soldOut ? const Color(0xFFF1F3F7) : (picked ? const Color(0xFFF4F8FF) : Colors.white),
      borderColor: picked ? AtasColors.blue : AtasColors.line,
      borderWidth: picked ? 1.6 : 1,
      onTap: onTap,
      onLongPress: onLongPress,
      child: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    product.name,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13.5,
                      height: 1.25,
                      color: soldOut ? AtasColors.inkFaint : AtasColors.ink,
                      decoration: soldOut ? TextDecoration.lineThrough : null,
                    ),
                  ),
                ),
                if (soldOut)
                  const TonePill('Habis', tone: Tone.danger)
                else
                  Text(
                    rupiah(price),
                    style: const TextStyle(color: AtasColors.blue, fontSize: 13, fontWeight: FontWeight.w800),
                  ),
              ],
            ),
          ),
          if (onCustomize != null)
            Positioned(
              right: 6,
              bottom: 6,
              child: Material(
                color: AtasColors.sky,
                shape: const CircleBorder(),
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: onCustomize,
                  child: const Tooltip(
                    message: 'Atur pilihan',
                    child: SizedBox(
                      width: 34,
                      height: 34,
                      child: Icon(LucideIcons.slidersHorizontal, size: 16, color: AtasColors.blue),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
    if (!picked) return card;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned.fill(child: card),
        Positioned(
          top: -6,
          right: -4,
          child: Container(
            constraints: const BoxConstraints(minWidth: 26),
            height: 26,
            padding: const EdgeInsets.symmetric(horizontal: 7),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AtasColors.sun,
              borderRadius: BorderRadius.circular(99),
              border: Border.all(color: Colors.white, width: 2),
              boxShadow: [BoxShadow(color: AtasColors.sun.withValues(alpha: 0.45), blurRadius: 8, offset: const Offset(0, 2))],
            ),
            child: Text('$inCart', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AtasColors.ink)),
          ),
        ),
      ],
    );
  }
}

class _AppendBanner extends StatelessWidget {
  const _AppendBanner({required this.queueNumber, required this.onCancel});

  final String queueNumber;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      padding: const EdgeInsets.fromLTRB(14, 6, 6, 6),
      decoration: BoxDecoration(color: AtasColors.sun, borderRadius: BorderRadius.circular(AtasRadius.md)),
      child: Row(
        children: [
          const Icon(LucideIcons.plusCircle, size: 18, color: AtasColors.ink),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Tambah item ke $queueNumber',
              style: const TextStyle(fontWeight: FontWeight.w800, color: AtasColors.ink),
            ),
          ),
          TextButton(
            onPressed: onCancel,
            style: TextButton.styleFrom(foregroundColor: AtasColors.ink),
            child: const Text('Batal'),
          ),
        ],
      ),
    );
  }
}

class _CartBar extends ConsumerWidget {
  const _CartBar({
    required this.cart,
    required this.taxEnabled,
    required this.paying,
    required this.onPay,
    this.appendTo,
  });

  final Cart cart;
  final bool taxEnabled;
  final bool paying;
  final VoidCallback onPay;

  /// The order getting these items, when the cart is not a new sale.
  final String? appendTo;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Glass(
      radius: 24,
      padding: const EdgeInsets.all(8),
      child: Row(
        children: [
          Expanded(
            child: InkWell(
              borderRadius: BorderRadius.circular(18),
              onTap: cart.isEmpty ? null : () => _showCart(context),
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Row(
                  children: [
                    Badge(
                      label: Text('${cart.itemCount}'),
                      backgroundColor: AtasColors.sun,
                      textColor: AtasColors.ink,
                      child: const TileIcon(LucideIcons.shoppingBag, size: 44),
                    ),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('Keranjang', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                          Text('Lihat & ubah', style: TextStyle(color: AtasColors.inkMuted, fontSize: 12)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          FilledButton(
            onPressed: cart.isEmpty || paying ? null : onPay,
            style: FilledButton.styleFrom(minimumSize: const Size(0, 52)),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(appendTo == null
                    ? 'Bayar ${rupiah(cart.total(taxEnabled))}'
                    : 'Tambah ${rupiah(cart.subtotal - cart.discount)}'),
                const SizedBox(width: 6),
                const Icon(LucideIcons.arrowRight, size: 18),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showCart(BuildContext context) => showGlassSheet<void>(context, (_) => const _CartSheet());
}

class _CartSheet extends ConsumerStatefulWidget {
  const _CartSheet();

  @override
  ConsumerState<_CartSheet> createState() => _CartSheetState();
}

class _CartSheetState extends ConsumerState<_CartSheet> {
  late final _name = TextEditingController(text: ref.read(cartProvider).guestName);
  late final _discount = TextEditingController(
    text: ref.read(cartProvider).discount == 0 ? '' : '${ref.read(cartProvider).discount}',
  );

  @override
  void dispose() {
    _name.dispose();
    _discount.dispose();
    super.dispose();
  }

  Future<void> _edit(CartLine line) async {
    final product = ref.read(catalogProvider)?.products.where((product) => product.id == line.productId).firstOrNull;
    if (product == null) return;
    final cart = ref.read(cartProvider);
    final edited = await showItemSheet(context, product, cart.channel, initial: line);
    if (edited != null) ref.read(cartProvider.notifier).update(ref.read(cartProvider).replace(line.key, edited));
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final taxEnabled = ref.watch(catalogProvider)?.taxEnabled ?? false;
    final notifier = ref.read(cartProvider.notifier);
    if (cart.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.of(context).pop();
      });
    }

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          children: [
            Row(
              children: [
                Text('Keranjang', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(width: 8),
                TonePill('${cart.itemCount} item', tone: Tone.blue),
                const Spacer(),
                TextButton.icon(
                  onPressed: () {
                    notifier.clear();
                    Navigator.of(context).pop();
                  },
                  style: TextButton.styleFrom(foregroundColor: AtasColors.danger),
                  icon: const Icon(LucideIcons.trash2, size: 16),
                  label: const Text('Kosongkan'),
                ),
              ],
            ),
            const SizedBox(height: 10),
            for (final line in cart.lines)
              SurfaceCard(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
                radius: AtasRadius.md,
                onTap: () => _edit(line),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(line.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                          if (line.requests.isNotEmpty || line.notes != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: Text(
                                [...line.requests, if (line.notes != null) '"${line.notes}"'].join(', '),
                                style: const TextStyle(color: AtasColors.inkMuted, fontSize: 12.5),
                              ),
                            ),
                          const SizedBox(height: 4),
                          Text(
                            rupiah(line.lineTotal),
                            style: const TextStyle(color: AtasColors.blue, fontWeight: FontWeight.w800, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                    QtyStepper(
                      value: line.quantity,
                      onMinus: () => notifier.update(cart.changeQuantity(line.key, -1)),
                      onPlus: () => notifier.update(cart.changeQuantity(line.key, 1)),
                    ),
                  ],
                ),
              ),
            const Padding(
              padding: EdgeInsets.only(top: 2, bottom: 10),
              child: Text('Tap item untuk ubah pilihan', style: TextStyle(color: AtasColors.inkFaint, fontSize: 12)),
            ),
            if (ref.watch(appendProvider) == null) ...[
              PillToggle<String>(
                options: const {'pickup': 'Bawa pulang', 'dine_in': 'Makan di sini'},
                value: cart.orderType,
                onChanged: (value) => notifier.update(cart.copyWith(orderType: value)),
              ),
              const SizedBox(height: 12),
            ],
            TextField(
              controller: _name,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                labelText: 'Nama customer (opsional)',
                prefixIcon: Icon(LucideIcons.user, size: 18),
              ),
              onChanged: (value) => notifier.update(ref.read(cartProvider).copyWith(guestName: value)),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _discount,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(
                labelText: 'Diskon',
                prefixText: 'Rp ',
                prefixIcon: Icon(LucideIcons.tag, size: 18),
              ),
              onChanged: (value) {
                final current = ref.read(cartProvider);
                final amount = int.tryParse(value) ?? 0;
                notifier.update(current.copyWith(discount: amount > current.subtotal ? current.subtotal : amount));
              },
            ),
            const SizedBox(height: 14),
            SurfaceCard(
              radius: AtasRadius.md,
              child: Column(
                children: [
                  _Total('Subtotal', cart.subtotal),
                  if (cart.discount > 0) _Total('Diskon', -cart.discount),
                  if (taxEnabled) _Total('Pajak', cart.tax(true)),
                  const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Divider()),
                  _Total('Total', cart.total(taxEnabled), bold: true),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Total extends StatelessWidget {
  const _Total(this.label, this.amount, {this.bold = false});

  final String label;
  final int amount;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
                color: bold ? AtasColors.ink : AtasColors.inkMuted,
                fontSize: bold ? 16 : 14,
              ),
            ),
          ),
          Text(
            amount < 0 ? '-${rupiah(-amount)}' : rupiah(amount),
            style: TextStyle(
              fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
              fontSize: bold ? 20 : 14,
              color: bold ? AtasColors.blue : (amount < 0 ? AtasColors.success : AtasColors.ink),
            ),
          ),
        ],
      ),
    );
  }
}

String channelLabel(String channel) => _channels[channel] ?? paymentLabel(channel);
