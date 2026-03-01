import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:intl/intl.dart';
import 'package:ataskopi_frontend/core/providers/tenant_provider.dart';
import 'package:ataskopi_frontend/shared/widgets/app_top_bar.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';
import 'package:ataskopi_frontend/features/checkout/presentation/screens/checkout_summary_screen.dart';
import 'package:ataskopi_frontend/features/menu/presentation/widgets/product_detail_modal.dart';
import 'package:ataskopi_frontend/features/menu/presentation/providers/menu_providers.dart';
import 'package:ataskopi_frontend/features/order/presentation/providers/order_providers.dart' as order;

class MenuCatalogScreen extends ConsumerStatefulWidget {
  const MenuCatalogScreen({super.key});

  @override
  ConsumerState<MenuCatalogScreen> createState() => _MenuCatalogScreenState();
}

class _MenuCatalogScreenState extends ConsumerState<MenuCatalogScreen> {
  String? _selectedCategoryId;
  final _currencyFormat = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantProvider);
    final cart = ref.watch(order.cartProvider);
    final categoriesAsync = ref.watch(categoriesProvider);
    final productsAsync = ref.watch(productsByCategoryProvider(_selectedCategoryId));

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppTopBar(
        title: 'Menu Utama',
        onBackPressed: () => Navigator.pop(context),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Search Bar
          Padding(
            padding: EdgeInsets.fromLTRB(16.w, 16.h, 16.w, 8.h),
            child: TextField(
              onChanged: (val) => ref.read(searchQueryProvider.notifier).state = val,
              decoration: InputDecoration(
                hintText: 'Cari menu...',
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: Colors.white,
                contentPadding: EdgeInsets.symmetric(horizontal: 16.w),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12.r),
                  borderSide: BorderSide.none,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12.r),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),

          // 2. Categories
          SizedBox(
            height: 40.h,
            child: categoriesAsync.when(
              data: (categories) => ListView.separated(
                padding: EdgeInsets.symmetric(horizontal: 16.w),
                scrollDirection: Axis.horizontal,
                itemCount: categories.length + 1,
                separatorBuilder: (_, __) => SizedBox(width: 8.w),
                itemBuilder: (context, index) {
                  final isAll = index == 0;
                  final category = isAll ? null : categories[index - 1];
                  final active = _selectedCategoryId == (isAll ? null : category?.id);

                  return ChoiceChip(
                    label: Text(isAll ? 'Semua' : category!.name),
                    selected: active,
                    onSelected: (_) => setState(() => _selectedCategoryId = isAll ? null : category?.id),
                    selectedColor: tenant.primaryColor,
                    labelStyle: TextStyle(
                      color: active ? Colors.white : Colors.black87,
                      fontWeight: active ? FontWeight.bold : FontWeight.normal,
                    ),
                    backgroundColor: Colors.white,
                    side: BorderSide.none,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                  );
                },
              ),
              loading: () => const Center(child: LinearProgressIndicator()),
              error: (_, __) => const SizedBox(),
            ),
          ),

          SizedBox(height: 8.h),

          // 3. Product List
          Expanded(
            child: productsAsync.when(
              data: (products) {
                if (products.isEmpty) {
                  return const Center(child: Text("Tidak ada produk ditemukan"));
                }
                return ListView.separated(
                  padding: EdgeInsets.all(16.w),
                  itemCount: products.length,
                  separatorBuilder: (_, __) => SizedBox(height: 12.h),
                  itemBuilder: (context, index) {
                    final product = products[index];
                    return GestureDetector(
                      onTap: () => ProductDetailModal.show(context, product),
                      child: Container(
                        padding: EdgeInsets.all(8.w),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16.r),
                        ),
                        child: Row(
                          children: [
                            // Image
                            Container(
                              width: 64.w,
                              height: 64.w,
                              decoration: BoxDecoration(
                                color: Colors.grey[100],
                                borderRadius: BorderRadius.circular(12.r),
                                image: product.imageUrl != null
                                    ? DecorationImage(
                                        image: NetworkImage(product.imageUrl!),
                                        fit: BoxFit.cover,
                                      )
                                    : null,
                              ),
                              child: product.imageUrl == null
                                  ? const Icon(Icons.coffee, color: Colors.grey)
                                  : null,
                            ),
                            SizedBox(width: 12.w),
                            
                            // Info
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    product.name,
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14.sp,
                                    ),
                                  ),
                                  SizedBox(height: 4.h),
                                  Text(
                                    product.description,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: Colors.grey[600],
                                      fontSize: 11.sp,
                                    ),
                                  ),
                                  SizedBox(height: 8.h),
                                  Text(
                                    _currencyFormat.format(product.basePrice),
                                    style: TextStyle(
                                      color: tenant.primaryColor,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13.sp,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            
                            // Add Button
                            Icon(Icons.add_circle, color: tenant.primaryColor, size: 28.w),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
            ),
          ),
        ],
      ),
      
      // STANDARD FIXED BOTTOM BAR
      bottomNavigationBar: cart.isNotEmpty ? _buildBottomCartBar(context, cart, tenant) : null,
    );
  }

  Widget _buildBottomCartBar(BuildContext context, List<order.CartItem> cart, TenantConfig tenant) {
    final totalItems = cart.fold(0, (sum, item) => sum + item.quantity);
    
    // Defensive check for calculation
    double subtotal = 0.0;
    try {
      final calculation = ref.watch(order.orderCalculationProvider);
      subtotal = calculation['subtotal'] ?? 0.0;
    } catch (e) {
      // Fallback calculation if provider fails
      subtotal = cart.fold(0, (sum, item) => sum + item.totalPrice);
    }

    return Container(
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
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
          child: Row(
            children: [
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$totalItems Item di Keranjang',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 11.sp,
                    ),
                  ),
                  Text(
                    _currencyFormat.format(subtotal),
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16.sp,
                    ),
                  ),
                ],
              ),
              const Spacer(),
              ElevatedButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const CheckoutSummaryScreen()),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: tenant.primaryColor,
                  foregroundColor: Colors.white,
                  padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 8.h),
                  minimumSize: Size(0, 40.h), // Override global full-width styles
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12.r),
                  ),
                ),
                child: const Text('Checkout'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
