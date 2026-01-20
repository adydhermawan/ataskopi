import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../../core/providers/tenant_provider.dart';

class RewardsScreen extends ConsumerWidget {
  const RewardsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenant = ref.watch(tenantProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: CustomScrollView(
        slivers: [
          // Header with Points
          SliverToBoxAdapter(
            child: Container(
              padding: EdgeInsets.only(
                top: ScreenUtil().statusBarHeight + 20.h,
                left: 24.w,
                right: 24.w,
                bottom: 24.h,
              ),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    tenant.primaryColor,
                    tenant.primaryColor.withOpacity(0.8),
                  ],
                ),
              ),
              child: Column(
                children: [
                  Text(
                    'Rewards',
                    style: TextStyle(
                      fontSize: 20.sp,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  SizedBox(height: 24.h),
                  // Points Card
                  Container(
                    padding: EdgeInsets.all(20.w),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20.r),
                      border: Border.all(color: Colors.white.withOpacity(0.2)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.stars_rounded, color: const Color(0xFFFFB400), size: 28.w),
                            SizedBox(width: 8.w),
                            Text(
                              '1,250',
                              style: TextStyle(
                                fontSize: 40.sp,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                        Text(
                          'Total Poin Kamu',
                          style: TextStyle(
                            fontSize: 14.sp,
                            color: Colors.white.withOpacity(0.8),
                          ),
                        ),
                        SizedBox(height: 16.h),
                        // Tier Progress
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _buildTierBadge('Silver', false, tenant),
                            SizedBox(width: 8.w),
                            Container(width: 30.w, height: 2.h, color: Colors.white.withOpacity(0.3)),
                            SizedBox(width: 8.w),
                            _buildTierBadge('Gold', true, tenant),
                            SizedBox(width: 8.w),
                            Container(width: 30.w, height: 2.h, color: Colors.white.withOpacity(0.3)),
                            SizedBox(width: 8.w),
                            _buildTierBadge('Platinum', false, tenant),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Available Rewards
          SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.all(20.w),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Tukar Poin',
                    style: TextStyle(
                      fontSize: 18.sp,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  SizedBox(height: 16.h),
                  _buildRewardItem(
                    context,
                    title: 'Diskon Rp 10.000',
                    points: 500,
                    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4ZRu3eLFQ8RLYiMHxcWFXoS7h4SkLa6AwRmZkT2LXVPhtkr8GGs51nq_WIPzfoc1Ms_hM4HzvA_ROsCEaRIzMAOIo99DnGMN5Ge4gO10OsoG6CSigRIudkYjHszRQHZKEgbApo-LFcBXoRu6v6Km_CHNIM-Lxdoxvba6_trgU0lyzE8unqqWIerkQYGk3Yp5byj_gNBMCd4CaXERBzPwXFcW5SZUEeubplxzZKuOSksRQPNORLTxUQiO3CJCsfOU-H1XpEp84iG6F',
                    tenant: tenant,
                  ),
                  _buildRewardItem(
                    context,
                    title: 'Free Croissant',
                    points: 750,
                    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBRjrc5d6LVSX5lZNpv_Hjtpqq2suG7DfQrC4LToqFKpWdRANmDxfIQXJ-VLfnAKMIhqgyoDCrtyqWS8FlJokV5lWWpHl2uDK55kk7_WKDWK4COJyV6qB7nRMql0OJJHvsAOq6QmaGm3iSFUHBiScpwO2DyswciulW0DQqK1Ls3amBJYGuotQM13H88pJci3afvTl0QA4EANdvkAtDpeZwoUq_MIzffUWwoIRbLmYvC5tMMkYlL9QhB6w1Q49skj6vkTJGZS3r5gbdN',
                    tenant: tenant,
                  ),
                  _buildRewardItem(
                    context,
                    title: 'Free Any Coffee',
                    points: 1000,
                    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDv3GTavczasScBZ-fNGjS1OIu6hBJFWo2NCIMvU6umDihIp_imLv0CSrV7atCT94K1ozSAA9nCLn83gsFXCdhWwuNptCcJVwGeDewpj_nYdGDeieRHiqU17fMmzeTEeCvT_DarWz-WzMmiIZHz0e3TrUyseZofVj1gnGyeQNBsv4_rV_YvJBT_LkpokdAMXTxpYg2z9xF_36GO8K-7S29xULBYfQ-QlHDzUamPFEy5QJOMPZLuMkDH1EtQ0UjP9_yQBoPVUvprtpsM',
                    tenant: tenant,
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(child: SizedBox(height: 40.h)),
        ],
      ),
    );
  }

  Widget _buildTierBadge(String name, bool isActive, TenantConfig tenant) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
      decoration: BoxDecoration(
        color: isActive ? const Color(0xFFFFB400) : Colors.white.withOpacity(0.2),
        borderRadius: BorderRadius.circular(100),
      ),
      child: Text(
        name,
        style: TextStyle(
          fontSize: 11.sp,
          fontWeight: FontWeight.bold,
          color: isActive ? const Color(0xFF0F172A) : Colors.white.withOpacity(0.7),
        ),
      ),
    );
  }

  Widget _buildRewardItem(
    BuildContext context, {
    required String title,
    required int points,
    required String imageUrl,
    required TenantConfig tenant,
  }) {
    return Container(
      margin: EdgeInsets.only(bottom: 12.h),
      padding: EdgeInsets.all(12.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Row(
        children: [
          Container(
            width: 64.w,
            height: 64.w,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12.r),
              image: DecorationImage(image: NetworkImage(imageUrl), fit: BoxFit.cover),
            ),
          ),
          SizedBox(width: 16.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 15.sp,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                SizedBox(height: 4.h),
                Row(
                  children: [
                    Icon(Icons.stars_rounded, color: const Color(0xFFFFB400), size: 16.w),
                    SizedBox(width: 4.w),
                    Text(
                      '$points poin',
                      style: TextStyle(
                        fontSize: 13.sp,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () {
              showDialog(
                context: context, // Use the correct context
                builder: (context) => AlertDialog(
                  title: const Text('Konfirmasi'),
                  content: Text('Tukar $points poin dengan $title?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Batal'),
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('$title berhasil ditukarkan!'),
                            backgroundColor: tenant.primaryColor,
                          ),
                        );
                      },
                      child: const Text('Tukar'),
                    ),
                  ],
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: tenant.primaryColor,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.r)),
              padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
              elevation: 0,
            ),
            child: Text('Tukar', style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
