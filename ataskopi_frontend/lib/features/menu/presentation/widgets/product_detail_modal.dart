import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:intl/intl.dart';
import 'package:ataskopi_frontend/core/providers/tenant_provider.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';
import 'package:ataskopi_frontend/features/order/presentation/providers/order_providers.dart' as order;

class ProductDetailModal extends ConsumerStatefulWidget {
  final Product product;

  const ProductDetailModal({super.key, required this.product});

  static void show(BuildContext context, Product product) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent, // Important for rounds
      builder: (context) => ProductDetailModal(product: product),
    );
  }

  @override
  ConsumerState<ProductDetailModal> createState() => _ProductDetailModalState();
}

class _ProductDetailModalState extends ConsumerState<ProductDetailModal> {
  int _quantity = 1;
  final Map<String, ProductOptionValue> _selectedOptions = {};
  final List<ProductModifier> _selectedModifiers = [];
  final TextEditingController _notesController = TextEditingController();
  final _currencyFormat = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _initializeDefaultOptions();
  }

  void _initializeDefaultOptions() {
    for (final option in widget.product.options) {
      if (option.values.isNotEmpty) {
        final defaultValue = option.values.firstWhere(
          (v) => v.isDefault,
          orElse: () => option.values.first,
        );
        _selectedOptions[option.id] = defaultValue;
      }
    }
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  double get _subtotal {
    double price = widget.product.basePrice;
    for (final val in _selectedOptions.values) price += val.priceModifier;
    for (final mod in _selectedModifiers) price += mod.price;
    return price * _quantity;
  }

  void _addToCart() {
    final cartItem = order.CartItem(
      product: widget.product,
      selectedOptions: _selectedOptions.values.toList(),
      selectedModifiers: _selectedModifiers,
      quantity: _quantity,
      notes: _notesController.text.isNotEmpty ? _notesController.text : null,
    );
    ref.read(order.cartProvider.notifier).addItem(cartItem);
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('${widget.product.name} ditambahkan')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantProvider);

    return Container(
      height: 0.85.sh, // Modal height
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
      ),
      child: Column(
        children: [
          // Handle
          Center(
            child: Container(
              margin: EdgeInsets.symmetric(vertical: 12.h),
              width: 40.w,
              height: 4.h,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2.r),
              ),
            ),
          ),

          // Content
          Expanded(
            child: ListView(
              padding: EdgeInsets.fromLTRB(20.w, 0, 20.w, 20.h),
              children: [
                // Image
                if (widget.product.imageUrl != null)
                  Container(
                    height: 160.h,
                    width: double.infinity,
                    margin: EdgeInsets.only(bottom: 16.h),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16.r),
                      image: DecorationImage(
                        image: NetworkImage(widget.product.imageUrl!),
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),

                // Name & Price
                Text(
                  widget.product.name,
                  style: TextStyle(fontSize: 20.sp, fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 6.h),
                Text(
                  widget.product.description,
                  style: TextStyle(fontSize: 13.sp, color: Colors.grey[600]),
                ),

                SizedBox(height: 16.h),

                // Options
                ...widget.product.options.map((option) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("Pilih ${option.name}", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14.sp)),
                    SizedBox(height: 8.h),
                    Wrap(
                      spacing: 8.w,
                      runSpacing: 8.h,
                      children: option.values.map((val) {
                        final selected = _selectedOptions[option.id]?.id == val.id;
                        return ChoiceChip(
                          label: Text(val.name),
                          selected: selected,
                          onSelected: (_) => setState(() => _selectedOptions[option.id] = val),
                          selectedColor: tenant.primaryColor.withOpacity(0.2),
                          labelStyle: TextStyle(
                            color: selected ? tenant.primaryColor : Colors.black,
                            fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                          ),
                          backgroundColor: Colors.white,
                        );
                      }).toList(),
                    ),
                    SizedBox(height: 20.h),
                  ],
                )),

                if (widget.product.modifiers.isNotEmpty) ...[
                  Text("Tambahan", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14.sp)),
                  SizedBox(height: 8.h),
                  ...widget.product.modifiers.map((mod) {
                    final selected = _selectedModifiers.any((m) => m.id == mod.id);
                    return CheckboxListTile(
                      title: Text(mod.name),
                      subtitle: Text('+${_currencyFormat.format(mod.price)}'),
                      value: selected,
                      activeColor: tenant.primaryColor,
                      contentPadding: EdgeInsets.zero,
                      onChanged: (_) {
                        setState(() {
                          if (selected) {
                            _selectedModifiers.removeWhere((m) => m.id == mod.id);
                          } else {
                            _selectedModifiers.add(mod);
                          }
                        });
                      },
                    );
                  }),
                ]
              ],
            ),
          ),

          // Bottom Bar (Fixed)
          Container(
            padding: EdgeInsets.all(16.w),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -5),
                )
              ],
            ),
            child: SafeArea(
              top: false,
              child: Column(
                children: [
                   // Quantity Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton.filledTonal(
                        onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                        icon: const Icon(Icons.remove),
                      ),
                      SizedBox(width: 16.w),
                      Text(
                        '$_quantity',
                        style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.bold),
                      ),
                      SizedBox(width: 16.w),
                      IconButton.filledTonal(
                        onPressed: () => setState(() => _quantity++),
                        icon: const Icon(Icons.add),
                      ),
                    ],
                  ),
                  
                  SizedBox(height: 16.h),

                  // Add Button
                  SizedBox(
                    width: double.infinity,
                    height: 48.h,
                    child: ElevatedButton(
                      onPressed: _addToCart,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: tenant.primaryColor,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Tambah Pesanan", style: TextStyle(fontWeight: FontWeight.bold)),
                          Text(_currencyFormat.format(_subtotal), style: const TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
