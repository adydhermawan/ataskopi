import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/providers.dart';
import '../../../core/theme/brand.dart';
import '../../../core/ui/atas_ui.dart';
import '../../sale/domain/cart.dart';
import '../../sale/domain/local_order.dart';
import '../../selfie/presentation/selfie_flow.dart';

/// Nothing prints on its own: the cashier picks what to print here. [added]
/// offers a bar ticket with only the items just added to the order.
Future<void> showPrintSheet(BuildContext context, LocalOrder order, {List<CartLine> added = const []}) {
  final read = readerOf(context);
  final messenger = ScaffoldMessenger.of(context);
  return showGlassSheet<void>(context, (_) => _PrintSheet(order: order, added: added, read: read, messenger: messenger));
}

class _PrintSheet extends ConsumerWidget {
  const _PrintSheet({required this.order, required this.added, required this.read, required this.messenger});

  final LocalOrder order;
  final List<CartLine> added;
  final Reader read;
  final ScaffoldMessengerState messenger;

  void _run(BuildContext context, String label, Future<bool> Function() job) {
    Navigator.of(context).pop();
    unawaited(printWithRetry(messenger, read, label, job));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hasSelfie = ref.watch(savedSelfiesProvider).contains(order.clientOrderId);
    final number = order.queueNumber;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Print $number', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          if (hasSelfie)
            _Option(
              icon: LucideIcons.camera,
              title: 'Struk selfie',
              subtitle: 'Foto yang tersimpan + detail order',
              leading: _SelfieThumb(order.clientOrderId),
              onTap: () => _run(context, 'strip $number', () => reprintSelfie(read, order)),
            ),
          _Option(
            icon: LucideIcons.receipt,
            title: 'Struk',
            onTap: () => _run(context, number, () => printReceipt(read, order)),
          ),
          _Option(
            icon: LucideIcons.coffee,
            title: 'Tiket bar',
            onTap: () => _run(context, 'tiket $number', () => printTicket(read, order)),
          ),
          _Option(
            icon: LucideIcons.copy,
            title: 'Struk + tiket bar',
            onTap: () => _run(context, number, () => printOrder(read, order)),
          ),
          if (added.isNotEmpty)
            _Option(
              icon: LucideIcons.plusCircle,
              title: 'Tiket tambahan',
              subtitle: 'Hanya item yang baru ditambah',
              onTap: () => _run(context, 'tiket tambahan $number', () => printAddedTicket(read, order, added)),
            ),
        ],
      ),
    );
  }
}

class _Option extends StatelessWidget {
  const _Option({required this.icon, required this.title, required this.onTap, this.subtitle, this.leading});

  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? leading;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      margin: const EdgeInsets.only(bottom: 8),
      padding: EdgeInsets.zero,
      radius: AtasRadius.md,
      onTap: onTap,
      child: ListTile(
        leading: leading ?? TileIcon(icon),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: subtitle == null ? null : Text(subtitle!),
        trailing: const Icon(LucideIcons.printer, size: 18, color: AtasColors.inkFaint),
      ),
    );
  }
}

/// Shows the saved photo, so the cashier knows which strip comes out.
class _SelfieThumb extends ConsumerStatefulWidget {
  const _SelfieThumb(this.clientOrderId);

  final String clientOrderId;

  @override
  ConsumerState<_SelfieThumb> createState() => _SelfieThumbState();
}

class _SelfieThumbState extends ConsumerState<_SelfieThumb> {
  Uint8List? _preview;

  @override
  void initState() {
    super.initState();
    ref.read(savedSelfiesProvider.notifier).load(widget.clientOrderId).then((shot) {
      if (mounted && shot != null) setState(() => _preview = shot.preview);
    });
  }

  @override
  Widget build(BuildContext context) {
    final preview = _preview;
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 44,
        height: 44,
        color: Colors.white,
        child: preview == null
            ? const Icon(LucideIcons.camera, size: 20, color: AtasColors.blue)
            : Image.memory(preview, fit: BoxFit.cover, alignment: Alignment.topCenter, filterQuality: FilterQuality.none),
      ),
    );
  }
}
