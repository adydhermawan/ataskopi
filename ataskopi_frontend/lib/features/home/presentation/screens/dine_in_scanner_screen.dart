import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../../core/providers/tenant_provider.dart';
import '../../../shared/domain/models/models.dart';
import '../../../order/presentation/providers/order_state.dart';
import '../../../menu/presentation/screens/menu_catalog_screen.dart';

class DineInScannerScreen extends ConsumerStatefulWidget {
  const DineInScannerScreen({super.key});

  @override
  ConsumerState<DineInScannerScreen> createState() => _DineInScannerScreenState();
}

class _DineInScannerScreenState extends ConsumerState<DineInScannerScreen> with SingleTickerProviderStateMixin {
  late AnimationController _scannerAnimationController;
  final TextEditingController _tableController = TextEditingController();

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
    _tableController.dispose();
    super.dispose();
  }

  void _onTableConfirmed(String tableNumber) {
    if (tableNumber.isEmpty) return;
    ref.read(orderFlowProvider.notifier).setMode(OrderMode.dineIn);
    ref.read(orderFlowProvider.notifier).setDineInData(
      tableNumber: tableNumber,
      tableId: tableNumber, // Fallback for manual input, ideally should validate
    );
    
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const MenuCatalogScreen()),
    );
  }

  void _showManualInput() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Input Nomor Meja'),
        content: TextField(
          controller: _tableController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            hintText: 'Contoh: 05',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              final val = _tableController.text;
              Navigator.pop(context);
              _onTableConfirmed(val);
            },
            child: const Text('Konfirmasi'),
          ),
        ],
      ),
    );
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
                            fontSize: 16.sp,
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
                        width: 240.w,
                        height: 240.w,
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.white.withOpacity(0.2), width: 2.w),
                          borderRadius: BorderRadius.circular(20.r),
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
                            top: 20.w + (200.w * _scannerAnimationController.value),
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
                        size: 120.w,
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
                          fontSize: 18.sp,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          height: 1.3,
                        ),
                      ),
                      SizedBox(height: 8.h),
                      Text(
                        'Atau masukkan nomor meja secara manual',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13.sp,
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
                          _buildControlButton(Icons.flashlight_on_rounded, () {}),
                          SizedBox(width: 24.w),
                          _buildMainButton(tenant.primaryColor, () => _onTableConfirmed('05')), // Mock scan
                          SizedBox(width: 24.w),
                          _buildControlButton(Icons.edit_note_rounded, _showManualInput),
                        ],
                      ),
                      SizedBox(height: 24.h),
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
                              fontSize: 14.sp,
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

  Widget _buildControlButton(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 52.w,
        height: 52.w,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.1),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white.withOpacity(0.15), width: 1.w),
        ),
        child: Icon(icon, color: Colors.white, size: 24.w),
      ),
    );
  }

  Widget _buildMainButton(Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 64.w,
        height: 64.w,
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
      ),
    );
  }
}
