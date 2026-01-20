import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'pickup_time_modal.dart';
import '../screens/dine_in_scanner_screen.dart';
import '../../../order/presentation/screens/delivery_address_screen.dart';

class OrderModeSelector extends StatelessWidget {
  const OrderModeSelector({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildModeCard(
                context,
                title: 'Pick Up',
                subtitle: 'Skip the queue',
                icon: Icons.shopping_basket_rounded,
                bgColor: const Color(0xFFFFFBEB),
                iconBgColor: Colors.white,
                iconColor: const Color(0xFFD97706),
                accentIcon: Icons.shopping_basket_rounded,
                onTap: () => PickupTimeModal.show(context),
              ),
            ),
            SizedBox(width: 16.w),
            Expanded(
              child: _buildModeCard(
                context,
                title: 'Delivery',
                subtitle: 'Doorstep service',
                icon: Icons.delivery_dining_rounded,
                bgColor: const Color(0xFFFFF5F1),
                iconBgColor: Colors.white,
                iconColor: const Color(0xFFF97316),
                accentIcon: Icons.moped_rounded,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const DeliveryAddressScreen()),
                  );
                },
              ),
            ),
          ],
        ),
        SizedBox(height: 16.h),
        _buildModeCard(
          context,
          title: 'Dine In',
          subtitle: 'Reserve or order at table',
          icon: Icons.restaurant_rounded,
          bgColor: const Color(0xFFEFF6FF),
          iconBgColor: Colors.white,
          iconColor: const Color(0xFF1E40AF),
          accentIcon: Icons.flatware_rounded,
          isWide: true,
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const DineInScannerScreen()),
            );
          },
        ),
      ],
    );
  }

  Widget _buildModeCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color bgColor,
    required Color iconBgColor,
    required Color iconColor,
    required IconData accentIcon,
    required VoidCallback onTap,
    bool isWide = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24.r),
      child: Container(
        height: isWide ? 110.h : 200.h,
        padding: EdgeInsets.all(16.w),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(24.r),
          boxShadow: [
            BoxShadow(
              color: iconColor.withOpacity(0.05),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            // Background Decorative Icon
            Positioned(
              bottom: -16.w,
              right: -16.w,
              child: Transform.rotate(
                angle: 0.2,
                child: Icon(
                  accentIcon,
                  size: 110.w,
                  color: iconColor.withOpacity(0.06),
                ),
              ),
            ),
            // Content
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: isWide ? MainAxisAlignment.center : MainAxisAlignment.start,
              children: [
                if (!isWide) ...[
                  Container(
                    width: 44.w,
                    height: 44.w,
                    decoration: BoxDecoration(
                      color: iconBgColor,
                      borderRadius: BorderRadius.circular(12.r),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.06),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Icon(icon, color: iconColor, size: 24.w),
                  ),
                  SizedBox(height: 24.h),
                ],
                if (isWide)
                  Row(
                    children: [
                      Container(
                          width: 44.w,
                          height: 44.w,
                          decoration: BoxDecoration(
                            color: iconBgColor,
                            borderRadius: BorderRadius.circular(12.r),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.06),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Icon(icon, color: iconColor, size: 24.w),
                      ),
                      SizedBox(width: 16.w),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              title,
                              style: TextStyle(
                                fontSize: 17.sp,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF1E293B),
                                letterSpacing: -0.5,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              subtitle,
                              style: TextStyle(
                                fontSize: 12.sp,
                                color: const Color(0xFF64748B),
                                fontWeight: FontWeight.w500,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  )
                else ...[
                  const Spacer(),
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 18.sp,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF1E293B),
                      letterSpacing: -0.5,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 13.sp,
                      color: const Color(0xFF64748B),
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
