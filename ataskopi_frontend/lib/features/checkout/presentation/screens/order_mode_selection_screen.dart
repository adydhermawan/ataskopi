import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:intl/intl.dart';

import 'package:ataskopi_frontend/core/providers/tenant_provider.dart';
import 'package:ataskopi_frontend/core/providers/settings_provider.dart';
import 'package:ataskopi_frontend/core/providers/location_provider.dart';
import 'package:ataskopi_frontend/shared/widgets/app_top_bar.dart';
import 'package:ataskopi_frontend/shared/widgets/app_button.dart';
import 'package:ataskopi_frontend/features/order/presentation/providers/order_state.dart';
import 'package:ataskopi_frontend/features/profile/presentation/screens/address_list_screen.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';
import 'package:ataskopi_frontend/features/scan/presentation/screens/qr_scanner_screen.dart';
import 'package:ataskopi_frontend/features/menu/presentation/screens/menu_catalog_screen.dart';

class OrderModeSelectionScreen extends ConsumerWidget {
  final bool isFromCheckout;
  const OrderModeSelectionScreen({super.key, this.isFromCheckout = false});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenant = ref.watch(tenantProvider);
    final settingsAsync = ref.watch(orderModeSettingsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: const AppTopBar(title: 'Pilih Metode Pesanan'),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(24.w),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Pilih metode yang Anda inginkan:',
              style: TextStyle(
                fontSize: 16.sp,
                color: const Color(0xFF64748B),
              ),
            ),
            SizedBox(height: 24.h),
            _buildModeOption(
              context, 
              'Makan di Tempat (Dine In)', 
              Icons.storefront_rounded, 
              Colors.blue, 
              () {
                final settings = settingsAsync.value;
                final method = settings?.dineInMethod ?? 'GUEST_NAME_ONLY';
                if (method == 'GUEST_NAME_ONLY') {
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(builder: (_) => DineInNameScreen(isFromCheckout: isFromCheckout)),
                  );
                } else if (method == 'BOTH') {
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(builder: (_) => DineInMethodScreen(isFromCheckout: isFromCheckout)),
                  );
                } else {
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(builder: (_) => const QrScannerScreen()),
                  );
                }
              },
            ),
            _buildModeOption(
              context, 
              'Ambil Sendiri (Pickup)', 
              Icons.shopping_bag_rounded, 
              Colors.orange, 
              () {
                ref.read(userLocationProvider.notifier).refreshLocation();
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (_) => PickupTimeScreen(isFromCheckout: isFromCheckout)),
                );
              }
            ),
            _buildModeOption(
              context, 
              'Pesanan Antar (Delivery)', 
              Icons.motorcycle_rounded, 
              Colors.green, 
              () async {
                 // Push AddressListScreen and wait for result
                 final selected = await Navigator.push(
                   context, 
                   MaterialPageRoute(builder: (_) => const AddressListScreen(isSelectionMode: true))
                 );
                 if (selected != null && selected is UserAddress) {
                   ref.read(orderFlowProvider.notifier).setDeliveryAddress(selected);
                   ref.read(orderFlowProvider.notifier).setMode(OrderMode.delivery);
                   if (isFromCheckout && context.mounted) {
                     Navigator.pop(context); // Go back to checkout
                   } else if (context.mounted) {
                     Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(builder: (_) => const MenuCatalogScreen()),
                     );
                   }
                 }
              }
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildModeOption(BuildContext context, String title, IconData icon, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16.r),
      child: Container(
        margin: EdgeInsets.only(bottom: 16.h),
        padding: EdgeInsets.all(16.w),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16.r),
          border: Border.all(color: const Color(0xFFF1F5F9), width: 1.5),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: EdgeInsets.all(12.w),
              decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
              child: Icon(icon, color: color, size: 24.w),
            ),
            SizedBox(width: 16.w),
            Expanded(
              child: Text(title, style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold, color: const Color(0xFF1E293B))),
            ),
            Icon(Icons.chevron_right_rounded, color: const Color(0xFF94A3B8), size: 24.w),
          ],
        ),
      ),
    );
  }
}

class PickupTimeScreen extends ConsumerStatefulWidget {
  final bool isFromCheckout;
  const PickupTimeScreen({super.key, this.isFromCheckout = false});

  @override
  ConsumerState<PickupTimeScreen> createState() => _PickupTimeScreenState();
}

class _PickupTimeScreenState extends ConsumerState<PickupTimeScreen> {
  DateTime _selectedDate = DateTime.now();
  TimeOfDay _selectedTime = TimeOfDay.fromDateTime(DateTime.now().add(const Duration(minutes: 30)));

  bool get _isValid {
    final now = DateTime.now();
    final pickupDateTime = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _selectedTime.hour,
      _selectedTime.minute,
    );
    return pickupDateTime.isAfter(now.add(const Duration(minutes: 19, seconds: 59)));
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 7)),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _selectTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime,
    );
    if (picked != null) {
      setState(() => _selectedTime = picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: const AppTopBar(title: 'Waktu Pengambilan'),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(24.w),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Kapan Anda akan mengambil pesanan?',
              style: TextStyle(
                fontSize: 16.sp,
                color: const Color(0xFF64748B),
              ),
            ),
            SizedBox(height: 32.h),
            GestureDetector(
              onTap: _selectDate,
              child: _buildSelectionItem(
                icon: Icons.calendar_today_rounded,
                label: 'TANGGAL',
                value: DateFormat('EEEE, d MMM yyyy').format(_selectedDate),
                tenant: tenant,
              ),
            ),
            SizedBox(height: 16.h),
            GestureDetector(
              onTap: _selectTime,
              child: _buildSelectionItem(
                icon: Icons.access_time_rounded,
                label: 'JAM',
                value: _selectedTime.format(context),
                tenant: tenant,
              ),
            ),
            SizedBox(height: 20.h),
            Container(
              padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
              decoration: BoxDecoration(
                color: _isValid ? const Color(0xFFEFF6FF) : const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(12.r),
              ),
              child: Row(
                children: [
                  Icon(
                    _isValid ? Icons.info_outline_rounded : Icons.error_outline_rounded,
                    color: _isValid ? const Color(0xFF2563EB) : const Color(0xFFEF4444),
                    size: 18.w,
                  ),
                  SizedBox(width: 12.w),
                  Expanded(
                    child: Text(
                      'Minimal 20 menit dari sekarang',
                      style: TextStyle(
                        fontSize: 12.sp,
                        fontWeight: FontWeight.w600,
                        color: _isValid ? const Color(0xFF1D4ED8) : const Color(0xFFB91C1C),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: EdgeInsets.all(24.w),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: AppButton(
          text: 'Lanjutkan',
          enabled: _isValid,
          onPressed: () {
            final pickupDateTime = DateTime(
              _selectedDate.year,
              _selectedDate.month,
              _selectedDate.day,
              _selectedTime.hour,
              _selectedTime.minute,
            );
            ref.read(orderFlowProvider.notifier).setMode(OrderMode.pickup);
            ref.read(orderFlowProvider.notifier).setPickupData(pickupDateTime);
            
            if (widget.isFromCheckout) {
              Navigator.pop(context);
            } else {
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (_) => const MenuCatalogScreen()),
              );
            }
          },
        ),
      ),
    );
  }

  Widget _buildSelectionItem({
    required IconData icon,
    required String label,
    required String value,
    required dynamic tenant,
  }) {
    return Container(
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(color: const Color(0xFFF1F5F9), width: 1.5),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: EdgeInsets.all(12.w),
            decoration: BoxDecoration(
              color: tenant.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12.r),
            ),
            child: Icon(icon, color: tenant.primaryColor, size: 22.w),
          ),
          SizedBox(width: 16.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 10.sp,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF94A3B8),
                    letterSpacing: 1,
                  ),
                ),
                SizedBox(height: 2.h),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 15.sp,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
          ),
          Icon(Icons.chevron_right_rounded, color: const Color(0xFFCBD5E1), size: 20.w),
        ],
      ),
    );
  }
}

class DineInNameScreen extends ConsumerStatefulWidget {
  final bool isFromCheckout;
  const DineInNameScreen({super.key, this.isFromCheckout = false});

  @override
  ConsumerState<DineInNameScreen> createState() => _DineInNameScreenState();
}

class _DineInNameScreenState extends ConsumerState<DineInNameScreen> {
  final _textController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: const AppTopBar(title: 'Masukkan Nama / No. Meja'),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(24.w),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              SizedBox(height: 20.h),
              Container(
                padding: EdgeInsets.all(20.w),
                decoration: BoxDecoration(
                  color: tenant.primaryColor.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.person_outline_rounded,
                  color: tenant.primaryColor,
                  size: 64.w,
                ),
              ),
              SizedBox(height: 32.h),
              Text(
                'Identitas Pemesan',
                style: TextStyle(
                  fontSize: 20.sp,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF1E293B),
                ),
              ),
              SizedBox(height: 8.h),
              Text(
                'Silakan masukkan nama Anda atau deskripsi meja tempat Anda duduk.',
                style: TextStyle(
                  fontSize: 14.sp,
                  color: const Color(0xFF64748B),
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 32.h),
              TextFormField(
                controller: _textController,
                autofocus: true,
                decoration: InputDecoration(
                  hintText: 'Contoh: Budi - Meja 5',
                  hintStyle: TextStyle(fontSize: 14.sp, color: const Color(0xFF94A3B8)),
                  contentPadding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 16.h),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16.r),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16.r),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16.r),
                    borderSide: BorderSide(color: tenant.primaryColor, width: 2),
                  ),
                  errorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16.r),
                    borderSide: const BorderSide(color: Color(0xFFEF4444)),
                  ),
                  filled: true,
                  fillColor: Colors.white,
                ),
                style: TextStyle(fontSize: 16.sp, color: const Color(0xFF1E293B)),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Nama / No. Meja tidak boleh kosong';
                  }
                  return null;
                },
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: Container(
        padding: EdgeInsets.all(24.w),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: AppButton(
          text: 'Lanjutkan',
          onPressed: () {
            if (_formKey.currentState!.validate()) {
              final name = _textController.text.trim();
              ref.read(orderFlowProvider.notifier).setMode(OrderMode.dineIn);
              ref.read(orderFlowProvider.notifier).setGuestName(name);
              
              if (widget.isFromCheckout) {
                Navigator.pop(context);
              } else {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (_) => const MenuCatalogScreen()),
                );
              }
            }
          },
        ),
      ),
    );
  }
}

class DineInMethodScreen extends ConsumerWidget {
  final bool isFromCheckout;
  const DineInMethodScreen({super.key, this.isFromCheckout = false});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenant = ref.watch(tenantProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: const AppTopBar(title: 'Metode Dine In'),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(24.w),
        child: Column(
          children: [
            Container(
              padding: EdgeInsets.all(20.w),
              decoration: BoxDecoration(
                color: tenant.primaryColor.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.restaurant_rounded,
                color: tenant.primaryColor,
                size: 64.w,
              ),
            ),
            SizedBox(height: 24.h),
            Text(
              'Pilih Metode Makan di Sini',
              style: TextStyle(
                fontSize: 20.sp,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF1E293B),
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 8.h),
            Text(
              'Pilih scan QR Code di meja Anda atau masukkan nama/meja secara manual.',
              style: TextStyle(
                fontSize: 14.sp,
                color: const Color(0xFF64748B),
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 32.h),
            // Scan QR Option
            InkWell(
              onTap: () async {
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const QrScannerScreen()),
                );
                
                if (result == true && context.mounted) {
                  if (isFromCheckout) {
                    Navigator.pop(context);
                  } else {
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(builder: (_) => const MenuCatalogScreen()),
                    );
                  }
                }
              },
              borderRadius: BorderRadius.circular(16.r),
              child: Container(
                padding: EdgeInsets.all(16.w),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
                  borderRadius: BorderRadius.circular(16.r),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: EdgeInsets.all(12.w),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(12.r),
                      ),
                      child: const Icon(
                        Icons.qr_code_scanner_rounded,
                        color: Color(0xFF1D4ED8),
                        size: 28,
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
                              fontSize: 16.sp,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF1E293B),
                            ),
                          ),
                          SizedBox(height: 4.h),
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
            SizedBox(height: 16.h),
            // Manual Entry Option
            InkWell(
              onTap: () {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (_) => DineInNameScreen(isFromCheckout: isFromCheckout)),
                );
              },
              borderRadius: BorderRadius.circular(16.r),
              child: Container(
                padding: EdgeInsets.all(16.w),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
                  borderRadius: BorderRadius.circular(16.r),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: EdgeInsets.all(12.w),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(12.r),
                      ),
                      child: const Icon(
                        Icons.edit_note_rounded,
                        color: Color(0xFF15803D),
                        size: 28,
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
                              fontSize: 16.sp,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF1E293B),
                            ),
                          ),
                          SizedBox(height: 4.h),
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
          ],
        ),
      ),
    );
  }
}
