import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ataskopi_frontend/features/onboarding/presentation/screens/onboarding_screen.dart';
import 'package:ataskopi_frontend/features/auth/presentation/screens/auth_entry_screen.dart';
import 'package:ataskopi_frontend/features/auth/presentation/screens/registration_screen.dart';
import 'package:ataskopi_frontend/features/auth/presentation/screens/pin_entry_screen.dart';
import 'package:ataskopi_frontend/shared/widgets/app_button.dart';

class AuthRobot {
  final WidgetTester tester;

  AuthRobot(this.tester);

  Future<void> verifyOnboarding() async {
    print('[DESIGN_CHECK] [Onboarding] : Verifying...');
    expect(find.byType(OnboardingScreen), findsOneWidget, reason: 'Onboarding Screen not found');
    expect(find.text('Pesan Kopi Mudah'), findsOneWidget, reason: 'Title "Pesan Kopi Mudah" not found');
    expect(find.byType(PageView), findsOneWidget);
    expect(find.text('Lanjutkan'), findsOneWidget);
    print('[DESIGN_CHECK] [Onboarding] : PASS');
  }

  Future<void> verifyAuthEntry() async {
    print('[DESIGN_CHECK] [Auth Entry] : Verifying...');
    expect(find.byType(AuthEntryScreen), findsOneWidget, reason: 'Auth Entry Screen not found');
    expect(find.text('Selamat Datang'), findsOneWidget);
    expect(find.text('Masuk dengan Google'), findsOneWidget);
    expect(find.text('Free voucher 50% member baru'), findsOneWidget);
    
    // Phone input check
    expect(find.byType(TextField), findsOneWidget, reason: 'Phone input not found');
    print('[DESIGN_CHECK] [Auth Entry] : PASS');
  }
  
  Future<void> verifyRegistration() async {
     print('[DESIGN_CHECK] [Registration] : Verifying...');
     expect(find.byType(RegistrationScreen), findsOneWidget, reason: 'Registration Screen not found');
     expect(find.text('Lengkapi Data Diri'), findsOneWidget);
     expect(find.widgetWithText(AppButton, 'Lanjutkan'), findsOneWidget);
     print('[DESIGN_CHECK] [Registration] : PASS');
  }

  Future<void> verifyPinEntry() async {
     print('[DESIGN_CHECK] [PIN Entry] : Verifying...');
     expect(find.byType(PinEntryScreen), findsOneWidget, reason: 'Pin Entry Screen not found');
     expect(find.text('Buat PIN Keamanan'), findsOneWidget); // Assuming registration flow
     // Check for keypad buttons 1, 2, 3..
     expect(find.text('1'), findsOneWidget);
     expect(find.text('9'), findsOneWidget);
     expect(find.text('0'), findsOneWidget);
     print('[DESIGN_CHECK] [PIN Entry] : PASS');
  }
}
