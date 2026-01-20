import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ataskopi_frontend/features/activity/presentation/screens/activity_screen.dart';

class ActivityRobot {
  final WidgetTester tester;

  ActivityRobot(this.tester);

  Future<void> verifyActivityScreen() async {
    print('[DESIGN_CHECK] [Activity Screen] : Verifying...');
    expect(find.byType(ActivityScreen), findsOneWidget, reason: 'Activity Screen not found');
    
    // Verify Header
    expect(find.text('Pesanan Saya'), findsOneWidget);
    
    // Verify Tabs
    expect(find.text('Aktif'), findsOneWidget);
    expect(find.text('Riwayat'), findsOneWidget);
    
    // Verify Content (Mock Data) - Order ID has # prefix
    expect(find.textContaining('ORD-20240119-01'), findsOneWidget); // Active order ID
    expect(find.text('PROSES'), findsOneWidget);
    
    print('[DESIGN_CHECK] [Activity Screen] : PASS');
  }
}
