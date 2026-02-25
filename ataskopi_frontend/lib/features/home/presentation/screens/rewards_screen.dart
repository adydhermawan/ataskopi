import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:ataskopi_frontend/core/providers/tenant_provider.dart';
import 'package:ataskopi_frontend/features/home/presentation/providers/home_providers.dart';
import 'package:ataskopi_frontend/features/home/presentation/screens/level_info_screen.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';

class RewardsScreen extends ConsumerWidget {
  const RewardsScreen({super.key});

  void _showVoucherDetails(BuildContext context, Voucher voucher, TenantConfig tenant) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(24.r),
            topRight: Radius.circular(24.r),
          ),
        ),
        child: Column(
          children: [
            // Handle Bar
            Center(
              child: Container(
                margin: EdgeInsets.only(top: 12.h, bottom: 20.h),
                width: 40.w,
                height: 4.h,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            
            Expanded(
              child: ListView(
                padding: EdgeInsets.symmetric(horizontal: 24.w),
                children: [
                  // Icon
                  Center(
                    child: Container(
                      width: 80.w,
                      height: 80.w,
                      decoration: BoxDecoration(
                        color: tenant.primaryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20.r),
                      ),
                      child: Icon(Icons.confirmation_number_outlined, color: tenant.primaryColor, size: 40.w),
                    ),
                  ),
                  SizedBox(height: 16.h),
                  
                  // Title
                  Text(
                    voucher.name,
                    style: TextStyle(fontSize: 20.sp, fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 8.h),
                  Text(
                    voucher.description,
                    style: TextStyle(fontSize: 14.sp, color: Colors.grey[600]),
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 24.h),

                  // Divider
                  Divider(color: Colors.grey[200]),
                  SizedBox(height: 16.h),

                  // Terms and Conditions
                  Text(
                    "Syarat & Ketentuan",
                    style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 12.h),
                  if (voucher.termsAndConditions.isEmpty)
                     Text("- Tidak ada syarat khusus", style: TextStyle(fontSize: 14.sp, color: Colors.grey[600]))
                  else
                    ...voucher.termsAndConditions.map((term) => Padding(
                      padding: EdgeInsets.only(bottom: 8.h),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text("• ", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey[600])),
                          Expanded(child: Text(term, style: TextStyle(fontSize: 14.sp, color: Colors.grey[700]))),
                        ],
                      ),
                    )),
                  
                  SizedBox(height: 24.h),
                  
                  // Validity
                  if (voucher.validUntil != null)
                    Container(
                      padding: EdgeInsets.all(12.w),
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(12.r),
                      ),
                      child: Row(
                        children: [
                           Icon(Icons.calendar_today_rounded, size: 16.w, color: Colors.grey[600]),
                           SizedBox(width: 8.w),
                           Text(
                             'Berlaku hingga ${voucher.validUntil!.toLocal().toString().split(' ')[0]}',
                             style: TextStyle(fontSize: 13.sp, color: Colors.grey[700]),
                           ),
                        ],
                      ),
                    ),
                  
                  SizedBox(height: 40.h),
                ],
              ),
            ),
            
            // Action Button
            Container(
              padding: EdgeInsets.all(24.w),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -4)),
                ],
              ),
              child: SafeArea(
                child: SizedBox(
                   width: double.infinity,
                   child: ElevatedButton(
                     onPressed: () {
                        Clipboard.setData(ClipboardData(text: voucher.code));
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Kode ${voucher.code} disalin!'),
                            backgroundColor: tenant.primaryColor,
                          ),
                        );
                     },
                     style: ElevatedButton.styleFrom(
                       backgroundColor: tenant.primaryColor,
                       foregroundColor: Colors.white,
                       padding: EdgeInsets.symmetric(vertical: 16.h),
                       shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
                       elevation: 0,
                     ),
                     child: Text('Salin Kode Voucher', style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold)),
                   ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenant = ref.watch(tenantProvider);
    final loyaltyAsync = ref.watch(loyaltyInfoProvider);
    final vouchersAsync = ref.watch(vouchersProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: CustomScrollView(
        slivers: [
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
              child: loyaltyAsync.when(
                data: (loyalty) => Column(
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
                                '${loyalty?.loyaltyPoints ?? 0}',
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
                          // Tier Info Button
                          GestureDetector(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(builder: (context) => const LevelInfoScreen()),
                              );
                            },
                            child: Container(
                              padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(100),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    loyalty?.currentTier?.name ?? '-',
                                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12.sp),
                                  ),
                                  SizedBox(width: 4.w),
                                  Icon(Icons.chevron_right_rounded, color: Colors.white, size: 16.w),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                loading: () => const Center(child: CircularProgressIndicator(color: Colors.white)),
                error: (e, s) => const SizedBox(),
              ),
            ),
          ),
          
          // Helper Text
          SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(20.w, 24.h, 20.w, 8.h),
              child: Text(
                "Voucher Tersedia",
                style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold),
              ),
            ),
          ),

          // Vouchers List
          vouchersAsync.when(
            data: (vouchers) {
              if (vouchers.isEmpty) {
                return SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.only(top: 40.h),
                    child: Center(child: Text('Belum ada voucher tersedia', style: TextStyle(color: Colors.grey[600]))),
                  ),
                );
              }
              return SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final voucher = vouchers[index];
                    return GestureDetector(
                      onTap: () => _showVoucherDetails(context, voucher, tenant),
                      child: Container(
                        margin: EdgeInsets.symmetric(horizontal: 20.w, vertical: 8.h),
                        padding: EdgeInsets.all(16.w),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16.r),
                          boxShadow: [
                             BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4)),
                          ],
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 60.w,
                              height: 60.w,
                              decoration: BoxDecoration(
                                color: tenant.primaryColor.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12.r),
                              ),
                              child: Icon(Icons.confirmation_number_outlined, color: tenant.primaryColor, size: 30.w),
                            ),
                            SizedBox(width: 16.w),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    voucher.code,
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16.sp),
                                  ),
                                  SizedBox(height: 4.h),
                                  Text(
                                    voucher.description,
                                    style: TextStyle(fontSize: 12.sp, color: Colors.grey[600]),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  if (voucher.validUntil != null)
                                    Padding(
                                      padding: EdgeInsets.only(top: 4.h),
                                      child: Text(
                                        'Berlaku s/d ${voucher.validUntil!.toLocal().toString().split(' ')[0]}',
                                        style: TextStyle(fontSize: 10.sp, color: Colors.grey),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            IconButton(
                              onPressed: () {
                                Clipboard.setData(ClipboardData(text: voucher.code));
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Kode ${voucher.code} disalin!'),
                                    backgroundColor: tenant.primaryColor,
                                  ),
                                );
                              },
                              icon: const Icon(Icons.copy_rounded, color: Colors.grey),
                            )
                          ],
                        ),
                      ),
                    );
                  },
                  childCount: vouchers.length,
                ),
              );
            },
            loading: () => const SliverToBoxAdapter(child: Center(child: CircularProgressIndicator())),
            error: (e, s) => SliverToBoxAdapter(child: Center(child: Text('Gagal memuat voucher', textAlign: TextAlign.center))),
          ),
          
          SliverToBoxAdapter(child: SizedBox(height: 40.h)),
        ],
      ),
    );
  }
}
