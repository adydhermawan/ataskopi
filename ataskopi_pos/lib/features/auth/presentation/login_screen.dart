import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/api/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/ui/atas_ui.dart';

class LoginScreen extends ConsumerStatefulWidget {
  /// [relogin] is shown over the app when the saved session has expired.
  const LoginScreen({super.key, this.relogin = false});

  final bool relogin;

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  late final _phone = TextEditingController(
    text: ref.read(sessionProvider)?.phone ?? ref.read(bootProvider).lastPhone,
  );
  final _pin = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _phone.dispose();
    _pin.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final session = await ref.read(authProvider).login(_phone.text.trim(), _pin.text);
      final previous = ref.read(sessionProvider);
      if (previous != null && previous.outletId != session.outletId) {
        await ref.read(authProvider).logout();
        throw ApiException(403, 'Akun ini untuk outlet lain');
      }

      await ref.read(dbProvider).writeJson(lastPhoneKey, {'phone': session.phone});
      try {
        ref.read(catalogProvider.notifier).set(
              await ref.read(engineProvider).refreshCatalog(session.outletId),
            );
      } on OfflineException {
        // Selling works from the saved menu; it refreshes once back online.
      }
      ref.read(sessionProvider.notifier).set(session);
      if (widget.relogin && mounted) Navigator.of(context).pop();
    } catch (error) {
      setState(() => _error = error is ApiException && error.isUnauthorized
          ? 'Nomor HP atau PIN salah'
          : error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AtasBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: widget.relogin ? AppBar(title: const Text('Login ulang')) : null,
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Center(child: AtasLogo(height: 96)),
                    const SizedBox(height: 14),
                    const Center(child: TonePill('Aplikasi Kasir', tone: Tone.blue, icon: LucideIcons.layoutGrid)),
                    const SizedBox(height: 28),
                    Glass(
                      radius: AtasRadius.xl,
                      opacity: 0.66,
                      padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text('Masuk', style: theme.textTheme.headlineSmall),
                          const SizedBox(height: 4),
                          const Text(
                            'Pakai nomor HP dan PIN kasir kamu.',
                            style: TextStyle(color: AtasColors.inkMuted),
                          ),
                          const SizedBox(height: 22),
                          TextField(
                            controller: _phone,
                            keyboardType: TextInputType.phone,
                            decoration: const InputDecoration(
                              labelText: 'Nomor HP',
                              prefixIcon: Icon(LucideIcons.phone, size: 18),
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _pin,
                            obscureText: true,
                            keyboardType: TextInputType.number,
                            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                            decoration: const InputDecoration(
                              labelText: 'PIN',
                              prefixIcon: Icon(LucideIcons.keyRound, size: 18),
                            ),
                            onSubmitted: (_) => _submit(),
                          ),
                          if (_error != null) ...[
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AtasColors.dangerSoft,
                                borderRadius: BorderRadius.circular(AtasRadius.sm),
                              ),
                              child: Row(
                                children: [
                                  const Icon(LucideIcons.alertCircle, size: 18, color: AtasColors.danger),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _error!,
                                      style: const TextStyle(color: AtasColors.danger, fontWeight: FontWeight.w600),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          const SizedBox(height: 20),
                          FilledButton(
                            onPressed: _busy ? null : _submit,
                            child: Text(_busy ? 'Memeriksa...' : 'Masuk'),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
