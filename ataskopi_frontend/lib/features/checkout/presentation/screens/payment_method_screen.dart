import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../../core/providers/tenant_provider.dart';
import '../../../../shared/widgets/app_top_bar.dart';

class PaymentMethodScreen extends ConsumerStatefulWidget {
  const PaymentMethodScreen({super.key});

  @override
  ConsumerState<PaymentMethodScreen> createState() => _PaymentMethodScreenState();
}

class _PaymentMethodScreenState extends ConsumerState<PaymentMethodScreen> {
  String _selectedMethod = 'qris';

  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantProvider);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: const AppTopBar(title: 'Pilih Pembayaran'),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  SizedBox(height: 40.h),
                  Text(
                    'TOTAL PEMBAYARAN',
                    style: TextStyle(
                      fontSize: 12.sp,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF94A3B8),
                      letterSpacing: 2.0,
                    ),
                  ),
                  SizedBox(height: 12.h),
                  Text(
                    'Rp 92.400',
                    style: TextStyle(
                      fontSize: 36.sp, 
                      fontWeight: FontWeight.w800, 
                      color: const Color(0xFF0F172A),
                      letterSpacing: -1.0,
                    ),
                  ),
                  SizedBox(height: 40.h),
                  const Divider(indent: 40, endIndent: 40, color: Color(0xFFF1F5F9), thickness: 1.5),
                  SizedBox(height: 40.h),
                  // Options
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 24.w),
                    child: Column(
                      children: [
                        _buildPaymentOption(
                          id: 'qris',
                          title: 'QRIS',
                          subtitle: 'ShopeePay, GoPay, Dana, dll',
                          icon: Icons.qr_code_scanner_rounded,
                          tenant: tenant,
                        ),
                        SizedBox(height: 16.h),
                        _buildPaymentOption(
                          id: 'tunai',
                          title: 'Tunai',
                          subtitle: 'Bayar langsung di kasir',
                          icon: Icons.payments_rounded,
                          tenant: tenant,
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: 40.h),
                  // Trust Badge
                  Container(
                    margin: EdgeInsets.symmetric(horizontal: 24.w),
                    padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 14.h),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(14.r),
                      border: Border.all(color: const Color(0xFFDCFCE7), width: 1.w),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.verified_user_rounded, color: const Color(0xFF22C55E), size: 18.w),
                        SizedBox(width: 10.w),
                        Text(
                          'Pembayaran Aman & Terenkripsi',
                          style: TextStyle(
                            fontSize: 13.sp, 
                            fontWeight: FontWeight.w700, 
                            color: const Color(0xFF166534),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Bottom Button
          Padding(
            padding: EdgeInsets.fromLTRB(24.w, 16.h, 24.w, ScreenUtil().bottomBarHeight + 24.h),
            child: SizedBox(
              width: double.infinity,
              height: 58.h,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: tenant.primaryColor,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
                  elevation: 0,
                  shadowColor: tenant.primaryColor.withOpacity(0.4),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Lanjutkan',
                      style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.w800, color: Colors.white),
                    ),
                    SizedBox(width: 8.w),
                    Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 20.w),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentOption({
    required String id,
    required String title,
    required String subtitle,
    required IconData icon,
    required dynamic tenant,
  }) {
    final isSelected = _selectedMethod == id;
    final primaryColor = tenant.primaryColor;

    return GestureDetector(
      onTap: () => setState(() => _selectedMethod = id),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: EdgeInsets.all(16.w),
        decoration: BoxDecoration(
          color: isSelected ? primaryColor.withOpacity(0.06) : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(18.r),
          border: Border.all(
            color: isSelected ? primaryColor : const Color(0xFFF1F5F9),
            width: 2.w,
          ),
          boxShadow: null,
        ),
        child: Row(
          children: [
            Container(
              padding: EdgeInsets.all(10.w),
              decoration: BoxDecoration(
                color: isSelected ? primaryColor.withOpacity(0.12) : Colors.white,
                borderRadius: BorderRadius.circular(14.r),
                boxShadow: null,    ),
              child: Icon(
                icon,
                color: isSelected ? primaryColor : const Color(0xFF64748B),
                size: 24.w,
              ),
            ),
            SizedBox(width: 20.w),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 17.sp,
                      fontWeight: FontWeight.w800,
                      color: isSelected ? primaryColor : const Color(0xFF1E293B),
                    ),
                  ),
                  SizedBox(height: 2.h),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 13.sp, 
                      color: const Color(0xFF64748B),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              width: 24.w,
              height: 24.w,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? primaryColor : const Color(0xFFCBD5E1),
                  width: 2.w,
                ),
              ),
              child: isSelected
                  ? Center(
                      child: Container(
                        width: 12.w,
                        height: 12.w,
                        decoration: BoxDecoration(color: primaryColor, shape: BoxShape.circle),
                      ),
                    )
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}
