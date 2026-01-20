import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'core/providers/tenant_provider.dart';
import 'core/theme/app_theme.dart';
import 'features/onboarding/presentation/screens/onboarding_screen.dart';

void main() {
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
          initialRoute: '/',
          routes: {
            '/': (context) => const OnboardingScreen(),
          },
        );
      },
    );
  }
}


