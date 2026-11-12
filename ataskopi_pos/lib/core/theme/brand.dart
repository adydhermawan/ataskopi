import 'package:flutter/material.dart';

/// AtasKopi brand tokens. The two anchors come straight from the logo:
/// Atas Blue (the "atas" script) and Sun (the circle behind "Kopi").
/// Everything else is a tint or a neutral built around them.
abstract final class AtasColors {
  // Brand
  static const blue = Color(0xFF1250A5); // logo ink, primary actions
  static const blueBright = Color(0xFF2F6FE4); // gradient start, focus rings
  static const blueDeep = Color(0xFF0B3478); // gradient end, text on sky
  static const sky = Color(0xFFE8F0FF); // tonal fills, selected states
  static const sun = Color(0xFFFFB400); // logo sun, badges and highlights
  static const sunSoft = Color(0xFFFFF4D6);
  static const sunInk = Color(0xFF7A4F00); // text on sun or sunSoft

  // Neutrals, slightly blue so they sit well next to the brand blue.
  static const ink = Color(0xFF0E1B33);
  static const inkMuted = Color(0xFF5E6B82);
  static const inkFaint = Color(0xFF9AA4B6);
  static const line = Color(0xFFE3E9F3);
  static const canvas = Color(0xFFF3F6FB);
  static const surface = Color(0xFFFFFFFF);

  // Status
  static const success = Color(0xFF12925A);
  static const successSoft = Color(0xFFE1F5EA);
  static const warning = Color(0xFFC26A05);
  static const warningSoft = Color(0xFFFFF0DA);
  static const danger = Color(0xFFDC3E42);
  static const dangerSoft = Color(0xFFFDEBEC);
}

abstract final class AtasGradients {
  static const primary = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AtasColors.blueBright, AtasColors.blue, AtasColors.blueDeep],
    stops: [0, 0.55, 1],
  );
}

abstract final class AtasRadius {
  static const sm = 12.0;
  static const md = 16.0;
  static const lg = 22.0;
  static const xl = 28.0;
}

const atasFont = 'PlusJakartaSans';

/// Semantic colour pairs for pills, banners and icon boxes.
enum Tone {
  blue(AtasColors.blue, AtasColors.sky),
  sun(AtasColors.sunInk, AtasColors.sunSoft),
  success(AtasColors.success, AtasColors.successSoft),
  warning(AtasColors.warning, AtasColors.warningSoft),
  danger(AtasColors.danger, AtasColors.dangerSoft),
  neutral(AtasColors.inkMuted, Color(0xFFEEF1F6));

  const Tone(this.fg, this.bg);

  final Color fg;
  final Color bg;
}
