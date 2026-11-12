import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme/brand.dart';

/// Soft brand-coloured light behind every screen. Painted once and cached,
/// so it gives the glass something to refract without costing frames.
class AtasBackground extends StatelessWidget {
  const AtasBackground({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        const Positioned.fill(child: RepaintBoundary(child: CustomPaint(painter: _GlowPainter()))),
        child,
      ],
    );
  }
}

class _GlowPainter extends CustomPainter {
  const _GlowPainter();

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = AtasColors.canvas);
    void glow(Offset center, double radius, Color color) {
      canvas.drawCircle(
        center,
        radius,
        Paint()
          ..shader = RadialGradient(colors: [color, color.withValues(alpha: 0)])
              .createShader(Rect.fromCircle(center: center, radius: radius)),
      );
    }

    final w = size.width;
    final h = size.height;
    glow(Offset(w * -0.1, h * 0.0), w * 1.0, AtasColors.blueBright.withValues(alpha: 0.22));
    glow(Offset(w * 1.1, h * 0.42), w * 0.8, AtasColors.sun.withValues(alpha: 0.16));
    glow(Offset(w * 0.1, h * 1.0), w * 1.0, const Color(0xFF7FB2FF).withValues(alpha: 0.24));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Frosted, slightly see-through panel with a light-catching rim.
/// Use it for things that float over content: nav, cart bar, sheets.
class Glass extends StatelessWidget {
  const Glass({
    super.key,
    required this.child,
    this.radius = AtasRadius.lg,
    this.padding = EdgeInsets.zero,
    this.blur = 22,
    this.opacity = 0.72,
    this.shadow = true,
  });

  final Widget child;
  final double radius;
  final EdgeInsetsGeometry padding;
  final double blur;
  final double opacity;
  final bool shadow;

  @override
  Widget build(BuildContext context) {
    final shape = BorderRadius.circular(radius);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: shape,
        boxShadow: shadow
            ? [
                BoxShadow(
                  color: AtasColors.blueDeep.withValues(alpha: 0.12),
                  blurRadius: 32,
                  spreadRadius: -6,
                  offset: const Offset(0, 14),
                ),
              ]
            : null,
      ),
      child: ClipRRect(
        borderRadius: shape,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: CustomPaint(
            foregroundPainter: _RimPainter(radius),
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Colors.white.withValues(alpha: (opacity + 0.12).clamp(0, 1)),
                    Colors.white.withValues(alpha: (opacity - 0.12).clamp(0, 1)),
                  ],
                ),
              ),
              child: Padding(padding: padding, child: child),
            ),
          ),
        ),
      ),
    );
  }
}

class _RimPainter extends CustomPainter {
  const _RimPainter(this.radius);

  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect.deflate(0.6), Radius.circular(radius)),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2
        ..shader = LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white,
            Colors.white.withValues(alpha: 0.25),
            Colors.white.withValues(alpha: 0.75),
          ],
          stops: const [0, 0.5, 1],
        ).createShader(rect),
    );
  }

  @override
  bool shouldRepaint(_RimPainter oldDelegate) => oldDelegate.radius != radius;
}

/// Solid white card for list content. Cheaper than [Glass], so lists use it.
class SurfaceCard extends StatelessWidget {
  const SurfaceCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin = EdgeInsets.zero,
    this.onTap,
    this.onLongPress,
    this.color = Colors.white,
    this.borderColor = AtasColors.line,
    this.borderWidth = 1,
    this.radius = AtasRadius.lg,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry margin;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final Color color;
  final Color borderColor;
  final double borderWidth;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(radius),
      side: BorderSide(color: borderColor, width: borderWidth),
    );
    return Padding(
      padding: margin,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(radius),
          boxShadow: [
            BoxShadow(
              color: AtasColors.blueDeep.withValues(alpha: 0.05),
              blurRadius: 18,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Material(
          color: color,
          shape: shape,
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: onTap,
            onLongPress: onLongPress,
            child: Padding(padding: padding, child: child),
          ),
        ),
      ),
    );
  }
}

class AtasLogo extends StatelessWidget {
  const AtasLogo({super.key, this.height = 32, this.onDark = false});

  final double height;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      onDark ? 'assets/brand/logo_white.png' : 'assets/brand/logo.png',
      height: height,
      filterQuality: FilterQuality.medium,
      semanticLabel: 'Kopi Atas',
    );
  }
}

class TonePill extends StatelessWidget {
  const TonePill(this.label, {super.key, this.tone = Tone.neutral, this.icon, this.solid = false});

  final String label;
  final Tone tone;
  final IconData? icon;

  /// Filled with the strong colour, for things that must be seen at a glance.
  final bool solid;

  @override
  Widget build(BuildContext context) {
    final fg = solid ? (tone == Tone.sun ? AtasColors.ink : Colors.white) : tone.fg;
    final bg = solid ? (tone == Tone.sun ? AtasColors.sun : tone.fg) : tone.bg;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(99)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 13, color: fg), const SizedBox(width: 4)],
          Text(
            label,
            style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w700, height: 1.2),
          ),
        ],
      ),
    );
  }
}

/// Rounded, tinted square behind a list icon.
class TileIcon extends StatelessWidget {
  const TileIcon(this.icon, {super.key, this.tone = Tone.blue, this.size = 38});

  final IconData icon;
  final Tone tone;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: tone.bg, borderRadius: BorderRadius.circular(AtasRadius.sm)),
      child: Icon(icon, size: size * 0.5, color: tone.fg),
    );
  }
}

class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key, this.padding = const EdgeInsets.fromLTRB(4, 20, 4, 8)});

  final String text;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Text(
        text.toUpperCase(),
        style: const TextStyle(
          color: AtasColors.inkMuted,
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.9,
        ),
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, this.subtitle});

  final IconData icon;
  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Glass(
              radius: 28,
              padding: const EdgeInsets.all(22),
              child: Icon(icon, size: 34, color: AtasColors.blue),
            ),
            const SizedBox(height: 16),
            Text(title, style: Theme.of(context).textTheme.titleMedium, textAlign: TextAlign.center),
            if (subtitle != null) ...[
              const SizedBox(height: 4),
              Text(subtitle!, style: const TextStyle(color: AtasColors.inkMuted), textAlign: TextAlign.center),
            ],
          ],
        ),
      ),
    );
  }
}

/// iOS-style segmented control: the picked option is a raised white pill.
class PillToggle<T> extends StatelessWidget {
  const PillToggle({super.key, required this.options, required this.value, required this.onChanged});

  final Map<T, String> options;
  final T value;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AtasColors.ink.withValues(alpha: 0.055),
        borderRadius: BorderRadius.circular(AtasRadius.md),
      ),
      child: Row(
        children: [
          for (final entry in options.entries)
            Expanded(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => onChanged(entry.key),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  curve: Curves.easeOut,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: entry.key == value ? Colors.white : Colors.transparent,
                    borderRadius: BorderRadius.circular(AtasRadius.sm),
                    boxShadow: entry.key == value
                        ? [BoxShadow(color: AtasColors.blueDeep.withValues(alpha: 0.10), blurRadius: 10, offset: const Offset(0, 3))]
                        : null,
                  ),
                  child: Text(
                    entry.value,
                    style: TextStyle(
                      fontWeight: entry.key == value ? FontWeight.w700 : FontWeight.w600,
                      color: entry.key == value ? AtasColors.blue : AtasColors.inkMuted,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class QtyStepper extends StatelessWidget {
  const QtyStepper({super.key, required this.value, this.onMinus, this.onPlus, this.large = false});

  final int value;
  final VoidCallback? onMinus;
  final VoidCallback? onPlus;
  final bool large;

  @override
  Widget build(BuildContext context) {
    final size = large ? 46.0 : 34.0;
    Widget button(IconData icon, VoidCallback? onTap, {bool filled = false}) => Material(
          color: filled ? AtasColors.blue : Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(large ? 14 : 10)),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(large ? 14 : 10),
            child: SizedBox(
              width: size,
              height: size,
              child: Icon(
                icon,
                size: large ? 20 : 16,
                color: onTap == null ? AtasColors.inkFaint : (filled ? Colors.white : AtasColors.ink),
              ),
            ),
          ),
        );

    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: AtasColors.ink.withValues(alpha: 0.055),
        borderRadius: BorderRadius.circular(large ? 17 : 13),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          button(Icons.remove_rounded, onMinus),
          SizedBox(
            width: large ? 44 : 32,
            child: Text(
              '$value',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: large ? 18 : 15, fontWeight: FontWeight.w800),
            ),
          ),
          button(Icons.add_rounded, onPlus, filled: true),
        ],
      ),
    );
  }
}

/// Bottom sheet on frosted glass. Every sheet in the app goes through here.
Future<T?> showGlassSheet<T>(BuildContext context, WidgetBuilder builder) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    elevation: 0,
    barrierColor: AtasColors.ink.withValues(alpha: 0.30),
    builder: (context) => _GlassSheet(child: builder(context)),
  );
}

class _GlassSheet extends StatelessWidget {
  const _GlassSheet({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    const shape = BorderRadius.vertical(top: Radius.circular(30));
    return ClipRRect(
      borderRadius: shape,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 28, sigmaY: 28),
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: shape,
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Colors.white.withValues(alpha: 0.96), const Color(0xFFF5F8FE).withValues(alpha: 0.94)],
            ),
            border: const Border(top: BorderSide(color: Colors.white, width: 1.5)),
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 5,
                  margin: const EdgeInsets.only(top: 10, bottom: 14),
                  decoration: BoxDecoration(color: AtasColors.inkFaint.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(9)),
                ),
                Flexible(child: child),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Smaller buttons for card actions, where the full 54dp is too much.
ButtonStyle compactButton() => const ButtonStyle(
      minimumSize: WidgetStatePropertyAll(Size(0, 42)),
      padding: WidgetStatePropertyAll(EdgeInsets.symmetric(horizontal: 16)),
      textStyle: WidgetStatePropertyAll(TextStyle(fontFamily: atasFont, fontSize: 14, fontWeight: FontWeight.w700)),
      shape: WidgetStatePropertyAll(RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(13)))),
    );

class NavItem {
  const NavItem(this.icon, this.label, {this.badge = 0});

  final IconData icon;
  final String label;
  final int badge;
}

/// Floating glass tab bar. The picked tab becomes a brand-blue pill.
class GlassNavBar extends StatelessWidget {
  const GlassNavBar({super.key, required this.items, required this.index, required this.onSelect});

  final List<NavItem> items;
  final int index;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.paddingOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 0, 16, bottom > 0 ? bottom : 12),
      child: Glass(
        radius: 26,
        padding: const EdgeInsets.all(6),
        child: Row(
          children: [
            for (var i = 0; i < items.length; i++)
              Expanded(child: _NavButton(item: items[i], selected: i == index, onTap: () => onSelect(i))),
          ],
        ),
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  const _NavButton({required this.item, required this.selected, required this.onTap});

  final NavItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? Colors.white : AtasColors.inkMuted;
    return Semantics(
      selected: selected,
      button: true,
      label: item.label,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 240),
          curve: Curves.easeOutCubic,
          height: 56,
          decoration: BoxDecoration(
            gradient: selected ? AtasGradients.primary : null,
            borderRadius: BorderRadius.circular(20),
            boxShadow: selected
                ? [BoxShadow(color: AtasColors.blue.withValues(alpha: 0.35), blurRadius: 14, offset: const Offset(0, 6))]
                : null,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Badge(
                isLabelVisible: item.badge > 0,
                label: Text('${item.badge}'),
                backgroundColor: selected ? AtasColors.sun : AtasColors.danger,
                textColor: selected ? AtasColors.ink : Colors.white,
                child: Icon(item.icon, size: 21, color: color),
              ),
              const SizedBox(height: 3),
              Text(
                item.label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
