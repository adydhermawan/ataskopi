import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ataskopi_frontend/features/home/presentation/widgets/home_banner.dart';
import 'package:ataskopi_frontend/features/home/presentation/widgets/outlet_selector.dart';
import 'package:ataskopi_frontend/features/home/presentation/widgets/order_mode_selector.dart';

class HomeRobot {
  final WidgetTester tester;

  HomeRobot(this.tester);

  Future<void> verifyHeaderDesign() async {
    print('[DESIGN_CHECK] [Home Screen] [Header] : Verifying...');
    
    // Banner check
    final bannerFinder = find.byType(HomeBanner);
    expect(bannerFinder, findsOneWidget, reason: 'Home Banner not found');
    
    // Tier check (Gold Member)
    expect(find.text('Gold Member'), findsOneWidget, reason: 'Tier badge not found');
    
    // Outlet Selector check
    expect(find.byType(OutletSelector), findsOneWidget, reason: 'Outlet Selector not found');
    
    print('[DESIGN_CHECK] [Home Screen] [Header] : PASS');
  }

  Future<void> verifyOrderModes() async {
    print('[DESIGN_CHECK] [Home Screen] [Order Modes] : Verifying...');
    expect(find.byType(OrderModeSelector), findsOneWidget, reason: 'Order Mode Selector not found');
    print('[DESIGN_CHECK] [Home Screen] [Order Modes] : PASS');
  }

  Future<void> verifyDailyCurations() async {
    print('[DESIGN_CHECK] [Home Screen] [Daily Curations] : Verifying...');
    await tester.drag(find.byType(CustomScrollView), const Offset(0, -300));
    await tester.pumpAndSettle();
    
    expect(find.text('Daily Curations'), findsOneWidget, reason: 'Daily Curations header not found');
    expect(find.text('View Menu'), findsOneWidget, reason: 'View Menu button not found');
    print('[DESIGN_CHECK] [Home Screen] [Daily Curations] : PASS');
  }

  Future<void> navigateToMenu() async {
     print('[NAVIGATION] Tapping "View Menu"');
     // Ensure visible
     await tester.drag(find.byType(CustomScrollView), const Offset(0, -600));
     await tester.pumpAndSettle();
     await tester.tap(find.text('View Menu'));
     await tester.pumpAndSettle();
  }
}
