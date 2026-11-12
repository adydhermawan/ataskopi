import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:uuid/uuid.dart';

import '../../../core/providers.dart';
import '../../../core/theme/brand.dart';
import '../../../core/ui/atas_ui.dart';
import '../../../core/utils/format.dart';
import '../../printer/data/receipt.dart';
import '../../selfie/presentation/selfie_settings_section.dart';
import '../../shift/presentation/close_shift_screen.dart';

class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  void _toast(BuildContext context, String message) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));

  /// Money in or out of the drawer needs the server shift, so it runs online.
  Future<void> _cashMovement(BuildContext context, WidgetRef ref, String type) async {
    final shift = ref.read(shiftProvider)!;
    if (!shift.isSynced) return _toast(context, 'Shift belum terkirim ke server. Coba lagi saat online.');

    final result = await showDialog<(int, String)>(
      context: context,
      builder: (_) => _AmountDialog(
        title: type == 'in' ? 'Kas masuk' : 'Kas keluar',
        askReason: true,
      ),
    );
    if (result == null || !context.mounted) return;

    try {
      await ref.read(apiProvider).post('/api/pos/shifts/${shift.serverId}/cash-movements', {
        'clientMovementId': const Uuid().v4(),
        'type': type,
        'amount': result.$1,
        'reason': result.$2,
      });
      if (context.mounted) _toast(context, 'Tercatat ${rupiah(result.$1)}');
    } catch (error) {
      if (context.mounted) _toast(context, error.toString());
    }
  }

  /// Needs the server: the form starts from the day's figures there, and the
  /// daily cash record is written as the shift closes.
  Future<void> _closeShift(BuildContext context, WidgetRef ref) async {
    await ref.read(syncLoopProvider).kick();
    final status = ref.read(syncStatusProvider);
    if (!context.mounted) return;
    if (status.unsettled > 0) {
      return _toast(context, 'Masih ada ${status.unsettled} order belum terkirim. Tunggu sampai online.');
    }

    final shift = ref.read(shiftProvider)!;
    final shiftId = shift.serverId;
    if (shiftId == null) return _toast(context, 'Shift belum terkirim ke server. Coba lagi saat online.');

    final ClosingSummary summary;
    try {
      summary = ClosingSummary.fromJson(
        await ref.read(apiProvider).get('/api/pos/shifts/$shiftId/closing') as Map<String, dynamic>,
      );
    } catch (error) {
      if (context.mounted) _toast(context, 'Data penutupan belum bisa diambil: $error');
      return;
    }
    if (!context.mounted) return;

    final closed = await Navigator.of(context).push<ClosedShift>(
      MaterialPageRoute(builder: (_) => CloseShiftScreen(shiftId: shiftId, summary: summary)),
    );
    if (closed == null || !context.mounted) return;

    final difference = closed.counted - closed.expected;
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Shift ditutup'),
        content: Text(
          'Seharusnya: ${rupiah(closed.expected)}\n'
          'Di laci: ${rupiah(closed.counted)}\n'
          'Selisih: ${difference == 0 ? 'tidak ada' : (difference > 0 ? '+' : '-') + rupiah(difference.abs())}\n\n'
          '${closed.dailyCashNote}',
        ),
        actions: [TextButton(onPressed: () => Navigator.of(dialogContext).pop(), child: const Text('OK'))],
      ),
    );

    await ref.read(appendProvider.notifier).finish();
    ref.read(tabProvider.notifier).select(0);
    await ref.read(shiftProvider.notifier).clear();
  }

  Future<void> _pickPrinter(BuildContext context, WidgetRef ref) async {
    final printers = await ref.read(printerProvider).pairedPrinters();
    if (!context.mounted) return;
    if (printers.isEmpty) {
      return _toast(context, 'Belum ada printer. Pair printer di pengaturan Bluetooth HP dulu.');
    }

    final picked = await showDialog<String>(
      context: context,
      builder: (_) => SimpleDialog(
        title: const Text('Pilih printer'),
        children: [
          for (final printer in printers)
            SimpleDialogOption(
              onPressed: () => Navigator.of(context).pop(printer.mac),
              child: ListTile(title: Text(printer.name), subtitle: Text(printer.mac)),
            ),
        ],
      ),
    );
    if (picked == null) return;

    await ref.read(printerMacProvider.notifier).set(picked);
    final printed = await ref.read(printerProvider).print(
          picked,
          buildTicket(number: 'TES', heading: 'Printer siap', lines: const [], time: DateTime.now()),
        );
    if (context.mounted) _toast(context, printed ? 'Tes print berhasil' : 'Printer tidak merespons');
  }

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    if (ref.read(syncStatusProvider).unsettled > 0) {
      return _toast(context, 'Ada order belum terkirim. Keluar setelah semuanya terkirim.');
    }
    await ref.read(authProvider).logout();
    ref.read(sessionProvider.notifier).set(null);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final shift = ref.watch(shiftProvider);
    final orders = ref.watch(ordersProvider);
    final mac = ref.watch(printerMacProvider);
    if (shift == null || session == null) return const SizedBox.shrink();

    final byMethod = <String, int>{};
    for (final payment in orders.expand((order) => order.payments)) {
      byMethod[payment.method] = (byMethod[payment.method] ?? 0) + payment.amount;
    }
    final sales = orders.fold(0, (sum, order) => sum + order.total);
    final unpaid = orders.fold(0, (sum, order) => sum + order.remaining);

    final initial = session.name.trim().isEmpty ? '?' : session.name.trim()[0].toUpperCase();
    Widget divider() => const Divider(indent: 70);

    return ListView(
      padding: EdgeInsets.fromLTRB(16, 8, 16, MediaQuery.paddingOf(context).bottom + 16),
      children: [
        Glass(
          radius: AtasRadius.lg,
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                alignment: Alignment.center,
                decoration: const BoxDecoration(gradient: AtasGradients.primary, shape: BoxShape.circle),
                child: Text(initial, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 20)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(session.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                    Text(
                      'Shift sejak ${clock(shift.openedAt)} · modal ${rupiah(shift.openingCash)}',
                      style: const TextStyle(color: AtasColors.inkMuted, fontSize: 12.5),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: AtasGradients.primary,
            borderRadius: BorderRadius.circular(AtasRadius.lg),
            boxShadow: [
              BoxShadow(color: AtasColors.blue.withValues(alpha: 0.30), blurRadius: 24, offset: const Offset(0, 10)),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Text(
                    'Penjualan shift ini',
                    style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(99),
                    ),
                    child: Text(
                      '${orders.length} order',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                rupiah(sales),
                style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w800, letterSpacing: -1),
              ),
              if (byMethod.isNotEmpty || unpaid > 0) ...[
                const SizedBox(height: 12),
                Container(height: 1, color: Colors.white.withValues(alpha: 0.15)),
                const SizedBox(height: 10),
              ],
              for (final entry in byMethod.entries)
                _SalesRow(paymentLabel(entry.key), rupiah(entry.value)),
              if (unpaid > 0) _SalesRow('Belum dibayar', rupiah(unpaid), color: AtasColors.sun),
            ],
          ),
        ),
        const SectionLabel('Perangkat'),
        SurfaceCard(
          padding: EdgeInsets.zero,
          child: ListTile(
            leading: const TileIcon(LucideIcons.printer),
            title: const Text('Printer'),
            subtitle: Text(mac ?? 'Belum dipilih'),
            trailing: const Icon(LucideIcons.chevronRight, size: 18, color: AtasColors.inkFaint),
            onTap: () => _pickPrinter(context, ref),
          ),
        ),
        const SectionLabel('Selfie'),
        const SurfaceCard(padding: EdgeInsets.zero, child: SelfieSettingsSection()),
        const SectionLabel('Kas & shift'),
        SurfaceCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              ListTile(
                leading: const TileIcon(LucideIcons.arrowDownLeft, tone: Tone.success),
                title: const Text('Kas masuk'),
                trailing: const Icon(LucideIcons.chevronRight, size: 18, color: AtasColors.inkFaint),
                onTap: () => _cashMovement(context, ref, 'in'),
              ),
              divider(),
              ListTile(
                leading: const TileIcon(LucideIcons.arrowUpRight, tone: Tone.warning),
                title: const Text('Kas keluar'),
                trailing: const Icon(LucideIcons.chevronRight, size: 18, color: AtasColors.inkFaint),
                onTap: () => _cashMovement(context, ref, 'out'),
              ),
              divider(),
              ListTile(
                leading: const TileIcon(LucideIcons.lock, tone: Tone.neutral),
                title: const Text('Tutup shift'),
                trailing: const Icon(LucideIcons.chevronRight, size: 18, color: AtasColors.inkFaint),
                onTap: () => _closeShift(context, ref),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SurfaceCard(
          padding: EdgeInsets.zero,
          child: ListTile(
            leading: const TileIcon(LucideIcons.logOut, tone: Tone.danger),
            title: const Text('Keluar', style: TextStyle(color: AtasColors.danger)),
            onTap: () => _logout(context, ref),
          ),
        ),
      ],
    );
  }
}

class _SalesRow extends StatelessWidget {
  const _SalesRow(this.label, this.value, {this.color = Colors.white});

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(child: Text(label, style: TextStyle(color: color.withValues(alpha: 0.85), fontSize: 13.5))),
          Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 13.5)),
        ],
      ),
    );
  }
}

class _AmountDialog extends StatefulWidget {
  const _AmountDialog({required this.title, this.askReason = false});

  final String title;
  final bool askReason;

  @override
  State<_AmountDialog> createState() => _AmountDialogState();
}

class _AmountDialogState extends State<_AmountDialog> {
  final _amount = TextEditingController();
  final _reason = TextEditingController();

  @override
  void dispose() {
    _amount.dispose();
    _reason.dispose();
    super.dispose();
  }

  bool get _valid =>
      int.tryParse(_amount.text) != null && (!widget.askReason || _reason.text.trim().isNotEmpty);

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _amount,
            autofocus: true,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
            decoration: const InputDecoration(prefixText: 'Rp '),
            onChanged: (_) => setState(() {}),
          ),
          if (widget.askReason) ...[
            const SizedBox(height: 12),
            TextField(
              controller: _reason,
              decoration: const InputDecoration(labelText: 'Alasan'),
              onChanged: (_) => setState(() {}),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Batal')),
        FilledButton(
          onPressed: _valid
              ? () => Navigator.of(context).pop((int.parse(_amount.text), _reason.text.trim()))
              : null,
          child: const Text('Simpan'),
        ),
      ],
    );
  }
}
