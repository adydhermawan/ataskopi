import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../../core/providers/tenant_provider.dart';

class LoyaltyCard extends ConsumerWidget {
  final int points;
  final String tier;

  const LoyaltyCard({super.key, required this.points, required this.tier});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenant = ref.watch(tenantProvider);

    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(20.w),
      decoration: BoxDecoration(
        color: tenant.primaryColor,
        borderRadius: BorderRadius.circular(24.r),
        boxShadow: [
          BoxShadow(
            color: tenant.primaryColor.withOpacity(0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20.r),
                ),
                child: Row(
                  children: [
                    Icon(Icons.stars, color: tenant.accentColor, size: 16),
                    SizedBox(width: 8.w),
                    Text(
                      tier,
                      style: TextStyle(color: Colors.white, fontSize: 12.sp, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.qr_code_2, color: Colors.white, size: 28),
            ],
          ),
          SizedBox(height: 20.h),
          Text(
            'Total Points',
            style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 14.sp),
          ),
          Text(
            points.toString(),
            style: TextStyle(color: Colors.white, fontSize: 32.sp, fontWeight: FontWeight.bold),
          ),
          SizedBox(height: 16.h),
          LinearProgressIndicator(
            value: 0.7,
            backgroundColor: Colors.white.withOpacity(0.2),
            valueColor: AlwaysStoppedAnimation<Color>(tenant.accentColor),
            borderRadius: BorderRadius.circular(4.r),
          ),
          SizedBox(height: 8.h),
          Text(
            '250 more points to Platinum',
            style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12.sp),
          ),
        ],
      ),
    );
  }
}
