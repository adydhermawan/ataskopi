// Force recompile
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:intl/intl.dart';
import '../../../../core/providers/tenant_provider.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../menu/presentation/screens/menu_catalog_screen.dart';
import '../../../shared/domain/models/models.dart';
import '../../../order/presentation/providers/order_state.dart';

class PickupTimeModal extends ConsumerStatefulWidget {
  const PickupTimeModal({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const PickupTimeModal(),
    );
  }

  @override
  ConsumerState<PickupTimeModal> createState() => _PickupTimeModalState();
}

class _PickupTimeModalState extends ConsumerState<PickupTimeModal> {
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

    return Container(
      padding: EdgeInsets.fromLTRB(24.w, 12.h, 24.w, 32.h),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24.r)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 48.w,
            height: 5.h,
            decoration: BoxDecoration(
              color: const Color(0xFFE2E8F0),
              borderRadius: BorderRadius.circular(100),
            ),
          ),
          SizedBox(height: 24.h),
          Text(
            'Pilih Waktu Pengambilan',
            style: TextStyle(
              fontSize: 20.sp,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF0F172A),
              letterSpacing: -0.5,
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
          SizedBox(height: 32.h),
          AppButton(
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
              
              Navigator.pop(context); // Close modal
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const MenuCatalogScreen()),
              );
            },
          ),
          SizedBox(height: 8.h),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Batal',
              style: TextStyle(
                fontSize: 15.sp,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF94A3B8),
              ),
            ),
          ),
        ],
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
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(color: const Color(0xFFF1F5F9), width: 1.w),
      ),
      child: Row(
        children: [
          Icon(icon, color: tenant.primaryColor, size: 22.w),
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
