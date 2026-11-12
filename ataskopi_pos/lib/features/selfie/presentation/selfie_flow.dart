import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../sale/domain/local_order.dart';
import 'selfie_screen.dart';

/// Reads through the app's container, so a print that finishes after its
/// screen is gone still works.
Reader readerOf(BuildContext context) => ProviderScope.containerOf(context, listen: false).read;

/// A failed print never blocks the sale; the cashier gets a retry instead.
Future<void> printWithRetry(
  ScaffoldMessengerState messenger,
  Reader read,
  String label,
  Future<bool> Function() job,
) async {
  if (await job()) return;
  final hasPrinter = read(printerMacProvider) != null;
  messenger.showSnackBar(SnackBar(
    content: Text(hasPrinter ? 'Print $label gagal' : 'Printer belum dipilih (menu Lainnya)'),
    action: hasPrinter
        ? SnackBarAction(label: 'Print ulang', onPressed: () => printWithRetry(messenger, read, label, job))
        : null,
  ));
}

/// Opens the camera. The photo is saved on the phone before it prints, so the
/// strip can be printed again later with the same photo.
Future<void> takeSelfie(BuildContext context, LocalOrder order) async {
  final read = readerOf(context);
  final messenger = ScaffoldMessenger.of(context);
  final shot = await showSelfie(context, order);
  if (shot == null) return;

  await read(savedSelfiesProvider.notifier).save(order.clientOrderId, shot);
  await printWithRetry(messenger, read, 'strip ${order.queueNumber}', () => printStrip(read, order, shot));
}

/// Prints the saved strip again. False when the photo is gone.
Future<bool> reprintSelfie(Reader read, LocalOrder order) async {
  final shot = await read(savedSelfiesProvider.notifier).load(order.clientOrderId);
  return shot != null && await printStrip(read, order, shot);
}

bool offersSelfie(Reader read, LocalOrder order) => order.channel == 'walk_in' && !read(selfieProvider).rush;
