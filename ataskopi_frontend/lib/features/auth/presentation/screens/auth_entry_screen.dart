import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:ataskopi_frontend/core/providers/api_providers.dart';
import 'package:ataskopi_frontend/core/providers/auth_provider.dart';
import 'package:ataskopi_frontend/shared/widgets/app_button.dart';
import 'package:ataskopi_frontend/shared/widgets/app_top_bar.dart';
import 'package:ataskopi_frontend/core/providers/tenant_provider.dart';
import 'package:ataskopi_frontend/features/auth/presentation/screens/pin_entry_screen.dart';
import 'package:ataskopi_frontend/features/auth/presentation/screens/registration_screen.dart';
import 'package:ataskopi_frontend/features/home/presentation/screens/home_main_screen.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';

class AuthEntryScreen extends ConsumerStatefulWidget {
  const AuthEntryScreen({super.key});

  @override
  ConsumerState<AuthEntryScreen> createState() => _AuthEntryScreenState();
}

class _AuthEntryScreenState extends ConsumerState<AuthEntryScreen> {
  final TextEditingController _phoneController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _handleContinue() async {
    final rawPhone = _phoneController.text.trim();
    if (rawPhone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Masukkan nomor handphone')),
      );
      return;
    }

    // Standardize phone: if starts with 0, replace with +62
    String formattedPhone = rawPhone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+62${formattedPhone.substring(1)}';
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+62$formattedPhone';
    }

    setState(() => _isLoading = true);

    try {
      final repository = ref.read(authRepositoryProvider);
      final response = await repository.checkPhone(phone: formattedPhone);

      if (response.success && response.data != null) {
        if (!mounted) return;
        
        if (response.data!.exists) {
          // Nav to PIN Entry for login
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => PinEntryScreen(
                phoneNumber: formattedPhone,
                isRegistration: false,
                name: response.data!.name ?? '',
              ),
            ),
          );
        } else {
          // Nav to Registration
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => RegistrationScreen(phoneNumber: formattedPhone),
            ),
          );
        }
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(response.message)),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Terjadi kesalahan koneksi')),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AuthState>(authProvider, (previous, next) {
      if (next.user != null) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const HomeMainScreen()),
          (route) => false,
        );
      } else if (next.error != null && next.error!.isNotEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(next.error!)),
        );
      }
    });

    final tenant = ref.watch(tenantProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: const AppTopBar(
        title: 'ATASKOPI',
        backgroundColor: Colors.transparent,
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: IntrinsicHeight(
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: 24.w),
                  child: Column(
                    children: [
                      SizedBox(height: 40.h),
                      // Logo or Illustration
                      Container(
                        width: 120.w,
                        height: 120.w,
                        decoration: BoxDecoration(
                          color: tenant.primaryColor.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Padding(
                          padding: EdgeInsets.all(24.w),
                          child: Image.asset(
                            'assets/icons/icon-512.png',
                            fit: BoxFit.contain,
                          ),
                        ),
                      ),
                      SizedBox(height: 32.h),
                      Text(
                        'Selamat Datang!',
                        style: TextStyle(
                          fontSize: 24.sp,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                      SizedBox(height: 8.h),
                      Text(
                        'Masukkan nomor handphone Anda untuk melanjutkan.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14.sp,
                          color: const Color(0xFF64748B),
                        ),
                      ),

                      SizedBox(height: 16.h),
                      TextButton(
                        onPressed: () {
                          ref.read(authProvider.notifier).devLogin();
                        },
                        child: Text(
                          '[DEV] Auto Login',
                          style: TextStyle(
                            fontSize: 12.sp,
                            color: Colors.red.shade400,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      SizedBox(height: 16.h),
                      // Phone Input
                      _buildPhoneInput(tenant),
                      SizedBox(height: 24.h),
                      AppButton(
                        text: 'Lanjutkan',
                        isLoading: _isLoading,
                        onPressed: _handleContinue,
                      ),
                      SizedBox(height: 24.h),
                      Row(
                        children: [
                          const Expanded(child: Divider()),
                          Padding(
                            padding: EdgeInsets.symmetric(horizontal: 16.w),
                            child: Text(
                              'atau masuk dengan',
                              style: TextStyle(
                                fontSize: 12.sp,
                                color: const Color(0xFF94A3B8),
                              ),
                            ),
                          ),
                          const Expanded(child: Divider()),
                        ],
                      ),
                      SizedBox(height: 24.h),
                      // Google Login
                      OutlinedButton(
                        onPressed: () {},
                        style: OutlinedButton.styleFrom(
                          minimumSize: Size(double.infinity, 56.h),
                          side: const BorderSide(color: Color(0xFFE2E8F0)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Image.network(
                              'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/1200px-Google_%22G%22_logo.svg.png',
                              width: 24.w,
                              height: 24.w,
                              errorBuilder: (context, error, stackTrace) => 
                                  Icon(Icons.g_mobiledata_rounded, size: 32.w, color: Colors.blue),
                            ),
                            SizedBox(width: 12.w),
                            Text(
                              'Google',
                              style: TextStyle(
                                fontSize: 16.sp,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF0F172A),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      // Footer
                      Text.rich(
                        TextSpan(
                          text: 'Dengan melanjutkan, Anda menyetujui ',
                          children: [
                            TextSpan(
                              text: 'Ketentuan Layanan',
                              style: TextStyle(color: tenant.primaryColor, fontWeight: FontWeight.w800),
                            ),
                            const TextSpan(text: ' & '),
                            TextSpan(
                              text: 'Kebijakan Privasi',
                              style: TextStyle(color: tenant.primaryColor, fontWeight: FontWeight.w800),
                            ),
                            const TextSpan(text: ' kami.'),
                          ],
                        ),
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12.sp,
                          color: const Color(0xFF94A3B8),
                          height: 1.6,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      SizedBox(height: 32.h),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildPhoneInput(TenantConfig tenant) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 16.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Text(
            '+62',
            style: TextStyle(
              fontSize: 16.sp,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF0F172A),
            ),
          ),
          SizedBox(width: 12.w),
          Container(
            width: 1.w,
            height: 24.h,
            color: const Color(0xFFE2E8F0),
          ),
          SizedBox(width: 12.w),
          Expanded(
            child: TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              style: TextStyle(
                fontSize: 16.sp,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF0F172A),
              ),
              decoration: InputDecoration(
                hintText: '812 3456 7890',
                hintStyle: TextStyle(
                  color: const Color(0xFF94A3B8),
                  fontSize: 16.sp,
                  fontWeight: FontWeight.normal,
                ),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(vertical: 18.h),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
