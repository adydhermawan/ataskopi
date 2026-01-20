import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../../core/providers/tenant_provider.dart';
import '../../../../shared/widgets/app_top_bar.dart';
import '../../../shared/data/mock_data.dart';
import '../../../shared/domain/models/models.dart';
import '../../../checkout/presentation/screens/checkout_summary_screen.dart';
import '../widgets/product_detail_modal.dart';

class MenuCatalogScreen extends ConsumerStatefulWidget {
  const MenuCatalogScreen({super.key});

  @override
  ConsumerState<MenuCatalogScreen> createState() => _MenuCatalogScreenState();
}

class _MenuCatalogScreenState extends ConsumerState<MenuCatalogScreen> {
  String _selectedCategoryId = 'all';

  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantProvider);
    final filteredProducts = _selectedCategoryId == 'all'
        ? MockData.products
        : MockData.products.where((p) => p.categoryId == _selectedCategoryId).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7F8),
      appBar: AppTopBar(
        title: 'Menu Utama',
        onBackPressed: () => Navigator.pop(context),
        actions: [
          AppTopBar.actionButton(
            icon: Icons.favorite_rounded,
            iconColor: const Color(0xFFEF4444),
            onTap: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
            child: Container(
              height: 48.h,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12.r),
                border: Border.all(color: const Color(0xFFF1F5F9)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  SizedBox(width: 16.w),
                  Icon(Icons.search_rounded, color: const Color(0xFF4E6D97), size: 22.w),
                  SizedBox(width: 12.w),
                  Expanded(
                    child: TextField(
                      decoration: InputDecoration(
                        hintText: 'Cari menu favoritmu...',
                        hintStyle: TextStyle(color: const Color(0xFF4E6D97), fontSize: 14.sp),
                        border: InputBorder.none,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Categories
          SizedBox(
            height: 40.h,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.symmetric(horizontal: 16.w),
              itemCount: MockData.categories.length + 1,
              itemBuilder: (context, index) {
                final bool isAll = index == 0;
                final cat = isAll ? null : MockData.categories[index - 1];
                final id = isAll ? 'all' : cat!.id;
                final isSelected = _selectedCategoryId == id;
                final name = isAll ? 'Semua' : cat!.name;

                return Padding(
                  padding: EdgeInsets.only(right: 12.w),
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedCategoryId = id),
                    child: Container(
                      padding: EdgeInsets.symmetric(horizontal: 20.w),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: isSelected ? tenant.primaryColor : Colors.white,
                        borderRadius: BorderRadius.circular(100),
                        boxShadow: null,
                        border: !isSelected ? Border.all(color: const Color(0xFFF1F5F9)) : null,
                      ),
                      child: Text(
                        name,
                        style: TextStyle(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.bold,
                          color: isSelected ? Colors.white : const Color(0xFF4E6D97),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          SizedBox(height: 16.h),
          // Product List
          Expanded(
            child: ListView.builder(
              padding: EdgeInsets.symmetric(horizontal: 16.w),
              itemCount: filteredProducts.length,
              itemBuilder: (context, index) {
                final product = filteredProducts[index];
                return _buildProductListItem(context, product, tenant);
              },
            ),
          ),
        ],
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      floatingActionButton: _buildFloatingCart(context, tenant),
    );
  }

  Widget _buildProductListItem(BuildContext context, Product product, TenantConfig tenant) {
    return Container(
      margin: EdgeInsets.only(bottom: 12.h),
      padding: EdgeInsets.all(12.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16.r),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2)),
        ],
        border: Border.all(color: const Color(0xFFF8FAFC)),
      ),
      child: Row(
        children: [
          Stack(
            children: [
              Container(
                width: 80.w,
                height: 80.w,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12.r),
                  image: DecorationImage(image: NetworkImage(product.imageUrl), fit: BoxFit.cover),
                ),
              ),
              if (product.isRecommended)
                Positioned(
                  top: 0,
                  right: 0,
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 3.h),
                    decoration: BoxDecoration(
                      color: tenant.accentColor,
                      borderRadius: BorderRadius.only(
                        topRight: Radius.circular(12.r),
                        bottomLeft: Radius.circular(8.r),
                      ),
                    ),
                    child: Text(
                      'BEST SELLER',
                      style: TextStyle(fontSize: 8.sp, fontWeight: FontWeight.bold, color: const Color(0xFF0E131B)),
                    ),
                  ),
                ),
            ],
          ),
          SizedBox(width: 16.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold, color: const Color(0xFF0E131B)),
                ),
                SizedBox(height: 4.h),
                Text(
                  product.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12.sp, color: const Color(0xFF4E6D97), height: 1.2),
                ),
                SizedBox(height: 8.h),
                Text(
                  'Rp ${product.basePrice ~/ 1000},000',
                  style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.bold, color: tenant.primaryColor),
                ),
              ],
            ),
          ),
          SizedBox(width: 8.w),
          SizedBox(
            width: 48.w,
            height: 48.w,
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => ProductDetailModal.show(context, product),
                borderRadius: BorderRadius.circular(100),
                child: Center(
                  child: Container(
                    width: 32.w,
                    height: 32.w,
                    decoration: BoxDecoration(
                      color: tenant.primaryColor.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.add_rounded, color: tenant.primaryColor, size: 24.w),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFloatingCart(BuildContext context, TenantConfig tenant) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16.w),
      padding: EdgeInsets.all(12.w),
      decoration: BoxDecoration(
        color: tenant.primaryColor,
        borderRadius: BorderRadius.circular(16.r),
        boxShadow: [
          BoxShadow(color: tenant.primaryColor.withOpacity(0.3), blurRadius: 15, offset: const Offset(0, 8)),
        ],
      ),
      child: Row(
        children: [
          Stack(
            children: [
              Icon(Icons.shopping_bag_outlined, color: Colors.white, size: 28.w),
              Positioned(
                top: 0,
                right: 0,
                child: Container(
                  width: 18.w,
                  height: 18.w,
                  decoration: BoxDecoration(
                    color: tenant.accentColor,
                    shape: BoxShape.circle,
                    border: Border.all(color: tenant.primaryColor, width: 2.w),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    '3',
                    style: TextStyle(fontSize: 10.sp, fontWeight: FontWeight.bold, color: Colors.black),
                  ),
                ),
              ),
            ],
          ),
          SizedBox(width: 12.w),
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('3 Items', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 10.sp)),
              Text('Rp 76,000', style: TextStyle(color: Colors.white, fontSize: 16.sp, fontWeight: FontWeight.bold)),
            ],
          ),
          const Spacer(),
          ElevatedButton(
            onPressed: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const CheckoutSummaryScreen()));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: tenant.primaryColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
              elevation: 0,
            ),
            child: const Text('Checkout'),
          ),
        ],
      ),
    );
  }
}
