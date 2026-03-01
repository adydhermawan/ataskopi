import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:ataskopi_frontend/core/providers/tenant_provider.dart';
import 'package:ataskopi_frontend/features/profile/presentation/providers/profile_providers.dart';
import 'package:ataskopi_frontend/core/providers/auth_provider.dart';
import 'package:ataskopi_frontend/features/home/presentation/providers/home_providers.dart';
import 'package:ataskopi_frontend/shared/widgets/app_top_bar.dart';
import 'package:ataskopi_frontend/features/profile/presentation/screens/edit_profile_screen.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';
import 'package:ataskopi_frontend/features/profile/presentation/screens/address_list_screen.dart';
import 'package:ataskopi_frontend/features/profile/presentation/screens/saved_payment_methods_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenant = ref.watch(tenantProvider);
    final user = ref.watch(authProvider).user;
    final loyaltyInfo = ref.watch(loyaltyInfoProvider).value;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: const AppTopBar(
        title: 'Profil Saya',
        showBackButton: false,
      ),
      body: CustomScrollView(
        slivers: [
          // Profile Header
          SliverToBoxAdapter(
            child: Container(
              padding: EdgeInsets.symmetric(vertical: 24.h, horizontal: 16.w),
              decoration: const BoxDecoration(
                color: Colors.white,
              ),
              child: Column(
                children: [
                  Stack(
                    children: [
                      Container(
                        width: 88.w,
                        height: 88.w,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: tenant.primaryColor.withOpacity(0.15), width: 3.w),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 12, offset: const Offset(0, 4)),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(100),
                          child: Icon(Icons.person, size: 48.w, color: const Color(0xFFCBD5E1)),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 20.h),
                  Text(
                    user?.name ?? 'User',
                    style: TextStyle(
                      fontSize: 20.sp,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF0F172A),
                      letterSpacing: -0.5,
                    ),
                  ),
                  SizedBox(height: 6.h),
                  Text(
                    user?.phone ?? '',
                    style: TextStyle(
                      fontSize: 14.sp,
                      color: const Color(0xFF64748B),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  SizedBox(height: 20.h),
                  if (loyaltyInfo != null)
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF7E6),
                        borderRadius: BorderRadius.circular(100),
                        border: Border.all(color: const Color(0xFFFFD591)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.stars_rounded, color: const Color(0xFFFAAD14), size: 18.w),
                          SizedBox(width: 8.w),
                          Text(
                            loyaltyInfo.currentTier?.name ?? 'Member',
                            style: TextStyle(
                              fontSize: 14.sp,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF873800),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
          // Menu Items
          SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(16.w, 24.h, 16.w, 24.h),
              child: Column(
                children: [
                  _buildMenuItem(
                    context, 
                    Icons.person_outline_rounded, 
                    'Edit Profil', 
                    tenant,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const EditProfileScreen()),
                      );
                    },
                  ),
                  _buildMenuItem(
                    context, 
                    Icons.location_on_outlined, 
                    'Alamat Tersimpan', 
                    tenant,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const AddressListScreen()),
                      );
                    },
                  ),
                  _buildMenuItem(
                    context, 
                    Icons.payment_rounded, 
                    'Metode Pembayaran', 
                    tenant,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const SavedPaymentMethodsScreen()),
                      );
                    },
                  ),
                  _buildMenuItem(context, Icons.settings_outlined, 'Pengaturan', tenant),
                  _buildMenuItem(context, Icons.help_outline_rounded, 'Bantuan', tenant),
                  _buildMenuItem(context, Icons.info_outline_rounded, 'Tentang Aplikasi', tenant),
                  SizedBox(height: 32.h),
                  _buildMenuItem(
                    context,
                    Icons.logout_rounded,
                    'Keluar',
                    tenant,
                    isDestructive: true,
                    onTap: () {
                      ref.read(authProvider.notifier).logout();
                      Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
                    },
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(child: SizedBox(height: ScreenUtil().bottomBarHeight + 40.h)),
        ],
      ),
    );
  }

  Widget _buildMenuItem(
    BuildContext context,
    IconData icon,
    String title,
    TenantConfig tenant, {
    bool isDestructive = false,
    VoidCallback? onTap,
  }) {
    return Container(
      margin: EdgeInsets.only(bottom: 12.h),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 15,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ListTile(
        contentPadding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 4.h),
        leading: Container(
          width: 38.w,
          height: 38.w,
          decoration: BoxDecoration(
            color: isDestructive 
                ? const Color(0xFFEF4444).withOpacity(0.08)
                : tenant.primaryColor.withOpacity(0.05),
            shape: BoxShape.circle,
          ),
          child: Icon(
            icon,
            color: isDestructive ? const Color(0xFFEF4444) : tenant.primaryColor,
            size: 20.w,
          ),
        ),
        title: Text(
          title,
          style: TextStyle(
            fontSize: 14.sp,
            fontWeight: FontWeight.w700,
            color: isDestructive ? const Color(0xFFEF4444) : const Color(0xFF0F172A),
            letterSpacing: -0.3,
          ),
        ),
        trailing: Icon(
          Icons.chevron_right_rounded,
          color: const Color(0xFFCBD5E1),
          size: 20.w,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20.r)),
        onTap: onTap ??
            () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Menu $title diklik')),
              );
            },
      ),
    );
  }
}

