import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../../core/providers/tenant_provider.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_top_bar.dart';
import '../../../menu/presentation/screens/menu_catalog_screen.dart';

class DeliveryAddressScreen extends ConsumerStatefulWidget {
  const DeliveryAddressScreen({super.key});

  @override
  ConsumerState<DeliveryAddressScreen> createState() => _DeliveryAddressScreenState();
}

class _DeliveryAddressScreenState extends ConsumerState<DeliveryAddressScreen> {
  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: const AppTopBar(
        title: 'Atur Alamat',
      ),
      body: Stack(
        children: [
          // Map Background (Mock)
          Positioned.fill(
            child: Image.network(
              'https://lh3.googleusercontent.com/aida-public/AB6AXuD8OgJYjm0D-Z0B7CHgVsywsucSio3L2T3U5RdTslS-uByb-E7bMEEEPY1vUlpl8GTyrsipJUchMRZeHUy3juUyqIT47IIKjCACDO0OS0mogYiHm0egCQtEe516koxLZ0AH9bWoK6CKtbpFx9kkNbNsexKEjsV_1lbsBLAhvsFsjo03lP_A2c8QPP75P_sbdGLZU-MbbaeNIQzsp1ppN3LWO-EIPTSWYplUtO88VKmdcueOKpKq5mxQ96OtAGWUOnqpc9kRuqOsyEeA',
              fit: BoxFit.cover,
            ),
          ),
          
          // Central Pin
          Center(
            child: Padding(
              padding: EdgeInsets.only(bottom: 24.h), // Offset for pin point
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8.r),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Text(
                      'Geser peta untuk mengubah',
                      style: TextStyle(
                        fontSize: 12.sp,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF1E293B),
                      ),
                    ),
                  ),
                  SizedBox(height: 8.h),
                  Icon(
                    Icons.location_on_rounded,
                    color: tenant.primaryColor,
                    size: 56.w,
                  ),
                ],
              ),
            ),
          ),

          // Map Controls
          Positioned(
            right: 16.w,
            bottom: 240.h, // Space for bottom sheet
            child: Container(
              width: 48.w,
              height: 48.w,
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Icon(Icons.my_location_rounded, color: const Color(0xFF475569), size: 24.w),
            ),
          ),

          // Bottom Sheet
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              padding: EdgeInsets.fromLTRB(24.w, 12.h, 24.w, 32.h),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24.r)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 20,
                    offset: const Offset(0, -5),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 48.w,
                    height: 5.h,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(100),
                    ),
                  ),
                  SizedBox(height: 24.h),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 44.w,
                        height: 44.w,
                        decoration: BoxDecoration(
                          color: tenant.primaryColor.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(Icons.pin_drop_rounded, color: tenant.primaryColor, size: 24.w),
                      ),
                      SizedBox(width: 16.w),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'LOKASI TERPILIH',
                              style: TextStyle(
                                fontSize: 10.sp,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF94A3B8),
                                letterSpacing: 1.2,
                              ),
                            ),
                            SizedBox(height: 4.h),
                            Text(
                              'Jl. Jend. Sudirman No. 123',
                              style: TextStyle(
                                fontSize: 17.sp,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF0F172A),
                              ),
                            ),
                            SizedBox(height: 2.h),
                            Text(
                              'Kebayoran Baru, Jakarta Selatan, DKI Jakarta',
                              style: TextStyle(
                                fontSize: 13.sp,
                                color: const Color(0xFF64748B),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 24.h),
                  Container(
                    height: 1.h,
                    color: const Color(0xFFF1F5F9),
                  ),
                  SizedBox(height: 24.h),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.edit_note_rounded, color: const Color(0xFF94A3B8), size: 20.w),
                          SizedBox(width: 8.w),
                          Text(
                            'Detail Alamat (Opsional)',
                            style: TextStyle(
                              fontSize: 14.sp,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF475569),
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 12.h),
                      Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(16.r),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: TextField(
                          decoration: InputDecoration(
                            hintText: 'Contoh: Gedung A, Lt. 5, Pagar hitam',
                            hintStyle: TextStyle(color: const Color(0xFF94A3B8), fontSize: 14.sp, fontWeight: FontWeight.w400),
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            contentPadding: EdgeInsets.all(16.w),
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 24.h),
                  AppButton(
                    text: 'Lanjutkan',
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const MenuCatalogScreen()),
                      );
                    },
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
