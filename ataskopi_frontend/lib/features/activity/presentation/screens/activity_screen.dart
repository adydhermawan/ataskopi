import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:ataskopi_frontend/shared/widgets/app_top_bar.dart';
import 'package:ataskopi_frontend/core/providers/tenant_provider.dart';
import 'package:ataskopi_frontend/features/activity/presentation/screens/order_tracking_screen.dart';
import 'package:ataskopi_frontend/features/order/presentation/providers/order_providers.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';

class ActivityScreen extends ConsumerStatefulWidget {
  const ActivityScreen({super.key});

  @override
  ConsumerState<ActivityScreen> createState() => _ActivityScreenState();
}




class _ActivityScreenState extends ConsumerState<ActivityScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _startPolling();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _tabController.dispose();
    super.dispose();
  }

  void _startPolling() {
    _timer = Timer.periodic(const Duration(seconds: 5), (timer) {
      // Only refresh active orders if we are on the Active tab
      if (_tabController.index == 0 && mounted) {
        final activeOrders = ref.read(activeOrdersProvider);
        
        // If data is available and list is empty, don't poll to save resources
        // If there's an error, we keep polling to retry
        // If it's loading, we let it finish
        activeOrders.when(
          data: (orders) {
            if (orders.isNotEmpty) {
              ref.invalidate(activeOrdersProvider);
            }
          },
          loading: () {}, // Wait for initial/current load to finish
          error: (e, s) => ref.invalidate(activeOrdersProvider), // Retry on error
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantProvider);
    final activeOrdersAsync = ref.watch(activeOrdersProvider);
    final historyOrdersAsync = ref.watch(historyOrdersProvider);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppTopBar(
        title: 'Pesanan Saya',
        showBackButton: false,
      ),
      body: Column(
        children: [
          // Tab Switcher
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
            child: Container(
              height: 44.h,
              padding: EdgeInsets.all(4.w),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(16.r),
              ),
              child: TabBar(
                controller: _tabController,
                indicator: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12.r),
                ),
                labelColor: tenant.primaryColor,
                unselectedLabelColor: const Color(0xFF94A3B8),
                labelStyle: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w700),
                unselectedLabelStyle: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w600),
                indicatorSize: TabBarIndicatorSize.tab,
                dividerColor: Colors.transparent,
                tabs: const [
                  Tab(text: 'Aktif'),
                  Tab(text: 'Riwayat'),
                ],
              ),
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildOrderList(activeOrdersAsync, tenant, false),
                _buildOrderList(historyOrdersAsync, tenant, true),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderList(AsyncValue<List<Order>> ordersAsync, TenantConfig tenant, bool isHistory) {
    // Prioritize showing data if available to prevent flickering during polling
    if (ordersAsync.hasValue) {
      return _buildSuccessList(ordersAsync.value!, tenant, isHistory);
    } else if (ordersAsync.isLoading) {
      return const Center(child: CircularProgressIndicator());
    } else if (ordersAsync.hasError) {
      return Center(child: Text('Error: ${ordersAsync.error}'));
    }
    return const SizedBox();
  }

  Widget _buildSuccessList(List<Order> orders, TenantConfig tenant, bool isHistory) {
        if (orders.isEmpty) {
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(activeOrdersProvider);
              ref.invalidate(historyOrdersProvider);
            },
            child: LayoutBuilder(
              builder: (context, constraints) => SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: SizedBox(
                  height: constraints.maxHeight,
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.receipt_long_outlined, size: 64.w, color: const Color(0xFFCBD5E1)),
                        SizedBox(height: 16.h),
                        Text(
                          'Belum ada pesanan',
                          style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.w600, color: const Color(0xFF94A3B8)),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          );
        }
        return RefreshIndicator(
          onRefresh: () async {
             // Invalidate both providers to ensure fresh data
             ref.invalidate(activeOrdersProvider);
             ref.invalidate(historyOrdersProvider);
             await Future.delayed(const Duration(milliseconds: 500)); // UI delay
          },
          child: ListView.builder(
            padding: EdgeInsets.symmetric(horizontal: 16.w),
            physics: const AlwaysScrollableScrollPhysics(), // Required for RefreshIndicator on empty lists
            itemCount: orders.length,
            itemBuilder: (context, index) {
              final order = orders[index];
              return _buildOrderCard(
                order: order,
                isHistory: isHistory,
                tenant: tenant,
              );
            },
          ),
        );
  }

  Widget _buildOrderCard({
    required Order order,
    required bool isHistory,
    required TenantConfig tenant,
  }) {
    try {
      Color statusColor;
      switch (order.orderStatus.toLowerCase()) {
        case 'completed': statusColor = const Color(0xFF22C55E); break;
        case 'cancelled': statusColor = const Color(0xFFEF4444); break;
        default: statusColor = tenant.primaryColor;
      }

      return Container(
        margin: EdgeInsets.only(bottom: 16.h),
        padding: EdgeInsets.all(12.w),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20.r),
          border: Border.all(color: const Color(0xFFF1F5F9), width: 1.5.w),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 4)),
          ],
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 40.w,
                      height: 40.w,
                      decoration: BoxDecoration(
                        color: tenant.primaryColor.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(12.r),
                      ),
                      child: Icon(Icons.coffee_rounded, color: tenant.primaryColor, size: 20.w),
                    ),
                    SizedBox(width: 12.w),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          order.orderNumber.isNotEmpty 
                              ? '#${order.orderNumber}' 
                              : '#${order.id.substring(0, 8).toUpperCase()}',
                          style: TextStyle(
                            fontSize: 13.sp, 
                            fontWeight: FontWeight.w700, 
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                        Text(
                          'Hari ini', // Or format order.createdAt
                          style: TextStyle(
                            fontSize: 11.sp, 
                            color: const Color(0xFF94A3B8),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(8.r),
                  ),
                  child: Text(
                    order.orderStatus.toUpperCase(),
                    style: TextStyle(
                      fontSize: 10.sp, 
                      fontWeight: FontWeight.w800, 
                      color: statusColor,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: 16.h),
            Container(height: 1.h, color: const Color(0xFFF8FAFC)),
            SizedBox(height: 16.h),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                order.items.map((e) => '${e.quantity}x ${e.productName}').join(', '),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 14.sp, 
                  color: const Color(0xFF475569), 
                  fontWeight: FontWeight.w600,
                  height: 1.4,
                ),
              ),
            ),
            SizedBox(height: 18.h),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Total Harga',
                      style: TextStyle(
                        fontSize: 11.sp, 
                        color: const Color(0xFF94A3B8),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      'Rp ${(order.total / 1000).toInt()}.000',
                      style: TextStyle(
                        fontSize: 16.sp, 
                        fontWeight: FontWeight.w800, 
                        color: const Color(0xFF0F172A),
                        letterSpacing: -0.5,
                      ),
                    ),
                  ],
                ),
                SizedBox(
                  height: 40.h,
                  child: OutlinedButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => OrderTrackingScreen(orderId: order.id)),
                      );
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: tenant.primaryColor,
                      side: BorderSide(color: tenant.primaryColor, width: 2.w),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14.r)),
                      padding: EdgeInsets.symmetric(horizontal: 24.w),
                    ),
                    child: Text(
                      'Detail',
                      style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w800),
                    ),
                  ),
                ),

              ],
            ),
          ],
        ),
      );
    } catch (e, s) {
      return Container(
        height: 100,
        color: Colors.red.shade100,
        child: Center(child: Text('Error rendering card: $e', style: const TextStyle(color: Colors.red))),
      );
    }
  }
}
