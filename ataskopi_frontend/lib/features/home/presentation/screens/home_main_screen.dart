import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:ataskopi_frontend/core/providers/tenant_provider.dart';
import 'package:ataskopi_frontend/shared/widgets/app_top_bar.dart';
import 'package:ataskopi_frontend/features/home/presentation/widgets/home_banner.dart';
import 'package:ataskopi_frontend/features/home/presentation/widgets/outlet_selector.dart';
import 'package:ataskopi_frontend/features/home/presentation/widgets/order_mode_selector.dart';
import 'package:ataskopi_frontend/features/home/presentation/widgets/product_recommendation.dart';
import 'package:ataskopi_frontend/features/menu/presentation/screens/menu_catalog_screen.dart';
import 'package:ataskopi_frontend/features/activity/presentation/screens/activity_screen.dart';
import 'package:ataskopi_frontend/features/home/presentation/screens/notifications_screen.dart';
import 'package:ataskopi_frontend/features/home/presentation/screens/rewards_screen.dart';
import 'package:ataskopi_frontend/features/profile/presentation/screens/profile_screen.dart';
import 'package:ataskopi_frontend/features/home/presentation/providers/home_providers.dart';
import 'package:ataskopi_frontend/features/home/presentation/providers/notification_provider.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';
import 'package:ataskopi_frontend/core/providers/pending_qr_provider.dart';
import 'package:ataskopi_frontend/features/scan/presentation/controllers/scan_controller.dart';

class HomeMainScreen extends ConsumerStatefulWidget {
  const HomeMainScreen({super.key});

  @override
  ConsumerState<HomeMainScreen> createState() => _HomeMainScreenState();
}

class _HashNavIcon extends StatelessWidget {
  final IconData icon;
  final bool isActive;
  final VoidCallback onTap;
  final Color activeColor;

  const _HashNavIcon({
    required this.icon,
    required this.isActive,
    required this.onTap,
    required this.activeColor,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
        child: Icon(
          icon,
          color: isActive ? activeColor : const Color(0xFF94A3B8),
          size: 26.w,
        ),
      ),
    );
  }
}

class _HomeMainScreenState extends ConsumerState<HomeMainScreen> {
  // Removed local _bottomNavIndex
  int _currentPage = 0;
  late final PageController _pageController;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantProvider);
    final bottomNavIndex = ref.watch(homeTabIndexProvider); // Watch provider

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: IndexedStack(
        index: bottomNavIndex,
        children: [
          _buildHomeContent(context, tenant),
          const ActivityScreen(),
          const RewardsScreen(),
          const ProfileScreen(),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          height: 64.h,
          padding: EdgeInsets.only(
            left: 24.w,
            right: 24.w,
          ),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(
              top: BorderSide(color: const Color(0xFFE2E8F0), width: 1.w),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 10,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _HashNavIcon(
              icon: LucideIcons.home,
              isActive: bottomNavIndex == 0,
              activeColor: tenant.primaryColor,
              onTap: () => ref.read(homeTabIndexProvider.notifier).state = 0,
            ),
            _HashNavIcon(
              icon: LucideIcons.history,
              isActive: bottomNavIndex == 1,
              activeColor: tenant.primaryColor,
              onTap: () => ref.read(homeTabIndexProvider.notifier).state = 1,
            ),
            _HashNavIcon(
              icon: LucideIcons.ticket,
              isActive: bottomNavIndex == 2,
              activeColor: tenant.primaryColor,
              onTap: () => ref.read(homeTabIndexProvider.notifier).state = 2,
            ),
            _HashNavIcon(
              icon: LucideIcons.user,
              isActive: bottomNavIndex == 3,
              activeColor: tenant.primaryColor,
              onTap: () => ref.read(homeTabIndexProvider.notifier).state = 3,
            ),
          ],
        ),
      ),
      ),
    );
  }

  Widget _buildHomeContent(BuildContext context, TenantConfig tenant) {
    final bannersAsync = ref.watch(bannersProvider);
    final selectedOutlet = ref.watch(selectedOutletProvider);
    final loyaltyInfoAsync = ref.watch(loyaltyInfoProvider);
    final unreadCountAsync = ref.watch(unreadNotificationCountProvider);
    final unreadCount = unreadCountAsync.valueOrNull ?? 0;

    return CustomScrollView(
      slivers: [
        // Banner with overlapping items
        SliverToBoxAdapter(
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              SizedBox(
                height: (1.sw * 6 / 5) * 0.7,
                child: bannersAsync.when(
                  data: (banners) {
                    final List<dynamic> displayBanners = banners.isEmpty 
                        ? [{'imageUrl': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=1000', 'title': 'Welcome to ATASKOPI'}] 
                        : banners;

                    return PageView.builder(
                      controller: _pageController,
                      itemCount: displayBanners.length,
                      onPageChanged: (index) {
                        setState(() {
                          _currentPage = index;
                        });
                      },
                      itemBuilder: (context, index) {
                        final item = displayBanners[index];
                        final isDefault = item is Map;
                        
                        return HomeBanner(
                          imageUrl: isDefault ? item['imageUrl'] : item.bannerUrl,
                          title: isDefault ? item['title'] : item.title,
                          tier: loyaltyInfoAsync.value?.currentTier?.name ?? 'Member',
                          unreadCount: unreadCount,
                          onTierTap: () => ref.read(homeTabIndexProvider.notifier).state = 2,
                          onNotificationTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen())),
                        );
                      },
                    );
                  },
                  loading: () => Container(height: (1.sw * 6 / 5) * 0.7, color: Colors.grey[200]),
                  error: (e, s) => Container(height: (1.sw * 6 / 5) * 0.7, color: Colors.grey[300]),
                ),
              ),
              
              // Dots Indicator
              if (bannersAsync.valueOrNull != null && bannersAsync.value!.length > 1)
                Positioned(
                  bottom: 100.h,
                  left: 0,
                  right: 0,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(bannersAsync.value!.length, (index) {
                      final isActive = index == _currentPage;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: EdgeInsets.symmetric(horizontal: 4.w),
                        width: isActive ? 32.w : 8.w,
                        height: 6.h,
                        decoration: BoxDecoration(
                          color: isActive ? Colors.white : Colors.white.withOpacity(0.4),
                          borderRadius: BorderRadius.circular(100),
                        ),
                      );
                    }),
                  ),
                ),

              Positioned(
                bottom: -40.h,
                left: 16.w,
                right: 16.w,
                child: OutletSelector(outletName: selectedOutlet?.name ?? 'Loading...'),
              ),
            ],
          ),
        ),
        SliverToBoxAdapter(child: SizedBox(height: 40.h)), // Reduced to accommodate OutletSelector overlap
        SliverToBoxAdapter(child: SizedBox(height: 24.h)),
        // Order Mode Selector
        SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 16.w),
            child: const OrderModeSelector(),
          ),
        ),
        SliverToBoxAdapter(child: SizedBox(height: 24.h)), // Reduced from 32.h
        // Daily Curations Header
        SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 16.w), // Aligned with other sections
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
