import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_top_bar.dart';
import '../../../../core/providers/tenant_provider.dart';
import 'pin_entry_screen.dart';
import 'registration_screen.dart';

class AuthEntryScreen extends ConsumerStatefulWidget {
  const AuthEntryScreen({super.key});

  @override
  ConsumerState<AuthEntryScreen> createState() => _AuthEntryScreenState();
}

class _AuthEntryScreenState extends ConsumerState<AuthEntryScreen> {
  final TextEditingController _phoneController = TextEditingController();

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
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
                        child: Icon(
                          Icons.coffee_rounded,
                          size: 60.w,
                          color: tenant.primaryColor,
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
                      SizedBox(height: 32.h),
                      // Phone Input
                      _buildPhoneInput(tenant),
                      SizedBox(height: 24.h),
                      AppButton(
                        text: 'Lanjutkan',
                        onPressed: () {
                          // Simple mock navigation for now
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => RegistrationScreen(phoneNumber: _phoneController.text),
                            ),
                          );
                        },
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
                              'https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png',
                              width: 24.w,
                              height: 24.w,
                              errorBuilder: (context, error, stackTrace) => 
                                  Icon(Icons.g_mobiledata_rounded, size: 24.w),
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
