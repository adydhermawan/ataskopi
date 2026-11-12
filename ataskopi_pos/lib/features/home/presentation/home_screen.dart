import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/ui/atas_ui.dart';
import '../../auth/presentation/login_screen.dart';
import '../../online/presentation/online_screen.dart';
import '../../queue/presentation/queue_screen.dart';
import '../../sale/presentation/sell_screen.dart';
import '../../settings/presentation/more_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  void initState() {
    super.initState();
    ref.read(syncLoopProvider).start();
  }

  @override
  void dispose() {
    ref.read(syncLoopProvider).stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final inbox = ref.watch(inboxProvider);
    final waiting = inbox.where((order) => order['orderStatus'] == 'pending').length;
    final activeOrders = ref.watch(ordersProvider).where((order) => order.isActive).length;
    final tab = ref.watch(tabProvider);

    ref.listen(inboxProvider, (previous, next) {
      int count(List<Map<String, dynamic>>? list) =>
          (list ?? const []).where((order) => order['orderStatus'] == 'pending').length;
      if (count(next) > count(previous)) {
        SystemSound.play(SystemSoundType.alert);
        HapticFeedback.heavyImpact();
      }
    });

    return AtasBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        extendBody: true,
        body: SafeArea(
          bottom: false,
          child: Column(
            children: [
              const _Header(),
              const StatusBanner(),
              Expanded(
                child: IndexedStack(
                  index: tab,
                  children: const [SellScreen(), QueueScreen(), OnlineScreen(), MoreScreen()],
                ),
              ),
            ],
          ),
        ),
        bottomNavigationBar: GlassNavBar(
          index: tab,
          onSelect: ref.read(tabProvider.notifier).select,
          items: [
            const NavItem(LucideIcons.layoutGrid, 'Kasir'),
            NavItem(LucideIcons.receipt, 'Antrian', badge: activeOrders),
            NavItem(LucideIcons.radio, 'Online', badge: waiting),
            const NavItem(LucideIcons.user, 'Akun'),
          ],
        ),
      ),
    );
  }
}

class _Header extends ConsumerWidget {
  const _Header();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final outlet = ref.watch(catalogProvider)?.outletName;
    final name = ref.watch(sessionProvider)?.name ?? '';
    final status = ref.watch(syncStatusProvider);
    final (tone, label) = !status.online
        ? (Tone.danger, 'Offline')
        : status.unsettled > 0
            ? (Tone.warning, 'Mengirim')
            : (Tone.success, 'Online');

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
      child: Row(
        children: [
          const AtasLogo(height: 34),
          const SizedBox(width: 12),
          Container(width: 1, height: 28, color: AtasColors.line),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  outlet ?? 'Kasir',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                ),
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: AtasColors.inkMuted, fontSize: 12.5),
                ),
              ],
            ),
          ),
          Glass(
            radius: 99,
            blur: 12,
            shadow: false,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: tone.fg,
                    shape: BoxShape.circle,
                    boxShadow: [BoxShadow(color: tone.fg.withValues(alpha: 0.5), blurRadius: 6)],
                  ),
                ),
                const SizedBox(width: 6),
                Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: tone.fg)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Always visible, so the cashier knows when online orders cannot arrive.
class StatusBanner extends ConsumerWidget {
  const StatusBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(syncStatusProvider);

    if (status.sessionExpired) {
      return _Bar(
        tone: Tone.danger,
        icon: LucideIcons.lock,
        text: 'Sesi habis. Penjualan tetap tersimpan di HP.',
        action: 'Login ulang',
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const LoginScreen(relogin: true)),
        ),
      );
    }
    if (!status.online) {
      return _Bar(
        tone: Tone.danger,
        icon: LucideIcons.wifiOff,
        text: 'Offline · order online tidak masuk · ${status.unsettled} belum terkirim',
      );
    }
    if (status.shiftError != null) {
      return _Bar(tone: Tone.warning, icon: LucideIcons.alertCircle, text: 'Shift ditolak server: ${status.shiftError}');
    }
    if (status.unsettled > 0) {
      return _Bar(
        tone: Tone.warning,
        icon: LucideIcons.refreshCw,
        text: '${status.unsettled} order belum terkirim ke server',
      );
    }
    return const SizedBox.shrink();
  }
}

class _Bar extends StatelessWidget {
  const _Bar({required this.tone, required this.icon, required this.text, this.action, this.onTap});

  final Tone tone;
  final IconData icon;
  final String text;
  final String? action;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 4, 16, 4),
      padding: EdgeInsets.fromLTRB(12, action == null ? 10 : 4, 4, action == null ? 10 : 4),
      decoration: BoxDecoration(
        color: tone.bg,
        borderRadius: BorderRadius.circular(AtasRadius.md),
        border: Border.all(color: tone.fg.withValues(alpha: 0.18)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: tone.fg),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text, style: TextStyle(color: tone.fg, fontWeight: FontWeight.w700, fontSize: 13)),
          ),
          if (action != null)
            TextButton(
              onPressed: onTap,
              style: TextButton.styleFrom(foregroundColor: tone.fg),
              child: Text(action!),
            ),
        ],
      ),
    );
  }
}
