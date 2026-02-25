import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class ResponsiveWrapper extends StatelessWidget {
  final Widget child;

  const ResponsiveWrapper({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    // Determine if we should apply the wrapper
    bool shouldWrap = kIsWeb;
    if (!kIsWeb) {
      try {
        if (Platform.isMacOS || Platform.isWindows || Platform.isLinux) {
          shouldWrap = true;
        }
      } catch (e) {
        shouldWrap = false;
      }
    }

    if (!shouldWrap) {
      return ScreenUtilInit(
        designSize: const Size(375, 812),
        minTextAdapt: true,
        splitScreenMode: true,
        child: child,
        builder: (context, child) => child!,
      );
    }

    return Container(
      color: const Color(0xFFF1F5F9), // Neutral background for the outer area
      child: Center(
        child: Container(
          constraints: const BoxConstraints(
            maxWidth: 480, // Mobile-like max width
          ),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.1),
                blurRadius: 20,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: ClipRect(
            child: LayoutBuilder(
              builder: (context, constraints) {
                // Override MediaQuery to match the constrained width
                return MediaQuery(
                  data: MediaQuery.of(context).copyWith(
                    size: Size(
                      constraints.maxWidth,
                      MediaQuery.of(context).size.height,
                    ),
                  ),
                  child: ScreenUtilInit(
                    designSize: const Size(375, 812),
                    minTextAdapt: true,
                    splitScreenMode: false,
                    useInheritedMediaQuery: true,
                    rebuildFactor: (old, data) => true,
                    child: child,
                    builder: (context, child) => child!,
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
