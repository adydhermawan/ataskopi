import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class WebConstrainedBox extends StatelessWidget {
  final Widget child;

  const WebConstrainedBox({
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
      return child;
    }

    // On Web/Desktop, strictly constrain the width.
    // We use a Container with alignment to center the app.
    // The inner ConstrainedBox forces the child to be at most 480px wide.
    return Container(
      color: const Color(0xFFF1F5F9), // Neutral background for outside area
      alignment: Alignment.center,
      child: ConstrainedBox(
        constraints: const BoxConstraints(
          maxWidth: 480,
        ),
        child: Container(
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
              child: child,
            ),
        ),
      ),
    );
  }
}
