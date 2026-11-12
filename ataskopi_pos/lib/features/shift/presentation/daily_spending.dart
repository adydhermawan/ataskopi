import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/theme/brand.dart';
import '../../../core/ui/atas_ui.dart';
import '../../../core/utils/format.dart';

/// Same categories as the admin's daily cash form.
const expenseCategories = {
  'OPERATIONAL': 'Operasional',
  'SALARY': 'Gaji Karyawan',
  'UTILITY': 'Utilitas (Listrik/Air/Gas)',
  'RENT': 'Sewa Tempat',
  'OTHER': 'Lain-lain',
};

num _num(Object? value) => (value as num?) ?? 0;

/// "1,5" or "1.5" from a phone keyboard.
double? parseQuantity(String text) => double.tryParse(text.trim().replaceAll(',', '.'));

String _quantity(num value) => value == value.roundToDouble() ? '${value.round()}' : '$value'.replaceAll('.', ',');

class DayPurchase {
  DayPurchase.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        name = json['rawMaterialName'] as String,
        unit = json['unit'] as String,
        quantity = _num(json['quantity']),
        unitPrice = _num(json['unitPrice']).round(),
        total = _num(json['totalAmount']).round(),
        supplier = json['supplier'] as String?;

  final String id;
  final String name;
  final String unit;
  final num quantity;
  final int unitPrice;
  final int total;
  final String? supplier;
}

class DayExpense {
  DayExpense.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        category = json['category'] as String,
        amount = _num(json['amount']).round(),
        description = json['description'] as String?;

  final String id;
  final String category;
  final int amount;
  final String? description;
}

class RawMaterialRef {
  RawMaterialRef.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        name = json['name'] as String,
        unit = json['unit'] as String,
        averageCost = _num(json['averageCost']).round();

  final String id;
  final String name;
  final String unit;
  final int averageCost;
}

/// One section of the closing form: "Belanja Harian" or "Pengeluaran Harian".
class SpendingSection extends StatelessWidget {
  const SpendingSection({
    super.key,
    required this.title,
    required this.caption,
    required this.icon,
    required this.color,
    required this.addLabel,
    required this.onAdd,
    required this.children,
    this.busy = false,
  });

  final String title;
  final String caption;
  final IconData icon;
  final Color color;
  final String addLabel;
  final VoidCallback onAdd;
  final List<Widget> children;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      margin: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: color),
              const SizedBox(width: 8),
              Expanded(child: Text(title, style: TextStyle(fontWeight: FontWeight.w800, color: color))),
            ],
          ),
          const SizedBox(height: 2),
          Text(caption, style: const TextStyle(color: AtasColors.inkMuted, fontSize: 12.5)),
          const SizedBox(height: 10),
          ...children,
          if (children.isEmpty)
            const Padding(
              padding: EdgeInsets.only(bottom: 8),
              child: Text('Belum ada', style: TextStyle(color: AtasColors.inkFaint, fontSize: 13)),
            ),
          OutlinedButton.icon(
            onPressed: busy ? null : onAdd,
            style: OutlinedButton.styleFrom(foregroundColor: color, side: BorderSide(color: color.withValues(alpha: 0.5))),
            icon: const Icon(LucideIcons.plus, size: 16),
            label: Text(addLabel),
          ),
        ],
      ),
    );
  }
}

class SpendingTile extends StatelessWidget {
  const SpendingTile({
    super.key,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.color,
    required this.onDelete,
  });

  final String title;
  final String subtitle;
  final int amount;
  final Color color;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.fromLTRB(12, 8, 4, 8),
      decoration: BoxDecoration(
        border: Border.all(color: AtasColors.line),
        borderRadius: BorderRadius.circular(AtasRadius.md),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                if (subtitle.isNotEmpty)
                  Text(subtitle, style: const TextStyle(color: AtasColors.inkMuted, fontSize: 12.5)),
              ],
            ),
          ),
          Text(rupiah(amount), style: TextStyle(color: color, fontWeight: FontWeight.w800)),
          IconButton(
            onPressed: onDelete,
            color: AtasColors.danger,
            icon: const Icon(LucideIcons.trash2, size: 18),
            tooltip: 'Hapus',
          ),
        ],
      ),
    );
  }
}

String purchaseSubtitle(DayPurchase p) =>
    ['${_quantity(p.quantity)} ${p.unit} @ ${rupiah(p.unitPrice)}', if (p.supplier?.isNotEmpty == true) p.supplier!]
        .join(' · ');

/// Asks before removing a saved purchase or expense.
Future<bool> confirmDelete(BuildContext context, String message) async =>
    await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Hapus?'),
        content: Text(message),
        actions: [
          TextButton(onPressed: () => Navigator.of(dialogContext).pop(false), child: const Text('Batal')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AtasColors.danger),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Hapus'),
          ),
        ],
      ),
    ) ??
    false;

/// Collects one cash purchase. Returns the request body, or null.
Future<Map<String, dynamic>?> showPurchaseSheet(BuildContext context, List<RawMaterialRef> materials) =>
    showGlassSheet<Map<String, dynamic>>(context, (_) => _PurchaseSheet(materials: materials));

class _PurchaseSheet extends StatefulWidget {
  const _PurchaseSheet({required this.materials});

  final List<RawMaterialRef> materials;

  @override
  State<_PurchaseSheet> createState() => _PurchaseSheetState();
}

class _PurchaseSheetState extends State<_PurchaseSheet> {
  RawMaterialRef? _material;
  final _qty = TextEditingController();
  final _price = TextEditingController();
  final _total = TextEditingController();
  final _supplier = TextEditingController();
  final _notes = TextEditingController();

  /// The total follows quantity × price until the cashier types it.
  bool _totalTyped = false;

  @override
  void dispose() {
    for (final controller in [_qty, _price, _total, _supplier, _notes]) {
      controller.dispose();
    }
    super.dispose();
  }

  void _recalculate() {
    final qty = parseQuantity(_qty.text);
    final price = int.tryParse(_price.text);
    if (!_totalTyped && qty != null && price != null) _total.text = '${(qty * price).round()}';
    setState(() {});
  }

  Future<void> _pickMaterial() async {
    final picked = await showDialog<RawMaterialRef>(
      context: context,
      builder: (_) => _MaterialPicker(materials: widget.materials),
    );
    if (picked != null) setState(() => _material = picked);
  }

  bool get _valid =>
      _material != null && (parseQuantity(_qty.text) ?? 0) > 0 && (int.tryParse(_total.text) ?? 0) > 0;

  void _save() {
    if (!_valid) return;
    Navigator.of(context).pop({
      'rawMaterialId': _material!.id,
      'quantity': parseQuantity(_qty.text),
      if ((int.tryParse(_price.text) ?? 0) > 0) 'unitPrice': int.parse(_price.text),
      'totalAmount': int.parse(_total.text),
      if (_supplier.text.trim().isNotEmpty) 'supplier': _supplier.text.trim(),
      if (_notes.text.trim().isNotEmpty) 'notes': _notes.text.trim(),
    });
  }

  @override
  Widget build(BuildContext context) {
    final material = _material;
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 16 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Tambah belanja (cash)', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 4),
          const Text(
            'Masuk ke menu Pembelian dan menambah stok bahan baku.',
            style: TextStyle(color: AtasColors.inkMuted, fontSize: 12.5),
          ),
          const SizedBox(height: 14),
          InkWell(
            onTap: _pickMaterial,
            borderRadius: BorderRadius.circular(AtasRadius.md),
            child: InputDecorator(
              decoration: const InputDecoration(
                labelText: 'Bahan baku *',
                prefixIcon: Icon(LucideIcons.package, size: 18),
                suffixIcon: Icon(LucideIcons.chevronDown, size: 18),
              ),
              child: Text(material == null ? 'Pilih bahan baku' : '${material.name} (${material.unit})'),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _qty,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
                  decoration: InputDecoration(labelText: 'Jumlah *', suffixText: material?.unit),
                  onChanged: (_) => _recalculate(),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: _price,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: const InputDecoration(labelText: 'Harga satuan', prefixText: 'Rp '),
                  onChanged: (_) => _recalculate(),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _total,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            decoration: const InputDecoration(labelText: 'Total harga *', prefixText: 'Rp '),
            onChanged: (_) => setState(() => _totalTyped = true),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _supplier,
            decoration: const InputDecoration(labelText: 'Toko / supplier (opsional)'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _notes,
            decoration: const InputDecoration(labelText: 'Catatan (opsional)'),
          ),
          const SizedBox(height: 16),
          FilledButton(onPressed: _valid ? _save : null, child: const Text('Simpan belanja')),
        ],
      ),
    );
  }
}

class _MaterialPicker extends StatefulWidget {
  const _MaterialPicker({required this.materials});

  final List<RawMaterialRef> materials;

  @override
  State<_MaterialPicker> createState() => _MaterialPickerState();
}

class _MaterialPickerState extends State<_MaterialPicker> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final query = _query.trim().toLowerCase();
    final shown = widget.materials.where((m) => m.name.toLowerCase().contains(query)).toList();

    return AlertDialog(
      title: const Text('Pilih bahan baku'),
      contentPadding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      content: SizedBox(
        width: double.maxFinite,
        height: MediaQuery.sizeOf(context).height * 0.55,
        child: Column(
          children: [
            TextField(
              autofocus: true,
              decoration: const InputDecoration(hintText: 'Cari', prefixIcon: Icon(LucideIcons.search, size: 18)),
              onChanged: (value) => setState(() => _query = value),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: shown.isEmpty
                  ? const Center(child: Text('Tidak ditemukan', style: TextStyle(color: AtasColors.inkMuted)))
                  : ListView.builder(
                      itemCount: shown.length,
                      itemBuilder: (_, index) {
                        final material = shown[index];
                        return ListTile(
                          title: Text(material.name),
                          subtitle: Text(material.unit),
                          onTap: () => Navigator.of(context).pop(material),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
      actions: [TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Batal'))],
    );
  }
}

/// Collects one cash expense. Returns the request body, or null.
Future<Map<String, dynamic>?> showExpenseSheet(BuildContext context) =>
    showGlassSheet<Map<String, dynamic>>(context, (_) => const _ExpenseSheet());

class _ExpenseSheet extends StatefulWidget {
  const _ExpenseSheet();

  @override
  State<_ExpenseSheet> createState() => _ExpenseSheetState();
}

class _ExpenseSheetState extends State<_ExpenseSheet> {
  String _category = 'OPERATIONAL';
  final _amount = TextEditingController();
  final _description = TextEditingController();

  @override
  void dispose() {
    _amount.dispose();
    _description.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final amount = int.tryParse(_amount.text) ?? 0;
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 16 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Tambah pengeluaran (cash)', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 4),
          const Text('Masuk ke menu Pengeluaran.', style: TextStyle(color: AtasColors.inkMuted, fontSize: 12.5)),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            value: _category,
            decoration: const InputDecoration(labelText: 'Kategori *'),
            items: [
              for (final entry in expenseCategories.entries)
                DropdownMenuItem(value: entry.key, child: Text(entry.value)),
            ],
            onChanged: (value) => setState(() => _category = value ?? _category),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _amount,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            decoration: const InputDecoration(labelText: 'Jumlah *', prefixText: 'Rp '),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _description,
            decoration: const InputDecoration(labelText: 'Keterangan (opsional)', hintText: 'Misal: sampah, parkir'),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: amount > 0
                ? () => Navigator.of(context).pop({
                      'category': _category,
                      'amount': amount,
                      if (_description.text.trim().isNotEmpty) 'description': _description.text.trim(),
                    })
                : null,
            child: const Text('Simpan pengeluaran'),
          ),
        ],
      ),
    );
  }
}
