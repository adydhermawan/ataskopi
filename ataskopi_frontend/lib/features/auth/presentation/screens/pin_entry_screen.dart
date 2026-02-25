import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../../core/providers/tenant_provider.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_top_bar.dart';
import '../../../home/presentation/screens/home_main_screen.dart';
import '../../../../core/providers/auth_provider.dart';

class PinEntryScreen extends ConsumerStatefulWidget {
  final String phoneNumber;
  final String name;
  final String? email;
  final bool isRegistration;

  const PinEntryScreen({
    super.key,
    required this.phoneNumber,
    required this.name,
    this.email,
    this.isRegistration = false,
  });

  @override
  ConsumerState<PinEntryScreen> createState() => _PinEntryScreenState();
}

class _PinEntryScreenState extends ConsumerState<PinEntryScreen> {
  String _pin = '';
  bool _isProcessing = false;

  void _onKeyPress(String value) {
    if (_isProcessing) return;
    if (_pin.length < 6) {
      setState(() => _pin += value);
      if (_pin.length == 6) {
        _verifyPin();
      }
    }
  }

  void _onBackspace() {
    if (_isProcessing) return;
    if (_pin.isNotEmpty) {
      setState(() => _pin = _pin.substring(0, _pin.length - 1));
    }
  }

  void _verifyPin() async {
    setState(() => _isProcessing = true);
    
    bool success;
    if (widget.isRegistration) {
      success = await ref.read(authProvider.notifier).register(
        phone: widget.phoneNumber,
        name: widget.name,
        email: widget.email,
        pin: _pin,
      );
    } else {
      success = await ref.read(authProvider.notifier).login(
        widget.phoneNumber,
        _pin,
      );
    }

    if (!success) {
      if (mounted) {
        setState(() {
          _pin = '';
          _isProcessing = false;
        });
        
        final error = ref.read(authProvider).error ?? 'Gagal masuk. Periksa PIN Anda.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error)),
        );
      }
      return;
    }

    if (mounted) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const HomeMainScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppTopBar(
        title: '',
        backgroundColor: Colors.transparent,
        onBackPressed: () => Navigator.pop(context),
        titleWidget: Center(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildStatusDot(false, tenant.primaryColor),
              SizedBox(width: 8.w),
              _buildStatusDot(true, tenant.primaryColor),
              SizedBox(width: 8.w),
              _buildStatusDot(false, tenant.primaryColor),
            ],
          ),
        ),
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: constraints.maxHeight,
              ),
              child: IntrinsicHeight(
                child: Column(
                  children: [
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(height: 32.h),
                          // Avatar
                          Stack(
                            children: [
                              Container(
                                width: 90.w,
                                height: 90.w,
                                padding: EdgeInsets.all(4.w),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: tenant.primaryColor.withOpacity(0.12),
                                      blurRadius: 24,
                                      offset: const Offset(0, 8),
                                    ),
                                  ],
                                  border: Border.all(color: tenant.primaryColor.withOpacity(0.08), width: 1.w),
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(100),
                                  child: Image.network(
                                    'https://lh3.googleusercontent.com/aida-public/AB6AXuBbntPVghwTaMEHPWvU31qH4Tl6L2ZDIcp4jMRCYUIEIqTGytszrFRBeMrDjOpZE5P27HeC-8Tv2_n5PWc_U6j2InxBCFyYs64Bn23qChDgU6cgKJW15sOYmAIPC-mJABMRwaI-F_MVcNpZDtrzWqTNnWJhCwbvmEBxPQ9xen4RuRKKXYEjMFL-lKApCzydyB8UUdpVrQgGUljZkWnlyzyP2nlz_SOw_yvkt5hI6bsakXmkGfSgbCkLmeA1mIOb1STT-Hp8VD2HMR4H',
                                    fit: BoxFit.cover,
                                  ),
                                ),
                              ),
                              Positioned(
                                bottom: 4.w,
                                right: 4.w,
                                child: Container(
                                  width: 18.w,
                                  height: 18.w,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF10B981),
                                    shape: BoxShape.circle,
                                    border: Border.all(color: Colors.white, width: 2.5.w),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          SizedBox(height: 24.h),
                          Text.rich(
                            TextSpan(
                              text: 'Halo, ',
                              children: [
                                TextSpan(
                                  text: widget.name,
                                  style: TextStyle(color: tenant.primaryColor, fontWeight: FontWeight.w800),
                                ),
                                const TextSpan(text: '! 👋'),
                              ],
                            ),
                            style: TextStyle(
                              fontSize: 24.sp,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF0F172A),
                              letterSpacing: -0.5,
                            ),
                          ),
                          SizedBox(height: 8.h),
                          Text(
                            'Masukkan PIN keamanan Anda',
                            style: TextStyle(
                              fontSize: 14.sp,
                              color: const Color(0xFF64748B),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          SizedBox(height: 32.h),
                          // PIN Dots
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(6, (index) {
                              final isFilled = index < _pin.length;
                              return AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                margin: EdgeInsets.symmetric(horizontal: 10.w),
                                width: 14.w,
                                height: 14.w,
                                decoration: BoxDecoration(
                                  color: isFilled ? tenant.primaryColor : const Color(0xFFE2E8F0),
                                  shape: BoxShape.circle,
                                  boxShadow: isFilled ? [
                                    BoxShadow(
                                      color: tenant.primaryColor.withOpacity(0.3),
                                      blurRadius: 12,
                                      offset: const Offset(0, 4),
                                    ),
                                  ] : null,
                                ),
                              );
                            }),
                          ),
                          SizedBox(height: 32.h),
                          TextButton(
                            onPressed: () {},
                            style: TextButton.styleFrom(
                              foregroundColor: tenant.primaryColor,
                              padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 12.h),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                            ),
                            child: Text(
                              'Lupa PIN?',
                              style: TextStyle(
                                fontSize: 14.sp,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Keypad
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 40.w, vertical: 16.h),
                      child: Column(
                        children: [
                          _buildKeyRow(['1', '2', '3'], ['', 'ABC', 'DEF']),
                          SizedBox(height: 16.h),
                          _buildKeyRow(['4', '5', '6'], ['GHI', 'JKL', 'MNO']),
                          SizedBox(height: 16.h),
                          _buildKeyRow(['7', '8', '9'], ['PQRS', 'TUV', 'WXYZ']),
                          SizedBox(height: 16.h),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              SizedBox(width: 72.w, height: 72.w),
                              _buildKeyButton('0', ''),
                              _buildBackspaceButton(),
                            ],
                          ),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: Text(
                        'GANTI NOMOR HP',
                        style: TextStyle(
                          fontSize: 12.sp,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF94A3B8),
                          letterSpacing: 2,
                        ),
                      ),
                    ),
                    SizedBox(height: 16.h),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatusDot(bool isActive, Color activeColor) {
    return Container(
      width: 6.w,
      height: 6.w,
      decoration: BoxDecoration(
        color: isActive ? activeColor : activeColor.withOpacity(0.2),
        shape: BoxShape.circle,
      ),
    );
  }

  Widget _buildKeyRow(List<String> values, List<String> subtexts) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: List.generate(3, (index) {
        return _buildKeyButton(values[index], subtexts[index]);
      }),
    );
  }

  Widget _buildKeyButton(String value, String subtext) {
    return InkWell(
      onTap: () => _onKeyPress(value),
      borderRadius: BorderRadius.circular(100),
      splashColor: const Color(0xFFE2E8F0),
      highlightColor: const Color(0xFFF1F5F9),
      child: Container(
        width: 72.w,
        height: 72.w,
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 26.sp,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF0F172A),
              ),
            ),
            if (subtext.isNotEmpty)
              Text(
                subtext,
                style: TextStyle(
                  fontSize: 10.sp,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF94A3B8),
                  letterSpacing: 1,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildBackspaceButton() {
    return InkWell(
      onTap: _onBackspace,
      borderRadius: BorderRadius.circular(100),
      splashColor: const Color(0xFFFEE2E2),
      child: SizedBox(
        width: 72.w,
        height: 72.w,
        child: const Icon(
          Icons.backspace_outlined,
          color: Color(0xFFEF4444),
          size: 26,
        ),
      ),
    );
  }
}
