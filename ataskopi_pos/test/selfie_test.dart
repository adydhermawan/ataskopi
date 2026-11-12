import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:ataskopi_pos/features/printer/data/printer_service.dart';
import 'package:ataskopi_pos/features/printer/data/receipt.dart';
import 'package:ataskopi_pos/features/sale/domain/cart.dart';
import 'package:ataskopi_pos/features/sale/domain/local_order.dart';
import 'package:ataskopi_pos/features/selfie/data/selfie_settings.dart';
import 'package:ataskopi_pos/features/selfie/domain/strip.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;

/// A landscape photo whose left half is dark and right half is light.
Uint8List samplePhoto({int width = 640, int height = 480}) {
  final image = img.Image(width: width, height: height);
  for (final pixel in image) {
    final value = pixel.x < width ~/ 2 ? 30 : 230;
    pixel
      ..r = value
      ..g = value
      ..b = value;
  }
  return img.encodeJpg(image);
}

double darkShare(MonoBitmap bitmap, {required int fromX, required int toX, required int fromY, required int toY}) {
  var dark = 0;
  for (var y = fromY; y < toY; y++) {
    for (var x = fromX; x < toX; x++) {
      dark += bitmap.dots[y * bitmap.width + x];
    }
  }
  return dark / ((toX - fromX) * (toY - fromY));
}

class FakeTransport implements PrinterTransport {
  final writes = <List<int>>[];
  Completer<void>? gate;

  @override
  Future<bool> connect(String mac) async => true;

  @override
  Future<bool> write(List<int> bytes) async {
    writes.add(bytes);
    await gate?.future;
    return true;
  }
}

LocalOrder sampleOrder({List<LocalPayment> payments = const [], List<CartLine> lines = const []}) => LocalOrder(
      clientOrderId: 'c1',
      shiftRef: 's1',
      queueNumber: 'A-007',
      orderType: 'take_away',
      channel: 'walk_in',
      lines: lines,
      subtotal: 25000,
      discount: 0,
      tax: 0,
      total: 25000,
      createdAt: DateTime(2026, 11, 10, 14, 30),
      guestName: 'Rina',
      payments: payments,
    );

void main() {
  group('strip', () {
    test('photo fills the frame at the printer width', () {
      final bitmap = composeStrip(StripRequest(photo: samplePhoto(), photoHeight: 320));

      expect(bitmap.width, printerDots);
      expect(bitmap.height, 320 + 2 * frameBorder);
      expect(bitmap.dots.every((dot) => dot == 0 || dot == 1), isTrue);
    });

    test('frame is solid black and the photo keeps its tones', () {
      final bitmap = composeStrip(StripRequest(photo: samplePhoto(), photoHeight: 320));

      expect(darkShare(bitmap, fromX: 0, toX: printerDots, fromY: 0, toY: frameBorder), 1.0);
      expect(darkShare(bitmap, fromX: 0, toX: frameBorder, fromY: 0, toY: bitmap.height), 1.0);
      expect(darkShare(bitmap, fromX: 40, toX: 150, fromY: 40, toY: 280), greaterThan(0.7));
      expect(darkShare(bitmap, fromX: 230, toX: 340, fromY: 40, toY: 280), lessThan(0.3));
    });

    test('mirror flips the photo to match the front camera preview', () {
      final bitmap = composeStrip(StripRequest(photo: samplePhoto(), photoHeight: 320, mirror: true));

      expect(darkShare(bitmap, fromX: 40, toX: 150, fromY: 40, toY: 280), lessThan(0.3));
      expect(darkShare(bitmap, fromX: 230, toX: 340, fromY: 40, toY: 280), greaterThan(0.7));
    });

    test('logo is cropped to its ink and sits above the frame', () {
      final logo = File('assets/logo.png').readAsBytesSync();
      final bitmap = composeStrip(StripRequest(photo: samplePhoto(), logo: logo, photoHeight: 320));
      final logoRows = bitmap.height - 320 - 2 * frameBorder;

      expect(logoRows, inInclusiveRange(60, 200));
      expect(darkShare(bitmap, fromX: 0, toX: printerDots, fromY: 0, toY: logoRows), greaterThan(0.05));
      expect(darkShare(bitmap, fromX: 0, toX: 60, fromY: 0, toY: logoRows - 12), 0);
    });

    test('raster is split into bands of at most 32 rows', () {
      final bitmap = composeStrip(StripRequest(photo: samplePhoto(), photoHeight: 320));
      final raster = encodeRaster(bitmap);
      final bands = (bitmap.height / 32).ceil();

      expect(raster.length, bands * 8 + bitmap.height * printerDots ~/ 8);
      expect(raster.sublist(0, 8), [0x1D, 0x76, 0x30, 0x00, 48, 0, 32, 0]);
    });

    test('a still wider than the preview is cut back to what the preview showed', () {
      // 4:3 portrait still, dark bands on the outer eighths that a 9:16
      // preview never shows.
      final image = img.Image(width: 480, height: 640);
      for (final pixel in image) {
        final value = pixel.x < 60 || pixel.x >= 420 ? 0 : 255;
        pixel
          ..r = value
          ..g = value
          ..b = value;
      }
      final photo = img.encodePng(image);

      final cropped = composeStrip(StripRequest(photo: photo, photoHeight: 320, previewAspect: 9 / 16));
      final uncropped = composeStrip(StripRequest(photo: photo, photoHeight: 320));

      double edge(MonoBitmap bitmap) =>
          darkShare(bitmap, fromX: frameBorder, toX: 40, fromY: frameBorder, toY: 320);
      expect(edge(cropped), lessThan(0.05));
      expect(edge(uncropped), greaterThan(0.95));
    });

    test('a washed-out photo is stretched to full contrast', () {
      final image = img.Image(width: 640, height: 480);
      for (final pixel in image) {
        final value = pixel.x < 320 ? 170 : 230;
        pixel
          ..r = value
          ..g = value
          ..b = value;
      }
      final bitmap = composeStrip(StripRequest(photo: img.encodePng(image), photoHeight: 320));

      expect(darkShare(bitmap, fromX: 40, toX: 150, fromY: 40, toY: 280), greaterThan(0.7));
      expect(darkShare(bitmap, fromX: 230, toX: 340, fromY: 40, toY: 280), lessThan(0.1));
    });

    test('decoded pixels give the same strip as the encoded photo', () {
      final image = img.Image(width: 640, height: 480, numChannels: 4);
      for (final pixel in image) {
        final value = pixel.x < 320 ? 30 : 230;
        pixel
          ..r = value
          ..g = value
          ..b = value
          ..a = 255;
      }
      final pixels = PhotoPixels(image.getBytes(order: img.ChannelOrder.rgba), 640, 480);

      final fromPixels = composeStrip(StripRequest(pixels: pixels, photoHeight: 320));
      final fromPng = composeStrip(StripRequest(photo: img.encodePng(image), photoHeight: 320));
      expect(fromPixels.dots, fromPng.dots);
    });

    test('unreadable photo fails clearly', () {
      expect(
        () => composeStrip(StripRequest(photo: Uint8List.fromList([1, 2, 3]))),
        throwsA(isA<FormatException>()),
      );
    });
  });

  group('strip text', () {
    test('carries the queue number, caption, social line and the receipt detail', () {
      final bytes = buildStrip(
        sampleOrder(),
        raster: const [0x1D, 0x76, 0x30, 0x00],
        caption: 'Ngopi dulu, overthinking nanti. Ini caption yang cukup panjang.',
        social: const [0x1D, 0x76, 0x30, 0x01],
        outletName: 'AtasKopi Pusat',
      );
      final text = String.fromCharCodes(bytes);

      expect(bytes.sublist(2, 6), [0x1D, 0x76, 0x30, 0x00]);
      expect(text, contains('A-007'));
      expect(text, contains(String.fromCharCodes(const [0x1D, 0x76, 0x30, 0x01])));
      expect(text, isNot(contains('Instagram')));
      expect(text, contains('10/11/2026 14:30'));
      expect(text, contains('BELUM LUNAS'));
      for (final line in text.split('\n')) {
        expect(line.replaceAll(RegExp(r'[\x00-\x1F]'), '').length, lessThanOrEqualTo(40));
      }
    });

    test('the receipt detail leaves out standard choices but keeps requests and notes', () {
      final order = sampleOrder(lines: const [
        CartLine(
          productId: 'p1',
          name: 'Kopsu',
          quantity: 1,
          unitPrice: 12000,
          options: [
            SelectedOption(optionId: 'o1', valueId: 'hot', label: 'Hot', isDefault: true),
            SelectedOption(optionId: 'o2', valueId: 'less', label: 'Less sugar'),
          ],
          notes: 'pisah es',
        ),
      ]);
      final text = String.fromCharCodes(buildStrip(order, raster: const [], caption: 'Hai', outletName: 'AtasKopi'));

      expect(text, isNot(contains('Hot')));
      expect(text, contains('+ Less sugar'));
      expect(text, contains('! pisah es'));
    });

    test('the bar ticket also lists only requests and notes', () {
      final order = sampleOrder(lines: const [
        CartLine(
          productId: 'p1',
          name: 'Dark Chocolate',
          quantity: 1,
          unitPrice: 12000,
          options: [
            SelectedOption(optionId: 'o1', valueId: 'ice', label: 'Ice', isDefault: true),
            SelectedOption(optionId: 'o2', valueId: 'less', label: 'Less'),
          ],
          notes: 'pisah es',
        ),
      ]);
      final text = String.fromCharCodes(buildOrderTicket(order));

      expect(text, isNot(contains('Ice')));
      expect(text, contains('+ Less'));
      expect(text, contains('! pisah es'));
    });

    test('a plain receipt starts with the logo', () {
      final logo = renderLogo(File('assets/logo.png').readAsBytesSync());
      final bytes = buildReceipt(sampleOrder(), outletName: 'AtasKopi', cashierName: 'Rina', logo: logo);

      expect(logo.sublist(0, 4), [0x1D, 0x76, 0x30, 0x00]);
      expect(bytes.sublist(2, 2 + logo.length), logo);
      expect(String.fromCharCodes(bytes), contains('AtasKopi'));
    });

    test('the social line shows both icons and the account, centred', () {
      final line = socialLine('@atas_kopi');
      final columns = [
        for (var x = 0; x < line.width; x++)
          if (List.generate(line.height, (y) => line.dots[y * line.width + x]).contains(1)) x,
      ];

      expect(line.width, printerDots);
      expect(columns.first, greaterThan(40));
      expect((columns.first - (printerDots - 1 - columns.last)).abs(), lessThan(24));
    });

    test('no account means no social line', () {
      final strip = renderStrip(StripRequest(photo: samplePhoto(), photoHeight: 320));
      expect(strip.social, isEmpty);
      expect(renderStrip(StripRequest(photo: samplePhoto(), photoHeight: 320, handle: '@atas_kopi')).social,
          isNotEmpty);
    });

    test('the yellow circle of the logo prints as an outline with "Kopi" in black', () {
      final logo = File('assets/logo.png').readAsBytesSync();
      final bitmap = composeStrip(StripRequest(photo: samplePhoto(), logo: logo, photoHeight: 320));
      final logoRows = bitmap.height - 320 - 2 * frameBorder;

      // The circle sits on the left of the logo: mostly white paper, with the
      // lettering and outline in black.
      final circle = darkShare(bitmap, fromX: 80, toX: 140, fromY: logoRows ~/ 5, toY: logoRows ~/ 2);
      expect(circle, inInclusiveRange(0.08, 0.45));
    });
  });

  group('printer queue', () {
    test('a bar ticket goes ahead of waiting strips, never into one', () async {
      // A strip is always one write: the plugin adds a line feed to each.
      final transport = FakeTransport()..gate = Completer<void>();
      final printer = PrinterService(transport, Duration.zero);

      final first = printer.print('mac', [1]);
      final strip = printer.print('mac', [2, 2, 2, 2]);
      final ticket = printer.print('mac', [3], priority: PrintPriority.ticket);

      await Future<void>.delayed(Duration.zero);
      transport.gate!.complete();
      expect(await Future.wait([first, strip, ticket]), [true, true, true]);

      expect(transport.writes, [
        [1],
        [3],
        [2, 2, 2, 2],
      ]);
    });

    test('back-to-back jobs leave time to tear the paper', () async {
      final transport = FakeTransport();
      final printer = PrinterService(transport, const Duration(milliseconds: 200));
      final clock = Stopwatch()..start();

      final receipt = printer.print('mac', [1]);
      final ticket = printer.print('mac', [2]);
      await receipt;
      final afterReceipt = clock.elapsedMilliseconds;
      await ticket;

      expect(transport.writes, [
        [1],
        [2],
      ]);
      expect(clock.elapsedMilliseconds - afterReceipt, greaterThanOrEqualTo(190));
    });

    test('no printer chosen resolves to false', () async {
      expect(await PrinterService(FakeTransport()).print(null, [1]), isFalse);
    });
  });

  test('settings survive a restart', () {
    const settings = SelfieSettings(rush: true, handle: '@kopi', photoHeight: 320, brightness: 0.15);
    final restored = SelfieSettings.fromJson(settings.toJson());

    expect(restored.rush, isTrue);
    expect(restored.handle, '@kopi');
    expect(restored.photoHeight, 320);
    expect(restored.brightness, 0.15);
  });

  test('captions fit two printed lines', () {
    for (final caption in captions) {
      expect(caption.length, lessThanOrEqualTo(64), reason: caption);
    }
  });
}
