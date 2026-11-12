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

/// The strip takes the receipt's place. When the customer skips the photo,
/// the receipt prints instead, unless it already went out.
Future<void> selfieOrReceipt(BuildContext context, LocalOrder order, {bool receiptIfSkipped = true}) async {
  final read = readerOf(context);
  final messenger = ScaffoldMessenger.of(context);
  final strip = await showSelfie(context, order);

  if (strip != null) {
    await printWithRetry(messenger, read, 'strip ${order.queueNumber}', () => printStrip(read, strip));
  } else if (receiptIfSkipped) {
    await printWithRetry(messenger, read, order.queueNumber, () => printReceipt(read, order));
  }
}

bool offersSelfie(Reader read, LocalOrder order) => order.channel == 'walk_in' && !read(selfieProvider).rush;
