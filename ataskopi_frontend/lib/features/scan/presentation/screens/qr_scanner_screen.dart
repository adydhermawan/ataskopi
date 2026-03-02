// Refactored QR Scanner Screen
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../widgets/qr_scanner_widget.dart';

class QrScannerScreen extends ConsumerWidget {
  const QrScannerScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // The widget encapsulates all scanner logic and UI.
    return const QrScannerWidget();
  }
}
