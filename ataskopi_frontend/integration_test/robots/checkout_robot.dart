import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ataskopi_frontend/features/checkout/presentation/screens/checkout_summary_screen.dart';

class CheckoutRobot {
  final WidgetTester tester;

  CheckoutRobot(this.tester);

  Future<void> verifyCheckoutSummary() async {
    print('[DESIGN_CHECK] [Checkout Summary] : Verifying...');
    expect(find.byType(CheckoutSummaryScreen), findsOneWidget, reason: 'Checkout Summary Screen not found');
    expect(find.text('Checkout Summary'), findsOneWidget);
    
    // Verify Sections
    expect(find.text('PICKUP LOCATION'), findsOneWidget);
    expect(find.text('Morning Brew Coffee - Downtown'), findsOneWidget);
    
    expect(find.text('Your Order'), findsOneWidget);
    expect(find.text('Iced Spanish Latte'), findsOneWidget);
    
    expect(find.text('Voucher & Points'), findsOneWidget);
    expect(find.text('Payment Method'), findsOneWidget);
    
    // Total Amount check
    expect(find.text('TOTAL PEMBAYARAN'), findsOneWidget);
    expect(find.text('Bayar Sekarang'), findsOneWidget);
    
    print('[DESIGN_CHECK] [Checkout Summary] : PASS');
  }

  Future<void> tapPayNow() async {
    print('[ACTION] Tapping "Bayar Sekarang" button');
    await tester.tap(find.text('Bayar Sekarang'));
    await tester.pumpAndSettle();
  }
}
