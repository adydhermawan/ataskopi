import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

// Import Screens
import 'package:ataskopi_frontend/features/home/presentation/screens/home_main_screen.dart';
import 'package:ataskopi_frontend/features/menu/presentation/screens/menu_catalog_screen.dart';
import 'package:ataskopi_frontend/features/onboarding/presentation/screens/onboarding_screen.dart';
import 'package:ataskopi_frontend/features/auth/presentation/screens/auth_entry_screen.dart';
import 'package:ataskopi_frontend/features/auth/presentation/screens/registration_screen.dart';
import 'package:ataskopi_frontend/features/checkout/presentation/screens/checkout_summary_screen.dart';
import 'package:ataskopi_frontend/features/activity/presentation/screens/activity_screen.dart';
import 'package:ataskopi_frontend/features/profile/presentation/screens/profile_screen.dart';

// Import Robots
import 'robots/home_robot.dart';
import 'robots/menu_robot.dart';
import 'robots/auth_robot.dart';
import 'robots/checkout_robot.dart';
import 'robots/activity_robot.dart';
import 'robots/profile_robot.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  Widget createTestApp(Widget home) {
    return ProviderScope(
      child: ScreenUtilInit(
        designSize: const Size(375, 812),
        minTextAdapt: true,
        splitScreenMode: true,
        builder: (context, child) {
          return MaterialApp(
            debugShowCheckedModeBanner: false,
            home: home,
          );
        },
      ),
    );
  }

  group('Automated Design Verification', () {
    testWidgets('Verify Home Screen Design', (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const HomeMainScreen()));
      await tester.pumpAndSettle();

      final homeRobot = HomeRobot(tester);
      await homeRobot.verifyHeaderDesign();
      await homeRobot.verifyOrderModes();
      await homeRobot.verifyDailyCurations();
    });

    testWidgets('Verify Menu Catalog Design', (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const MenuCatalogScreen()));
      await tester.pumpAndSettle();

      final menuRobot = MenuRobot(tester);
      await menuRobot.verifyScreenLoaded();
      await menuRobot.verifyHeader();
      await menuRobot.verifySearchBar();
      await menuRobot.verifyCategories();
      await menuRobot.verifyProductList();
      await menuRobot.verifyFloatingCart();
    });

    testWidgets('Verify Onboarding & Auth Design', (WidgetTester tester) async {
      final authRobot = AuthRobot(tester);
      
      // Onboarding
      await tester.pumpWidget(createTestApp(const OnboardingScreen()));
      await tester.pumpAndSettle();
      await authRobot.verifyOnboarding();

      // Auth Entry
      await tester.pumpWidget(createTestApp(const AuthEntryScreen()));
      await tester.pumpAndSettle();
      await authRobot.verifyAuthEntry();
      
      // Registration
      await tester.pumpWidget(createTestApp(const RegistrationScreen(phoneNumber: '+62 812 3456 7890')));
      await tester.pumpAndSettle();
      await authRobot.verifyRegistration();
    });

    testWidgets('Verify Checkout Design', (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const CheckoutSummaryScreen()));
      await tester.pumpAndSettle();

      final checkoutRobot = CheckoutRobot(tester);
      await checkoutRobot.verifyCheckoutSummary();
    });
    
    testWidgets('Verify Activity Screen Design', (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const ActivityScreen()));
      await tester.pumpAndSettle();

      final activityRobot = ActivityRobot(tester);
      await activityRobot.verifyActivityScreen();
    });
    
    testWidgets('Verify Profile Screen Design', (WidgetTester tester) async {
      await tester.pumpWidget(createTestApp(const ProfileScreen()));
      await tester.pumpAndSettle();

      final profileRobot = ProfileRobot(tester);
      await profileRobot.verifyProfileScreen();
    });

    testWidgets('Verify End-to-End Order Flow', (WidgetTester tester) async {
      // Start at Home
      await tester.pumpWidget(createTestApp(const HomeMainScreen()));
      await tester.pumpAndSettle();
      
      final homeRobot = HomeRobot(tester);
      final menuRobot = MenuRobot(tester);
      final checkoutRobot = CheckoutRobot(tester);

      // 1. Home -> Menu
      await homeRobot.navigateToMenu();
      await menuRobot.verifyScreenLoaded();

      // 2. Menu -> Add Item -> Checkout
      await menuRobot.addItemToCart();
      await menuRobot.tapCheckout();
      
      // 3. Checkout Summary
      await checkoutRobot.verifyCheckoutSummary();
      await checkoutRobot.tapPayNow();
      
      // Verification of success or payment screen would go here
      print('[E2E_FLOW] Order Flow completed successfully');
    });
  });
}
