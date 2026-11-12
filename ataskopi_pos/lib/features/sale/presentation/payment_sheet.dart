import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/theme/brand.dart';
import '../../../core/ui/atas_ui.dart';
import '../../../core/utils/format.dart';
import '../../printer/data/receipt.dart';
import '../data/sale_service.dart';
import '../domain/local_order.dart';

class PaymentChoice {
  const PaymentChoice(this.payments, {this.selfie = false});

  /// Empty for "bayar nanti".
  final List<LocalPayment> payments;

  /// The customer wants a selfie strip in place of the receipt.
  final bool selfie;
}

/// Collects one or more payments. Returns null when the cashier backs out.
/// With [offerSelfie] the cashier can pick a selfie strip before paying, so
/// it prints once in place of the receipt.
Future<PaymentChoice?> showPaymentSheet(
  BuildContext context, {
  required int due,
  required String channel,
  bool allowLater = true,
  bool offerSelfie = false,
}) {
  return showGlassSheet<PaymentChoice>(
    context,
    (_) => _PaymentSheet(due: due, channel: channel, allowLater: allowLater, offerSelfie: offerSelfie),
  );
}

/// Notes a customer is likely to hand over for [due]: the next ten thousand,
/// fifty thousand and hundred thousand above it, so Rp 26.000 offers 30rb,
/// 50rb and 100rb. An exact amount is left to "Uang pas".
List<int> cashSuggestions(int due) {
  if (due <= 0) return const [];
  final notes = <int>{
    for (final step in const [10000, 50000, 100000]) (due + step - 1) ~/ step * step,
  }..removeWhere((note) => note <= due);
  return notes.toList()..sort();
}

/// "30rb" for round thousands, otherwise the full figure without "Rp".
String shortRupiah(int value) =>
    value % 1000 == 0 ? '${value ~/ 1000}rb' : rupiah(value).substring(3);

class _PaymentSheet extends StatefulWidget {
  const _PaymentSheet({
    required this.due,
    required this.channel,
    required this.allowLater,
    required this.offerSelfie,
  });

  final int due;
  final String channel;
  final bool allowLater;
  final bool offerSelfie;

  @override
  State<_PaymentSheet> createState() => _PaymentSheetState();
}

class _PaymentSheetState extends State<_PaymentSheet> {
  final _payments = <LocalPayment>[];
  final _amount = TextEditingController();
  bool _done = false;
  bool _selfie = false;

  int get _paid => _payments.fold(0, (sum, payment) => sum + payment.amount);

  int get _remaining => widget.due - _paid;

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  /// A typed amount splits the bill; otherwise the payment covers what is left.
  int get _portion {
    final typed = int.tryParse(_amount.text);
    if (typed == null || typed <= 0) return _remaining;
    return typed < _remaining ? typed : _remaining;
  }

  void _add(String method, {int? tendered}) {
    if (_done || _remaining <= 0) return;
    final portion = _portion;
    final amount = tendered != null && tendered < portion ? tendered : portion;

    setState(() {
      _payments.add(newPayment(method, amount, tendered: tendered));
      _amount.clear();
    });
    if (_remaining <= 0) _finish();
  }

  /// Cash that no suggestion covers, such as Rp 27.000 for a Rp 26.000 bill.
  Future<void> _typeTendered() async {
    final tendered = await showDialog<int>(
      context: context,
      builder: (_) => _TenderedDialog(due: _portion),
    );
    if (tendered != null && mounted) _add('cash', tendered: tendered);
  }

  void _finish() {
    if (_done) return;
    _done = true;
    Navigator.of(context).pop(PaymentChoice(List<LocalPayment>.from(_payments), selfie: _selfie));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isOjol = widget.channel != 'walk_in';

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 16 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            _paid == 0 ? 'Total tagihan' : 'Sisa tagihan',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AtasColors.inkMuted, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 2),
          Text(
            rupiah(_remaining),
            textAlign: TextAlign.center,
            style: theme.textTheme.displaySmall?.copyWith(color: AtasColors.ink),
          ),
          if (_payments.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final payment in _payments)
                  Container(
                    padding: const EdgeInsets.fromLTRB(12, 4, 4, 4),
                    decoration: BoxDecoration(
                      color: AtasColors.successSoft,
                      borderRadius: BorderRadius.circular(99),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(LucideIcons.check, size: 14, color: AtasColors.success),
                        const SizedBox(width: 6),
                        Text(
                          '${paymentLabel(payment.method)} ${rupiah(payment.amount)}',
                          style: const TextStyle(color: AtasColors.success, fontWeight: FontWeight.w700, fontSize: 13),
                        ),
                        IconButton(
                          visualDensity: VisualDensity.compact,
                          iconSize: 16,
                          color: AtasColors.success,
                          icon: const Icon(LucideIcons.x),
                          onPressed: () => setState(() => _payments.remove(payment)),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ],
          if (widget.offerSelfie) ...[
            const SizedBox(height: 14),
            Center(
              child: FilterChip(
                avatar: Icon(LucideIcons.camera, size: 16, color: _selfie ? Colors.white : AtasColors.ink),
                label: Text(_selfie ? 'Struk selfie: ya' : 'Struk selfie'),
                selected: _selfie,
                onSelected: (on) => setState(() => _selfie = on),
              ),
            ),
          ],
          const SizedBox(height: 20),
          if (isOjol)
            FilledButton.icon(
              onPressed: () => _add(widget.channel),
              style: FilledButton.styleFrom(backgroundColor: AtasColors.success),
              icon: const Icon(LucideIcons.bike, size: 20),
              label: Text('Lunas via ${paymentLabel(widget.channel)}'),
            )
          else ...[
            TextField(
              controller: _amount,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(
                labelText: 'Nominal (isi kalau dibayar sebagian)',
                prefixText: 'Rp ',
                prefixIcon: Icon(LucideIcons.split, size: 18),
              ),
              onChanged: (_) => setState(() {}),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 10, bottom: 2),
              child: Row(
                children: [
                  const Expanded(child: SectionLabel('Tunai', padding: EdgeInsets.symmetric(horizontal: 4))),
                  TextButton.icon(
                    onPressed: _typeTendered,
                    style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                    icon: const Icon(LucideIcons.keyboard, size: 16),
                    label: const Text('Nominal lain'),
                  ),
                ],
              ),
            ),
            Row(
              children: [
                Expanded(
                  child: _CashTile(
                    label: 'Uang pas',
                    caption: rupiah(_portion),
                    primary: true,
                    onTap: () => _add('cash', tendered: _portion),
                  ),
                ),
                for (final note in cashSuggestions(_portion)) ...[
                  const SizedBox(width: 8),
                  Expanded(
                    child: _CashTile(
                      label: shortRupiah(note),
                      caption: 'kembali ${shortRupiah(note - _portion)}',
                      onTap: () => _add('cash', tendered: note),
                    ),
                  ),
                ],
              ],
            ),
            const SectionLabel('Non-tunai', padding: EdgeInsets.fromLTRB(4, 18, 4, 8)),
            FilledButton.icon(
              onPressed: () => _add('qris'),
              style: FilledButton.styleFrom(backgroundColor: AtasColors.ink),
              icon: const Icon(LucideIcons.qrCode, size: 20),
              label: const Text('QRIS sudah masuk'),
            ),
          ],
          const SizedBox(height: 10),
          if (widget.allowLater)
            OutlinedButton.icon(
              onPressed: _finish,
              icon: const Icon(LucideIcons.clock, size: 18),
              label: Text(_paid == 0 ? 'Bayar nanti' : 'Simpan, sisanya nanti'),
            ),
        ],
      ),
    );
  }
}

/// Types the cash handed over and shows the change before it is saved.
/// Less than [due] is a part payment, as with the tiles.
class _TenderedDialog extends StatefulWidget {
  const _TenderedDialog({required this.due});

  final int due;

  @override
  State<_TenderedDialog> createState() => _TenderedDialogState();
}

class _TenderedDialogState extends State<_TenderedDialog> {
  final _amount = TextEditingController();

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  int? get _tendered {
    final value = int.tryParse(_amount.text);
    return value == null || value <= 0 ? null : value;
  }

  void _save() {
    final tendered = _tendered;
    if (tendered != null) Navigator.of(context).pop(tendered);
  }

  @override
  Widget build(BuildContext context) {
    final tendered = _tendered;
    final String hint;
    final Color hintColor;
    if (tendered == null) {
      hint = 'Tagihan ${rupiah(widget.due)}';
      hintColor = AtasColors.inkMuted;
    } else if (tendered >= widget.due) {
      hint = 'Kembali ${rupiah(tendered - widget.due)}';
      hintColor = AtasColors.success;
    } else {
      hint = 'Kurang ${rupiah(widget.due - tendered)}, dicatat bayar sebagian';
      hintColor = AtasColors.inkMuted;
    }

    return AlertDialog(
      title: const Text('Uang diterima'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _amount,
            autofocus: true,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
            decoration: const InputDecoration(prefixText: 'Rp '),
            onChanged: (_) => setState(() {}),
            onSubmitted: (_) => _save(),
          ),
          const SizedBox(height: 10),
          Text(hint, style: TextStyle(color: hintColor, fontWeight: FontWeight.w700)),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Batal')),
        FilledButton(onPressed: tendered == null ? null : _save, child: const Text('Simpan')),
      ],
    );
  }
}

class _CashTile extends StatelessWidget {
  const _CashTile({required this.label, required this.caption, required this.onTap, this.primary = false});

  final String label;
  final String caption;
  final VoidCallback onTap;
  final bool primary;

  @override
  Widget build(BuildContext context) {
    final fg = primary ? Colors.white : AtasColors.blueDeep;
    return Material(
      color: primary ? AtasColors.blue : AtasColors.sky,
      borderRadius: BorderRadius.circular(AtasRadius.md),
      child: InkWell(
        borderRadius: BorderRadius.circular(AtasRadius.md),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
          child: Column(
            children: [
              Icon(LucideIcons.banknote, size: 20, color: fg),
              const SizedBox(height: 6),
              Text(label, style: TextStyle(color: fg, fontWeight: FontWeight.w800, fontSize: 15)),
              Text(
                caption,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: fg.withValues(alpha: 0.75), fontSize: 11.5, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
