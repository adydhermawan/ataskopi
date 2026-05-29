import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'pickup_time_modal.dart';
import '../../../scan/presentation/screens/qr_scanner_screen.dart';
import '../../../menu/presentation/screens/menu_catalog_screen.dart';
import '../../../order/presentation/screens/delivery_address_screen.dart';
import 'package:ataskopi_frontend/core/providers/location_provider.dart';
import 'package:ataskopi_frontend/core/providers/tenant_provider.dart';
import 'package:ataskopi_frontend/core/providers/settings_provider.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';
import '../../../order/presentation/providers/order_state.dart';

class OrderModeSelector extends ConsumerWidget {
  const OrderModeSelector({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenant = ref.watch(tenantProvider);
    final settingsAsync = ref.watch(orderModeSettingsProvider);
    
    // Default to enabled if not loaded yet
    final settings = settingsAsync.value;
    final isDineInEnabled = settings?.dineInEnabled ?? true;
    final isPickupEnabled = settings?.pickupEnabled ?? true;
    final isDeliveryEnabled = settings?.deliveryEnabled ?? true;

    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildModeCard(
                context,
                title: 'Pick Up',
                subtitle: 'Skip the queue',
                icon: Icons.shopping_basket_rounded,
                bgColor: const Color(0xFFFFFBEB),
                iconBgColor: Colors.white,
                iconColor: const Color(0xFFD97706),
                accentIcon: Icons.shopping_basket_rounded,
                isEnabled: isPickupEnabled,
                onTap: () {
                  if (isPickupEnabled) {
                    PickupTimeModal.show(context);
                  } else {
                    _showUnavailableDialog(context, 'Pick Up', tenant.primaryColor);
                  }
                },
              ),
            ),
            SizedBox(width: 16.w),
            Expanded(
              child: _buildModeCard(
                context,
                title: 'Delivery',
                subtitle: 'Doorstep service',
                icon: Icons.delivery_dining_rounded,
                bgColor: const Color(0xFFFFF5F1),
                iconBgColor: Colors.white,
                iconColor: const Color(0xFFF97316),
                accentIcon: Icons.moped_rounded,
                isEnabled: isDeliveryEnabled,
                onTap: () {
                  if (isDeliveryEnabled) {
                    ref.read(userLocationProvider.notifier).refreshLocation();
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const DeliveryAddressScreen()),
                    );
                  } else {
                    _showUnavailableDialog(context, 'Delivery', tenant.primaryColor);
                  }
                },
              ),
            ),
          ],
        ),
        SizedBox(height: 16.h),
        _buildModeCard(
          context,
          title: 'Dine In',
          subtitle: 'Reserve or order at table',
          icon: Icons.restaurant_rounded,
          bgColor: const Color(0xFFEFF6FF),
          iconBgColor: Colors.white,
          iconColor: const Color(0xFF1E40AF),
          accentIcon: Icons.flatware_rounded,
          isWide: true,
          isEnabled: isDineInEnabled,
          onTap: () async {
            if (isDineInEnabled) {
              final method = settings?.dineInMethod ?? 'SCAN_ONLY';
              if (method == 'GUEST_NAME_ONLY') {
                _showGuestNameDialog(context, ref, tenant.primaryColor);
              } else if (method == 'BOTH') {
                _showDineInMethodChoiceDialog(context, ref, tenant.primaryColor);
              } else {
                // Default: SCAN_ONLY
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const QrScannerScreen()),
                );
                
                if (result == true && context.mounted) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const MenuCatalogScreen()),
                  );
                }
              }
            } else {
              _showUnavailableDialog(context, 'Dine In', tenant.primaryColor);
            }
          },
        ),
      ],
    );
  }

  void _showUnavailableDialog(BuildContext context, String modeName, Color primaryColor) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24.r),
          ),
          elevation: 10,
          backgroundColor: Colors.white,
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 28.h),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: EdgeInsets.all(16.w),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.info_outline_rounded,
                    color: const Color(0xFFEF4444),
                    size: 40.w,
                  ),
                ),
                SizedBox(height: 20.h),
                Text(
                  'Layanan Belum Tersedia',
                  style: TextStyle(
                    fontSize: 18.sp,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF1E293B),
                  ),
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 12.h),
                Text(
                  'Mohon maaf, saat ini layanan $modeName sedang tidak tersedia untuk sementara waktu. Silakan pilih metode pemesanan yang lain.',
                  style: TextStyle(
                    fontSize: 13.sp,
                    color: const Color(0xFF64748B),
                    height: 1.5,
                  ),
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 24.h),
                SizedBox(
                  width: double.infinity,
                  height: 48.h,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryColor,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14.r),
                      ),
                      elevation: 0,
                    ),
                    child: Text(
                      'Oke, Saya Mengerti',
                      style: TextStyle(
                        fontSize: 14.sp,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildModeCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color bgColor,
    required Color iconBgColor,
    required Color iconColor,
    required IconData accentIcon,
    required VoidCallback onTap,
    bool isWide = false,
    bool isEnabled = true,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20.r),
      child: Container(
        height: isWide ? 100.h : 140.h,
        decoration: BoxDecoration(
          color: isEnabled ? bgColor : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20.r),
          boxShadow: [
            BoxShadow(
              color: isEnabled ? iconColor.withOpacity(0.05) : Colors.black.withOpacity(0.02),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            // Background Decorative Icon
            Positioned(
              bottom: 0,
              right: 0,
              child: Transform.rotate(
                angle: 0.2,
                child: Icon(
                  accentIcon,
                  size: 90.w,
                  color: isEnabled ? iconColor.withOpacity(0.06) : Colors.black.withOpacity(0.03),
                ),
              ),
            ),
            // Content
            Positioned.fill(
              child: Opacity(
                opacity: isEnabled ? 1.0 : 0.55,
                child: Padding(
                  padding: EdgeInsets.all(12.w),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: isWide ? MainAxisAlignment.center : MainAxisAlignment.start,
                    children: [
                      if (!isWide) ...[
                        Container(
                          width: 36.w,
                          height: 36.w,
                          decoration: BoxDecoration(
                            color: isEnabled ? iconBgColor : Colors.white.withOpacity(0.7),
                            borderRadius: BorderRadius.circular(10.r),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.06),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Icon(icon, color: isEnabled ? iconColor : const Color(0xFF94A3B8), size: 20.w),
                        ),
                        SizedBox(height: 16.h),
                      ],
                      if (isWide)
                        Row(
                          children: [
                            Container(
                              width: 36.w,
                              height: 36.w,
                              decoration: BoxDecoration(
                                color: isEnabled ? iconBgColor : Colors.white.withOpacity(0.7),
                                borderRadius: BorderRadius.circular(10.r),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.06),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Icon(icon, color: isEnabled ? iconColor : const Color(0xFF94A3B8), size: 20.w),
                            ),
                            SizedBox(width: 12.w),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    title,
                                    style: TextStyle(
                                      fontSize: 16.sp,
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFF1E293B),
                                      letterSpacing: -0.5,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    subtitle,
                                    style: TextStyle(
                                      fontSize: 11.sp,
                                      color: const Color(0xFF64748B),
                                      fontWeight: FontWeight.w500,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        )
                      else ...[
                        const Spacer(),
                        Text(
                          title,
                          style: TextStyle(
                            fontSize: 16.sp,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF1E293B),
                            letterSpacing: -0.5,
                          ),
                        ),
                        Text(
                          subtitle,
                          style: TextStyle(
                            fontSize: 12.sp,
                            color: const Color(0xFF64748B),
                            fontWeight: FontWeight.w500,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showGuestNameDialog(BuildContext context, WidgetRef ref, Color primaryColor) {
    final textController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24.r),
          ),
          elevation: 10,
          backgroundColor: Colors.white,
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 28.h),
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: EdgeInsets.all(16.w),
                    decoration: BoxDecoration(
                      color: primaryColor.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.person_outline_rounded,
                      color: primaryColor,
                      size: 40.w,
                    ),
                  ),
                  SizedBox(height: 20.h),
                  Text(
                    'Masukkan Nama / No. Meja',
                    style: TextStyle(
                      fontSize: 18.sp,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF1E293B),
                    ),
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 8.h),
                  Text(
                    'Silakan masukkan nama Anda atau deskripsi meja tempat Anda duduk.',
                    style: TextStyle(
                      fontSize: 13.sp,
                      color: const Color(0xFF64748B),
                      height: 1.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 20.h),
                  TextFormField(
                    controller: textController,
                    autofocus: true,
                    decoration: InputDecoration(
                      hintText: 'Contoh: Budi - Meja 5',
                      hintStyle: TextStyle(fontSize: 14.sp, color: const Color(0xFF94A3B8)),
                      contentPadding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 14.h),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14.r),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14.r),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14.r),
                        borderSide: BorderSide(color: primaryColor, width: 2),
                      ),
                      errorBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14.r),
                        borderSide: const BorderSide(color: Color(0xFFEF4444)),
                      ),
                    ),
                    style: TextStyle(fontSize: 15.sp, color: const Color(0xFF1E293B)),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Nama / No. Meja tidak boleh kosong';
                      }
                      return null;
                    },
                  ),
                  SizedBox(height: 24.h),
                  Row(
                    children: [
                      Expanded(
                        child: SizedBox(
                          height: 48.h,
                          child: OutlinedButton(
                            onPressed: () => Navigator.pop(context),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Color(0xFFE2E8F0)),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14.r),
                              ),
                            ),
                            child: Text(
                              'Batal',
                              style: TextStyle(
                                fontSize: 14.sp,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ),
                      ),
                      SizedBox(width: 12.w),
                      Expanded(
                        child: SizedBox(
                          height: 48.h,
                          child: ElevatedButton(
                            onPressed: () {
                              if (formKey.currentState!.validate()) {
                                final name = textController.text.trim();
                                ref.read(orderFlowProvider.notifier).setMode(OrderMode.dineIn);
                                ref.read(orderFlowProvider.notifier).setGuestName(name);
                                
                                Navigator.pop(context); // Close dialog
                                
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const MenuCatalogScreen()),
                                );
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: primaryColor,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14.r),
                              ),
                              elevation: 0,
                            ),
                            child: Text(
                              'Lanjut',
                              style: TextStyle(
                                fontSize: 14.sp,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _showDineInMethodChoiceDialog(BuildContext context, WidgetRef ref, Color primaryColor) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24.r),
          ),
          elevation: 10,
          backgroundColor: Colors.white,
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 28.h),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: EdgeInsets.all(16.w),
                  decoration: BoxDecoration(
                    color: primaryColor.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.restaurant_rounded,
                    color: primaryColor,
                    size: 40.w,
                  ),
                ),
                SizedBox(height: 20.h),
                Text(
                  'Pilih Metode Makan di Sini',
                  style: TextStyle(
                    fontSize: 18.sp,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF1E293B),
                  ),
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 8.h),
                Text(
                  'Pilih scan QR Code di meja Anda atau masukkan nama/meja secara manual.',
                  style: TextStyle(
                    fontSize: 13.sp,
                    color: const Color(0xFF64748B),
                    height: 1.5,
                  ),
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 24.h),
                // Scan QR Option
                InkWell(
                  onTap: () async {
                    Navigator.pop(context); // Close dialog
                    final result = await Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const QrScannerScreen()),
                    );
                    
                    if (result == true && context.mounted) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const MenuCatalogScreen()),
                      );
                    }
                  },
                  borderRadius: BorderRadius.circular(16.r),
                  child: Container(
                    padding: EdgeInsets.all(16.w),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      borderRadius: BorderRadius.circular(16.r),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: EdgeInsets.all(10.w),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(12.r),
                          ),
                          child: const Icon(
                            Icons.qr_code_scanner_rounded,
                            color: Color(0xFF1D4ED8),
                          ),
                        ),
                        SizedBox(width: 16.w),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Scan QR Code Meja',
                                style: TextStyle(
                                  fontSize: 15.sp,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF1E293B),
                                ),
                              ),
                              SizedBox(height: 2.h),
                              Text(
                                'Pesan langsung terhubung dengan nomor meja',
                                style: TextStyle(
                                  fontSize: 12.sp,
                                  color: const Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
                      ],
                    ),
                  ),
                ),
                SizedBox(height: 12.h),
                // Manual Entry Option
                InkWell(
                  onTap: () {
                    Navigator.pop(context); // Close selection dialog
                    _showGuestNameDialog(context, ref, primaryColor);
                  },
                  borderRadius: BorderRadius.circular(16.r),
                  child: Container(
                    padding: EdgeInsets.all(16.w),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      borderRadius: BorderRadius.circular(16.r),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: EdgeInsets.all(10.w),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0FDF4),
                            borderRadius: BorderRadius.circular(12.r),
                          ),
                          child: const Icon(
                            Icons.edit_note_rounded,
                            color: Color(0xFF15803D),
                          ),
                        ),
                        SizedBox(width: 16.w),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Tulis Nama / No. Meja',
                                style: TextStyle(
                                  fontSize: 15.sp,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF1E293B),
                                ),
                              ),
                              SizedBox(height: 2.h),
                              Text(
                                'Masukkan identitas meja/nama Anda secara manual',
                                style: TextStyle(
                                  fontSize: 12.sp,
                                  color: const Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
                      ],
                    ),
                  ),
                ),
                SizedBox(height: 24.h),
                SizedBox(
                  width: double.infinity,
                  height: 48.h,
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFFE2E8F0)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14.r),
                      ),
                    ),
                    child: Text(
                      'Batal',
                      style: TextStyle(
                        fontSize: 14.sp,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF64748B),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
