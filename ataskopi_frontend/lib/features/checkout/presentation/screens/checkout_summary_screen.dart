import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../../core/providers/tenant_provider.dart';
import '../../../../shared/widgets/app_top_bar.dart';
import '../../../shared/data/mock_data.dart';
import '../../../activity/presentation/screens/activity_screen.dart';
import 'payment_method_screen.dart';
import 'qris_payment_screen.dart';

class CheckoutSummaryScreen extends ConsumerWidget {
  const CheckoutSummaryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenant = ref.watch(tenantProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: const AppTopBar(title: 'Checkout Summary'),
      body: SingleChildScrollView(
        padding: EdgeInsets.only(bottom: 40.h),
        child: Column(
          children: [
            SizedBox(height: 16.h),
            // Pickup Location
            _buildSectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.storefront_rounded, color: tenant.primaryColor, size: 20.w),
                      SizedBox(width: 8.w),
                      Text(
                        'PICKUP LOCATION',
                        style: TextStyle(
                          fontSize: 10.sp,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF94A3B8),
                          letterSpacing: 1.5,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 12.h),
                  Text(
                    'Morning Brew Coffee - Downtown',
                    style: TextStyle(
                      fontSize: 17.sp,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF0F172A),
                      letterSpacing: -0.5,
                    ),
                  ),
                  SizedBox(height: 4.h),
                  Text(
                    'Jalan Sudirman No. 45, Jakarta Selatan',
                    style: TextStyle(
                      fontSize: 14.sp,
                      color: const Color(0xFF64748B),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  SizedBox(height: 14.h),
                  Row(
                    children: [
                      Icon(Icons.schedule_rounded, color: tenant.primaryColor, size: 16.w),
                      SizedBox(width: 8.w),
                      Text(
                        'Ready in 10-15 mins',
                        style: TextStyle(
                          fontSize: 13.sp,
                          fontWeight: FontWeight.w700,
                          color: tenant.primaryColor,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            // Your Order
            _buildSectionCard(
              padding: EdgeInsets.zero,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: EdgeInsets.fromLTRB(16.w, 16.h, 16.w, 8.h),
                    child: Text(
                      'Your Order',
                      style: TextStyle(
                        fontSize: 18.sp,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                        letterSpacing: -0.5,
                      ),
                    ),
                  ),
                  _buildOrderItem(
                    'Iced Spanish Latte',
                    'Rp 35.000',
                    'Oat Milk, Less Sugar',
                    1,
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuC1xuJSWENsmFBAhmPHS2bYA3kqE0ysOKQvJoyTihzgf8J_Ol9Cg0_-I4foCczoKN8woBtc_md_Jo6It9MfKe0kqyfzGP2gC5uD2ak5Nk17pNIjTwfgyqbvH69vKGiWtTY9FSKbyrVsqyS_9e7eV9VjjQjIaT4U97UZ8mFW7oQ9UeU-Z5SpjEr5JngQSCaJkCmpi-XtKKQIm8ehrPpUYturX2stdrSc3cla4r5528i9paCE0WDsMZBsGjJAS1YV1UnWRJ1cV8nFBpKk',
                  ),
                  _buildOrderItem(
                    'Smashed Avocado Toast',
                    'Rp 55.000',
                    'Extra Poached Egg',
                    1,
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuBpEWAvSl3bWlB8KniWr6VtGnO7eVjwXEwGa8VuPKhhxvzLiujdjmw09-V9XvJZSvQmWho7nhfQP63FfL5xtos_mAtveWJIYlCtxwMvr7y3JCgLJyqYxZo7SUFSb7aE7l6ixqvm4yByMzCC7kqRoVxsrFO80YzYu0T9mXAQoaG673vBka--MPbxJXAczRdVi4V49yDxGcLo4f-wKBdJYOpY2W_J2gVNsj1KBEGtr_S3NpMKhoQeEu5SKZmV3Tx7fBQC1ORObm18EGD8',
                    isLast: true,
                  ),
                ],
              ),
            ),
            // Voucher & Points
            _buildSectionCard(
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        padding: EdgeInsets.all(10.w),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFB400).withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(Icons.confirmation_number_rounded, color: const Color(0xFFFFB400), size: 18.w),
                      ),
                      SizedBox(width: 12.w),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Voucher & Points',
                              style: TextStyle(
                                fontSize: 15.sp, 
                                fontWeight: FontWeight.w800, 
                                color: const Color(0xFF0F172A),
                              ),
                            ),
                            Text(
                              '1.250 points available',
                              style: TextStyle(
                                fontSize: 12.sp, 
                                color: const Color(0xFF64748B),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(Icons.chevron_right_rounded, color: const Color(0xFFCBD5E1), size: 24.w),
                    ],
                  ),
                  SizedBox(height: 16.h),
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12.r),
                      border: Border.all(color: const Color(0xFFF1F5F9)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.stars_rounded, color: const Color(0xFFFFB400), size: 18.w),
                        SizedBox(width: 12.w),
                        Expanded(
                          child: Text(
                            'Redeem 750 points for Rp 7.500',
                            style: TextStyle(
                              fontSize: 13.sp, 
                              fontWeight: FontWeight.w600, 
                              color: const Color(0xFF1E293B),
                            ),
                          ),
                        ),
                        Switch(
                          value: true,
                          onChanged: (_) {},
                          activeColor: tenant.primaryColor,
                          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            // Payment Method
            _buildSectionCard(
              child: InkWell(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const PaymentMethodScreen()),
                  );
                },
                child: Row(
                  children: [
                    Container(
                      padding: EdgeInsets.all(10.w),
                      decoration: BoxDecoration(
                        color: tenant.primaryColor.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.qr_code_scanner_rounded, color: tenant.primaryColor, size: 18.w),
                    ),
                    SizedBox(width: 12.w),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Payment Method',
                            style: TextStyle(
                              fontSize: 15.sp, 
                              fontWeight: FontWeight.w800, 
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                          Text(
                            'QRIS (ShopeePay, GoPay, etc)',
                            style: TextStyle(
                              fontSize: 12.sp, 
                              color: const Color(0xFF64748B),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.chevron_right_rounded, color: const Color(0xFFCBD5E1), size: 24.w),
                  ],
                ),
              ),
            ),
            // Payment Detail
            _buildSectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'PAYMENT DETAIL',
                    style: TextStyle(
                      fontSize: 10.sp,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF94A3B8),
                      letterSpacing: 1.5,
                    ),
                  ),
                  SizedBox(height: 16.h),
                  _buildPriceRow('Subtotal', 'Rp 90.000'),
                  SizedBox(height: 12.h),
                  _buildPriceRow('Tax (PPN 11%)', 'Rp 9.900'),
                  SizedBox(height: 12.h),
                  _buildPriceRow('Point Discount', '- Rp 7.500', isDiscount: true),
                  SizedBox(height: 20.h),
                  Container(height: 1.h, color: const Color(0xFFF1F5F9)),
                  SizedBox(height: 16.h),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Total Amount',
                        style: TextStyle(
                          fontSize: 17.sp, 
                          fontWeight: FontWeight.w800, 
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        'Rp 92.400',
                        style: TextStyle(
                          fontSize: 20.sp, 
                          fontWeight: FontWeight.w800, 
                          color: tenant.primaryColor,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
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
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'TOTAL PEMBAYARAN',
                      style: TextStyle(
                        fontSize: 10.sp, 
                        fontWeight: FontWeight.w800, 
                        color: const Color(0xFF94A3B8),
                        letterSpacing: 1.2,
                      ),
                    ),
                    Text(
                      'Rp 92.400',
                      style: TextStyle(
                        fontSize: 22.sp, 
                        fontWeight: FontWeight.w800, 
                        color: tenant.primaryColor,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Icon(Icons.verified_user_rounded, color: const Color(0xFF94A3B8), size: 14.w),
                    SizedBox(width: 6.w),
                    Text(
                      'Secure Payment',
                      style: TextStyle(
                        fontSize: 12.sp, 
                        color: const Color(0xFF94A3B8),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            SizedBox(height: 20.h),
            SizedBox(
              width: double.infinity,
              height: 58.h,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const QrisPaymentScreen()),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: tenant.primaryColor,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
                  elevation: 0,
                  shadowColor: tenant.primaryColor.withOpacity(0.4),
                ),
                child: Text(
                  'Bayar Sekarang',
                  style: TextStyle(
                    fontSize: 16.sp, 
                    fontWeight: FontWeight.w800, 
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionCard({required Widget child, EdgeInsets? padding, double? margin}) {
    return Container(
      width: double.infinity,
      padding: padding ?? EdgeInsets.all(16.w),
      margin: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16.r),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
        ],
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: child,
    );
  }

  Widget _buildOrderItem(String name, String price, String options, int qty, String imageUrl, {bool isLast = false}) {
    return Container(
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        border: isLast ? null : Border(bottom: BorderSide(color: const Color(0xFFF1F5F9), width: 1.w)),
      ),
      child: Row(
        children: [
          Container(
            width: 72.w,
            height: 72.w,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14.r),
              color: const Color(0xFFF1F5F9), // Placeholder color
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14.r),
              child: Image.network(
                imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Icon(
                  Icons.image_not_supported_outlined,
                  color: const Color(0xFF94A3B8),
                  size: 24.w,
                ),
              ),
            ),
          ),
          SizedBox(width: 16.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        name,
                        style: TextStyle(
                          fontSize: 15.sp, 
                          fontWeight: FontWeight.w700, 
                          color: const Color(0xFF0F172A),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    SizedBox(width: 8.w),
                    Text(
                      price,
                      style: TextStyle(
                        fontSize: 15.sp, 
                        fontWeight: FontWeight.w700, 
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 6.h),
                Text(
                  options,
                  style: TextStyle(
                    fontSize: 13.sp, 
                    color: const Color(0xFF64748B),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                SizedBox(height: 6.h),
                Text(
                  'x$qty',
                  style: TextStyle(
                    fontSize: 13.sp, 
                    fontWeight: FontWeight.w800, 
                    color: const Color(0xFF1250A5),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPriceRow(String label, String value, {bool isDiscount = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 14.sp, 
            color: const Color(0xFF64748B),
            fontWeight: FontWeight.w500,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 14.sp,
            fontWeight: FontWeight.w700,
            color: isDiscount ? const Color(0xFF1250A5) : const Color(0xFF1E293B),
          ),
        ),
      ],
    );
  }
}

class SSideBox extends StatelessWidget {
  final double? width;
  const SSideBox({super.key, this.width});
  @override
  Widget build(BuildContext context) => SizedBox(width: width);
}
