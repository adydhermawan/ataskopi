import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../../core/providers/tenant_provider.dart';
import '../../../../shared/widgets/app_top_bar.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../activity/presentation/screens/activity_screen.dart';
import '../../../activity/presentation/screens/order_tracking_screen.dart';

class QrisPaymentScreen extends ConsumerWidget {
  const QrisPaymentScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenant = ref.watch(tenantProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: const AppTopBar(title: 'Pembayaran QRIS'),
      body: SingleChildScrollView(
        child: Column(
          children: [
            SizedBox(height: 32.h),
            Text(
              'TOTAL PEMBAYARAN',
              style: TextStyle(
                fontSize: 12.sp,
                fontWeight: FontWeight.w800,
                color: const Color(0xFF94A3B8),
                letterSpacing: 1.5,
              ),
            ),
            SizedBox(height: 8.h),
            Text(
              'Rp 92.400',
              style: TextStyle(
                fontSize: 32.sp,
                fontWeight: FontWeight.w800,
                color: tenant.primaryColor,
                letterSpacing: -0.5,
              ),
            ),
            SizedBox(height: 32.h),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 24.w),
              child: Container(
                padding: EdgeInsets.all(32.w),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24.r),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 20, offset: const Offset(0, 8)),
                  ],
                  border: Border.all(color: const Color(0xFFF1F5F9)),
                ),
                child: Column(
                  children: [
                    AspectRatio(
                      aspectRatio: 1,
                      child: Container(
                        padding: EdgeInsets.all(12.w),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12.r),
                          border: Border.all(color: const Color(0xFFF1F5F9)),
                        ),
                        child: Image.network(
                          'https://lh3.googleusercontent.com/aida-public/AB6AXuCTFJYqUAKjESe0MS4c855a2N5Jo9JOnttAIXkmamVfSbOXIb7qtJ8Hhomav5Q_-VERwkz9mNq4xmbSON5tJWGA8ptabCnZjhNJhs_Dk4heovpHAKJSAwmoqqMTt9Vf2x2ajjtpx6l_LxvQHDPLVtL9T928m6Fyw01PoaaD8KjyDFshvpFFlkHCkfBpwu8rFoY7WW4pZsXebvA7nhgtJvDolOCdn3C1F0ydeUvf1h_FBU9rTEO_hnQB3rVlsHYXYVoHErq5tgpOG058',
                          fit: BoxFit.contain,
                        ),
                      ),
                    ),
                    SizedBox(height: 24.h),
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(100),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.schedule_rounded, color: const Color(0xFF2563EB), size: 16.w),
                          SizedBox(width: 8.w),
                          Text(
                            'Waktu Tersisa: 04:59',
                            style: TextStyle(
                              fontSize: 13.sp,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF1D4ED8),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SizedBox(height: 40.h),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 32.w),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Cara Pembayaran',
                    style: TextStyle(
                      fontSize: 16.sp,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  SizedBox(height: 20.h),
                  _buildStep(1, 'Screenshot atau simpan QR ini'),
                  _buildStep(2, 'Buka aplikasi pembayaran pilihanmu'),
                  _buildStep(3, 'Upload atau scan QR dari galeri'),
                ],
              ),
            ),
            SizedBox(height: 48.h),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: EdgeInsets.fromLTRB(20.w, 16.h, 20.w, ScreenUtil().bottomBarHeight + 16.h),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: const Color(0xFFF1F5F9), width: 1.5)),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 15, offset: const Offset(0, -5)),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppButton(
              text: 'Unduh QR',
              icon: Icons.download_rounded,
              onPressed: () {},
            ),
            SizedBox(height: 8.h),
            TextButton(
              onPressed: () {
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (_) => const OrderTrackingScreen()),
                  (route) => route.isFirst,
                );
              },
              child: Text(
                'Saya Sudah Bayar',
                style: TextStyle(
                  fontSize: 15.sp,
                  fontWeight: FontWeight.w700,
                  color: tenant.primaryColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep(int number, String text) {
    return Padding(
      padding: EdgeInsets.only(bottom: 16.h),
      child: Row(
        children: [
          Container(
            width: 24.w,
            height: 24.w,
            decoration: const BoxDecoration(
              color: Color(0xFF1250A5),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(
              number.toString(),
              style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: Colors.white),
            ),
          ),
          SizedBox(width: 16.w),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 14.sp,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF475569),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
