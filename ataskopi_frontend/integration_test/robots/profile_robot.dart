import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ataskopi_frontend/features/profile/presentation/screens/profile_screen.dart';

class ProfileRobot {
  final WidgetTester tester;

  ProfileRobot(this.tester);

  Future<void> verifyProfileScreen() async {
    print('[DESIGN_CHECK] [Profile Screen] : Verifying...');
    expect(find.byType(ProfileScreen), findsOneWidget, reason: 'Profile Screen not found');
    
    // Verify Header - always visible
    expect(find.text('Profil Saya'), findsOneWidget);
    expect(find.text('Budi Santoso'), findsOneWidget); // Mock User
    expect(find.text('Gold Member'), findsOneWidget);
    
    // Scroll down to see menu items
    await tester.drag(find.byType(CustomScrollView), const Offset(0, -300));
    await tester.pumpAndSettle();
    
    // Verify Menu Items (at least some should be visible after scrolling)
    expect(find.textContaining('Edit'), findsAtLeastNWidgets(1));
    expect(find.text('Keluar'), findsOneWidget);
    
    print('[DESIGN_CHECK] [Profile Screen] : PASS');
  }
}
