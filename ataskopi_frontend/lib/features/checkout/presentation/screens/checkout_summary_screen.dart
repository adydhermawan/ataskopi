import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:intl/intl.dart';
import 'package:ataskopi_frontend/core/providers/tenant_provider.dart';
import 'package:ataskopi_frontend/shared/widgets/app_top_bar.dart';
import 'package:ataskopi_frontend/features/shared/data/mock_data.dart';
import 'package:ataskopi_frontend/features/activity/presentation/screens/activity_screen.dart';
import 'package:ataskopi_frontend/features/checkout/presentation/screens/payment_method_screen.dart';
import 'package:ataskopi_frontend/features/checkout/presentation/screens/qris_payment_screen.dart';
import 'package:ataskopi_frontend/features/activity/presentation/screens/order_tracking_screen.dart';
import 'package:ataskopi_frontend/features/order/presentation/providers/order_providers.dart';
import 'package:ataskopi_frontend/features/home/presentation/providers/home_providers.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';
import 'package:ataskopi_frontend/features/profile/presentation/screens/address_list_screen.dart';
import 'package:ataskopi_frontend/core/providers/api_providers.dart';
import 'package:ataskopi_frontend/core/providers/api_providers.dart';
import '../../../order/presentation/providers/order_state.dart';
import '../../../home/presentation/widgets/pickup_time_modal.dart';
import '../../../order/presentation/screens/delivery_address_screen.dart';
import '../../../scan/presentation/controllers/scan_controller.dart';
import '../../../scan/presentation/screens/qr_scanner_screen.dart';

class CheckoutSummaryScreen extends ConsumerWidget {
  const CheckoutSummaryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenant = ref.watch(tenantProvider);
    final cart = ref.watch(cartProvider);
    final selectedOutlet = ref.watch(selectedOutletProvider);
    final calculation = ref.watch(orderCalculationProvider);
    final loyaltyInfo = ref.watch(loyaltyInfoProvider).value;
    final orderFlow = ref.watch(orderFlowProvider);
    final paymentMethod = ref.watch(selectedPaymentMethodProvider);

    // Auto-prompt if mode is not selected
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (orderFlow.mode == null && cart.isNotEmpty) {
        _showOrderModeSelectorModal(context, ref);
      }
    });

    // EFFECT: Clear selected voucher if it is no longer available (e.g. usage limit reached, new user only)
    ref.listen(vouchersProvider, (prev, next) {
      next.whenData((availableVouchers) {
        final currentVoucher = ref.read(selectedVoucherProvider);
        if (currentVoucher != null) {
          final stillValid = availableVouchers.any((v) => v.code == currentVoucher.code);
          if (!stillValid) {
            ref.read(selectedVoucherProvider.notifier).state = null;
          }
        }
      });
    });

    // EFFECT: Clear voucher and points if cart is empty
    if (cart.isEmpty) {
      Future.microtask(() {
        if (ref.read(selectedVoucherProvider) != null) {
          ref.read(selectedVoucherProvider.notifier).state = null;
        }
        if (ref.read(pointsToRedeemProvider) != 0) {
          ref.read(pointsToRedeemProvider.notifier).state = 0;
        }
      });
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: const AppTopBar(title: 'Ringkasan Pesanan'),
      body: SingleChildScrollView(
        padding: EdgeInsets.only(bottom: 40.h),
        child: Column(
          children: [
            SizedBox(height: 16.h),
            
            // Context Header
            _buildSectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        orderFlow.mode == null
                            ? Icons.question_mark_rounded
                            : (orderFlow.mode == OrderMode.delivery 
                                ? Icons.location_on_rounded 
                                : (orderFlow.mode == OrderMode.dineIn ? Icons.deck_rounded : Icons.storefront_rounded)), 
                        color: tenant.primaryColor, 
                        size: 20.w
                      ),
                      SizedBox(width: 8.w),
                      Text(
                        orderFlow.mode == null
                            ? 'METODE PESANAN'
                            : (orderFlow.mode == OrderMode.delivery 
                                ? 'LOKASI PENGIRIMAN' 
                                : (orderFlow.mode == OrderMode.dineIn ? 'NOMOR MEJA' : 'LOKASI PENGAMBILAN')),
                        style: TextStyle(
                          fontSize: 10.sp,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF94A3B8),
                          letterSpacing: 1.5,
                        ),
                      ),
                      const Spacer(),
                      // Uber / Change Button
                      InkWell(
                        onTap: () => _showOrderModeSelectorModal(context, ref),
                        child: Text(
                           orderFlow.mode == null ? 'PILIH' : 'UBAH',
                           style: TextStyle(
                             fontSize: 12.sp,
                             fontWeight: FontWeight.w700,
                             color: tenant.primaryColor,
                           ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 12.h),
                  if (orderFlow.mode == null)
                    Text(
                      'Belum dipilih',
                      style: TextStyle(
                        fontSize: 17.sp,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                        letterSpacing: -0.5,
                      ),
                    )
                  else if (orderFlow.mode == OrderMode.dineIn)
                    Text(
                      'Meja ${orderFlow.tableNumber ?? "-"}',
                      style: TextStyle(
                        fontSize: 17.sp,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                        letterSpacing: -0.5,
                      ),
                    )
                  else if (orderFlow.mode == OrderMode.delivery)
                    InkWell(
                       onTap: () async {
                         final selected = await Navigator.push(
                           context, 
                           MaterialPageRoute(builder: (_) => const AddressListScreen(isSelectionMode: true))
                         );
                         if (selected != null && selected is UserAddress) {
                           ref.read(orderFlowProvider.notifier).setDeliveryAddress(selected);
                         }
                       },
                       child: Row(
                         children: [
                           Expanded(
                             child: Text(
                               orderFlow.deliveryAddress?.address ?? 'Pilih Alamat Pengiriman',
                               style: TextStyle(
                                 fontSize: 15.sp,
                                 fontWeight: FontWeight.w700,
                                 color: orderFlow.deliveryAddress != null ? const Color(0xFF0F172A) : tenant.primaryColor,
                               ),
                             ),
                           ),
                           Icon(Icons.edit_rounded, size: 16.w, color: tenant.primaryColor),
                         ],
                       ),
                    )
                  else
                    Text(
                      selectedOutlet?.name ?? 'Loading...',
                      style: TextStyle(
                        fontSize: 17.sp,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                        letterSpacing: -0.5,
                      ),
                    ),
                  
                  if (orderFlow.mode != OrderMode.delivery) ...[
                    SizedBox(height: 4.h),
                    Text(
                      selectedOutlet?.address ?? '',
                      style: TextStyle(
                        fontSize: 14.sp,
                        color: const Color(0xFF64748B),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],

                  if (orderFlow.mode == OrderMode.pickup && orderFlow.pickupTime != null) ...[
                    SizedBox(height: 14.h),
                    Row(
                      children: [
                        Icon(Icons.schedule_rounded, color: tenant.primaryColor, size: 16.w),
                        SizedBox(width: 8.w),
                        Text(
                          'Ambil jam: ${DateFormat('HH:mm').format(orderFlow.pickupTime!)}',
                          style: TextStyle(
                            fontSize: 13.sp,
                            fontWeight: FontWeight.w700,
                            color: tenant.primaryColor,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),

            // Your Order
            _buildSectionCard(
              padding: EdgeInsets.zero,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: EdgeInsets.fromLTRB(16.w, 16.h, 16.w, 8.h),
                    child: Text(
                      'Pesanan Anda',
                      style: TextStyle(
                        fontSize: 18.sp,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                        letterSpacing: -0.5,
                      ),
                    ),
                  ),
                  ...cart.map((item) => _buildOrderItem(
                        item.product.name,
                        'Rp ${(item.totalPrice / 1000).toInt()}.000',
                        [...item.selectedOptions.map((e) => e.name), ...item.selectedModifiers.map((e) => e.name)].join(', '),
                        item.quantity,
                        item.product.imageUrl ?? 'https://static.okomura.com/placeholder_coffee.png',
                        isLast: cart.indexOf(item) == cart.length - 1,
                      )),
                ],
              ),
            ),

            // Voucher & Points
            _buildSectionCard(
              child: Column(
                children: [
                   // Voucher Section
                   InkWell(
                    onTap: () => _showVoucherSelectionModal(context, ref),
                     child: Row(
                      children: [
                        Container(
                          padding: EdgeInsets.all(10.w),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFB400).withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.confirmation_number_rounded, color: const Color(0xFFFFB400), size: 18.w),
                        ),
                        SizedBox(width: 12.w),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Voucher',
                                style: TextStyle(
                                  fontSize: 15.sp, 
                                  fontWeight: FontWeight.w800, 
                                  color: const Color(0xFF0F172A),
                                ),
                              ),
                              Text(
                                ref.watch(selectedVoucherProvider)?.code ?? 'Hemat dengan voucher promo',
                                style: TextStyle(
                                  fontSize: 12.sp, 
                                  color: ref.watch(selectedVoucherProvider) != null ?  const Color(0xFFFFB400) : const Color(0xFF64748B),
                                  fontWeight: ref.watch(selectedVoucherProvider) != null ? FontWeight.bold : FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Icon(Icons.chevron_right_rounded, color: const Color(0xFFCBD5E1), size: 24.w),
                      ],
                                     ),
                   ),
                  
                  if (loyaltyInfo != null) ...[
                     Padding(
                       padding: EdgeInsets.symmetric(vertical: 12.h),
                       child: Divider(height: 1, color: const Color(0xFFF1F5F9)),
                     ),
                     // Points Section
                     Row(
                      children: [
                        Container(
                          padding: EdgeInsets.all(10.w),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1250A5).withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.stars_rounded, color: const Color(0xFF1250A5), size: 18.w),
                        ),
                        SizedBox(width: 12.w),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Tukar Poin (${loyaltyInfo.loyaltyPoints} Poin)',
                                style: TextStyle(
                                  fontSize: 15.sp, 
                                  fontWeight: FontWeight.w800, 
                                  color: const Color(0xFF0F172A),
                                ),
                              ),
                              Text(
                                '1 Poin = Rp 1.000',
                                style: TextStyle(
                                  fontSize: 12.sp, 
                                  color: const Color(0xFF64748B),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Switch(
                          value: ref.watch(pointsToRedeemProvider) > 0, 
                          onChanged: (loyaltyInfo.loyaltyPoints > 0) ? (val) {
                             if (val) {
                               // Calculate max points usable: min(userPoints, orderTotal * percentage)
                               final totalOrder = calculation['subtotal']! - calculation['discount']!;
                               
                               // Get Settings
                               final settings = loyaltyInfo.loyaltySettings;
                               final pointValue = settings?.pointValueIdr ?? 1000.0;
                               final maxPercent = (settings?.maxRedemptionPercentage ?? 50) / 100.0;
                               
                               // Max allowed value in IDR
                               final maxValueAllowed = totalOrder * maxPercent;
                               
                               // Convert to points (ceil to ensure we don't under-cover, but actually we should floor allowed points? No, ceil points because 1 point = 1000. If we need covers 500 rupiah, 1 point is 1000. Can we redeem partial? No. 
                               // So max points = floor(maxValueAllowed / pointValue)
                               final maxPointsByRule = (maxValueAllowed / pointValue).floor();
                               
                               // Use ALL points if enough, or just enough to cover rule
                               int pointsToUse = loyaltyInfo.loyaltyPoints;
                               
                               // Cap by Rule
                               if (pointsToUse > maxPointsByRule) {
                                  pointsToUse = maxPointsByRule;
                               }
                               
                               // Also Cap by Total Order (can't pay more than 100%) - redundant if maxPercent <= 100
                               final maxPointsTotal = (totalOrder / pointValue).ceil();
                               if (pointsToUse > maxPointsTotal) {
                                 pointsToUse = maxPointsTotal;
                               }

                               if (pointsToUse == 0 && maxPointsByRule == 0) {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Total belanja terlalu kecil untuk penukaran poin.")));
                                  return;
                               }
                               
                               ref.read(pointsToRedeemProvider.notifier).state = pointsToUse;
                               
                               ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                 content: Text("Poin digunakan: $pointsToUse (Maksimal ${(maxPercent * 100).toInt()}% dari total)"),
                                 duration: const Duration(seconds: 2),
                               ));
                             } else {
                               ref.read(pointsToRedeemProvider.notifier).state = 0;
                             }
                          } : null, // Disable if 0 points
                          activeColor: const Color(0xFF1250A5),
                        )
                      ],
                    ),
                  ],
                ],
              ),
            ),

            // Payment Method Selection
            _buildSectionCard(
              child: InkWell(
                onTap: () async {
                  final result = await Navigator.push(
                    context, 
                    MaterialPageRoute(builder: (_) => const PaymentMethodScreen())
                  );
                  if (result != null && result is String) {
                    ref.read(selectedPaymentMethodProvider.notifier).state = result;
                  }
                },
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: EdgeInsets.all(10.w),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            paymentMethod == 'tunai' ? Icons.payments_rounded : Icons.qr_code_scanner_rounded, 
                            color: const Color(0xFF64748B), 
                            size: 18.w
                          ),
                        ),
                        SizedBox(width: 12.w),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Metode Pembayaran',
                                style: TextStyle(
                                  fontSize: 15.sp, 
                                  fontWeight: FontWeight.w800, 
                                  color: const Color(0xFF0F172A),
                                ),
                              ),
                              Text(
                                paymentMethod == 'tunai' ? 'Tunai (Cash)' : 'QRIS (ShopeePay, GoPay, dll)',
                                style: TextStyle(
                                  fontSize: 12.sp, 
                                  color: const Color(0xFF64748B),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Icon(Icons.chevron_right_rounded, color: const Color(0xFFCBD5E1), size: 24.w),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Payment Detail
            _buildSectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'DETAIL PEMBAYARAN',
                    style: TextStyle(
                      fontSize: 10.sp,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF94A3B8),
                      letterSpacing: 1.5,
                    ),
                  ),
                  SizedBox(height: 16.h),
                  _buildPriceRow('Subtotal', 'Rp ${(calculation['subtotal']! / 1000).toInt()}.000'),
                  if (calculation['discount']! > 0) ...[
                    SizedBox(height: 12.h),
                    _buildPriceRow('Diskon Voucher', '- Rp ${(calculation['discount']! / 1000).toInt()}.000', isDiscount: true),
                  ],
                  if (calculation['pointsDiscount']! > 0) ...[
                    SizedBox(height: 12.h),
                    _buildPriceRow('Diskon Poin', '- Rp ${(calculation['pointsDiscount']! / 1000).toInt()}.000', isDiscount: true),
                  ],
                  SizedBox(height: 12.h),
                  _buildPriceRow('Pajak (11%)', 'Rp ${(calculation['tax']! / 1000).toInt()}.000'),
                  SizedBox(height: 20.h),
                  Container(height: 1.h, color: const Color(0xFFF1F5F9)),
                  SizedBox(height: 16.h),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Total Bayar',
                        style: TextStyle(
                          fontSize: 17.sp, 
                          fontWeight: FontWeight.w800, 
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        'Rp ${(calculation['total']! / 1000).toInt()}.000',
                        style: TextStyle(
                          fontSize: 20.sp, 
                          fontWeight: FontWeight.w800, 
                          color: tenant.primaryColor,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: EdgeInsets.fromLTRB(20.w, 16.h, 20.w, ScreenUtil().bottomBarHeight + 16.h),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: const Color(0xFFF1F5F9), width: 1.5)),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 15, offset: const Offset(0, -5)),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'TOTAL PEMBAYARAN',
                      style: TextStyle(
                        fontSize: 10.sp, 
                        fontWeight: FontWeight.w800, 
                        color: const Color(0xFF94A3B8),
                        letterSpacing: 1.2,
                      ),
                    ),
                    Text(
                      'Rp ${(calculation['total']! / 1000).toInt()}.000',
                      style: TextStyle(
                        fontSize: 22.sp, 
                        fontWeight: FontWeight.w800, 
                        color: tenant.primaryColor,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Icon(Icons.verified_user_rounded, color: const Color(0xFF94A3B8), size: 14.w),
                    SizedBox(width: 6.w),
                    Text(
                      'Pembayaran Aman',
                      style: TextStyle(
                        fontSize: 12.sp, 
                        color: const Color(0xFF94A3B8),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            SizedBox(height: 20.h),
            SizedBox(
              width: double.infinity,
              height: 58.h,
              child: ElevatedButton(
                onPressed: () => _handlePlaceOrder(context, ref),
                style: ElevatedButton.styleFrom(
                  backgroundColor: tenant.primaryColor,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
                  elevation: 0,
                  shadowColor: tenant.primaryColor.withOpacity(0.4),
                ),
                child: Text(
                  'Bayar Sekarang',
                  style: TextStyle(
                    fontSize: 16.sp, 
                    fontWeight: FontWeight.w800, 
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showVoucherSelectionModal(BuildContext context, WidgetRef ref) {
    final tenant = ref.read(tenantProvider);
    final vouchersAsync = ref.read(vouchersProvider);
    final calculation = ref.read(orderCalculationProvider);
    final subtotal = calculation['subtotal'] ?? 0;
    final selectedVoucher = ref.read(selectedVoucherProvider);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(24.r),
            topRight: Radius.circular(24.r),
          ),
        ),
        child: Column(
          children: [
            // Handle Bar
            Center(
              child: Container(
                margin: EdgeInsets.only(top: 12.h, bottom: 20.h),
                width: 40.w,
                height: 4.h,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 24.w),
              child: Text(
                "Pilih Voucher",
                style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.bold),
              ),
            ),
            SizedBox(height: 16.h),
            Expanded(
              child: vouchersAsync.when(
                data: (vouchers) {
                  if (vouchers.isEmpty) return Center(child: Text("Tidak ada voucher tersedia"));

                  final applicable = <Voucher>[];
                  final notApplicable = <Voucher>[];

                  for (var v in vouchers) {
                     if ((v.minOrder ?? 0) <= subtotal) {
                       applicable.add(v);
                     } else {
                       notApplicable.add(v);
                     }
                  }

                  return ListView(
                    padding: EdgeInsets.symmetric(horizontal: 20.w),
                    children: [
                       if (applicable.isNotEmpty) ...[
                          Text("Dapat Digunakan", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green, fontSize: 13.sp)),
                          SizedBox(height: 8.h),
                          ...applicable.map((v) => _buildVoucherItem(context, ref, v, true, tenant, selectedVoucher?.id == v.id)),
                          SizedBox(height: 16.h),
                       ],
                       if (notApplicable.isNotEmpty) ...[
                          Text("Belum Memenuhi Syarat", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey, fontSize: 13.sp)),
                          SizedBox(height: 8.h),
                          ...notApplicable.map((v) => _buildVoucherItem(context, ref, v, false, tenant, false)),
                       ]
                    ],
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e,s) => Center(child: Text("Gagal memuat voucher")),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVoucherItem(BuildContext context, WidgetRef ref, Voucher voucher, bool isApplicable, TenantConfig tenant, bool isSelected) {
    return InkWell(
      onTap: isApplicable ? () {
         if (isSelected) {
            ref.read(selectedVoucherProvider.notifier).state = null;
         } else {
            ref.read(selectedVoucherProvider.notifier).state = voucher;
         }
         Navigator.pop(context);
      } : null,
      child: Container(
        margin: EdgeInsets.only(bottom: 12.h),
        padding: EdgeInsets.all(12.w),
        decoration: BoxDecoration(
          color: isApplicable ? Colors.white : Colors.grey[50],
          borderRadius: BorderRadius.circular(12.r),
          border: Border.all(color: isSelected ? tenant.primaryColor : Colors.grey[200]!),
          boxShadow: isApplicable ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset:const Offset(0,2))] : [],
        ),
        child: Row(
          children: [
             Icon(Icons.confirmation_number_outlined, color: isApplicable ? tenant.primaryColor : Colors.grey),
             SizedBox(width: 12.w),
             Expanded(
               child: Column(
                 crossAxisAlignment: CrossAxisAlignment.start,
                 children: [
                   Text(voucher.name, style: TextStyle(fontWeight: FontWeight.bold, color: isApplicable ? Colors.black : Colors.grey)),
                   Text(
                     isApplicable ? voucher.description : "Min. Order Rp ${NumberFormat.decimalPattern('id').format(voucher.minOrder ?? 0)}",
                     style: TextStyle(fontSize: 12.sp, color: Colors.grey[600]),
                   ),
                 ],
               ),
             ),
             if (isSelected) Icon(Icons.check_circle, color: tenant.primaryColor),
          ],
        ),
      ),
    );
  }

  void _handlePlaceOrder(BuildContext context, WidgetRef ref) async {
    final cart = ref.read(cartProvider);
    final selectedOutlet = ref.read(selectedOutletProvider);
    final orderFlow = ref.read(orderFlowProvider);
    
    if (selectedOutlet == null) return;

    // Show loading
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()),
    );

    // CONSTRUCTION PAYLOAD
    try {
      // 1. Pre-Flight Validations
      if (orderFlow.mode == OrderMode.delivery) {
        if (orderFlow.deliveryAddress == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Mohon lengkapi alamat pengiriman terlebih dahulu'),
              backgroundColor: Colors.orange,
            ),
          );
          return;
        }
      } else if (orderFlow.mode == OrderMode.dineIn) {
        if (orderFlow.tableNumber == null || orderFlow.tableNumber!.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Mohon scan nomor meja terlebih dahulu'),
              backgroundColor: Colors.orange,
            ),
          );
          return;
        }
      }

      // Ensure auth session is restored (in case of app restart)
      final authRepo = ref.read(authRepositoryProvider);
      await authRepo.restoreSession();
      
      // Check if we have a valid token
      if (ref.read(apiClientProvider).authToken == null) {
        if (context.mounted) {
          Navigator.pop(context); // Close loading
           ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Sesi Anda telah berakhir. Silakan login kembali.'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      final repository = ref.read(orderRepositoryProvider);
      
      String orderType = 'pickup';
      switch (orderFlow.mode) {
        case OrderMode.dineIn: orderType = 'dine_in'; break;
        case OrderMode.delivery: orderType = 'delivery'; break;
        case OrderMode.pickup: orderType = 'pickup'; break;
        default: orderType = 'pickup';
      }

      // Construct items payload matching strict backend schema
      final itemsPayload = cart.map((item) {
        // Map options to { optionId, valueId }
        final mappedOptions = item.selectedOptions.map((optValue) {
          // Find parent option ID from product options
          final parentOption = item.product.options.firstWhere(
            (opt) => opt.values.any((v) => v.id == optValue.id),
            orElse: () => item.product.options.first, // Fallback (should not happen)
          );
          
          return {
            'optionId': parentOption.id,
            'valueId': optValue.id,
          };
        }).toList();

        // Map modifiers to { modifierId, quantity }
        final mappedModifiers = item.selectedModifiers.map((mod) {
          return {
            'modifierId': mod.id,
            'quantity': 1, // Default quantity 1 for checkbox modifiers
          };
        }).toList();

        return {
          'productId': item.product.id,
          'quantity': item.quantity,
          'notes': item.notes ?? '', // Send empty string instead of null
          'selectedOptions': mappedOptions,
          'selectedModifiers': mappedModifiers,
        };
      }).toList();

      // Build payload map with conditional entries to avoid sending 'null' to Zod
      final Map<String, dynamic> payload = {
        'outletId': selectedOutlet.id,
        'items': itemsPayload,
        'orderType': orderType,
        'paymentMethod': ref.read(selectedPaymentMethodProvider) == 'tunai' ? 'cash' : 'qris',
        'pointsToRedeem': ref.read(pointsToRedeemProvider),
      };

      // Add optional fields only if they have values
      if (orderFlow.pickupTime != null) {
        // Zod datetime() expects strict UTC ISO format (ending with Z or offset)
        // Dart's default toIso8601String() on local time doesn't include offset, causing 422
        payload['scheduledTime'] = orderFlow.pickupTime!.toUtc().toIso8601String();
      }
      
      if (orderFlow.tableId != null && orderFlow.tableId!.isNotEmpty) {
        payload['tableId'] = orderFlow.tableId;
      }
      
      if (orderFlow.mode == OrderMode.delivery && orderFlow.deliveryAddress != null) {
         payload['deliveryAddress'] = {
           'latitude': orderFlow.deliveryAddress?.latitude ?? 0,
           'longitude': orderFlow.deliveryAddress?.longitude ?? 0,
           'address': orderFlow.deliveryAddress?.address ?? '',
           'notes': orderFlow.deliveryAddress?.notes ?? '', 
         };
      }

      final voucherCode = ref.read(selectedVoucherProvider)?.code;
      if (voucherCode != null && voucherCode.isNotEmpty) {
        payload['voucherCode'] = voucherCode;
      }


      final response = await repository.createOrder(
        outletId: payload['outletId'] as String,
        items: payload['items'] as List<Map<String, dynamic>>,
        orderType: payload['orderType'] as String,
        scheduledTime: payload['scheduledTime'] as String?,
        tableId: payload['tableId'] as String?,
        deliveryAddress: payload['deliveryAddress'], 
        paymentMethod: payload['paymentMethod'] as String,
        voucherCode: payload['voucherCode'] as String?,
        pointsToRedeem: payload['pointsToRedeem'] as int?,
      );

      if (context.mounted) {
        Navigator.pop(context); // Close loading dialog
      }

      if (response.success && response.data != null) {
        // Refresh loyalty and vouchers data
        ref.refresh(loyaltyInfoProvider);
        ref.refresh(vouchersProvider);
        ref.invalidate(activeOrdersProvider); // Ensure activity screen shows the new order

        ref.read(cartProvider.notifier).clear();
        ref.read(orderFlowProvider.notifier).reset();
        ref.read(selectedVoucherProvider.notifier).state = null;
        ref.read(pointsToRedeemProvider.notifier).state = 0;
        
        final paymentMethod = ref.read(selectedPaymentMethodProvider);
        if (context.mounted) {
           if (paymentMethod == 'qris') {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (_) => QrisPaymentScreen(order: response.data!)),
            );
          } else {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (_) => OrderTrackingScreen(orderId: response.data!.id)),
            );
          }
        }
      } else {
        if (context.mounted) {
          // SHOW DETAILED ERROR FOR DEBUGGING
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text("Order Failed"),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("Message: ${response.message}"),
                    if (response.errorCode != null) Text("Code: ${response.errorCode}"),
                    // Try to show more details if available in message structure (parsed JSON string?)
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx), 
                  child: const Text("OK")
                )
              ],
            ),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context); // Close loading dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Terjadi kesalahan: ${e.toString()}'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Widget _buildSectionCard({required Widget child, EdgeInsets? padding, double? margin}) {
    return Container(
      width: double.infinity,
      padding: padding ?? EdgeInsets.all(16.w),
      margin: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16.r),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
        ],
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: child,
    );
  }

  Widget _buildOrderItem(String name, String price, String options, int qty, String imageUrl, {bool isLast = false}) {
    return Container(
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        border: isLast ? null : Border(bottom: BorderSide(color: const Color(0xFFF1F5F9), width: 1.w)),
      ),
      child: Row(
        children: [
          Container(
            width: 72.w,
            height: 72.w,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14.r),
              color: const Color(0xFFF1F5F9), // Placeholder color
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14.r),
              child: Image.network(
                imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Icon(
                  Icons.image_not_supported_outlined,
                  color: const Color(0xFF94A3B8),
                  size: 24.w,
                ),
              ),
            ),
          ),
          SizedBox(width: 16.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        name,
                        style: TextStyle(
                          fontSize: 15.sp, 
                          fontWeight: FontWeight.w700, 
                          color: const Color(0xFF0F172A),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    SizedBox(width: 8.w),
                    Text(
                      price,
                      style: TextStyle(
                        fontSize: 15.sp, 
                        fontWeight: FontWeight.w700, 
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 6.h),
                Text(
                  options,
                  style: TextStyle(
                    fontSize: 13.sp, 
                    color: const Color(0xFF64748B),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                SizedBox(height: 6.h),
                Text(
                  'x$qty',
                  style: TextStyle(
                    fontSize: 13.sp, 
                    fontWeight: FontWeight.w800, 
                    color: const Color(0xFF1250A5),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPriceRow(String label, String value, {bool isDiscount = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 14.sp, 
            color: const Color(0xFF64748B),
            fontWeight: FontWeight.w500,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 14.sp,
            fontWeight: FontWeight.w700,
            color: isDiscount ? const Color(0xFF1250A5) : const Color(0xFF1E293B),
          ),
        ),
      ],
    );
  }
  void _showOrderModeSelectorModal(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(24.r),
            topRight: Radius.circular(24.r),
          ),
        ),
        padding: EdgeInsets.all(24.w),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Pilih Metode Pesanan',
              style: TextStyle(
                fontSize: 18.sp,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 16.h),
            _buildModeOption(
              context, 
              'Makan di Tempat (Dine In)', 
              Icons.storefront_rounded, 
              Colors.blue, 
              () async {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const QrScannerScreen()),
                );
              },
            ),
            _buildModeOption(
              context, 
              'Ambil Sendiri (Pickup)', 
              Icons.shopping_bag_rounded, 
              Colors.orange, 
              () {
                Navigator.pop(context);
                PickupTimeModal.show(context);
              }
            ),
             _buildModeOption(
              context, 
              'Pesanan Antar (Delivery)', 
              Icons.motorcycle_rounded, 
              Colors.green, 
              () async {
                Navigator.pop(context);
                final selected = await Navigator.push(
                   context, 
                   MaterialPageRoute(builder: (_) => const AddressListScreen(isSelectionMode: true))
                 );
                 if (selected != null && selected is UserAddress) {
                   ref.read(orderFlowProvider.notifier).setDeliveryAddress(selected);
                   ref.read(orderFlowProvider.notifier).setMode(OrderMode.delivery);
                 }
              }
            ),
            SizedBox(height: 20.h),
          ],
        ),
      ),
    );
  }

  Widget _buildModeOption(BuildContext context, String title, IconData icon, Color color, VoidCallback onTap) {
      return InkWell(
        onTap: onTap,
        child: Container(
            padding: EdgeInsets.symmetric(vertical: 16.h),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: Colors.grey[100]!)),
            ),
            child: Row(
              children: [
                Container(
                  padding: EdgeInsets.all(8.w),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8.r),
                  ),
                  child: Icon(icon, color: color, size: 24.w),
                ),
                SizedBox(width: 16.w),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 16.sp,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                const Spacer(),
                const Icon(Icons.chevron_right, color: Colors.grey),
              ],
            ),
          ),
      );
  }
}

class SSideBox extends StatelessWidget {
  final double? width;
  const SSideBox({super.key, this.width});
  @override
  Widget build(BuildContext context) => SizedBox(width: width);
}
