import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../../core/providers/tenant_provider.dart';
import '../../../../shared/widgets/app_top_bar.dart';
import '../../../shared/domain/models/models.dart';
import '../../../checkout/presentation/screens/checkout_summary_screen.dart';

class ProductDetailModal extends ConsumerStatefulWidget {
  final Product product;

  const ProductDetailModal({super.key, required this.product});

  static void show(BuildContext context, Product product) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ProductDetailModal(product: product),
    );
  }

  @override
  ConsumerState<ProductDetailModal> createState() => _ProductDetailModalState();
}

class _ProductDetailModalState extends ConsumerState<ProductDetailModal> {
  int _quantity = 1;
  String _selectedVariant = 'hot';
  final List<String> _selectedAddons = [];

  void _toggleAddon(String addon) {
    setState(() {
      if (_selectedAddons.contains(addon)) {
        _selectedAddons.remove(addon);
      } else {
        _selectedAddons.add(addon);
      }
    });
  }

  double get _totalPrice {
    double total = widget.product.basePrice.toDouble();
    // Addon prices (mock)
    if (_selectedAddons.contains('Extra Shot')) total += 5000;
    if (_selectedAddons.contains('Whipped Cream')) total += 8000;
    if (_selectedAddons.contains('Oat Milk Upgrade')) total += 10000;
    return total * _quantity;
  }

  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantProvider);

    return Container(
      height: 0.9.sh,
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24.r)),
      ),
      child: Stack(
        children: [
          CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Handle
                    Center(
                      child: Container(
                        margin: EdgeInsets.symmetric(vertical: 12.h),
                        width: 48.w,
                        height: 5.h,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(100),
                        ),
                      ),
                    ),
                    // Image
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16.w),
                      child: Stack(
                        children: [
                          Container(
                            height: 250.h,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(20.r),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.08),
                                  blurRadius: 15,
                                  offset: const Offset(0, 5),
                                ),
                              ],
                              image: DecorationImage(
                                image: NetworkImage(widget.product.imageUrl),
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                          if (widget.product.isRecommended)
                            Positioned(
                              top: 16.h,
                              right: 16.w,
                              child: Container(
                                padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFB400),
                                  borderRadius: BorderRadius.circular(100),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFFFFB400).withOpacity(0.3),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: Text(
                                  'BEST SELLER',
                                  style: TextStyle(
                                    fontSize: 10.sp,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                    letterSpacing: 1,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                    SizedBox(height: 24.h),
                    // Info
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 20.w),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.product.name,
                            style: TextStyle(
                              fontSize: 28.sp,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF0F172A),
                              letterSpacing: -0.8,
                            ),
                          ),
                          SizedBox(height: 8.h),
                          Text(
                            widget.product.description,
                            style: TextStyle(
                              fontSize: 14.sp,
                              color: const Color(0xFF64748B),
                              height: 1.6,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(height: 32.h),
                    // Variants
                    _buildSectionHeader('Pilih Varian (Wajib)'),
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 20.w),
                      child: GridView.count(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisCount: 2,
                        mainAxisSpacing: 12.w,
                        crossAxisSpacing: 12.w,
                        childAspectRatio: 2.2,
                        children: [
                          _buildVariantCard(
                            id: 'hot',
                            label: 'Hot',
                            icon: Icons.coffee_rounded,
                            iconColor: const Color(0xFFF97316),
                            tenant: tenant,
                          ),
                          _buildVariantCard(
                            id: 'ice',
                            label: 'Ice',
                            icon: Icons.ac_unit_rounded,
                            iconColor: const Color(0xFF3B82F6),
                            tenant: tenant,
                          ),
                        ],
                      ),
                    ),
                    SizedBox(height: 32.h),
                    // Addons
                    _buildSectionHeader('Tambahan (Opsional)'),
                    Container(
                      color: const Color(0xFFF1F5F9),
                      child: Column(
                        children: [
                          _buildAddonItem('Extra Shot', 'Rp 5.000', tenant: tenant),
                          _buildAddonItem('Whipped Cream', 'Rp 8.000', tenant: tenant),
                          _buildAddonItem('Oat Milk Upgrade', 'Rp 10.000', badge: 'Plant Based', tenant: tenant),
                        ],
                      ),
                    ),
                    SizedBox(height: 32.h),
                    // Notes
                    _buildSectionHeader('Catatan Khusus'),
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 20.w),
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16.r),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: TextField(
                          maxLines: 2,
                          style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w500),
                          decoration: InputDecoration(
                            hintText: 'Contoh: Kurangi gula, sedikit es...',
                            hintStyle: TextStyle(color: const Color(0xFF94A3B8), fontSize: 14.sp, fontWeight: FontWeight.w400),
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            contentPadding: EdgeInsets.all(16.w),
                          ),
                        ),
                      ),
                    ),
                    SizedBox(height: 140.h), // Space for footer
                  ],
                ),
              ),
            ],
          ),
          // Footer
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: ClipRRect(
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                child: Container(
                  padding: EdgeInsets.fromLTRB(20.w, 20.h, 20.w, 32.h),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.85),
                    border: Border(top: BorderSide(color: const Color(0xFFF1F5F9), width: 1.5)),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Text(
                                'Jumlah',
                                style: TextStyle(
                                  fontSize: 13.sp,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF64748B),
                                ),
                              ),
                              SizedBox(width: 12.w),
                              Container(
                                padding: EdgeInsets.all(4.w),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(100),
                                ),
                                child: Row(
                                  children: [
                                    _buildQuantityButton(Icons.remove, () {
                                      if (_quantity > 1) setState(() => _quantity--);
                                    }, isPrimary: false, tenant: tenant),
                                    SizedBox(
                                      width: 40.w,
                                      child: Text(
                                        '$_quantity',
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          fontSize: 17.sp,
                                          fontWeight: FontWeight.w800,
                                          color: const Color(0xFF0F172A),
                                        ),
                                      ),
                                    ),
                                    _buildQuantityButton(Icons.add, () {
                                      setState(() => _quantity++);
                                    }, isPrimary: true, tenant: tenant),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                'SUBTOTAL',
                                style: TextStyle(
                                  fontSize: 10.sp,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF94A3B8),
                                  letterSpacing: 1.5,
                                ),
                              ),
                              Text(
                                'Rp ${_totalPrice.toInt() ~/ 1000}.000',
                                style: TextStyle(
                                  fontSize: 22.sp,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF0F172A),
                                  letterSpacing: -0.5,
                                ),
                              ),
                            ],
                          ),
                        ],
                       ),
                      SizedBox(height: 20.h),
                      SizedBox(
                        width: double.infinity,
                        height: 56.h,
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.pop(context); // Close modal
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const CheckoutSummaryScreen()),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: tenant.primaryColor,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
                            elevation: 0,
                            shadowColor: tenant.primaryColor.withOpacity(0.4),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.shopping_bag_rounded, color: Colors.white, size: 22.w),
                              SizedBox(width: 12.w),
                              Text(
                                'Tambah ke Keranjang',
                                style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.w800, color: Colors.white),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: EdgeInsets.only(left: 20.w, bottom: 12.h),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 16.sp,
          fontWeight: FontWeight.w800,
          color: const Color(0xFF0F172A),
          letterSpacing: -0.2,
        ),
      ),
    );
  }

  Widget _buildVariantCard({
    required String id,
    required String label,
    required IconData icon,
    required Color iconColor,
    required dynamic tenant,
  }) {
    final isSelected = _selectedVariant == id;
    final primaryColor = tenant.primaryColor;

    return GestureDetector(
      onTap: () => setState(() => _selectedVariant = id),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: EdgeInsets.symmetric(horizontal: 16.w),
        decoration: BoxDecoration(
          color: isSelected ? primaryColor.withOpacity(0.08) : Colors.white,
          borderRadius: BorderRadius.circular(16.r),
          border: Border.all(color: isSelected ? primaryColor : const Color(0xFFE2E8F0), width: 2.w),
        ),
        child: Row(
          children: [
            Icon(icon, color: isSelected ? iconColor : const Color(0xFF94A3B8), size: 22.w),
            SizedBox(width: 10.w),
            Text(
              label,
              style: TextStyle(
                fontSize: 15.sp,
                fontWeight: FontWeight.w700,
                color: isSelected ? primaryColor : const Color(0xFF64748B),
              ),
            ),
            const Spacer(),
            if (isSelected)
              Icon(Icons.check_circle_rounded, color: primaryColor, size: 18.w),
          ],
        ),
      ),
    );
  }

  Widget _buildAddonItem(String name, String price, {String? badge, required dynamic tenant}) {
    final isSelected = _selectedAddons.contains(name);
    return GestureDetector(
      onTap: () => _toggleAddon(name),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 18.h),
        margin: EdgeInsets.only(bottom: 1.5.h),
        color: Colors.white,
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        name,
                        style: TextStyle(fontSize: 15.sp, fontWeight: FontWeight.w700, color: const Color(0xFF1E293B)),
                      ),
                      if (badge != null) ...[
                        SizedBox(width: 10.w),
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
                          decoration: BoxDecoration(
                            color: tenant.primaryColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6.r),
                          ),
                          child: Text(
                            badge.toUpperCase(),
                            style: TextStyle(fontSize: 9.sp, fontWeight: FontWeight.w800, color: tenant.primaryColor),
                          ),
                        ),
                      ],
                    ],
                  ),
                  SizedBox(height: 6.h),
                  Text(
                    '+ $price',
                    style: TextStyle(fontSize: 13.sp, color: const Color(0xFF64748B), fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
            Checkbox(
              value: isSelected,
              onChanged: (_) => _toggleAddon(name),
              activeColor: tenant.primaryColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6.r)),
              side: BorderSide(color: const Color(0xFFE2E8F0), width: 1.5.w),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuantityButton(IconData icon, VoidCallback onTap, {required bool isPrimary, required dynamic tenant}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36.w,
        height: 36.w,
        decoration: BoxDecoration(
          color: isPrimary ? tenant.primaryColor : Colors.white,
          shape: BoxShape.circle,
          boxShadow: null,
        ),
        child: Icon(icon, color: isPrimary ? Colors.white : const Color(0xFF0F172A), size: 18.w),
      ),
    );
  }
}
