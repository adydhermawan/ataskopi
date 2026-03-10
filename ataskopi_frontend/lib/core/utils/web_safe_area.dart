import 'dart:js_interop';
import 'package:flutter/foundation.dart';

@JS('window._safeAreaTop')
external JSNumber? get _jsSafeAreaTop;

@JS('window._safeAreaBottom')
external JSNumber? get _jsSafeAreaBottom;

/// Helper to access iOS PWA safe area insets via JavaScript globals.
/// Flutter Web does not automatically read CSS env(safe-area-inset-*) into MediaQuery.
/// We inject the values from CSS->JS in index.html, and read them here using JS Interop.
class WebSafeArea {
  static double _top = 0;
  static double _bottom = 0;

  static void init() {
    if (!kIsWeb) return;
    try {
      _top = _jsSafeAreaTop?.toDartDouble ?? 0.0;
      _bottom = _jsSafeAreaBottom?.toDartDouble ?? 0.0;
    } catch (_) {
      _top = 0;
      _bottom = 0;
    }
  }

  static double get top => _top;
  static double get bottom => _bottom;
}
