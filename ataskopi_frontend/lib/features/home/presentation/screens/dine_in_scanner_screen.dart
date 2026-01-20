import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../../core/providers/tenant_provider.dart';

class DineInScannerScreen extends ConsumerStatefulWidget {
  const DineInScannerScreen({super.key});

  @override
  ConsumerState<DineInScannerScreen> createState() => _DineInScannerScreenState();
}

class _DineInScannerScreenState extends ConsumerState<DineInScannerScreen> with SingleTickerProviderStateMixin {
  late AnimationController _scannerAnimationController;

  @override
  void initState() {
    super.initState();
    _scannerAnimationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _scannerAnimationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantProvider);

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Background Mock Camera View
          Positioned.fill(
            child: Opacity(
              opacity: 0.6,
              child: Image.network(
                'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1000&auto=format&fit=crop',
                fit: BoxFit.cover,
              ),
            ),
          ),
          Positioned.fill(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
              child: Container(color: Colors.black.withOpacity(0.3)),
            ),
          ),

          // Overlay UI
          SafeArea(
            child: Column(
              children: [
                // Top App Bar
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
                  child: Row(
                    children: [
                      GestureDetector(
                        onTap: () => Navigator.pop(context),
                        child: Container(
                          width: 48.w,
                          height: 48.w,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.close_rounded, color: Colors.white),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          'Scan Meja',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 18.sp,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      SizedBox(width: 48.w), // Spacer for centering
                    ],
                  ),
                ),

                const Spacer(),

                // Scanner Reticle
                Center(
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Hollow Square
                      Container(
                        width: 280.w,
                        height: 280.w,
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.white.withOpacity(0.2), width: 2.w),
                          borderRadius: BorderRadius.circular(24.r),
                        ),
                      ),
                      // Corner Brackets
                      _buildCorner(Alignment.topLeft, tenant.primaryColor),
                      _buildCorner(Alignment.topRight, tenant.primaryColor),
                      _buildCorner(Alignment.bottomLeft, tenant.primaryColor),
                      _buildCorner(Alignment.bottomRight, tenant.primaryColor),
                      
                      // Scanning Line
                      AnimatedBuilder(
                        animation: _scannerAnimationController,
                        builder: (context, child) {
                          return Positioned(
                            top: 20.w + (240.w * _scannerAnimationController.value),
                            left: 20.w,
                            right: 20.w,
                            child: Container(
                              height: 3.h,
                              decoration: BoxDecoration(
                                color: tenant.primaryColor.withOpacity(0.8),
                                boxShadow: [
                                  BoxShadow(
                                    color: tenant.primaryColor.withOpacity(0.6),
                                    blurRadius: 15,
                                    spreadRadius: 2,
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),

                      // Ghosted QR Icon
                      Icon(
                        Icons.qr_code_2_rounded,
                        size: 160.w,
                        color: Colors.white.withOpacity(0.2),
                      ),
                    ],
                  ),
                ),

                SizedBox(height: 48.h),

                // Text Instructions
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 40.w),
                  child: Column(
                    children: [
                      Text(
                        'Arahkan kamera ke QR code yang ada di meja',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 22.sp,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          height: 1.3,
                        ),
                      ),
                      SizedBox(height: 12.h),
                      Text(
                        'Pastikan QR code terlihat jelas di dalam kotak',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 15.sp,
                          fontWeight: FontWeight.w500,
                          color: Colors.white.withOpacity(0.7),
                        ),
                      ),
                    ],
                  ),
                ),

                const Spacer(),

                // Bottom Controls
                Padding(
                  padding: EdgeInsets.fromLTRB(24.w, 0, 24.w, 40.h),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _buildControlButton(Icons.flashlight_on_rounded),
                          SizedBox(width: 32.w),
                          _buildMainButton(tenant.primaryColor),
                          SizedBox(width: 32.w),
                          _buildControlButton(Icons.image_rounded),
                        ],
                      ),
                      SizedBox(height: 32.h),
                      GestureDetector(
                        onTap: () => Navigator.pop(context),
                        child: Container(
                          width: 220.w,
                          height: 56.h,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(100),
                            border: Border.all(color: Colors.white.withOpacity(0.1), width: 1.w),
                          ),
                          child: Text(
                            'Batal',
                            style: TextStyle(
                              fontSize: 16.sp,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCorner(Alignment alignment, Color color) {
    const double size = 32;
    const double thickness = 5;

    return Positioned(
      top: alignment == Alignment.topLeft || alignment == Alignment.topRight ? 0 : null,
      bottom: alignment == Alignment.bottomLeft || alignment == Alignment.bottomRight ? 0 : null,
      left: alignment == Alignment.topLeft || alignment == Alignment.bottomLeft ? 0 : null,
      right: alignment == Alignment.topRight || alignment == Alignment.bottomRight ? 0 : null,
      child: Container(
        width: size.w,
        height: size.w,
        decoration: BoxDecoration(
          border: Border(
            top: alignment == Alignment.topLeft || alignment == Alignment.topRight
                ? BorderSide(color: color, width: thickness.w)
                : BorderSide.none,
            bottom: alignment == Alignment.bottomLeft || alignment == Alignment.bottomRight
                ? BorderSide(color: color, width: thickness.w)
                : BorderSide.none,
            left: alignment == Alignment.topLeft || alignment == Alignment.bottomLeft
                ? BorderSide(color: color, width: thickness.w)
                : BorderSide.none,
            right: alignment == Alignment.topRight || alignment == Alignment.bottomRight
                ? BorderSide(color: color, width: thickness.w)
                : BorderSide.none,
          ),
          borderRadius: BorderRadius.only(
            topLeft: alignment == Alignment.topLeft ? Radius.circular(16.r) : Radius.zero,
            topRight: alignment == Alignment.topRight ? Radius.circular(16.r) : Radius.zero,
            bottomLeft: alignment == Alignment.bottomLeft ? Radius.circular(16.r) : Radius.zero,
            bottomRight: alignment == Alignment.bottomRight ? Radius.circular(16.r) : Radius.zero,
          ),
        ),
      ),
    );
  }

  Widget _buildControlButton(IconData icon) {
    return Container(
      width: 52.w,
      height: 52.w,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white.withOpacity(0.15), width: 1.w),
      ),
      child: Icon(icon, color: Colors.white, size: 24.w),
    );
  }

  Widget _buildMainButton(Color color) {
    return Container(
      width: 80.w,
      height: 80.w,
      padding: EdgeInsets.all(4.w),
      decoration: const BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
      ),
      child: Container(
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
        ),
        child: Icon(Icons.qr_code_scanner_rounded, color: Colors.white, size: 36.w),
      ),
    );
  }
}
