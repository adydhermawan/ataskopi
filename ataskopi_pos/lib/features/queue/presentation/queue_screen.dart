import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/ui/atas_ui.dart';
import '../../../core/utils/format.dart';
import '../../sale/domain/local_order.dart';
import '../../sale/presentation/payment_sheet.dart';
import '../../sale/presentation/sell_screen.dart';
import '../../selfie/presentation/selfie_flow.dart';

const _statusLabels = {'preparing': 'Dibuat', 'ready': 'Siap', 'completed': 'Selesai'};
const _statusTones = {'preparing': Tone.sun, 'ready': Tone.success, 'completed': Tone.neutral};

class QueueScreen extends ConsumerStatefulWidget {
  const QueueScreen({super.key});

  @override
  ConsumerState<QueueScreen> createState() => _QueueScreenState();
}

class _QueueScreenState extends ConsumerState<QueueScreen> {
  bool _showDone = false;

  @override
  Widget build(BuildContext context) {
    final orders = ref.watch(ordersProvider).where((order) => order.isActive != _showDone).toList();
    if (_showDone) orders.sort((a, b) => b.createdAt.compareTo(a.createdAt));

    final all = ref.watch(ordersProvider);
    final active = all.where((order) => order.isActive).length;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
          child: PillToggle<bool>(
            options: {false: 'Aktif · $active', true: 'Selesai · ${all.length - active}'},
            value: _showDone,
            onChanged: (value) => setState(() => _showDone = value),
          ),
        ),
        Expanded(
          child: orders.isEmpty
              ? EmptyState(
                  icon: _showDone ? LucideIcons.checkCircle2 : LucideIcons.coffee,
                  title: _showDone ? 'Belum ada order selesai' : 'Tidak ada antrian',
                  subtitle: _showDone ? null : 'Order baru dari tab Kasir muncul di sini',
                )
              : ListView.builder(
                  padding: EdgeInsets.fromLTRB(16, 0, 16, MediaQuery.paddingOf(context).bottom + 16),
                  itemCount: orders.length,
                  itemBuilder: (_, index) => _OrderCard(order: orders[index]),
                ),
        ),
      ],
    );
  }
}

class _OrderCard extends ConsumerWidget {
  const _OrderCard({required this.order});

  final LocalOrder order;

  Future<void> _change(WidgetRef ref, Future<void> Function() action) async {
    await action();
    await ref.read(ordersProvider.notifier).reload();
    unawaited(ref.read(syncLoopProvider).kick());
  }

  Future<void> _pay(BuildContext context, WidgetRef ref) async {
    final read = readerOf(context);
    final messenger = ScaffoldMessenger.of(context);
    final choice = await showPaymentSheet(
      context,
      due: order.remaining,
      channel: order.channel,
      allowLater: false,
      offerSelfie: offersSelfie(read, order),
    );
    if (choice == null || choice.payments.isEmpty) return;
    await _change(ref, () => ref.read(salesProvider).addPayments(order, choice.payments));
    // The receipt waits until the bill is settled; a part payment prints nothing.
    if (!order.isPaid) return;
    if (choice.selfie && context.mounted) {
      unawaited(selfieOrReceipt(context, order));
    } else {
      unawaited(printWithRetry(messenger, read, order.queueNumber, () => printReceipt(read, order)));
    }
  }

  void _reprint(BuildContext context) {
    final read = readerOf(context);
    unawaited(printWithRetry(ScaffoldMessenger.of(context), read, order.queueNumber, () => printOrder(read, order)));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final sales = ref.read(salesProvider);

    final meta = [if (order.channel != 'walk_in') channelLabel(order.channel), clock(order.createdAt)].join(' · ');

    return SurfaceCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              QueueBadge(order.queueNumber),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.guestName?.isNotEmpty == true ? order.guestName! : 'Walk-in',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
                    Text(meta, style: const TextStyle(color: AtasColors.inkMuted, fontSize: 12.5)),
                  ],
                ),
              ),
              TonePill(
                _statusLabels[order.orderStatus] ?? order.orderStatus,
                tone: _statusTones[order.orderStatus] ?? Tone.neutral,
              ),
            ],
          ),
          const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Divider()),
          for (final line in order.lines) OrderLineText(line.quantity, line.name, [...line.requests, if (line.notes != null) line.notes!]),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(rupiah(order.total), style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(width: 2),
              if (!order.isPaid) TonePill('Belum lunas ${rupiah(order.remaining)}', tone: Tone.danger, icon: LucideIcons.wallet),
              if (order.syncState == SyncState.pending || order.hasPendingStatus)
                const TonePill('Belum terkirim', tone: Tone.warning, icon: LucideIcons.clock),
              if (order.syncState == SyncState.rejected)
                const TonePill('Ditolak server', tone: Tone.danger, icon: LucideIcons.alertCircle),
            ],
          ),
          if (order.lastError != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(order.lastError!, style: const TextStyle(color: AtasColors.warning, fontSize: 12.5)),
            ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (!order.isPaid && order.isActive)
                FilledButton.icon(
                  style: compactButton().copyWith(
                    backgroundColor: const WidgetStatePropertyAll(AtasColors.sun),
                    foregroundColor: const WidgetStatePropertyAll(AtasColors.ink),
                  ),
                  onPressed: () => _pay(context, ref),
                  icon: const Icon(LucideIcons.wallet, size: 16),
                  label: const Text('Bayar'),
                ),
              if (order.orderStatus == 'preparing')
                FilledButton.icon(
                  style: compactButton(),
                  onPressed: () => _change(ref, () => sales.setStatus(order, 'ready')),
                  icon: const Icon(LucideIcons.bellRing, size: 16),
                  label: const Text('Siap'),
                ),
              if (order.orderStatus == 'ready')
                FilledButton.icon(
                  style: compactButton(),
                  onPressed: order.isPaid ? () => _change(ref, () => sales.setStatus(order, 'completed')) : null,
                  icon: const Icon(LucideIcons.check, size: 16),
                  label: const Text('Selesai'),
                ),
              if (offersSelfie(ref.watch, order))
                OutlinedButton.icon(
                  style: compactButton(),
                  onPressed: () => selfieOrReceipt(context, order, receiptIfSkipped: false),
                  icon: const Icon(LucideIcons.camera, size: 16),
                  label: const Text('Selfie'),
                ),
              OutlinedButton.icon(
                style: compactButton(),
                onPressed: () => _reprint(context),
                icon: const Icon(LucideIcons.printer, size: 16),
                label: const Text('Print ulang'),
              ),
              if (order.syncState == SyncState.rejected)
                OutlinedButton.icon(
                  style: compactButton(),
                  onPressed: () => _change(ref, () => ref.read(engineProvider).retry(order)),
                  icon: const Icon(LucideIcons.refreshCw, size: 16),
                  label: const Text('Kirim ulang'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Queue number in a tinted tile, the first thing the barista looks for.
class QueueBadge extends StatelessWidget {
  const QueueBadge(this.number, {super.key, this.highlight = false});

  final String number;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 56),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: highlight ? AtasColors.sun : AtasColors.sky,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(
        number,
        style: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.3,
          color: highlight ? AtasColors.ink : AtasColors.blue,
        ),
      ),
    );
  }
}

/// "2× Kopi Susu" with its choices underneath.
class OrderLineText extends StatelessWidget {
  const OrderLineText(this.quantity, this.name, this.extras, {super.key});

  final int quantity;
  final String name;
  final List<String> extras;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 30,
            child: Text('$quantity×', style: const TextStyle(fontWeight: FontWeight.w800, color: AtasColors.blue)),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                if (extras.isNotEmpty)
                  Text(extras.join(', '), style: const TextStyle(color: AtasColors.inkMuted, fontSize: 12.5)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
