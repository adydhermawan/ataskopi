import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/providers.dart';
import '../../../core/theme/brand.dart';
import '../../../core/ui/atas_ui.dart';
import '../../../core/utils/format.dart';
import '../../printer/data/printer_service.dart';
import '../../printer/data/receipt.dart';
import '../../queue/presentation/queue_screen.dart';
import '../../sale/presentation/payment_sheet.dart';

const _typeLabels = {'dine_in': 'Dine-in', 'pickup': 'Pickup', 'delivery': 'Delivery'};
const _typeIcons = {'dine_in': LucideIcons.utensils, 'pickup': LucideIcons.shoppingBag, 'delivery': LucideIcons.bike};

/// The next step for an online order, as (status, button label).
(String, String)? nextStep(Map<String, dynamic> order) {
  switch (order['orderStatus']) {
    case 'pending':
      return ('preparing', 'Terima');
    case 'preparing':
      return order['orderType'] == 'delivery' ? ('on_delivery', 'Kirim') : ('ready', 'Siap');
    case 'ready':
    case 'waiting_pickup':
    case 'on_delivery':
      return ('completed', 'Selesai');
  }
  return null;
}

class OnlineScreen extends ConsumerStatefulWidget {
  const OnlineScreen({super.key});

  @override
  ConsumerState<OnlineScreen> createState() => _OnlineScreenState();
}

class _OnlineScreenState extends ConsumerState<OnlineScreen> {
  final _busy = <String>{};

  String? _detail(Map<String, dynamic> order) {
    if (order['tableNumber'] != null) return 'Meja ${order['tableNumber']}';
    if (order['scheduledTime'] != null) return 'Ambil ${clock(DateTime.parse(order['scheduledTime'] as String))}';
    return order['deliveryAddress'] as String?;
  }

  Future<void> _advance(Map<String, dynamic> order, String status) async {
    final id = order['id'] as String;
    setState(() => _busy.add(id));
    try {
      await ref.read(apiProvider).patch('/api/pos/orders/$id/status', {
        'status': status,
        'expectedStatus': order['orderStatus'],
      });

      // Only the device whose accept succeeded prints the ticket.
      if (status == 'preparing') {
        final ticket = buildTicket(
          number: (order['queueNumber'] ?? order['orderNumber']) as String,
          heading: 'ONLINE · ${_typeLabels[order['orderType']] ?? order['orderType']}',
          name: order['customerName'] as String?,
          detail: _detail(order),
          time: DateTime.parse(order['createdAt'] as String),
          lines: [
            for (final item in (order['items'] as List).cast<Map<String, dynamic>>())
              TicketLine(
                item['quantity'] as int,
                item['name'] as String,
                // Only what differs from the standard drink, like cashier tickets.
                extras: ((item['requests'] ?? [...item['options'] as List, ...item['modifiers'] as List]) as List)
                    .cast<String>(),
                notes: item['notes'] as String?,
              ),
          ],
        );
        unawaited(ref.read(printerProvider).print(ref.read(printerMacProvider), ticket, priority: PrintPriority.ticket));
      }
      await ref.read(syncLoopProvider).kick();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
      }
      await ref.read(syncLoopProvider).kick();
    } finally {
      if (mounted) setState(() => _busy.remove(id));
    }
  }

  /// The customer pays at the counter; the payment counts towards this shift.
  Future<void> _pay(Map<String, dynamic> order) async {
    final id = order['id'] as String;
    final due = (order['total'] as num).round() - ((order['paidAmount'] as num?) ?? 0).round();
    final payments = (await showPaymentSheet(context, due: due, channel: 'walk_in', allowLater: false, askName: false))?.payments;
    if (payments == null || payments.isEmpty || !mounted) return;

    final shift = ref.read(shiftProvider);
    setState(() => _busy.add(id));
    try {
      for (final payment in payments) {
        await ref.read(apiProvider).post('/api/pos/orders/$id/payments', {
          ...payment.toJson(),
          if (shift != null) 'shiftId': shift.serverId ?? shift.clientShiftId,
        });
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Pembayaran ${order['queueNumber'] ?? order['orderNumber']} tercatat')));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Pembayaran gagal tercatat: $error')));
      }
    } finally {
      await ref.read(syncLoopProvider).kick();
      if (mounted) setState(() => _busy.remove(id));
    }
  }

  Future<void> _togglePause(bool paused) async {
    final catalog = ref.read(catalogProvider)!;
    try {
      await ref.read(apiProvider).patch('/api/pos/outlet/online', {'outletId': catalog.outletId, 'paused': paused});
      ref.read(catalogProvider.notifier).set(await ref.read(engineProvider).refreshCatalog(catalog.outletId));
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    final orders = ref.watch(inboxProvider);
    final paused = ref.watch(catalogProvider)?.onlineOrdersPaused ?? false;
    final theme = Theme.of(context);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
          child: Glass(
            radius: AtasRadius.lg,
            padding: const EdgeInsets.fromLTRB(14, 10, 8, 10),
            child: Row(
              children: [
                TileIcon(paused ? LucideIcons.pauseCircle : LucideIcons.radio, tone: paused ? Tone.warning : Tone.success),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Terima order online', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                      Text(
                        paused ? 'Dijeda: customer tidak bisa order dari app' : 'Aktif, order dari app masuk ke sini',
                        style: const TextStyle(color: AtasColors.inkMuted, fontSize: 12.5),
                      ),
                    ],
                  ),
                ),
                Switch(value: !paused, onChanged: (on) => _togglePause(!on)),
              ],
            ),
          ),
        ),
        Expanded(
          child: orders.isEmpty
              ? const EmptyState(
                  icon: LucideIcons.radio,
                  title: 'Belum ada order online',
                  subtitle: 'Order baru akan berbunyi dan muncul di sini',
                )
              : ListView.builder(
                  padding: EdgeInsets.fromLTRB(16, 0, 16, MediaQuery.paddingOf(context).bottom + 16),
                  itemCount: orders.length,
                  itemBuilder: (_, index) {
                    final order = orders[index];
                    final step = nextStep(order);
                    final isNew = order['orderStatus'] == 'pending';
                    final paid = order['paymentStatus'] == 'paid';
                    final busy = _busy.contains(order['id']);
                    // The server refuses to complete an unpaid order, so the
                    // button waits for the payment.
                    final blocked = step?.$1 == 'completed' && !paid;
                    final type = order['orderType'] as String?;
                    final detail = _detail(order);

                    return SurfaceCard(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(14),
                      borderColor: isNew ? AtasColors.sun : AtasColors.line,
                      borderWidth: isNew ? 2 : 1,
                      color: isNew ? const Color(0xFFFFFCF3) : Colors.white,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              QueueBadge((order['queueNumber'] ?? order['orderNumber']) as String, highlight: isNew),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      (order['customerName'] as String?) ?? 'Customer',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                                    ),
                                    Text(
                                      clock(DateTime.parse(order['createdAt'] as String)),
                                      style: const TextStyle(color: AtasColors.inkMuted, fontSize: 12.5),
                                    ),
                                  ],
                                ),
                              ),
                              if (isNew)
                                const TonePill('BARU', tone: Tone.sun, solid: true, icon: LucideIcons.sparkles)
                              else
                                TonePill(
                                  _typeLabels[type] ?? type ?? '',
                                  tone: Tone.blue,
                                  icon: _typeIcons[type],
                                ),
                            ],
                          ),
                          if (isNew || detail != null) ...[
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                if (isNew) ...[
                                  TonePill(_typeLabels[type] ?? type ?? '', tone: Tone.blue, icon: _typeIcons[type]),
                                  const SizedBox(width: 8),
                                ],
                                if (detail != null)
                                  Expanded(
                                    child: Text(
                                      detail,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(color: AtasColors.inkMuted, fontSize: 13, fontWeight: FontWeight.w600),
                                    ),
                                  ),
                              ],
                            ),
                          ],
                          const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Divider()),
                          for (final item in (order['items'] as List).cast<Map<String, dynamic>>())
                            OrderLineText(item['quantity'] as int, item['name'] as String, const []),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Text(
                                rupiah(order['total'] as num),
                                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                              ),
                              const SizedBox(width: 8),
                              Flexible(
                                child: TonePill(
                                  paid ? 'Lunas' : 'Belum bayar · ${paymentLabel((order['paymentMethod'] ?? '-') as String)}',
                                  tone: paid ? Tone.success : Tone.danger,
                                ),
                              ),
                              const Spacer(),
                              if (!paid && order['paymentStatus'] == 'pending')
                                Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: FilledButton(
                                    style: compactButton().copyWith(
                                      backgroundColor: const WidgetStatePropertyAll(AtasColors.sun),
                                      foregroundColor: const WidgetStatePropertyAll(AtasColors.ink),
                                    ),
                                    onPressed: busy ? null : () => _pay(order),
                                    child: const Text('Bayar'),
                                  ),
                                ),
                              if (step != null)
                                FilledButton(
                                  style: compactButton(),
                                  onPressed: busy || blocked ? null : () => _advance(order, step.$1),
                                  child: Text(step.$2),
                                ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}
