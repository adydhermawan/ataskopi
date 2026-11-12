import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/theme/brand.dart';
import '../../../core/ui/atas_ui.dart';
import '../../../core/utils/format.dart';
import '../../catalog/data/catalog.dart';
import '../domain/cart.dart';

/// For anything other than the default drink. With [initial] it edits a line
/// already in the cart.
Future<CartLine?> showItemSheet(BuildContext context, Product product, String channel, {CartLine? initial}) {
  return showGlassSheet<CartLine>(
    context,
    (_) => _ItemSheet(product: product, channel: channel, initial: initial),
  );
}

class _ItemSheet extends StatefulWidget {
  const _ItemSheet({required this.product, required this.channel, this.initial});

  final Product product;
  final String channel;
  final CartLine? initial;

  @override
  State<_ItemSheet> createState() => _ItemSheetState();
}

class _ItemSheetState extends State<_ItemSheet> {
  late final Map<String, Set<String>> _picked = {
    for (final option in widget.product.options) option.id: <String>{},
  };
  final _modifiers = <String>{};
  final _notes = TextEditingController();
  int _quantity = 1;

  @override
  void initState() {
    super.initState();
    final initial = widget.initial;
    if (initial == null) {
      for (final (option, value) in defaultOptions(widget.product)) {
        _picked[option.id]!.add(value.id);
      }
      return;
    }
    for (final option in initial.options) {
      _picked[option.optionId]?.add(option.valueId);
    }
    _modifiers.addAll(initial.modifiers.map((modifier) => modifier.modifierId));
    _notes.text = initial.notes ?? '';
    _quantity = initial.quantity;
  }

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  void _toggle(ProductOption option, OptionValue value) {
    setState(() {
      final picked = _picked[option.id]!;
      if (picked.contains(value.id)) {
        if (picked.length > option.minSelect) picked.remove(value.id);
      } else {
        if (option.maxSelect <= 1) picked.clear();
        if (picked.length < option.maxSelect || option.maxSelect <= 1) picked.add(value.id);
      }
    });
  }

  CartLine _line() => buildLine(
        widget.product,
        channel: widget.channel,
        quantity: _quantity,
        notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
        options: [
          for (final option in widget.product.options)
            for (final value in option.values)
              if (_picked[option.id]!.contains(value.id)) (option, value),
        ],
        modifiers: [
          for (final modifier in widget.product.modifiers)
            if (_modifiers.contains(modifier.id)) modifier,
        ],
      );

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final line = _line();

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.88),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Flexible(
              child: ListView(
                shrinkWrap: true,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                children: [
                  Text(widget.product.name, style: theme.textTheme.headlineSmall),
                  const SizedBox(height: 2),
                  Text(
                    rupiah(widget.product.priceFor(widget.channel)),
                    style: const TextStyle(color: AtasColors.blue, fontWeight: FontWeight.w700),
                  ),
                  for (final option in widget.product.options) ...[
                    SectionLabel(option.name),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final value in option.values)
                          ChoiceChip(
                            label: Text(value.priceModifier == 0
                                ? value.name
                                : '${value.name} +${rupiah(value.priceModifier)}'),
                            selected: _picked[option.id]!.contains(value.id),
                            onSelected: (_) => _toggle(option, value),
                          ),
                      ],
                    ),
                  ],
                  if (widget.product.modifiers.isNotEmpty) ...[
                    const SectionLabel('Tambahan'),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final modifier in widget.product.modifiers)
                          FilterChip(
                            avatar: _modifiers.contains(modifier.id)
                                ? const Icon(LucideIcons.check, size: 16, color: Colors.white)
                                : null,
                            label: Text('${modifier.name} +${rupiah(modifier.price)}'),
                            selected: _modifiers.contains(modifier.id),
                            onSelected: (on) => setState(
                              () => on ? _modifiers.add(modifier.id) : _modifiers.remove(modifier.id),
                            ),
                          ),
                      ],
                    ),
                  ],
                  const SectionLabel('Catatan'),
                  TextField(
                    controller: _notes,
                    decoration: const InputDecoration(
                      hintText: 'contoh: less sugar',
                      prefixIcon: Icon(LucideIcons.stickyNote, size: 18),
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              decoration: const BoxDecoration(border: Border(top: BorderSide(color: AtasColors.line))),
              child: Row(
                children: [
                  QtyStepper(
                    large: true,
                    value: _quantity,
                    onMinus: _quantity > 1 ? () => setState(() => _quantity--) : null,
                    onPlus: () => setState(() => _quantity++),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: () => Navigator.of(context).pop(line),
                      child: Text('${widget.initial == null ? 'Tambah' : 'Simpan'} · ${rupiah(line.lineTotal)}'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
