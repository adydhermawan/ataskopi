import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../../core/providers/tenant_provider.dart';
import '../../../../shared/widgets/app_top_bar.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  String _selectedFilter = 'All';

  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppTopBar(
        title: 'Notifications',
        actions: [
          AppTopBar.actionButton(
            icon: Icons.done_all_rounded,
            onTap: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips
          Container(
            height: 60.h,
            padding: EdgeInsets.symmetric(vertical: 10.h),
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.symmetric(horizontal: 24.w),
              children: [
                _buildFilterChip('All', null),
                _buildFilterChip('Transaksi', tenant.primaryColor),
                _buildFilterChip('Promo', const Color(0xFFEA580C)),
                _buildFilterChip('Loyalty', const Color(0xFFCA8A04)),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 12.h),
              children: [
                _buildSectionHeader('New'),
                _buildNotificationItem(
                  category: 'TRANSAKSI',
                  categoryColor: tenant.primaryColor,
                  icon: Icons.receipt_long_rounded,
                  title: 'Order #4092 is ready!',
                  subtitle: 'Your Iced Americano and Croissant are waiting at the pickup counter.',
                  time: '2m ago',
                  isUnread: true,
                  tenant: tenant,
                ),
                _buildNotificationItem(
                  category: 'PROMO',
                  categoryColor: const Color(0xFFEA580C),
                  icon: Icons.local_offer_rounded,
                  title: 'Flash Sale: 50% off Lattes',
                  subtitle: 'Valid until 2 PM today only. Don\'t miss out on your afternoon boost!',
                  time: '30m ago',
                  isUnread: true,
                  tenant: tenant,
                ),
                SizedBox(height: 24.h),
                _buildSectionHeader('Earlier'),
                _buildNotificationItem(
                  category: 'LOYALTY',
                  categoryColor: const Color(0xFFCA8A04),
                  icon: Icons.star_rounded,
                  title: 'You earned 50 beans',
                  subtitle: 'Great job! You are 120 beans away from a free drink.',
                  time: '2h ago',
                  isUnread: false,
                  tenant: tenant,
                ),
                _buildNotificationItem(
                  category: 'TRANSAKSI',
                  categoryColor: tenant.primaryColor,
                  icon: Icons.description_rounded,
                  title: 'Receipt for Order #4088',
                  subtitle: 'Total paid: Rp 12.500. View your full receipt details here.',
                  time: 'Yesterday',
                  isUnread: false,
                  tenant: tenant,
                ),
                _buildNotificationItem(
                  category: 'PROMO',
                  categoryColor: const Color(0xFFEA580C),
                  icon: Icons.donut_small_rounded,
                  title: 'Free Donut with purchase',
                  subtitle: 'Thanks for being a loyal customer! Enjoy a sweet treat on us.',
                  time: '2d ago',
                  isUnread: false,
                  tenant: tenant,
                ),
                // Empty state indicator
                SizedBox(height: 40.h),
                Center(
                  child: Column(
                    children: [
                      Container(
                        padding: EdgeInsets.all(20.w),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(Icons.notifications_off_outlined, color: const Color(0xFF94A3B8), size: 32.w),
                      ),
                      SizedBox(height: 12.h),
                      Text(
                        'End of list',
                        style: TextStyle(
                          fontSize: 13.sp,
                          color: const Color(0xFF94A3B8),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: 40.h),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, Color? color) {
    final bool isSelected = _selectedFilter == label;
    return Padding(
      padding: EdgeInsets.only(right: 12.w),
      child: InkWell(
        onTap: () => setState(() => _selectedFilter = label),
        borderRadius: BorderRadius.circular(100),
        child: Container(
          padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 8.h),
          decoration: BoxDecoration(
            color: isSelected ? (color ?? const Color(0xFF0F172A)) : Colors.white,
            borderRadius: BorderRadius.circular(100),
            border: Border.all(
              color: isSelected ? Colors.transparent : const Color(0xFFE2E8F0),
              width: 1.w,
            ),
            boxShadow: isSelected
                ? [BoxShadow(color: (color ?? const Color(0xFF0F172A)).withOpacity(0.2), blurRadius: 8, offset: const Offset(0, 4))]
                : null,
          ),
          child: Row(
            children: [
              if (color != null && !isSelected) ...[
                Container(
                  width: 8.w,
                  height: 8.w,
                  decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                ),
                SizedBox(width: 8.w),
              ],
              Text(
                label,
                style: TextStyle(
                  fontSize: 13.sp,
                  fontWeight: FontWeight.w700,
                  color: isSelected ? Colors.white : const Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: EdgeInsets.only(bottom: 16.h, left: 4.w),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          fontSize: 12.sp,
          fontWeight: FontWeight.w800,
          color: const Color(0xFF94A3B8),
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _buildNotificationItem({
    required String category,
    required Color categoryColor,
    required IconData icon,
    required String title,
    required String subtitle,
    required String time,
    required bool isUnread,
    required TenantConfig tenant,
  }) {
    return Container(
      margin: EdgeInsets.only(bottom: 16.h),
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20.r),
        border: Border.all(
          color: isUnread ? Colors.transparent : const Color(0xFFF1F5F9),
          width: 1.5.w,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isUnread ? 0.05 : 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        children: [
          if (isUnread)
            Positioned(
              right: 0,
              top: 0,
              child: Container(
                width: 10.w,
                height: 10.w,
                decoration: BoxDecoration(
                  color: tenant.primaryColor,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2.w),
                ),
              ),
            ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 52.w,
                height: 52.w,
                decoration: BoxDecoration(
                  color: categoryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(14.r),
                ),
                child: Icon(icon, color: categoryColor, size: 26.w),
              ),
              SizedBox(width: 16.w),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
                          decoration: BoxDecoration(
                            color: categoryColor.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(6.r),
                          ),
                          child: Text(
                            category,
                            style: TextStyle(
                              fontSize: 9.sp,
                              fontWeight: FontWeight.w800,
                              color: categoryColor,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        SizedBox(width: 8.w),
                        Text(
                          time,
                          style: TextStyle(
                            fontSize: 11.sp,
                            color: const Color(0xFF94A3B8),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 8.h),
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 15.sp,
                        fontWeight: FontWeight.w800,
                        color: isUnread ? const Color(0xFF0F172A) : const Color(0xFF475569),
                        height: 1.2,
                      ),
                    ),
                    SizedBox(height: 4.h),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 13.sp,
                        color: const Color(0xFF64748B),
                        height: 1.4,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
extension on Container {
  // Mock ring for container (Flutter doesn't have ring directly, used Stack or border)
  // I'll adjust the decoration in the actual code above.
}
