import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:ataskopi_frontend/core/providers/tenant_provider.dart';
import 'package:ataskopi_frontend/shared/widgets/app_top_bar.dart';
import 'package:ataskopi_frontend/core/providers/auth_provider.dart';
import 'package:ataskopi_frontend/core/providers/api_providers.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}



class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  late TextEditingController _nameController;
  late TextEditingController _emailController;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authProvider).user;
    _nameController = TextEditingController(text: user?.name ?? '');
    _emailController = TextEditingController(text: user?.email ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  void _handleSave() async {
    setState(() => _isSaving = true);
    try {
      final repository = ref.read(profileRepositoryProvider);
      final response = await repository.updateProfile(
        name: _nameController.text,
        email: _emailController.text,
      );

      if (response.success && response.data != null) {
        // Update local auth state
        ref.read(authProvider.notifier).updateUser(response.data!);
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(response.message)),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal memperbarui profil')),
      );
    } finally {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFA),
      appBar: const AppTopBar(title: 'Edit Profil'),
      body: SingleChildScrollView(
        child: Column(
          children: [
            SizedBox(height: 32.h),
            // Avatar Section
            Center(
              child: Column(
                children: [
                  Stack(
                    children: [
                      Container(
                        width: 112.w,
                        height: 112.w,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 4.w),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 20, offset: const Offset(0, 4)),
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
                          width: 36.w,
                          height: 36.w,
                          decoration: BoxDecoration(
                            color: tenant.primaryColor,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2.w),
                            boxShadow: [
                              BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 8, offset: const Offset(0, 2)),
                            ],
                          ),
                          child: Icon(Icons.photo_camera_rounded, color: Colors.white, size: 18.w),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 16.h),
                  TextButton(
                    onPressed: () {},
                    child: Text(
                      'Ubah Foto',
                      style: TextStyle(
                        fontSize: 14.sp,
                        fontWeight: FontWeight.w700,
                        color: tenant.primaryColor,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(height: 32.h),
            // Form Fields
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 20.w),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildLabel('Nama Lengkap'),
                  _buildTextField(
                    controller: _nameController,
                    hint: 'Masukkan nama lengkap',
                    icon: Icons.person_outline_rounded,
                    tenant: tenant,
                  ),
                  SizedBox(height: 20.h),
                  _buildLabel('Email'),
                  _buildTextField(
                    controller: _emailController,
                    hint: 'email@address.com',
                    icon: Icons.mail_outline_rounded,
                    tenant: tenant,
                  ),
                  SizedBox(height: 20.h),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildLabel('Nomor Telepon'),
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(100),
                        ),
                        child: Text(
                          'Terkunci',
                          style: TextStyle(
                            fontSize: 10.sp,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF94A3B8),
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 4.h),
                  _buildTextField(
                    controller: TextEditingController(text: ref.watch(authProvider).user?.phone ?? ''),
                    hint: '+62...',
                    icon: Icons.smartphone_rounded,
                    tenant: tenant,
                    enabled: false,
                    suffixIcon: Icons.lock_outline_rounded,
                  ),
                  SizedBox(height: 12.h),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4.w),
                    child: Text(
                      'Hubungi layanan pelanggan untuk mengubah nomor telepon.',
                      style: TextStyle(
                        fontSize: 12.sp,
                        color: const Color(0xFF94A3B8),
                        fontWeight: FontWeight.w500,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(height: 120.h),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: EdgeInsets.fromLTRB(20.w, 16.h, 20.w, ScreenUtil().bottomBarHeight + 16.h),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: const Color(0xFFF1F5F9), width: 1.h)),
        ),
        child: SizedBox(
          width: double.infinity,
          height: 56.h,
          child: ElevatedButton(
            onPressed: _isSaving ? null : _handleSave,
            style: ElevatedButton.styleFrom(
              backgroundColor: tenant.primaryColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14.r)),
              elevation: 0,
            ),
            child: _isSaving 
              ? SizedBox(height: 24.w, width: 24.w, child: const CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : Text(
                  'Simpan Perubahan',
                  style: TextStyle(
                    fontSize: 16.sp,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
          ),
        ),
      ),

    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: EdgeInsets.only(left: 4.w, bottom: 8.h),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 14.sp,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF475569),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    required TenantConfig tenant,
    bool enabled = true,
    IconData? suffixIcon,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: enabled ? Colors.white : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(
          color: const Color(0xFFF1F5F9),
          width: 1.5.w,
        ),
      ),
      child: TextField(
        controller: controller,
        enabled: enabled,
        style: TextStyle(
          fontSize: 16.sp,
          fontWeight: FontWeight.w700,
          color: enabled ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
          letterSpacing: -0.3,
        ),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(color: const Color(0xFF94A3B8), fontSize: 16.sp, fontWeight: FontWeight.normal),
          prefixIcon: Icon(icon, color: const Color(0xFF94A3B8), size: 20.w),
          suffixIcon: suffixIcon != null ? Icon(suffixIcon, color: const Color(0xFFCBD5E1), size: 20.w) : null,
          border: InputBorder.none,
          contentPadding: EdgeInsets.symmetric(vertical: 16.h, horizontal: 16.w),
        ),
      ),
    );
  }
}
