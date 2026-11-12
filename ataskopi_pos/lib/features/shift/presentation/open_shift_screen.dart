import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:uuid/uuid.dart';

import '../../../core/api/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/theme/brand.dart';
import '../../../core/ui/atas_ui.dart';
import '../../../core/utils/format.dart';
import '../data/local_shift.dart';

class OpenShiftScreen extends ConsumerStatefulWidget {
  const OpenShiftScreen({super.key});

  @override
  ConsumerState<OpenShiftScreen> createState() => _OpenShiftScreenState();
}

class _OpenShiftScreenState extends ConsumerState<OpenShiftScreen> {
  final _cash = TextEditingController(text: '0');
  bool _busy = false;
  String? _message;

  @override
  void dispose() {
    _cash.dispose();
    super.dispose();
  }

  Future<void> _loadCatalog() async {
    final session = ref.read(sessionProvider)!;
    setState(() => _busy = true);
    try {
      ref.read(catalogProvider.notifier).set(
            await ref.read(engineProvider).refreshCatalog(session.outletId),
          );
      setState(() => _message = null);
    } catch (error) {
      setState(() => _message = 'Menu belum bisa diambil: $error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _open() async {
    final session = ref.read(sessionProvider)!;
    final catalog = ref.read(catalogProvider)!;
    setState(() {
      _busy = true;
      _message = null;
    });

    try {
      // Another phone or a reinstall may have left a shift open on the server.
      LocalShift? running;
      try {
        final open = await ref.read(apiProvider).get('/api/pos/shifts?outletId=${session.outletId}');
        if (open is Map<String, dynamic>) {
          running = LocalShift(
            clientShiftId: open['clientShiftId'] as String,
            outletId: session.outletId,
            openingCash: (open['openingCash'] as num).round(),
            openedAt: DateTime.parse(open['openedAt'] as String),
            menuOrder: catalog.bestSellerOrder(),
            serverId: open['id'] as String,
          );
        }
      } on OfflineException {
        // Opening works offline; the shift is sent once the connection is back.
      }

      await ref.read(shiftProvider.notifier).open(running ??
          LocalShift(
            clientShiftId: const Uuid().v4(),
            outletId: session.outletId,
            openingCash: int.tryParse(_cash.text) ?? 0,
            openedAt: DateTime.now(),
            menuOrder: catalog.bestSellerOrder(),
          ));
    } catch (error) {
      setState(() => _message = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _logout() async {
    await ref.read(authProvider).logout();
    ref.read(sessionProvider.notifier).set(null);
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider)!;
    final catalog = ref.watch(catalogProvider);

    final theme = Theme.of(context);
    final first = session.name.trim().split(' ').first;

    return AtasBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const AtasLogo(height: 32),
          actions: [
            TextButton.icon(
              onPressed: _logout,
              icon: const Icon(LucideIcons.logOut, size: 16),
              label: const Text('Keluar'),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          children: [
            Text('Halo, $first', style: theme.textTheme.headlineMedium),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: TonePill(
                catalog?.outletName ?? 'Menu belum tersedia di HP ini',
                tone: catalog == null ? Tone.warning : Tone.blue,
                icon: LucideIcons.store,
              ),
            ),
            const SizedBox(height: 24),
            Glass(
              radius: AtasRadius.xl,
              opacity: 0.66,
              padding: const EdgeInsets.all(20),
              child: catalog == null
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const TileIcon(LucideIcons.download, size: 48),
                        const SizedBox(height: 14),
                        Text('Ambil menu dulu', style: theme.textTheme.titleLarge),
                        const SizedBox(height: 4),
                        const Text(
                          'Menu disimpan di HP supaya kasir tetap jalan walau offline.',
                          style: TextStyle(color: AtasColors.inkMuted),
                        ),
                        const SizedBox(height: 18),
                        FilledButton.icon(
                          onPressed: _busy ? null : _loadCatalog,
                          icon: const Icon(LucideIcons.download, size: 18),
                          label: const Text('Ambil menu dari server'),
                        ),
                      ],
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            const TileIcon(LucideIcons.wallet, tone: Tone.sun),
                            const SizedBox(width: 12),
                            Text('Modal awal di laci', style: theme.textTheme.titleMedium),
                          ],
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _cash,
                          keyboardType: TextInputType.number,
                          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.5),
                          decoration: const InputDecoration(
                            prefixText: 'Rp ',
                            prefixStyle: TextStyle(
                              fontFamily: atasFont,
                              fontSize: 28,
                              fontWeight: FontWeight.w700,
                              color: AtasColors.inkFaint,
                            ),
                          ),
                          onChanged: (_) => setState(() {}),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final amount in [0, 100000, 200000, 300000])
                              ChoiceChip(
                                label: Text(rupiah(amount)),
                                selected: _cash.text == '$amount',
                                onSelected: (_) => setState(() => _cash.text = '$amount'),
                              ),
                          ],
                        ),
                        const SizedBox(height: 22),
                        FilledButton.icon(
                          onPressed: _busy ? null : _open,
                          icon: const Icon(LucideIcons.play, size: 18),
                          label: Text(_busy ? 'Membuka...' : 'Buka shift'),
                        ),
                      ],
                    ),
            ),
            if (_message != null) ...[
              const SizedBox(height: 16),
              Text(_message!, style: const TextStyle(color: AtasColors.danger, fontWeight: FontWeight.w600)),
            ],
          ],
        ),
      ),
    );
  }
}
