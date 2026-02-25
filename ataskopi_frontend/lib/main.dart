import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'core/providers/tenant_provider.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/presentation/screens/auth_entry_screen.dart';
import 'features/scan/presentation/controllers/scan_controller.dart';
import 'core/providers/pending_qr_provider.dart';

import 'core/providers/api_providers.dart' as core;
import 'features/home/presentation/screens/home_main_screen.dart';

void main() async {
  // API Connection test removed to prevent startup delay/errors on Web

  runApp(
    const ProviderScope(
      child: AtasKopiApp(),
    ),
  );
}

class AtasKopiApp extends ConsumerWidget {
  const AtasKopiApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenant = ref.watch(tenantProvider);

    return ScreenUtilInit(
      designSize: const Size(375, 812), // iPhone X/11-size as baseline
      minTextAdapt: true,
      splitScreenMode: true,
      builder: (context, child) {
        return MaterialApp(
          title: tenant.name,
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme(tenant),
          home: const _SessionCheckWrapper(),
        );
      },
    );
  }
}

class _SessionCheckWrapper extends ConsumerStatefulWidget {
  const _SessionCheckWrapper();

  @override
  ConsumerState<_SessionCheckWrapper> createState() => _SessionCheckWrapperState();
}

class _SessionCheckWrapperState extends ConsumerState<_SessionCheckWrapper> {
  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<void> _checkSession() async {
    // Artificial delay for splash effect
    await Future.delayed(const Duration(seconds: 2));
    
    if (!mounted) return;

    // Check session
    final repository = ref.read(core.authRepositoryProvider);

    final response = await repository.checkSession();

    
    if (!mounted) return;

    if (response.success && response.data != null) {
      // Check for QR Code in URL (Web)
      final uri = Uri.base;

      
      if (uri.queryParameters.containsKey('qr')) {
        final qrCode = uri.queryParameters['qr']!;

        
        // Handle it using ScanController
        final success = await ref.read(scanControllerProvider).handleQrCode(context, qrCode);
        if (success) {

           return; 
        } else {

        }
      }

      // Go to Home
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const HomeMainScreen()),
      );
    } else {
      // Check for QR Code in URL (Web) even if not logged in
      final uri = Uri.base;
      if (uri.queryParameters.containsKey('qr')) {
         final qrCode = uri.queryParameters['qr']!;

         ref.read(pendingQrCodeProvider.notifier).state = qrCode;
      }
      
      // Go to Auth
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const AuthEntryScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
             Image.asset('assets/icons/icon-512.png', width: 120.w, height: 120.w),
             SizedBox(height: 24.h),
             CircularProgressIndicator(color: ref.watch(tenantProvider).primaryColor),
          ],
        ),
      ),
    );
  }
}
