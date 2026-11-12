import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../../selfie/domain/strip.dart';

Future<Uint8List>? _png;
Future<Uint8List>? _raster;

/// The logo artwork, for the selfie strip.
Future<Uint8List> logoPng() =>
    _png ??= rootBundle.load('assets/logo.png').then((data) => data.buffer.asUint8List());

/// The logo as printer commands for the top of a receipt. Rendered once, off
/// the main isolate, then reused for every receipt.
Future<Uint8List> receiptLogo() {
  return _raster ??= logoPng().then((png) => compute(renderLogo, png)).catchError((Object error) {
    _raster = null;
    throw error;
  });
}
