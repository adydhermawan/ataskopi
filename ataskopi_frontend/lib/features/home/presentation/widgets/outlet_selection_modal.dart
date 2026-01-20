import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../../core/providers/tenant_provider.dart';
import '../../../menu/presentation/screens/menu_catalog_screen.dart';

class OutletSelectionModal extends ConsumerWidget {
  const OutletSelectionModal({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const OutletSelectionModal(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenant = ref.watch(tenantProvider);

    return Container(
      height: 0.75.sh,
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24.r)),
      ),
      child: Column(
        children: [
          // Handle
          Center(
            child: Container(
              margin: EdgeInsets.symmetric(vertical: 12.h),
              width: 48.w,
              height: 5.h,
              decoration: BoxDecoration(
                color: const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(100),
              ),
            ),
          ),
          // Title
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 8.h),
            child: Row(
              children: [
                Text(
                  'Pilih Outlet',
                  style: TextStyle(
                    fontSize: 20.sp,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                const Spacer(),
                Icon(Icons.location_on_rounded, color: tenant.primaryColor, size: 20.w),
                SizedBox(width: 4.w),
                Text(
                  'Jakarta',
                  style: TextStyle(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.w500,
                    color: tenant.primaryColor,
                  ),
                ),
              ],
            ),
          ),
          // Search
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 12.h),
            child: Container(
              height: 48.h,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12.r),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  SizedBox(width: 16.w),
                  Icon(Icons.search_rounded, color: const Color(0xFF94A3B8), size: 20.w),
                  SizedBox(width: 12.w),
                  Expanded(
                    child: TextField(
                      decoration: InputDecoration(
                        hintText: 'Cari outlet terdekat...',
                        hintStyle: TextStyle(color: const Color(0xFF94A3B8), fontSize: 14.sp),
                        border: InputBorder.none,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Outlet List
          Expanded(
            child: ListView(
              padding: EdgeInsets.symmetric(horizontal: 20.w),
              children: [
                _buildOutletItem(
                  context: context,
                  name: 'Outlet Central Park',
                  address: 'Jl. Letjen S. Parman No.28, Tanjung Duren',
                  distance: '0.5 km',
                  isOpen: true,
                  isSelected: true,
                  tenant: tenant,
                ),
                _buildOutletItem(
                  context: context,
                  name: 'Outlet Senayan City',
                  address: 'Jl. Asia Afrika Lot 19, Gelora',
                  distance: '2.3 km',
                  isOpen: true,
                  isSelected: false,
                  tenant: tenant,
                ),
                _buildOutletItem(
                  context: context,
                  name: 'Outlet Grand Indonesia',
                  address: 'Jl. M.H. Thamrin No.1, Menteng',
                  distance: '3.8 km',
                  isOpen: true,
                  isSelected: false,
                  tenant: tenant,
                ),
                _buildOutletItem(
                  context: context,
                  name: 'Outlet Pacific Place',
                  address: 'Jl. Jend. Sudirman No.52-53',
                  distance: '4.1 km',
                  isOpen: false,
                  isSelected: false,
                  tenant: tenant,
                ),
              ],
            ),
          ),
          // Confirm Button
          Padding(
            padding: EdgeInsets.fromLTRB(20.w, 12.h, 20.w, ScreenUtil().bottomBarHeight + 16.h),
            child: SizedBox(
              width: double.infinity,
              height: 56.h,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const MenuCatalogScreen()),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: tenant.primaryColor,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
                  elevation: 0,
                ),
                child: Text(
                  'Pilih Outlet',
                  style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOutletItem({
    required BuildContext context,
    required String name,
    required String address,
    required String distance,
    required bool isOpen,
    required bool isSelected,
    required TenantConfig tenant,
  }) {
    return Container(
      margin: EdgeInsets.only(bottom: 12.h),
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(
          color: isSelected ? tenant.primaryColor : const Color(0xFFF1F5F9),
          width: isSelected ? 2.w : 1.w,
        ),
        boxShadow: null,
      ),
      child: Row(
        children: [
          Container(
            width: 48.w,
            height: 48.w,
            decoration: BoxDecoration(
              color: isSelected ? tenant.primaryColor.withOpacity(0.1) : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(12.r),
            ),
            child: Icon(
              Icons.storefront_rounded,
              color: isSelected ? tenant.primaryColor : const Color(0xFF64748B),
              size: 24.w,
            ),
          ),
          SizedBox(width: 12.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        name,
                        style: TextStyle(
                          fontSize: 15.sp,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                    ),
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                      decoration: BoxDecoration(
                        color: isOpen ? const Color(0xFFF0FDF4) : const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(6.r),
                      ),
                      child: Text(
                        isOpen ? 'Buka' : 'Tutup',
                        style: TextStyle(
                          fontSize: 10.sp,
                          fontWeight: FontWeight.bold,
                          color: isOpen ? const Color(0xFF22C55E) : const Color(0xFFEF4444),
                        ),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 4.h),
                Text(
                  address,
                  style: TextStyle(
                    fontSize: 12.sp,
                    color: const Color(0xFF64748B),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                SizedBox(height: 4.h),
                Row(
                  children: [
                    Icon(Icons.directions_walk_rounded, size: 14.w, color: const Color(0xFF94A3B8)),
                    SizedBox(width: 4.w),
                    Text(
                      distance,
                      style: TextStyle(
                        fontSize: 12.sp,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (isSelected)
            Icon(Icons.check_circle_rounded, color: tenant.primaryColor, size: 24.w),
        ],
      ),
    );
  }
}
