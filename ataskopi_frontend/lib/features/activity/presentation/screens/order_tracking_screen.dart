import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../../core/providers/tenant_provider.dart';
import '../../../../shared/widgets/app_top_bar.dart';

class OrderTrackingScreen extends ConsumerWidget {
  const OrderTrackingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenant = ref.watch(tenantProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppTopBar(
        title: 'Track Order',
        actions: [
          AppTopBar.actionButton(
            icon: Icons.help_outline_rounded,
            onTap: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(24.w),
        child: Column(
          children: [
            // Tracking Card
            Container(
              padding: EdgeInsets.all(24.w),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24.r),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 15, offset: const Offset(0, 6)),
                ],
                border: Border.all(color: const Color(0xFFF1F5F9), width: 1.w),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'ORDER ID',
                            style: TextStyle(
                              fontSize: 10.sp,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF94A3B8),
                              letterSpacing: 1.5,
                            ),
                          ),
                          SizedBox(height: 4.h),
                          Text(
                            '#000117',
                            style: TextStyle(
                              fontSize: 26.sp, 
                              fontWeight: FontWeight.w800, 
                              color: const Color(0xFF0F172A),
                              letterSpacing: -0.5,
                            ),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            'EST. TIME',
                            style: TextStyle(
                              fontSize: 10.sp,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF94A3B8),
                              letterSpacing: 1.5,
                            ),
                          ),
                          SizedBox(height: 4.h),
                          Text(
                            '5 mins',
                            style: TextStyle(
                              fontSize: 26.sp, 
                              fontWeight: FontWeight.w800, 
                              color: tenant.primaryColor,
                              letterSpacing: -0.5,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  SizedBox(height: 32.h),
                  // Stepper
                  _buildStepper(tenant),
                ],
              ),
            ),
            SizedBox(height: 24.h),
            // Order Summary Card
            Container(
              padding: EdgeInsets.all(24.w),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24.r),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 15, offset: const Offset(0, 6)),
                ],
                border: Border.all(color: const Color(0xFFF1F5F9), width: 1.w),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Order Summary',
                    style: TextStyle(
                      fontSize: 16.sp, 
                      fontWeight: FontWeight.w800, 
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  SizedBox(height: 20.h),
                  _buildSummaryItem(
                    '2x Ice Matcha Coffee',
                    'Large • Cloud Foam',
                    'Rp 76.000',
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuDv3GTavczasScBZ-fNGjS1OIu6hBJFWo2NCIMvU6umDihIp_imLv0CSrV7atCT94K1ozSAA9nCLn83gsFXCdhWwuNptCcJVwGeDewpj_nYdGDeieRHiqU17fMmzeTEeCvT_DarWz-WzMmiIZHz0e3TrUyseZofVj1gnGyeQNBsv4_rV_YvJBT_LkpokdAMXTxpYg2z9xF_36GO8K-7S29xULBYfQ-QlHDzUamPFEy5QJOMPZLuMkDH1EtQ0UjP9_yQBoPVUvprtpsM',
                  ),
                  SizedBox(height: 20.h),
                  Container(height: 1.h, color: const Color(0xFFF8FAFC)),
                  SizedBox(height: 20.h),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'TOTAL AMOUNT',
                            style: TextStyle(
                              fontSize: 10.sp,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF94A3B8),
                              letterSpacing: 1.5,
                            ),
                          ),
                          SizedBox(height: 2.h),
                          Text(
                            'via GoPay',
                            style: TextStyle(
                              fontSize: 12.sp, 
                              color: const Color(0xFF94A3B8), 
                              fontStyle: FontStyle.italic,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        'Rp 76.000',
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
            ),
            SizedBox(height: 16.h),
            // Location Card
            Container(
              padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 14.h),
              decoration: BoxDecoration(
                color: Color.lerp(tenant.primaryColor, Colors.white, 0.95),
                borderRadius: BorderRadius.circular(20.r),
                border: Border.all(color: tenant.primaryColor.withOpacity(0.1), width: 1.w),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44.w,
                    height: 44.w,
                    decoration: BoxDecoration(
                      color: tenant.primaryColor,
                      borderRadius: BorderRadius.circular(14.r),
                      boxShadow: [
                        BoxShadow(color: tenant.primaryColor.withOpacity(0.2), blurRadius: 8, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: Icon(Icons.storefront_rounded, color: Colors.white, size: 22.w),
                  ),
                  SizedBox(width: 16.w),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'PICKUP LOCATION',
                        style: TextStyle(
                          fontSize: 10.sp,
                          fontWeight: FontWeight.w800,
                          color: tenant.primaryColor,
                          letterSpacing: 1.2,
                        ),
                      ),
                      SizedBox(height: 2.h),
                      Text(
                        'Outlet Central Park, Level 1',
                        style: TextStyle(
                          fontSize: 15.sp, 
                          fontWeight: FontWeight.w800, 
                          color: const Color(0xFF1E293B),
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
    );
  }

  Widget _buildStepper(TenantConfig tenant) {
    return Column(
      children: [
        _buildStepItem(
          icon: Icons.check_rounded,
          title: 'Paid',
          subtitle: 'Order successfully placed',
          isCompleted: true,
          isActive: false,
          isLast: false,
          tenant: tenant,
        ),
        _buildStepItem(
          icon: Icons.coffee_rounded,
          title: 'Preparing',
          subtitle: 'Barista is working on your coffee',
          isCompleted: false,
          isActive: true,
          isLast: false,
          tenant: tenant,
        ),
        _buildStepItem(
          icon: Icons.shopping_basket_rounded,
          title: 'Ready for Pickup',
          subtitle: 'Awaiting your arrival',
          isCompleted: false,
          isActive: false,
          isLast: false,
          tenant: tenant,
        ),
        _buildStepItem(
          icon: Icons.celebration_rounded,
          title: 'Done',
          subtitle: 'Enjoy your drink',
          isCompleted: false,
          isActive: false,
          isLast: true,
          tenant: tenant,
        ),
      ],
    );
  }

  Widget _buildStepItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool isCompleted,
    required bool isActive,
    required bool isLast,
    required TenantConfig tenant,
  }) {
    final Color activeColor = tenant.primaryColor;
    final Color inactiveColor = const Color(0xFFF1F5F9);

    return IntrinsicHeight(
      child: Row(
        children: [
          Column(
            children: [
              Container(
                width: 32.w,
                height: 32.w,
                decoration: BoxDecoration(
                  color: isCompleted
                      ? activeColor
                      : (isActive ? activeColor.withOpacity(0.15) : inactiveColor),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: isCompleted
                      ? Icon(Icons.check_rounded, color: Colors.white, size: 16.w)
                      : (isActive
                          ? Container(
                              width: 14.w,
                              height: 14.w,
                              decoration: BoxDecoration(
                                color: activeColor, 
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(color: activeColor.withOpacity(0.3), blurRadius: 8, spreadRadius: 1),
                                ],
                              ),
                            )
                          : Container(
                              width: 8.w,
                              height: 8.w,
                              decoration: BoxDecoration(color: const Color(0xFFCBD5E1), shape: BoxShape.circle),
                            )),
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2.5.w,
                    margin: EdgeInsets.symmetric(vertical: 4.h),
                    decoration: BoxDecoration(
                      color: isCompleted ? activeColor : inactiveColor,
                      borderRadius: BorderRadius.circular(1.r),
                    ),
                  ),
                ),
            ],
          ),
          SizedBox(width: 20.w),
          Padding(
            padding: EdgeInsets.only(bottom: isLast ? 0 : 36.h),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 16.sp,
                    fontWeight: FontWeight.w800,
                    color: (isCompleted || isActive) ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
                  ),
                ),
                SizedBox(height: 2.h),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 13.sp,
                    fontWeight: FontWeight.w500,
                    color: (isCompleted || isActive) ? const Color(0xFF64748B) : const Color(0xFFCBD5E1),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryItem(String name, String options, String price, String imageUrl) {
    return Row(
      children: [
        Container(
          width: 56.w,
          height: 56.w,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14.r),
            image: DecorationImage(image: NetworkImage(imageUrl), fit: BoxFit.cover),
          ),
        ),
        SizedBox(width: 16.w),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                style: TextStyle(
                  fontSize: 15.sp, 
                  fontWeight: FontWeight.w700, 
                  color: const Color(0xFF1E293B),
                ),
              ),
              SizedBox(height: 2.h),
              Text(
                options,
                style: TextStyle(
                  fontSize: 12.sp, 
                  color: const Color(0xFF94A3B8),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        Text(
          price,
          style: TextStyle(
            fontSize: 15.sp, 
            fontWeight: FontWeight.w800, 
            color: const Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }
}
