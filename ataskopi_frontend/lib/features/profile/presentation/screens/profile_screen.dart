import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../../core/providers/tenant_provider.dart';
import '../../../../shared/widgets/app_top_bar.dart';
import 'edit_profile_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenant = ref.watch(tenantProvider);

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
              padding: EdgeInsets.symmetric(vertical: 32.h, horizontal: 24.w),
              decoration: const BoxDecoration(
                color: Colors.white,
              ),
              child: Column(
                children: [
                  Stack(
                    children: [
                      Container(
                        width: 108.w,
                        height: 108.w,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: tenant.primaryColor.withOpacity(0.15), width: 4.w),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 15, offset: const Offset(0, 5)),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(100),
                          child: Image.network(
                            'https://lh3.googleusercontent.com/aida-public/AB6AXuD69fpGYwHbvraM09Q7eg9UeYoyWo-H5j2-a6yxQXjzhys0qbZ4FM1c4eQ02LgBbmJUaJNcJwhithjRF88DZ0VLE9HzxmiUchue3KEyP3yD-Al4ZH0DAAgew7U1JLB1g6PnvDXQliOLhTpvOMDAlwNqnZHYQuCqXEX9Nlfzo-s9nOlSA5DQpQN_HzdjfQZCrUf1og1qKtERjiedqxrSW6wIRqYhEZ3QMCN19HIIO-59g19Bm3cJCtYOgR-Ffr3mbr_B7kYXzFYx8hN4',
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          width: 34.w,
                          height: 34.w,
                          decoration: BoxDecoration(
                            color: tenant.primaryColor,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2.w),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.1),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Icon(Icons.camera_alt_rounded, color: Colors.white, size: 16.w),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 20.h),
                  Text(
                    'Budi Santoso',
                    style: TextStyle(
                      fontSize: 24.sp,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF0F172A),
                      letterSpacing: -0.5,
                    ),
                  ),
                  SizedBox(height: 6.h),
                  Text(
                    '+62 812 3456 7890',
                    style: TextStyle(
                      fontSize: 14.sp,
                      color: const Color(0xFF64748B),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  SizedBox(height: 20.h),
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
                          'Gold Member',
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
              padding: EdgeInsets.fromLTRB(24.w, 32.h, 24.w, 24.h),
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
                  _buildMenuItem(context, Icons.location_on_outlined, 'Alamat Tersimpan', tenant),
                  _buildMenuItem(context, Icons.payment_rounded, 'Metode Pembayaran', tenant),
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
      margin: EdgeInsets.only(bottom: 16.h),
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
        contentPadding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 6.h),
        leading: Container(
          width: 44.w,
          height: 44.w,
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
            fontSize: 16.sp,
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
