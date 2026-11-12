import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/providers.dart';
import '../../../core/theme/brand.dart';
import '../../../core/ui/atas_ui.dart';
import '../../../core/utils/format.dart';
import '../../printer/data/receipt.dart';
import 'daily_spending.dart';

int _int(Object? value) => (value as num?)?.round() ?? 0;

/// What the server knows at closing time: this shift's drawer, and the whole
/// day's takings for the daily cash record.
class ClosingSummary {
  ClosingSummary.fromJson(Map<String, dynamic> json)
      : date = json['date'] as String,
        openingCash = _int((json['shift'] as Map)['openingCash']),
        expectedCash = _int((json['shift'] as Map)['expectedCash']),
        cashIn = _int(json['cashIn']),
        cashOut = _int(json['cashOut']),
        daySales = {
          for (final entry in (json['daySales'] as Map<String, dynamic>).entries) entry.key: _int(entry.value),
        },
        cashPurchases = _int(json['cashPurchases']),
        cashExpenses = _int(json['cashExpenses']),
        suggested = json['suggested'] as Map<String, dynamic>,
        existing = json['existing'] as Map<String, dynamic>?,
        purchases = [
          for (final row in (json['purchases'] as List? ?? const [])) DayPurchase.fromJson(row as Map<String, dynamic>),
        ],
        expenses = [
          for (final row in (json['expenses'] as List? ?? const [])) DayExpense.fromJson(row as Map<String, dynamic>),
        ],
        materials = [
          for (final row in (json['rawMaterials'] as List? ?? const []))
            RawMaterialRef.fromJson(row as Map<String, dynamic>),
        ];

  final String date;
  final int openingCash;
  final int expectedCash;
  final int cashIn;
  final int cashOut;
  final Map<String, int> daySales;
  final int cashPurchases;
  final int cashExpenses;
  final Map<String, dynamic> suggested;
  final Map<String, dynamic>? existing;
  final List<DayPurchase> purchases;
  final List<DayExpense> expenses;
  final List<RawMaterialRef> materials;

  bool get recordClosed => existing?['isClosed'] == true;
}

/// Returned once the shift is closed on the server.
class ClosedShift {
  const ClosedShift({required this.expected, required this.counted, required this.dailyCashNote});

  final int expected;
  final int counted;
  final String dailyCashNote;
}

/// Closes the shift and writes the day's "Catatan Kas Harian" in one step.
/// Every figure starts from the day's transactions and can be corrected to
/// the money actually there.
class CloseShiftScreen extends ConsumerStatefulWidget {
  const CloseShiftScreen({super.key, required this.shiftId, required this.summary});

  final String shiftId;
  final ClosingSummary summary;

  @override
  ConsumerState<CloseShiftScreen> createState() => _CloseShiftScreenState();
}

class _CloseShiftScreenState extends ConsumerState<CloseShiftScreen> {
  late ClosingSummary _s = widget.summary;
  late final _drawer = _money(_s.expectedCash);
  late final _cash = _money(_int(_s.suggested['cashAmount']));
  late final _qris = _money(_int(_s.suggested['qrisAmount']));
  late final _other = _money(_int(_s.suggested['otherAmount']));
  late final _otherName = TextEditingController(text: _s.suggested['otherMethodName'] as String? ?? '');
  final _notes = TextEditingController();
  bool _busy = false;
  String? _error;

  /// Once the cashier types the cash figure, new shopping no longer moves it.
  bool _cashTyped = false;

  static TextEditingController _money(int value) => TextEditingController(text: value == 0 ? '' : '$value');

  static int _read(TextEditingController controller) => int.tryParse(controller.text) ?? 0;

  @override
  void dispose() {
    for (final controller in [_drawer, _cash, _qris, _other, _otherName, _notes]) {
      controller.dispose();
    }
    super.dispose();
  }

  /// Shopping and expenses are saved at once, and the cash figure follows.
  Future<void> _spend(Future<dynamic> Function() request, String done) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final summary = ClosingSummary.fromJson(await request() as Map<String, dynamic>);
      if (!mounted) return;
      setState(() {
        _s = summary;
        if (!_cashTyped) {
          final cash = _int(summary.suggested['cashAmount']);
          _cash.text = cash == 0 ? '' : '$cash';
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(done)));
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String get _base => '/api/pos/shifts/${widget.shiftId}';

  Future<void> _addPurchase() async {
    if (_s.materials.isEmpty) {
      setState(() => _error = 'Belum ada bahan baku di outlet ini. Tambahkan dulu di admin.');
      return;
    }
    final body = await showPurchaseSheet(context, _s.materials);
    if (body == null || !mounted) return;
    await _spend(() => ref.read(apiProvider).post('$_base/purchases', body), 'Belanja tersimpan, stok bertambah');
  }

  Future<void> _deletePurchase(DayPurchase purchase) async {
    if (!await confirmDelete(context, 'Hapus belanja ${purchase.name}? Stok yang bertambah akan dikurangi lagi.')) {
      return;
    }
    await _spend(() => ref.read(apiProvider).delete('$_base/purchases/${purchase.id}'), 'Belanja dihapus');
  }

  Future<void> _addExpense() async {
    final body = await showExpenseSheet(context);
    if (body == null || !mounted) return;
    await _spend(() => ref.read(apiProvider).post('$_base/expenses', body), 'Pengeluaran tersimpan');
  }

  Future<void> _deleteExpense(DayExpense expense) async {
    if (!await confirmDelete(context, 'Hapus pengeluaran ${rupiah(expense.amount)}?')) return;
    await _spend(() => ref.read(apiProvider).delete('$_base/expenses/${expense.id}'), 'Pengeluaran dihapus');
  }

  Future<void> _close() async {
    if (_drawer.text.isEmpty) {
      setState(() => _error = 'Isi uang di laci dulu, walau Rp 0.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });

    final other = _read(_other);
    try {
      final closed = await ref.read(apiProvider).patch('/api/pos/shifts/${widget.shiftId}', {
        'actualCash': _read(_drawer),
        if (!_s.recordClosed)
          'dailyCash': {
            'cashAmount': _read(_cash),
            'qrisAmount': _read(_qris),
            'otherAmount': other,
            'otherMethodName': other > 0 && _otherName.text.trim().isNotEmpty ? _otherName.text.trim() : null,
            'notes': _notes.text.trim().isEmpty ? null : _notes.text.trim(),
          },
      }) as Map<String, dynamic>;

      final daily = closed['dailyCash'] as Map<String, dynamic>?;
      final note = daily == null
          ? 'Catatan kas harian tidak diubah (sudah ditutup admin).'
          : daily['saved'] == true
              ? 'Catatan kas harian ${_dateLabel(_s.date)} tersimpan.'
              : daily['error'] as String? ?? 'Catatan kas harian tidak tersimpan.';

      if (!mounted) return;
      Navigator.of(context).pop(ClosedShift(
        expected: _int(closed['expectedCash']),
        counted: _read(_drawer),
        dailyCashNote: note,
      ));
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final drawer = _read(_drawer);
    final difference = drawer - _s.expectedCash;
    final total = _read(_cash) + _read(_qris) + _read(_other);
    final gross = total + _s.cashPurchases + _s.cashExpenses;
    final cashSales = _s.daySales['cash'] ?? 0;
    final existing = _s.existing;

    return AtasBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(title: const Text('Tutup shift')),
        body: ListView(
          padding: EdgeInsets.fromLTRB(16, 4, 16, MediaQuery.paddingOf(context).bottom + 24),
          children: [
            const SectionLabel('Laci kasir'),
            SurfaceCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _Row('Modal awal', _s.openingCash),
                  _Row('Tunai masuk shift ini', _s.expectedCash - _s.openingCash - _s.cashIn + _s.cashOut),
                  if (_s.cashIn > 0) _Row('Kas masuk', _s.cashIn),
                  if (_s.cashOut > 0) _Row('Kas keluar', -_s.cashOut),
                  const Divider(height: 20),
                  _Row('Seharusnya di laci', _s.expectedCash, bold: true),
                  const SizedBox(height: 12),
                  _MoneyField(
                    controller: _drawer,
                    label: 'Uang di laci sekarang',
                    icon: LucideIcons.wallet,
                    big: true,
                    onChanged: () => setState(() {}),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    difference == 0
                        ? 'Pas, tidak ada selisih'
                        : 'Selisih ${difference > 0 ? '+' : '-'}${rupiah(difference.abs())}',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: difference == 0 ? AtasColors.success : AtasColors.warning,
                    ),
                  ),
                ],
              ),
            ),
            SectionLabel('Catatan Kas Harian · ${_dateLabel(_s.date)}'),
            if (_s.recordClosed)
              const _Notice(
                'Catatan kas tanggal ini sudah ditutup admin, jadi tidak diubah. Shift tetap bisa ditutup.',
                tone: Tone.warning,
              )
            else if (existing != null)
              _Notice(
                'Sudah ada catatan untuk tanggal ini (total '
                '${rupiah(_int(existing['cashAmount']) + _int(existing['qrisAmount']) + _int(existing['otherAmount']))}). '
                'Angka di bawah sudah mencakup semua shift hari ini dan akan menggantinya.',
              ),
            if (!_s.recordClosed) ...[
              SpendingSection(
                title: 'Belanja Harian / Nota Kasir (Cash)',
                caption: 'Otomatis masuk ke menu Pembelian dan menambah stok.',
                icon: LucideIcons.shoppingCart,
                color: AtasColors.danger,
                addLabel: 'Tambah belanja',
                busy: _busy,
                onAdd: _addPurchase,
                children: [
                  for (final purchase in _s.purchases)
                    SpendingTile(
                      title: purchase.name,
                      subtitle: purchaseSubtitle(purchase),
                      amount: purchase.total,
                      color: AtasColors.danger,
                      onDelete: _busy ? null : () => _deletePurchase(purchase),
                    ),
                ],
              ),
              SpendingSection(
                title: 'Pengeluaran Harian (Cash)',
                caption: 'Otomatis masuk ke menu Pengeluaran.',
                icon: LucideIcons.receipt,
                color: AtasColors.warning,
                addLabel: 'Tambah pengeluaran',
                busy: _busy,
                onAdd: _addExpense,
                children: [
                  for (final expense in _s.expenses)
                    SpendingTile(
                      title: expenseCategories[expense.category] ?? expense.category,
                      subtitle: expense.description ?? '',
                      amount: expense.amount,
                      color: AtasColors.warning,
                      onDelete: _busy ? null : () => _deleteExpense(expense),
                    ),
                ],
              ),
            ],
            if (!_s.recordClosed)
              SurfaceCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _Row('Penjualan tunai hari ini', cashSales),
                    if (_s.cashPurchases > 0) _Row('Belanja bahan baku (cash)', -_s.cashPurchases),
                    if (_s.cashExpenses > 0) _Row('Pengeluaran (cash)', -_s.cashExpenses),
                    const SizedBox(height: 12),
                    _MoneyField(
                      controller: _cash,
                      label: 'Kas tunai bersih',
                      helper: 'Penjualan tunai − belanja − pengeluaran. Sesuaikan kalau uang nyatanya beda',
                      icon: LucideIcons.banknote,
                      onChanged: () => setState(() => _cashTyped = true),
                    ),
                    const SizedBox(height: 12),
                    _MoneyField(
                      controller: _qris,
                      label: 'Penjualan QRIS',
                      helper: 'Dari transaksi: ${rupiah(_s.daySales['qris'] ?? 0)}. Cocokkan dengan mutasi QRIS',
                      icon: LucideIcons.qrCode,
                      onChanged: () => setState(() {}),
                    ),
                    const SizedBox(height: 12),
                    _MoneyField(
                      controller: _other,
                      label: 'Lain-lain (opsional)',
                      icon: LucideIcons.bike,
                      onChanged: () => setState(() {}),
                    ),
                    if (_read(_other) > 0) ...[
                      const SizedBox(height: 12),
                      TextField(
                        controller: _otherName,
                        decoration: const InputDecoration(
                          labelText: 'Nama metode lain',
                          hintText: 'Misal: ShopeeFood, Grab',
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    TextField(
                      controller: _notes,
                      maxLength: 500,
                      decoration: const InputDecoration(labelText: 'Catatan (opsional)'),
                    ),
                    const Divider(height: 20),
                    _Row('Total setor', total, bold: true),
                    if (_s.cashPurchases + _s.cashExpenses > 0)
                      _Row('Omset kotor (+ belanja & pengeluaran)', gross),
                  ],
                ),
              ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: AtasColors.danger, fontWeight: FontWeight.w600)),
            ],
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: _busy ? null : _close,
              icon: const Icon(LucideIcons.lock, size: 18),
              label: Text(_busy
                  ? 'Menutup...'
                  : _s.recordClosed
                      ? 'Tutup shift'
                      : 'Tutup shift & simpan kas harian'),
            ),
            const SizedBox(height: 8),
            Text(
              'Penjualan hari ini: ${_s.daySales.entries.where((e) => e.value != 0).map((e) => '${paymentLabel(e.key)} ${rupiah(e.value)}').join(' · ')}',
              style: theme.textTheme.bodySmall?.copyWith(color: AtasColors.inkMuted),
            ),
          ],
        ),
      ),
    );
  }
}

String _dateLabel(String date) => DateFormat('dd/MM/yyyy').format(DateTime.parse(date));

class _Row extends StatelessWidget {
  const _Row(this.label, this.amount, {this.bold = false});

  final String label;
  final int amount;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
      color: bold ? AtasColors.ink : AtasColors.inkMuted,
      fontSize: bold ? 15 : 14,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(
            amount < 0 ? '-${rupiah(-amount)}' : rupiah(amount),
            style: style.copyWith(color: amount < 0 ? AtasColors.danger : AtasColors.ink),
          ),
        ],
      ),
    );
  }
}

class _MoneyField extends StatelessWidget {
  const _MoneyField({
    required this.controller,
    required this.label,
    required this.icon,
    required this.onChanged,
    this.helper,
    this.big = false,
  });

  final TextEditingController controller;
  final String label;
  final String? helper;
  final IconData icon;
  final bool big;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      style: big ? const TextStyle(fontSize: 22, fontWeight: FontWeight.w800) : null,
      decoration: InputDecoration(
        labelText: label,
        helperText: helper,
        helperMaxLines: 2,
        prefixText: 'Rp ',
        prefixIcon: Icon(icon, size: 18),
      ),
      onChanged: (_) => onChanged(),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice(this.text, {this.tone = Tone.blue});

  final String text;
  final Tone tone;

  @override
  Widget build(BuildContext context) {
    final warning = tone == Tone.warning;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: warning ? AtasColors.sun.withValues(alpha: 0.25) : AtasColors.sky,
        borderRadius: BorderRadius.circular(AtasRadius.md),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(warning ? LucideIcons.alertTriangle : LucideIcons.info, size: 18, color: AtasColors.ink),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }
}
