import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:ataskopi_frontend/core/providers/tenant_provider.dart';
import 'package:ataskopi_frontend/features/home/presentation/providers/home_providers.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';
import 'package:ataskopi_frontend/shared/widgets/app_top_bar.dart';

class LevelInfoScreen extends ConsumerWidget {
  const LevelInfoScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenant = ref.watch(tenantProvider);
    final loyaltyAsync = ref.watch(loyaltyInfoProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppTopBar(
        title: 'Informasi Level',
        showBackButton: true,
        onBackPressed: () => Navigator.pop(context),
      ),
      body: loyaltyAsync.when(
        data: (loyalty) {
          if (loyalty == null || loyalty.allTiers.isEmpty) {
             return Center(
               child: Column(
                 mainAxisAlignment: MainAxisAlignment.center,
                 children: [
                   Icon(Icons.stars_rounded, size: 64.w, color: Colors.grey[300]),
                   SizedBox(height: 16.h),
                   Text(
                     "Belum ada informasi level",
                     style: TextStyle(color: Colors.grey[500], fontSize: 14.sp),
                   ),
                 ],
               ),
             );
          }
          
          final tiers = loyalty.allTiers;
          
          return ListView.builder(
            padding: EdgeInsets.all(20.w),
            itemCount: tiers.length,
            itemBuilder: (context, index) {
              final tier = tiers[index];
              final isCurrent = tier.isCurrentTier;
              
              // Determine status based on index relative to current tier
              // We assume tiers are sorted by minPoints (backend does this)
              final currentTierIndex = tiers.indexWhere((t) => t.isCurrentTier);
              
              bool isPassed = false;
              bool isLocked = true;
              
              if (currentTierIndex != -1) {
                isPassed = index < currentTierIndex;
                isLocked = index > currentTierIndex;
              } else {
                // Fallback logic
                isLocked = (loyalty.totalSpent ?? 0) < tier.minPoints;
                isPassed = !isLocked && !isCurrent;
              }

              return Container(
                margin: EdgeInsets.only(bottom: 16.h),
                padding: EdgeInsets.all(20.w),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16.r),
                  border: Border.all(
                    color: isCurrent ? tenant.primaryColor : const Color(0xFFE2E8F0),
                    width: isCurrent ? 2 : 1,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              tier.name,
                              style: TextStyle(
                                fontSize: 18.sp,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF0F172A),
                              ),
                            ),
                            SizedBox(height: 4.h),
                            Text(
                              'Min. Poin: ${tier.minPoints}',
                              style: TextStyle(
                                fontSize: 12.sp,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                        if (isCurrent)
                          Container(
                            padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
                            decoration: BoxDecoration(
                              color: tenant.primaryColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(100),
                            ),
                            child: Text(
                              'Level Saat Ini',
                              style: TextStyle(
                                fontSize: 10.sp,
                                fontWeight: FontWeight.w700,
                                color: tenant.primaryColor,
                              ),
                            ),
                          )
                        else if (isLocked)
                          Icon(Icons.lock_outline_rounded, color: const Color(0xFFCBD5E1), size: 24.w)
                        else
                          Icon(Icons.check_circle_rounded, color: Colors.green, size: 24.w),
                      ],
                    ),
                    SizedBox(height: 16.h),
                    Container(height: 1, color: const Color(0xFFF1F5F9)),
                    SizedBox(height: 16.h),
                    Text(
                      'Keuntungan:',
                      style: TextStyle(
                        fontSize: 14.sp,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                    SizedBox(height: 8.h),
                    Text(
                      tier.benefitsDescription ?? 'Akses promo spesial dan loyalitas poin.',
                      style: TextStyle(
                        fontSize: 13.sp,
                        color: const Color(0xFF64748B),
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text('Error loading tiers: $e')),
      ),
    );
  }
}
