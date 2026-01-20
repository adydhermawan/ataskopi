import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../../core/providers/tenant_provider.dart';
import 'order_tracking_screen.dart';
import '../../../../shared/widgets/app_top_bar.dart';

class ActivityScreen extends ConsumerStatefulWidget {
  const ActivityScreen({super.key});

  @override
  ConsumerState<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends ConsumerState<ActivityScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantProvider);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppTopBar(
        title: 'Pesanan Saya',
        showBackButton: false,
        actions: [
          AppTopBar.actionButton(
            icon: Icons.search_rounded,
            onTap: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          // Tab Switcher
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 16.h),
            child: Container(
              height: 52.h,
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
                _buildActiveTab(tenant),
                _buildHistoryTab(tenant),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveTab(TenantConfig tenant) {
    return ListView(
      padding: EdgeInsets.symmetric(horizontal: 24.w),
      children: [
        _buildOrderCard(
          id: 'ORD-20240119-01',
          date: 'Hari ini, 10:45',
          status: 'PROSES',
          statusColor: tenant.primaryColor,
          items: '1x Iced Spanish Latte, 1x Avocado Toast',
          price: 'Rp 92.400',
          isHistory: false,
          tenant: tenant,
        ),
      ],
    );
  }

  Widget _buildHistoryTab(TenantConfig tenant) {
    return ListView(
      padding: EdgeInsets.symmetric(horizontal: 24.w),
      children: [
        _buildOrderCard(
          id: 'ORD-20230812',
          date: '12 Aug 2023, 10:45 AM',
          status: 'SELESAI',
          statusColor: const Color(0xFF22C55E),
          items: '1x Flat White, 1x Avo Toast',
          price: 'Rp 65.000',
          isHistory: true,
          tenant: tenant,
        ),
        _buildOrderCard(
          id: 'ORD-20230810',
          date: '10 Aug 2023, 08:30 AM',
          status: 'SELESAI',
          statusColor: const Color(0xFF22C55E),
          items: '1x Cold Brew, 1x Almond Croissant',
          price: 'Rp 45.000',
          isHistory: true,
          tenant: tenant,
        ),
        _buildOrderCard(
          id: 'ORD-20230808',
          date: '08 Aug 2023, 15:12 PM',
          status: 'DIBATALKAN',
          statusColor: const Color(0xFF94A3B8),
          items: '2x Caramel Macchiato',
          price: 'Rp 48.000',
          isHistory: true,
          tenant: tenant,
        ),
      ],
    );
  }

  Widget _buildOrderCard({
    required String id,
    required String date,
    required String status,
    required Color statusColor,
    required String items,
    required String price,
    required bool isHistory,
    required TenantConfig tenant,
  }) {
    return Container(
      margin: EdgeInsets.only(bottom: 20.h),
      padding: EdgeInsets.all(16.w),
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
                    width: 48.w,
                    height: 48.w,
                    decoration: BoxDecoration(
                      color: tenant.primaryColor.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(14.r),
                    ),
                    child: Icon(Icons.coffee_rounded, color: tenant.primaryColor, size: 24.w),
                  ),
                  SizedBox(width: 14.w),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '#$id',
                        style: TextStyle(
                          fontSize: 13.sp, 
                          fontWeight: FontWeight.w700, 
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        date,
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
                  status,
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
              items,
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
                    price,
                    style: TextStyle(
                      fontSize: 18.sp, 
                      fontWeight: FontWeight.w800, 
                      color: const Color(0xFF0F172A),
                      letterSpacing: -0.5,
                    ),
                  ),
                ],
              ),
              if (isHistory)
                SizedBox(
                  height: 48.h,
                  child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: tenant.primaryColor,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14.r)),
                      elevation: 0,
                      shadowColor: tenant.primaryColor.withOpacity(0.4),
                      padding: EdgeInsets.symmetric(horizontal: 24.w),
                    ),
                    child: Text(
                      'Order Lagi',
                      style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w800),
                    ),
                  ),
                )
              else
                SizedBox(
                  height: 48.h,
                  child: OutlinedButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const OrderTrackingScreen()),
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
  }
}
