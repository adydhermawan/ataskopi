import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart'; // Add url_launcher to pubspec if needed, or use conditional import
import 'package:ataskopi_frontend/core/providers/tenant_provider.dart';
import 'package:ataskopi_frontend/shared/widgets/app_top_bar.dart';
import 'package:ataskopi_frontend/features/order/presentation/providers/order_providers.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';

class OrderTrackingScreen extends ConsumerStatefulWidget {
  final String orderId;
  const OrderTrackingScreen({super.key, required this.orderId});

  @override
  ConsumerState<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends ConsumerState<OrderTrackingScreen> {
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    _startPolling();
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  void _startPolling() {
    _pollingTimer = Timer.periodic(const Duration(seconds: 10), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }

      final orderState = ref.read(orderDetailsProvider(widget.orderId));
      
      // Stop polling if order reached terminal state
      if (orderState.hasValue && orderState.value != null) {
        final status = orderState.value!.orderStatus.toLowerCase();
        if (status == 'completed' || status == 'cancelled' || status == 'rejected') {
          timer.cancel();
          return;
        }
      }

      ref.invalidate(orderDetailsProvider(widget.orderId));
    });
  }

  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantProvider);
    final orderAsync = ref.watch(orderDetailsProvider(widget.orderId));

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppTopBar(
        title: 'Detail Pesanan',
        actions: [
          AppTopBar.actionButton(
            icon: Icons.refresh_rounded,
            onTap: () => ref.refresh(orderDetailsProvider(widget.orderId)),
          ),
        ],
      ),
      body: orderAsync.when(
        data: (order) {
          if (order == null) {
            return _buildNotFound();
          }
          return _buildContent(context, order, tenant);
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => _buildError(e.toString()),
      ),
    );
  }

  Widget _buildNotFound() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.search_off_rounded, size: 64.w, color: Colors.grey),
          SizedBox(height: 16.h),
          Text('Pesanan tidak ditemukan', style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildError(String message) {
     return Center(
      child: Padding(
        padding: EdgeInsets.all(24.w),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline_rounded, size: 48.w, color: Colors.red),
            SizedBox(height: 16.h),
            Text('Gagal memuat data', style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold)),
            SizedBox(height: 8.h),
            Text(message, textAlign: TextAlign.center, style: TextStyle(fontSize: 12.sp, color: Colors.grey)),
            SizedBox(height: 24.h),
            ElevatedButton(
              onPressed: () => ref.refresh(orderDetailsProvider(widget.orderId)),
              child: const Text('Coba Lagi'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, Order order, TenantConfig tenant) {
    return SingleChildScrollView(
      padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 24.h),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Status Card & Stepper
          _buildTrackingCard(order, tenant),
          SizedBox(height: 24.h),

          // 2. Specific Info Card (Delivery Map / Pickup Time / Table Info)
          if (order.orderType == 'delivery' && order.deliveryAddress != null)
             _buildDeliveryMapCard(order, tenant)
          else if (order.orderType == 'dine_in' && order.table != null)
             _buildDineInInfo(order, tenant)
          else if (order.orderType == 'pickup')
            _buildPickupInfo(order, tenant),
          
          if (order.orderType != 'dine_in' && (order.deliveryAddress != null || order.outlet != null || order.table != null))
             SizedBox(height: 24.h),

          // 3. Order Summary (Items & Pricing)
          _buildOrderSummary(order, tenant),
          
          SizedBox(height: 48.h),
        ],
      ),
    );
  }

  Widget _buildTrackingCard(Order order, TenantConfig tenant) {
    return Container(
      padding: EdgeInsets.all(24.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24.r),
        boxShadow: [
           BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 15, offset: const Offset(0, 6)),
        ],
        border: Border.all(color: const Color(0xFFF1F5F9), width: 1.w),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('ORDER ID', style: _labelStyle),
                  SizedBox(height: 4.h),
                  Text(order.orderNumber.isNotEmpty ? '#${order.orderNumber}' : '#${order.id.substring(0, 8).toUpperCase()}', 
                    style: TextStyle(fontSize: 20.sp, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
                ],
              ),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
                decoration: BoxDecoration(
                  color: tenant.primaryColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8.r),
                ),
                child: Text(
                  order.orderStatus.toUpperCase().replaceAll('_', ' '),
                  style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w800, color: tenant.primaryColor),
                ),
              ),
            ],
          ),
          SizedBox(height: 24.h),
          Container(height: 1.h, color: const Color(0xFFF1F5F9)),
          SizedBox(height: 24.h),
          _buildStepper(tenant, order.orderStatus, order.orderType),
        ],
      ),
    );
  }

  // --- Type Specific Widgets ---

  Widget _buildDeliveryMapCard(Order order, TenantConfig tenant) {
    final address = order.deliveryAddress!;
    // Default to a fallback if lat/lng is 0 (should use address text then)
    final LatLng center = (address.latitude == 0 && address.longitude == 0) 
        ? const LatLng(-6.2088, 106.8456) // Fallback Jakarta
        : LatLng(address.latitude, address.longitude);

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24.r),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 15, offset: const Offset(0, 6)),
        ],
        border: Border.all(color: const Color(0xFFF1F5F9), width: 1.w),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 150.h,
            child: FlutterMap(
              options: MapOptions(
                initialCenter: center,
                initialZoom: 15.0,
                interactionOptions: const InteractionOptions(flags: InteractiveFlag.none), // Static map
              ),
              children: [
                TileLayer(
                   urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                   userAgentPackageName: 'com.ataskopi.app',
                ),
                MarkerLayer(
                  markers: [
                    Marker(
                      point: center,
                      width: 40.w,
                      height: 40.w,
                      child: Icon(Icons.location_on_rounded, color: tenant.primaryColor, size: 40.w),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Padding(
            padding: EdgeInsets.all(20.w),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                 Container(
                   padding: EdgeInsets.all(10.w),
                   decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(12.r)),
                   child: Icon(Icons.delivery_dining_rounded, color: const Color(0xFF2563EB), size: 24.w),
                 ),
                 SizedBox(width: 16.w),
                 Expanded(
                   child: Column(
                     crossAxisAlignment: CrossAxisAlignment.start,
                     children: [
                       Text('ALAMAT PENGIRIMAN', style: _labelStyle),
                       SizedBox(height: 4.h),
                       Text(
                         address.address, 
                         style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w600, color: const Color(0xFF1E293B)),
                       ),
                       if (address.notes != null && address.notes!.isNotEmpty)
                          Padding(
                            padding: EdgeInsets.only(top: 4.h),
                            child: Text('Catatan: ${address.notes}', style: TextStyle(fontSize: 12.sp, color: Colors.grey)),
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

  Widget _buildDineInInfo(Order order, TenantConfig tenant) {
    return Container(
      padding: EdgeInsets.all(24.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24.r),
        boxShadow: [
           BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 15, offset: const Offset(0, 6)),
        ],
        border: Border.all(color: const Color(0xFFF1F5F9), width: 1.w),
      ),
      child: Row(
        children: [
          Container(
            padding: EdgeInsets.all(12.w),
            decoration: BoxDecoration(
              color: const Color(0xFFFDF4FF),
              borderRadius: BorderRadius.circular(16.r),
            ),
            child: Icon(Icons.table_restaurant_rounded, color: const Color(0xFFC026D3), size: 28.w),
          ),
          SizedBox(width: 16.w),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('NOMOR MEJA', style: _labelStyle),
              SizedBox(height: 4.h),
              Text(
                'Meja ${order.table?.tableNumber ?? '-'}',
                style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
              ),
              Text(
                order.outlet?.name ?? 'Outlet',
                style: TextStyle(fontSize: 12.sp, color: const Color(0xFF64748B)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPickupInfo(Order order, TenantConfig tenant) {
    return Container(
      padding: EdgeInsets.all(24.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24.r),
        boxShadow: [
           BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 15, offset: const Offset(0, 6)),
        ],
        border: Border.all(color: const Color(0xFFF1F5F9), width: 1.w),
      ),
      child: Row(
        children: [
           Container(
            padding: EdgeInsets.all(12.w),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF7ED),
              borderRadius: BorderRadius.circular(16.r),
            ),
            child: Icon(Icons.shopping_bag_rounded, color: const Color(0xFFEA580C), size: 28.w),
          ),
          SizedBox(width: 16.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('PICKUP LOCATION', style: _labelStyle),
                SizedBox(height: 4.h),
                Text(
                  order.outlet?.name ?? 'Kopi Atas',
                  style: TextStyle(fontSize: 15.sp, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
                ),
                Text(
                  order.outlet?.address ?? '',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12.sp, color: const Color(0xFF64748B)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- Summary & Items ---

  Widget _buildOrderSummary(Order order, TenantConfig tenant) {
    return Container(
      padding: EdgeInsets.all(24.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24.r),
        boxShadow: [
           BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 15, offset: const Offset(0, 6)),
        ],
        border: Border.all(color: const Color(0xFFF1F5F9), width: 1.w),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.receipt_long_rounded, size: 20.w, color: const Color(0xFF64748B)),
              SizedBox(width: 8.w),
              Text('Rincian Pesanan', style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
            ],
          ),
          SizedBox(height: 20.h),
          
          // Items List
          ...order.items.map((item) => _buildDetailItem(item)),

          SizedBox(height: 16.h),
          const Divider(color: Color(0xFFF1F5F9), thickness: 1),
          SizedBox(height: 16.h),

           // Price Breakdown
          _buildPriceRow('Subtotal', order.subtotal),
           if (order.tax > 0) _buildPriceRow('Pajak (11%)', order.tax),
           if (order.discount > 0) _buildPriceRow('Diskon Voucher', -order.discount, isDiscount: true),
           if (order.pointsDiscount > 0) _buildPriceRow('Diskon Poin', -order.pointsDiscount, isDiscount: true),
           
           // Points Earned
            if (true) ...[ // show always or check if completed?
             Padding(
               padding: EdgeInsets.only(top: 8.h),
               child: Container(
                 padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
                 decoration: BoxDecoration(
                   color: const Color(0xFFFFF7ED),
                   borderRadius: BorderRadius.circular(8.r),
                   border: Border.all(color: const Color(0xFFFFB400).withOpacity(0.3)),
                 ),
                 child: Row(
                   children: [
                     Icon(Icons.stars_rounded, size: 16.w, color: const Color(0xFFFFB400)),
                     SizedBox(width: 8.w),
                     Text(
                       'Kamu mendapatkan ${order.earnedPoints} Poin',
                       style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: const Color(0xFFD97706)),
                     ),
                   ],
                 ),
               ),
             ),
           ],

           SizedBox(height: 16.h),
           const Divider(color: Color(0xFFF1F5F9), thickness: 1),
           SizedBox(height: 16.h),
           
           Row(
             mainAxisAlignment: MainAxisAlignment.spaceBetween,
             children: [
               Text('Total Pembayaran', style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A))),
               Text(
                 'Rp ${(order.total / 1000).toInt()}.000',
                  style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.w900, color: tenant.primaryColor),
               ),
             ],
           ),
           SizedBox(height: 8.h),
           Align(
             alignment: Alignment.centerRight,
             child: Text(
               'Metode: ${(order.paymentMethod ?? 'CASH').toUpperCase()}',
               style: TextStyle(fontSize: 12.sp, color: Colors.grey[600], fontWeight: FontWeight.w500),
             ),
           ),
        ],
      ),
    );
  }

  Widget _buildDetailItem(OrderItem item) {
    // Collect options and modifiers text
    List<String> details = [];
    if (item.selectedOptions.isNotEmpty) details.addAll(item.selectedOptions);
    if (item.selectedModifiers.isNotEmpty) details.addAll(item.selectedModifiers);
    if (item.notes != null && item.notes!.isNotEmpty) details.add('"${item.notes}"');

    return Padding(
      padding: EdgeInsets.only(bottom: 16.h),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 24.w,
            height: 24.w,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFE2E8F0)),
              borderRadius: BorderRadius.circular(6.r),
            ),
            child: Text('${item.quantity}x', style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.bold, color: const Color(0xFF64748B))),
          ),
          SizedBox(width: 12.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.productName,
                  style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w700, color: const Color(0xFF1E293B)),
                ),
                if (details.isNotEmpty)
                  Padding(
                    padding: EdgeInsets.only(top: 4.h),
                    child: Text(
                      details.join(', '),
                      style: TextStyle(fontSize: 12.sp, color: const Color(0xFF94A3B8), height: 1.3),
                    ),
                  ),
              ],
            ),
          ),
          SizedBox(width: 8.w),
          Text(
            'Rp ${(item.unitPrice * item.quantity / 1000).toInt()}.000',
            style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w600, color: const Color(0xFF0F172A)),
          ),
        ],
      ),
    );
  }

  Widget _buildPriceRow(String label, double amount, {bool isDiscount = false}) {
     return Padding(
       padding: EdgeInsets.only(bottom: 8.h),
       child: Row(
         mainAxisAlignment: MainAxisAlignment.spaceBetween,
         children: [
           Text(label, style: TextStyle(fontSize: 13.sp, color: isDiscount ? const Color(0xFF16A34A) : const Color(0xFF64748B))),
           Text(
             '${isDiscount ? "-" : ""}Rp ${(amount.abs() / 1000).toInt()}.000',
             style: TextStyle(
               fontSize: 13.sp, 
               fontWeight: FontWeight.w600, 
               color: isDiscount ? const Color(0xFF16A34A) : const Color(0xFF0F172A)
            ),
           ),
         ],
       ),
     );
  }

  // --- Stepper Logic from Previous Implementation (Reused & Simplified) ---
   Widget _buildStepper(TenantConfig tenant, String status, String type) {
    status = status.toLowerCase();
    type = type.toLowerCase();
    
    List<Map<String, dynamic>> steps = [];
    if (type == 'dine_in') {
      steps = [
        {'key': 'paid', 'title': 'Pesanan Diterima', 'icon': Icons.receipt_long_rounded},
        {'key': 'preparing', 'title': 'Sedang Disiapkan', 'icon': Icons.coffee_maker_rounded},
        {'key': 'done', 'title': 'Selesai Disajikan', 'icon': Icons.check_circle_rounded},
      ];
    } else if (type == 'delivery') {
      steps = [
        {'key': 'paid', 'title': 'Dikonfirmasi', 'icon': Icons.check_circle_outline_rounded},
        {'key': 'preparing', 'title': 'Disiapkan', 'icon': Icons.coffee_maker_rounded},
        {'key': 'waiting_pickup', 'title': 'Mencari Driver', 'icon': Icons.delivery_dining_rounded},
        {'key': 'on_the_way', 'title': 'Sedang Diantar', 'icon': Icons.moped_rounded},
        {'key': 'done', 'title': 'Tiba di Lokasi', 'icon': Icons.home_filled},
      ];
    } else { // Pickup
      steps = [
         {'key': 'paid', 'title': 'Dikonfirmasi',  'icon': Icons.check_circle_outline_rounded},
         {'key': 'preparing', 'title': 'Disiapkan', 'icon': Icons.coffee_maker_rounded},
         {'key': 'ready', 'title': 'Siap Diambil', 'icon': Icons.shopping_bag_rounded},
         {'key': 'done', 'title': 'Selesai', 'icon': Icons.check_circle_rounded},
      ];
    }

    int currentIdx = -1;
    // Map status string to index with alias handling
    String mappedStatus = status;
    if (status == 'pending') mappedStatus = 'paid';
    if (status == 'completed') mappedStatus = 'done';
    
    // Type specific aliases
    if (type == 'delivery') {
      if (status == 'ready') mappedStatus = 'preparing'; // or waiting_pickup?
      if (status == 'on_delivery') mappedStatus = 'on_the_way';
    } else if (type == 'dine_in') {
      if (status == 'ready') mappedStatus = 'preparing'; // Pesanan siap saji
    } else if (type == 'pickup') {
      // ready is already a key in pickup
    }

    for (int i=0; i<steps.length; i++) {
        if (steps[i]['key'] == mappedStatus) {
            currentIdx = i;
            break;
        }
    }

    // Horizontal Stepper for cleaner look
    return Row(
      children: [
        for (int i = 0; i < steps.length; i++) ...[
          Expanded(
            child: Column(
              children: [
                _buildStepCircle(
                  active: i <= currentIdx, 
                  current: i == currentIdx,
                  icon: steps[i]['icon'],
                  color: tenant.primaryColor
                ),
                SizedBox(height: 8.h),
                Text(
                  steps[i]['title'],
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 10.sp, 
                    fontWeight: i <= currentIdx ? FontWeight.bold : FontWeight.normal,
                    color: i <= currentIdx ? const Color(0xFF0F172A) : const Color(0xFFCBD5E1),
                  ),
                ),
              ],
            ),
          ),
          if (i < steps.length - 1)
             Expanded(
               child: Container(
                 height: 2.h, 
                 margin: EdgeInsets.only(bottom: 14.h), // Align with center of circle approx
                 color: i < currentIdx ? tenant.primaryColor : const Color(0xFFF1F5F9),
               ),
             ),
        ],
      ],
    );
  }

  Widget _buildStepCircle({required bool active, required bool current, required IconData icon, required Color color}) {
    return Container(
      width: 36.w,
      height: 36.w,
      decoration: BoxDecoration(
        color: active ? color : Colors.transparent,
        border: Border.all(color: active ? color : const Color(0xFFCBD5E1), width: 1.5),
        shape: BoxShape.circle,
        boxShadow: current ? [BoxShadow(color: color.withValues(alpha: 0.15), blurRadius: 8, offset: const Offset(0, 4))] : [],
      ),
      child: Icon(icon, size: 18.w, color: active ? Colors.white : const Color(0xFFCBD5E1)),
    );
  }

  final TextStyle _labelStyle = TextStyle(
    fontSize: 10.sp,
    fontWeight: FontWeight.w800,
    color: const Color(0xFF94A3B8),
    letterSpacing: 1.5,
  );
}
