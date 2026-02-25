import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../../core/providers/tenant_provider.dart';
import '../../../../shared/widgets/app_top_bar.dart';
import '../providers/notification_provider.dart';
import '../providers/home_providers.dart';
import '../../../menu/presentation/screens/menu_catalog_screen.dart';
import '../../../shared/domain/models/models.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  String _selectedFilter = 'all';

  @override
  void initState() {
    super.initState();
    // Load notifications on init
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(notificationStateProvider.notifier).loadNotifications();
    });
  }

  void _onFilterChanged(String filter) {
    setState(() => _selectedFilter = filter);
    ref.read(notificationStateProvider.notifier).loadNotifications(
      category: filter == 'all' ? null : filter,
    );
  }

  Future<void> _onRefresh() async {
    await ref.read(notificationStateProvider.notifier).loadNotifications(
      category: _selectedFilter == 'all' ? null : _selectedFilter,
    );
  }

  void _markAllAsRead() {
    ref.read(notificationStateProvider.notifier).markAllAsRead();
  }

  void _onNotificationTap(NotificationModel notification) {
    if (!notification.isRead) {
      ref.read(notificationStateProvider.notifier).markAsRead(notification.id);
    }
    
    // Navigate based on category
    switch (notification.category) {
      case 'transaction':
        // Go to Activity Tab (Index 1)
        ref.read(homeTabIndexProvider.notifier).state = 1;
        Navigator.pop(context); // Return to MainScreen
        break;
      case 'loyalty':
        // Go to Rewards Tab (Index 2)
        ref.read(homeTabIndexProvider.notifier).state = 2;
        Navigator.pop(context); // Return to MainScreen
        break;
      case 'promo':
        // Go to Menu via Catalog
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const MenuCatalogScreen()),
        );
        break;
      case 'info':
      default:
        // Already marked as read, detailed info is in the message
        break;
    }
  }

  String _formatTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final diff = now.difference(dateTime);
    
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
  }

  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantProvider);
    final notificationState = ref.watch(notificationStateProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppTopBar(
        title: 'Notifications',
        actions: [
          AppTopBar.actionButton(
            icon: Icons.done_all_rounded,
            onTap: _markAllAsRead,
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
                _buildFilterChip('all', 'All', null),
                _buildFilterChip('transaction', 'Transaksi', tenant.primaryColor),
                _buildFilterChip('promo', 'Promo', const Color(0xFFEA580C)),
                _buildFilterChip('loyalty', 'Loyalty', const Color(0xFFCA8A04)),
              ],
            ),
          ),
          Expanded(
            child: notificationState.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.error_outline, size: 48.w, color: Colors.red[300]),
                    SizedBox(height: 16.h),
                    Text(
                      'Failed to load notifications',
                      style: TextStyle(fontSize: 16.sp, color: const Color(0xFF64748B)),
                    ),
                    SizedBox(height: 16.h),
                    ElevatedButton(
                      onPressed: _onRefresh,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
              data: (notifications) => RefreshIndicator(
                onRefresh: _onRefresh,
                child: notifications.isEmpty
                    ? _buildEmptyState()
                    : _buildNotificationList(notifications, tenant),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return ListView(
      children: [
        SizedBox(height: 100.h),
        Center(
          child: Column(
            children: [
              Container(
                padding: EdgeInsets.all(24.w),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.notifications_off_outlined,
                  color: const Color(0xFF94A3B8),
                  size: 48.w,
                ),
              ),
              SizedBox(height: 16.h),
              Text(
                'No notifications yet',
                style: TextStyle(
                  fontSize: 16.sp,
                  color: const Color(0xFF64748B),
                  fontWeight: FontWeight.w600,
                ),
              ),
              SizedBox(height: 8.h),
              Text(
                'Check back later for updates',
                style: TextStyle(
                  fontSize: 14.sp,
                  color: const Color(0xFF94A3B8),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildNotificationList(List<NotificationModel> notifications, TenantConfig tenant) {
    // Separate new (unread) and earlier (read) notifications
    final newNotifications = notifications.where((n) => !n.isRead).toList();
    final earlierNotifications = notifications.where((n) => n.isRead).toList();

    return ListView(
      padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 12.h),
      children: [
        if (newNotifications.isNotEmpty) ...[
          _buildSectionHeader('New'),
          ...newNotifications.map((n) => _buildNotificationItem(
            notification: n,
            tenant: tenant,
          )),
          SizedBox(height: 24.h),
        ],
        if (earlierNotifications.isNotEmpty) ...[
          _buildSectionHeader('Earlier'),
          ...earlierNotifications.map((n) => _buildNotificationItem(
            notification: n,
            tenant: tenant,
          )),
        ],
        SizedBox(height: 40.h),
        _buildEndOfList(),
        SizedBox(height: 40.h),
      ],
    );
  }

  Widget _buildEndOfList() {
    return Center(
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
    );
  }

  Color _getCategoryColor(String category, TenantConfig tenant) {
    switch (category) {
      case 'transaction':
        return tenant.primaryColor;
      case 'promo':
        return const Color(0xFFEA580C);
      case 'loyalty':
        return const Color(0xFFCA8A04);
      default:
        return const Color(0xFF64748B);
    }
  }

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'transaction':
        return Icons.receipt_long_rounded;
      case 'promo':
        return Icons.local_offer_rounded;
      case 'loyalty':
        return Icons.star_rounded;
      default:
        return Icons.info_rounded;
    }
  }

  Widget _buildFilterChip(String value, String label, Color? color) {
    final bool isSelected = _selectedFilter == value;
    return Padding(
      padding: EdgeInsets.only(right: 12.w),
      child: InkWell(
        onTap: () => _onFilterChanged(value),
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
    required NotificationModel notification,
    required TenantConfig tenant,
  }) {
    final categoryColor = _getCategoryColor(notification.category, tenant);
    final categoryIcon = _getCategoryIcon(notification.category);
    final isUnread = !notification.isRead;

    return GestureDetector(
      onTap: () => _onNotificationTap(notification),
      child: Container(
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
                  child: Icon(categoryIcon, color: categoryColor, size: 26.w),
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
                              notification.category.toUpperCase(),
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
                            _formatTimeAgo(notification.createdAt),
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
                        notification.title,
                        style: TextStyle(
                          fontSize: 15.sp,
                          fontWeight: FontWeight.w800,
                          color: isUnread ? const Color(0xFF0F172A) : const Color(0xFF475569),
                          height: 1.2,
                        ),
                      ),
                      SizedBox(height: 4.h),
                      Text(
                        notification.message,
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
      ),
    );
  }
}

