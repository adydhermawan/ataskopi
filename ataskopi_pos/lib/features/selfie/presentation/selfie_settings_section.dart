import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/providers.dart';
import '../../../core/theme/brand.dart';
import '../../../core/ui/atas_ui.dart';
import '../../sale/domain/local_order.dart';
import '../data/selfie_settings.dart';
import '../domain/strip.dart';
import 'selfie_screen.dart';

class SelfieSettingsSection extends ConsumerWidget {
  const SelfieSettingsSection({super.key});

  void _toast(BuildContext context, String message) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));

  Future<T?> _choose<T>(BuildContext context, String title, Map<T, String> options) => showDialog<T>(
        context: context,
        builder: (_) => SimpleDialog(
          title: Text(title),
          children: [
            for (final entry in options.entries)
              SimpleDialogOption(onPressed: () => Navigator.of(context).pop(entry.key), child: Text(entry.value)),
          ],
        ),
      );

  Future<void> _editHandle(BuildContext context, WidgetRef ref) async {
    final settings = ref.read(selfieProvider);
    final controller = TextEditingController(text: settings.handle);
    final handle = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Akun IG & TikTok di strip'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(hintText: '@atas_kopi, kosongkan kalau tidak perlu'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.of(context).pop(controller.text.trim()), child: const Text('Simpan')),
        ],
      ),
    );
    controller.dispose();
    if (handle == null) return;
    await ref.read(selfieProvider.notifier).update(settings.copyWith(handle: handle));
  }

  /// Hardware check: times one strip end to end on this printer, so the
  /// photo size and send settings can be tuned before opening.
  Future<void> _testStrip(BuildContext context, WidgetRef ref) async {
    if (ref.read(printerMacProvider) == null) return _toast(context, 'Pilih printer dulu.');
    final messenger = ScaffoldMessenger.of(context);
    final sample = LocalOrder(
      clientOrderId: 'test',
      shiftRef: 'test',
      queueNumber: 'TES',
      orderType: 'take_away',
      channel: 'walk_in',
      lines: const [],
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      createdAt: DateTime.now(),
      guestName: 'Tes strip',
    );
    final strip = await showSelfie(context, sample);
    if (strip == null) return;

    final watch = Stopwatch()..start();
    final printed = await printStrip(ref.read, strip);
    final seconds = (watch.elapsedMilliseconds / 1000).toStringAsFixed(1);
    messenger.showSnackBar(SnackBar(
      content: Text(printed
          ? 'Strip terkirim dalam $seconds detik (${(strip.length / 1024).toStringAsFixed(0)} KB)'
          : 'Strip gagal terkirim setelah $seconds detik. Cek printer menyala dan dekat HP.'),
      duration: const Duration(seconds: 6),
    ));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(selfieProvider);
    final notifier = ref.read(selfieProvider.notifier);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SwitchListTile(
          secondary: const TileIcon(LucideIcons.zap, tone: Tone.sun),
          title: const Text('Mode rush'),
          subtitle: Text(settings.rush ? 'Selfie mati, struk langsung keluar' : 'Selfie ditawarkan setelah bayar'),
          value: settings.rush,
          onChanged: (rush) => notifier.update(settings.copyWith(rush: rush)),
        ),
        ListTile(
          leading: const TileIcon(LucideIcons.atSign),
          title: const Text('Akun IG & TikTok di strip'),
          subtitle: Text(settings.handle.isEmpty ? 'Tidak dicetak' : settings.handle),
          onTap: () => _editHandle(context, ref),
        ),
        ListTile(
          leading: const TileIcon(LucideIcons.image),
          title: const Text('Ukuran foto'),
          subtitle: Text('Tinggi ${photoHeights[settings.photoHeight] ?? '${settings.photoHeight} dot'}'),
          onTap: () async {
            final height = await _choose(context, 'Tinggi foto', photoHeights);
            if (height != null) await notifier.update(settings.copyWith(photoHeight: height));
          },
        ),
        ListTile(
          leading: const TileIcon(LucideIcons.sun),
          title: const Text('Kecerahan foto'),
          subtitle: Text(brightnessLevels[settings.brightness] ?? settings.brightness.toString()),
          onTap: () async {
            final level = await _choose(context, 'Kecerahan foto', brightnessLevels);
            if (level != null) await notifier.update(settings.copyWith(brightness: level));
          },
        ),
        ListTile(
          leading: const TileIcon(LucideIcons.camera),
          title: const Text('Tes strip'),
          subtitle: const Text('Ambil foto dan ukur waktu print'),
          onTap: () => _testStrip(context, ref),
        ),
      ],
    );
  }
}
