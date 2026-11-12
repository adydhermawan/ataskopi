import 'package:flutter/material.dart';

import 'brand.dart';

export 'brand.dart';

ThemeData buildTheme() {
  const scheme = ColorScheme(
    brightness: Brightness.light,
    primary: AtasColors.blue,
    onPrimary: Colors.white,
    primaryContainer: AtasColors.sky,
    onPrimaryContainer: AtasColors.blueDeep,
    // Material uses secondaryContainer for selected chips and tonal buttons,
    // so it stays in the blue family; the sun is reserved for accents.
    secondary: AtasColors.blueBright,
    onSecondary: Colors.white,
    secondaryContainer: AtasColors.sky,
    onSecondaryContainer: AtasColors.blueDeep,
    tertiary: AtasColors.sun,
    onTertiary: AtasColors.ink,
    tertiaryContainer: AtasColors.sunSoft,
    onTertiaryContainer: AtasColors.sunInk,
    error: AtasColors.danger,
    onError: Colors.white,
    errorContainer: AtasColors.dangerSoft,
    onErrorContainer: Color(0xFF8E1F23),
    surface: AtasColors.surface,
    onSurface: AtasColors.ink,
    onSurfaceVariant: AtasColors.inkMuted,
    surfaceContainerLowest: Colors.white,
    surfaceContainerLow: Color(0xFFF8FAFD),
    surfaceContainer: Color(0xFFF2F5FA),
    surfaceContainerHigh: Color(0xFFECF0F6),
    surfaceContainerHighest: Color(0xFFE5EAF2),
    outline: AtasColors.inkFaint,
    outlineVariant: AtasColors.line,
    inverseSurface: AtasColors.ink,
    onInverseSurface: Colors.white,
    inversePrimary: Color(0xFF9CC0FF),
    shadow: Color(0xFF0B1E44),
    scrim: Color(0xFF0B1E44),
    surfaceTint: Colors.transparent,
  );

  final base = ThemeData(useMaterial3: true, colorScheme: scheme, fontFamily: atasFont);
  final text = base.textTheme.apply(bodyColor: AtasColors.ink, displayColor: AtasColors.ink).copyWith(
        displaySmall: base.textTheme.displaySmall?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -1),
        headlineMedium: base.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.6),
        headlineSmall: base.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.4),
        titleLarge: base.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.3),
        titleMedium: base.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        titleSmall: base.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
        labelLarge: base.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700),
      );

  OutlineInputBorder field(Color color, [double width = 1]) => OutlineInputBorder(
        borderRadius: BorderRadius.circular(AtasRadius.md),
        borderSide: BorderSide(color: color, width: width),
      );
  final buttonShape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(AtasRadius.md));
  const buttonText = TextStyle(fontFamily: atasFont, fontSize: 15.5, fontWeight: FontWeight.w700);

  return base.copyWith(
    textTheme: text,
    scaffoldBackgroundColor: AtasColors.canvas,
    splashFactory: InkRipple.splashFactory,
    appBarTheme: AppBarTheme(
      centerTitle: false,
      elevation: 0,
      scrolledUnderElevation: 0,
      backgroundColor: Colors.transparent,
      foregroundColor: AtasColors.ink,
      titleTextStyle: text.titleLarge,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(64, 54),
        padding: const EdgeInsets.symmetric(horizontal: 20),
        shape: buttonShape,
        textStyle: buttonText,
        disabledBackgroundColor: const Color(0xFFDDE3ED),
        disabledForegroundColor: AtasColors.inkFaint,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(64, 50),
        padding: const EdgeInsets.symmetric(horizontal: 18),
        shape: buttonShape,
        textStyle: buttonText,
        foregroundColor: AtasColors.ink,
        side: const BorderSide(color: AtasColors.line, width: 1.2),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        shape: buttonShape,
        textStyle: buttonText.copyWith(fontSize: 14.5),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      border: field(AtasColors.line),
      enabledBorder: field(AtasColors.line),
      focusedBorder: field(AtasColors.blue, 1.6),
      errorBorder: field(AtasColors.danger),
      labelStyle: const TextStyle(color: AtasColors.inkMuted, fontWeight: FontWeight.w500),
      floatingLabelStyle: const TextStyle(color: AtasColors.blue, fontWeight: FontWeight.w600),
      hintStyle: const TextStyle(color: AtasColors.inkFaint, fontWeight: FontWeight.w500),
      prefixIconColor: AtasColors.inkMuted,
      suffixIconColor: AtasColors.inkMuted,
      prefixStyle: const TextStyle(color: AtasColors.inkMuted, fontWeight: FontWeight.w600),
    ),
    chipTheme: ChipThemeData(
      showCheckmark: false,
      backgroundColor: Colors.white,
      selectedColor: AtasColors.blue,
      disabledColor: AtasColors.canvas,
      side: const WidgetStateBorderSide.fromMap({
        WidgetState.selected: BorderSide(color: AtasColors.blue),
        WidgetState.any: BorderSide(color: AtasColors.line),
      }),
      shape: const StadiumBorder(),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
      labelStyle: TextStyle(
        fontFamily: atasFont,
        fontSize: 13.5,
        fontWeight: FontWeight.w600,
        color: WidgetStateColor.resolveWith(
          (states) => states.contains(WidgetState.selected) ? Colors.white : AtasColors.ink,
        ),
      ),
      secondaryLabelStyle: const TextStyle(
        fontFamily: atasFont,
        fontSize: 13.5,
        fontWeight: FontWeight.w700,
        color: Colors.white,
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: AtasColors.ink.withValues(alpha: 0.94),
      contentTextStyle: const TextStyle(fontFamily: atasFont, color: Colors.white, fontWeight: FontWeight.w600),
      actionTextColor: AtasColors.sun,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AtasRadius.md)),
      elevation: 0,
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AtasRadius.xl)),
      titleTextStyle: text.titleLarge,
    ),
    popupMenuTheme: PopupMenuThemeData(
      color: Colors.white,
      surfaceTintColor: Colors.transparent,
      elevation: 12,
      shadowColor: AtasColors.blueDeep.withValues(alpha: 0.25),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AtasRadius.md)),
      textStyle: const TextStyle(fontFamily: atasFont, fontWeight: FontWeight.w600, color: AtasColors.ink),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: const WidgetStatePropertyAll(Colors.white),
      trackColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected) ? AtasColors.blue : const Color(0xFFD5DCE7),
      ),
      trackOutlineColor: const WidgetStatePropertyAll(Colors.transparent),
    ),
    listTileTheme: const ListTileThemeData(
      iconColor: AtasColors.blue,
      contentPadding: EdgeInsets.symmetric(horizontal: 16),
      minVerticalPadding: 12,
      titleTextStyle: TextStyle(fontFamily: atasFont, fontSize: 15, fontWeight: FontWeight.w700, color: AtasColors.ink),
      subtitleTextStyle: TextStyle(fontFamily: atasFont, fontSize: 13, color: AtasColors.inkMuted),
    ),
    dividerTheme: const DividerThemeData(color: AtasColors.line, thickness: 1, space: 1),
    badgeTheme: const BadgeThemeData(
      backgroundColor: AtasColors.danger,
      textStyle: TextStyle(fontFamily: atasFont, fontSize: 10, fontWeight: FontWeight.w800),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: AtasColors.blue),
  );
}
