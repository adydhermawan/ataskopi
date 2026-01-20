import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../../core/providers/tenant_provider.dart';
import '../../../../shared/widgets/app_top_bar.dart';
import '../widgets/home_banner.dart';
import '../widgets/outlet_selector.dart';
import '../widgets/order_mode_selector.dart';
import '../widgets/product_recommendation.dart';
import '../../../menu/presentation/screens/menu_catalog_screen.dart';
import '../../../activity/presentation/screens/activity_screen.dart';
import '../screens/notifications_screen.dart';
import '../screens/rewards_screen.dart';
import '../../../profile/presentation/screens/profile_screen.dart';

class HomeMainScreen extends ConsumerStatefulWidget {
  const HomeMainScreen({super.key});

  @override
  ConsumerState<HomeMainScreen> createState() => _HomeMainScreenState();
}

class _HashNavIcon extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;
  final Color activeColor;

  const _HashNavIcon({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.onTap,
    required this.activeColor,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            color: isActive ? activeColor : const Color(0xFF94A3B8),
            size: 24.w,
          ),
          SizedBox(height: 4.h),
          Text(
            label,
            style: TextStyle(
              fontSize: 10.sp,
              fontWeight: FontWeight.w500,
              color: isActive ? activeColor : const Color(0xFF94A3B8),
            ),
          ),
        ],
      ),
    );
  }
}

class _HomeMainScreenState extends ConsumerState<HomeMainScreen> {
  int _bottomNavIndex = 0;

  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantProvider);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: IndexedStack(
        index: _bottomNavIndex,
        children: [
          _buildHomeContent(context, tenant),
          const ActivityScreen(),
          const RewardsScreen(),
          const ProfileScreen(),
        ],
      ),
      bottomNavigationBar: ClipRRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            height: 80.h + ScreenUtil().bottomBarHeight,
            padding: EdgeInsets.only(
              left: 40.w,
              right: 40.w,
              top: 12.h,
              bottom: ScreenUtil().bottomBarHeight,
            ),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.9),
              border: Border(
                top: BorderSide(color: const Color(0xFFE2E8F0), width: 1.w),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _HashNavIcon(
                  icon: Icons.home_rounded,
                  label: 'Home',
                  isActive: _bottomNavIndex == 0,
                  activeColor: tenant.primaryColor,
                  onTap: () => setState(() => _bottomNavIndex = 0),
                ),
                _HashNavIcon(
                  icon: Icons.receipt_long_rounded,
                  label: 'Orders',
                  isActive: _bottomNavIndex == 1,
                  activeColor: tenant.primaryColor,
                  onTap: () => setState(() => _bottomNavIndex = 1),
                ),
                _HashNavIcon(
                  icon: Icons.local_offer_rounded,
                  label: 'Rewards',
                  isActive: _bottomNavIndex == 2,
                  activeColor: tenant.primaryColor,
                  onTap: () => setState(() => _bottomNavIndex = 2),
                ),
                _HashNavIcon(
                  icon: Icons.person_rounded,
                  label: 'Profile',
                  isActive: _bottomNavIndex == 3,
                  activeColor: tenant.primaryColor,
                  onTap: () => setState(() => _bottomNavIndex = 3),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHomeContent(BuildContext context, TenantConfig tenant) {
    return CustomScrollView(
      slivers: [
        // Banner with overlapping items
        SliverToBoxAdapter(
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              HomeBanner(
                imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDv3GTavczasScBZ-fNGjS1OIu6hBJFWo2NCIMvU6umDihIp_imLv0CSrV7atCT94K1ozSAA9nCLn83gsFXCdhWwuNptCcJVwGeDewpj_nYdGDeieRHiqU17fMmzeTEeCvT_DarWz-WzMmiIZHz0e3TrUyseZofVj1gnGyeQNBsv4_rV_YvJBT_LkpokdAMXTxpYg2z9xF_36GO8K-7S29xULBYfQ-QlHDzUamPFEy5QJOMPZLuMkDH1EtQ0UjP9_yQBoPVUvprtpsM',
                title: 'Ice Matcha Coffee with\nCloud Foam & Free Toast',
                tier: 'Gold Member',
                onTierTap: () {
                  setState(() {
                    _bottomNavIndex = 2; // Index for RewardsScreen
                  });
                },
                onNotificationTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                  );
                },
              ),
              Positioned(
                bottom: -40.h,
                left: 20.w,
                right: 20.w,
                child: const OutletSelector(outletName: 'Outlet Central Park'),
              ),
            ],
          ),
        ),
        SliverToBoxAdapter(child: SizedBox(height: 80.h)), // Increased to 80.h for better separation
        SliverToBoxAdapter(child: SizedBox(height: 24.h)),
        // Order Mode Selector
        SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 20.w),
            child: const OrderModeSelector(),
          ),
        ),
        SliverToBoxAdapter(child: SizedBox(height: 24.h)), // Reduced from 32.h
        // Daily Curations Header
        SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 20.w), // Aligned with other sections
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  'Daily Curations',
                  style: TextStyle(
                    fontSize: 20.sp,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const MenuCatalogScreen()),
                    );
                  },
                  child: Text(
                    'View Menu',
                    style: TextStyle(
                      color: tenant.primaryColor,
                      fontWeight: FontWeight.w600,
                      fontSize: 14.sp,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        SliverToBoxAdapter(child: SizedBox(height: 20.h)),
        // Product List
        const SliverToBoxAdapter(child: ProductRecommendationList()),
        SliverToBoxAdapter(child: SizedBox(height: 40.h)),
      ],
    );
  }
}
