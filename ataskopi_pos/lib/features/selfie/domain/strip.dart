import 'dart:math' as math;
import 'dart:typed_data';

import 'package:image/image.dart' as img;

/// 58mm printers at 203 dpi print 48mm of the paper, which is 384 dots.
const int printerDots = 384;

/// Thin on purpose: big black areas slow cheap printers down and heat them up.
const int frameBorder = 4;
const int photoWidth = printerDots - 2 * frameBorder;

const int _logoWidth = 240;
const int _logoGap = 12;

/// Large solid black makes cheap printers streak, so the darkest tone of a
/// photo keeps a few white dots.
const double _photoFloor = 0.1;

/// Photo heights the cashier can choose from, in dots (8 dots is 1 mm).
const photoHeights = {320: '4 cm', 460: '5,8 cm', 600: '7,5 cm'};

class StripRequest {
  const StripRequest({
    this.photo,
    this.pixels,
    this.logo,
    this.previewAspect,
    this.photoHeight = 460,
    this.brightness = 0.05,
    this.contrast = 1.2,
    this.gamma = 0.8,
    this.mirror = false,
    this.handle = '',
  });

  /// An encoded photo, decoded here.
  final Uint8List? photo;

  /// Or a photo the phone already decoded, upright and scaled down, which is
  /// much faster than decoding a full camera picture in Dart.
  final PhotoPixels? pixels;

  final Uint8List? logo;

  /// Width over height of what the camera preview showed. Still pictures can
  /// cover more than the preview, so they are cut back to it first.
  final double? previewAspect;

  final int photoHeight;
  final double brightness;
  final double contrast;
  final double gamma;

  /// The front camera preview is mirrored, so the print matches what the
  /// customer saw on screen.
  final bool mirror;

  /// The account shown next to the Instagram and TikTok icons.
  final String handle;
}

class PhotoPixels {
  const PhotoPixels(this.rgba, this.width, this.height);

  final Uint8List rgba;
  final int width;
  final int height;
}

class MonoBitmap {
  MonoBitmap(this.width, this.height, this.dots);

  final int width;
  final int height;

  /// One entry per dot, 1 means black.
  final Uint8List dots;
}

class RenderedStrip {
  const RenderedStrip(this.raster, this.preview, this.social);

  /// GS v 0 commands, ready to go between the strip's text.
  final Uint8List raster;

  /// The Instagram and TikTok icons with the account name, empty when there
  /// is no account to show.
  final Uint8List social;

  /// What the paper will look like, for the cashier to check before printing.
  final Uint8List preview;
}

/// Heavy work: run it with `compute` so the cashier screen never stalls.
RenderedStrip renderStrip(StripRequest request) {
  final bitmap = composeStrip(request);
  final handle = request.handle.trim();
  return RenderedStrip(
    encodeRaster(bitmap),
    previewPng(bitmap),
    handle.isEmpty ? Uint8List(0) : encodeRaster(socialLine(handle)),
  );
}

/// The logo alone, centred, for the top of a plain receipt.
Uint8List renderLogo(Uint8List logo) {
  final art = _logoTones(logo);
  final tones = Float64List(printerDots * art.height)..fillRange(0, printerDots * art.height, 1.0);
  final left = (printerDots - art.width) ~/ 2;
  for (var y = 0; y < art.height; y++) {
    for (var x = 0; x < art.width; x++) {
      tones[y * printerDots + left + x] = art.tones[y * art.width + x];
    }
  }
  return encodeRaster(MonoBitmap(printerDots, art.height, _dither(tones, printerDots, art.height)));
}

/// Logo on top, then the photo inside a thin frame, dithered as one picture.
MonoBitmap composeStrip(StripRequest request) {
  final logo = request.logo == null ? null : _logoTones(request.logo!);
  final logoHeight = logo?.height ?? 0;
  final top = logo == null ? 0 : logoHeight + _logoGap;
  final height = top + request.photoHeight + 2 * frameBorder;

  final tones = Float64List(printerDots * height)..fillRange(0, printerDots * height, 1.0);

  if (logo != null) {
    final left = (printerDots - logo.width) ~/ 2;
    for (var y = 0; y < logo.height; y++) {
      for (var x = 0; x < logo.width; x++) {
        tones[y * printerDots + left + x] = logo.tones[y * logo.width + x];
      }
    }
  }

  for (var y = top; y < height; y++) {
    for (var x = 0; x < printerDots; x++) {
      final inFrame = y < top + frameBorder ||
          y >= height - frameBorder ||
          x < frameBorder ||
          x >= printerDots - frameBorder;
      if (inFrame) tones[y * printerDots + x] = 0;
    }
  }

  final photo = _photoTones(request);
  for (var y = 0; y < request.photoHeight; y++) {
    final row = (top + frameBorder + y) * printerDots + frameBorder;
    for (var x = 0; x < photoWidth; x++) {
      tones[row + x] = photo[y * photoWidth + x];
    }
  }

  return MonoBitmap(printerDots, height, _dither(tones, printerDots, height));
}

class _Tones {
  _Tones(this.width, this.height, this.tones);

  final int width;
  final int height;
  final Float64List tones;
}

Float64List _photoTones(StripRequest request) {
  var upright = _decodePhoto(request);
  if (request.mirror) upright = img.flipHorizontal(upright);
  final aspect = request.previewAspect;
  if (aspect != null) upright = _cropToAspect(upright, aspect);
  final resized = _cover(upright, photoWidth, request.photoHeight);

  final luma = Float64List(photoWidth * request.photoHeight);
  for (final pixel in resized) {
    luma[pixel.y * photoWidth + pixel.x] = _luma(pixel);
  }

  // Stretch the photo's own darkest and lightest tones to full range, so a
  // backlit or dim face still prints with contrast.
  final sorted = Float64List.fromList(luma)..sort();
  // A nearly flat picture is left alone rather than blown up into noise.
  var low = sorted[(sorted.length * 0.02).floor()];
  var range = sorted[(sorted.length * 0.98).floor()] - low;
  if (range < 0.1) {
    low = 0;
    range = 1;
  }

  final tones = Float64List(luma.length);
  for (var i = 0; i < luma.length; i++) {
    final levelled = ((luma[i] - low) / range).clamp(0.0, 1.0);
    final adjusted = ((levelled - 0.5) * request.contrast + 0.5 + request.brightness).clamp(0.0, 1.0);
    tones[i] = _photoFloor + (1 - _photoFloor) * math.pow(adjusted, request.gamma).toDouble();
  }
  return tones;
}

img.Image _decodePhoto(StripRequest request) {
  final pixels = request.pixels;
  if (pixels != null) {
    return img.Image.fromBytes(
      width: pixels.width,
      height: pixels.height,
      bytes: pixels.rgba.offsetInBytes == 0 ? pixels.rgba.buffer : Uint8List.fromList(pixels.rgba).buffer,
      numChannels: 4,
      order: img.ChannelOrder.rgba,
    );
  }
  final encoded = request.photo;
  final decoded = encoded == null ? null : img.decodeImage(encoded);
  if (decoded == null) throw const FormatException('Foto tidak bisa dibaca');
  return img.bakeOrientation(decoded);
}

img.Image _cropToAspect(img.Image source, double aspect) {
  final current = source.width / source.height;
  if ((current - aspect).abs() < 0.01) return source;
  if (current > aspect) {
    final width = (source.height * aspect).round();
    return img.copyCrop(source, x: (source.width - width) ~/ 2, y: 0, width: width, height: source.height);
  }
  final height = (source.width / aspect).round();
  return img.copyCrop(source, x: 0, y: (source.height - height) ~/ 2, width: source.width, height: height);
}

/// The logo file has a wide transparent margin, so it is cropped to the ink.
_Tones _logoTones(Uint8List encoded) {
  final decoded = img.decodeImage(encoded);
  if (decoded == null) throw const FormatException('Logo tidak bisa dibaca');

  var left = decoded.width, right = -1, top = decoded.height, bottom = -1;
  for (final pixel in decoded) {
    if (_onWhite(pixel) < 0.9) {
      left = math.min(left, pixel.x);
      right = math.max(right, pixel.x);
      top = math.min(top, pixel.y);
      bottom = math.max(bottom, pixel.y);
    }
  }
  if (right < 0) throw const FormatException('Logo kosong');

  final cropped = img.copyCrop(decoded, x: left, y: top, width: right - left + 1, height: bottom - top + 1);
  final resized = img.copyResize(cropped, width: _logoWidth, interpolation: img.Interpolation.average);

  // The white "Kopi" sits on a yellow circle, which thermal paper can only
  // print as pale dots or solid black. Inverting it reads best: a white
  // circle with a thin outline and the lettering in black.
  var yellow = 0;
  var sumX = 0.0, sumY = 0.0;
  for (final pixel in resized) {
    if (_isYellow(pixel)) {
      yellow++;
      sumX += pixel.x;
      sumY += pixel.y;
    }
  }
  final centreX = yellow == 0 ? 0.0 : sumX / yellow;
  final centreY = yellow == 0 ? 0.0 : sumY / yellow;
  final radius = math.sqrt(yellow / math.pi);

  final tones = Float64List(resized.width * resized.height);
  for (final pixel in resized) {
    final tone = _onWhite(pixel);
    final distance = math.sqrt(math.pow(pixel.x - centreX, 2) + math.pow(pixel.y - centreY, 2));
    final double value;
    if (tone < 0.5) {
      value = 0; // the dark strokes of "atas"
    } else if (yellow > 0 && (distance - radius).abs() < 1.3) {
      value = 0; // the circle's outline
    } else if (yellow > 0 && distance < radius) {
      value = (1 - pixel.b / pixel.maxChannelValue) < 0.5 ? 0 : 1; // yellow to white, white to black
    } else if (yellow > 0 && distance < radius + 4) {
      value = 1; // the circle's soft yellow edge
    } else {
      value = tone;
    }
    tones[pixel.y * resized.width + pixel.x] = value;
  }
  return _Tones(resized.width, resized.height, tones);
}

bool _isYellow(img.Pixel pixel) {
  final max = pixel.maxChannelValue;
  final alpha = pixel.length > 3 ? pixel.a / max : 1.0;
  return alpha > 0.5 && pixel.r / max > 0.7 && pixel.g / max > 0.45 && pixel.b / max < 0.35;
}

double _luma(img.Pixel pixel) =>
    (0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b) / pixel.maxChannelValue;

/// Brightness of a pixel laid over white paper.
double _onWhite(img.Pixel pixel) {
  final alpha = pixel.length > 3 ? pixel.a / pixel.maxChannelValue : 1.0;
  return _luma(pixel) * alpha + (1 - alpha);
}

/// Crops the middle of the photo to the frame's shape, then scales it down.
img.Image _cover(img.Image source, int width, int height) {
  final scale = math.max(width / source.width, height / source.height);
  final cropWidth = (width / scale).round().clamp(1, source.width);
  final cropHeight = (height / scale).round().clamp(1, source.height);
  final cropped = img.copyCrop(
    source,
    x: (source.width - cropWidth) ~/ 2,
    y: (source.height - cropHeight) ~/ 2,
    width: cropWidth,
    height: cropHeight,
  );
  return img.copyResize(cropped, width: width, height: height, interpolation: img.Interpolation.average);
}

/// Atkinson dithering: keeps faces readable on thermal paper with less noise
/// than Floyd-Steinberg.
Uint8List _dither(Float64List tones, int width, int height) {
  final dots = Uint8List(width * height);

  void spread(int x, int y, double amount) {
    if (x >= 0 && x < width && y < height) tones[y * width + x] += amount;
  }

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      final tone = tones[y * width + x];
      final white = tone >= 0.5;
      dots[y * width + x] = white ? 0 : 1;

      final share = (tone - (white ? 1.0 : 0.0)) / 8;
      spread(x + 1, y, share);
      spread(x + 2, y, share);
      spread(x - 1, y + 1, share);
      spread(x, y + 1, share);
      spread(x + 1, y + 1, share);
      spread(x, y + 2, share);
    }
  }
  return dots;
}

/// Encodes the bitmap as GS v 0 commands, split into bands because cheap
/// printers can drop a single large raster command.
Uint8List encodeRaster(MonoBitmap bitmap, {int bandHeight = 32}) {
  final bytesPerRow = (bitmap.width + 7) ~/ 8;
  final out = BytesBuilder(copy: false);

  for (var top = 0; top < bitmap.height; top += bandHeight) {
    final rows = math.min(bandHeight, bitmap.height - top);
    out.add([0x1D, 0x76, 0x30, 0x00, bytesPerRow & 0xFF, bytesPerRow >> 8, rows & 0xFF, rows >> 8]);

    final band = Uint8List(bytesPerRow * rows);
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < bitmap.width; x++) {
        if (bitmap.dots[(top + y) * bitmap.width + x] == 1) {
          band[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
        }
      }
    }
    out.add(band);
  }
  return out.takeBytes();
}

Uint8List previewPng(MonoBitmap bitmap) {
  final image = img.Image(width: bitmap.width, height: bitmap.height, numChannels: 1);
  for (final pixel in image) {
    pixel.r = bitmap.dots[pixel.y * bitmap.width + pixel.x] == 1 ? 0 : 255;
  }
  return img.encodePng(image);
}

const int _iconSize = 28;
const int _socialHeight = 36;

/// Instagram and TikTok icons followed by the account name, on one line.
MonoBitmap socialLine(String handle) {
  final font = img.arial24;
  final textWidth = handle.codeUnits.fold<int>(0, (sum, code) => sum + (font.characters[code]?.xAdvance ?? 0));
  final width = 2 * _iconSize + 8 + 10 + textWidth;

  final canvas = img.Image(width: printerDots, height: _socialHeight)..clear(img.ColorRgb8(255, 255, 255));
  final black = img.ColorRgb8(0, 0, 0);
  final white = img.ColorRgb8(255, 255, 255);
  final left = math.max(0, (printerDots - width) ~/ 2);
  final top = (_socialHeight - _iconSize) ~/ 2;

  _instagramIcon(canvas, left, top, black, white);
  _tiktokIcon(canvas, left + _iconSize + 8, top, black, white);
  img.drawString(canvas, handle, font: font, x: left + 2 * _iconSize + 18, y: (_socialHeight - font.lineHeight) ~/ 2, color: black);

  final dots = Uint8List(printerDots * _socialHeight);
  for (final pixel in canvas) {
    dots[pixel.y * printerDots + pixel.x] = pixel.r < 128 ? 1 : 0;
  }
  return MonoBitmap(printerDots, _socialHeight, dots);
}

/// Rounded square, lens and flash dot.
void _instagramIcon(img.Image canvas, int x, int y, img.Color black, img.Color white) {
  const s = _iconSize;
  img.fillRect(canvas, x1: x, y1: y, x2: x + s - 1, y2: y + s - 1, color: black, radius: 8);
  img.fillRect(canvas, x1: x + 3, y1: y + 3, x2: x + s - 4, y2: y + s - 4, color: white, radius: 5);
  img.fillCircle(canvas, x: x + s ~/ 2, y: y + s ~/ 2, radius: 7, color: black);
  img.fillCircle(canvas, x: x + s ~/ 2, y: y + s ~/ 2, radius: 4, color: white);
  img.fillCircle(canvas, x: x + s - 8, y: y + 7, radius: 2, color: black);
}

/// The music note: a ring, its stem, and a curled flag.
void _tiktokIcon(img.Image canvas, int x, int y, img.Color black, img.Color white) {
  img.fillCircle(canvas, x: x + 10, y: y + 19, radius: 8, color: black);
  img.fillCircle(canvas, x: x + 10, y: y + 19, radius: 4, color: white);
  img.fillRect(canvas, x1: x + 14, y1: y, x2: x + 18, y2: y + 19, color: black);
  img.fillCircle(canvas, x: x + 18, y: y + 1, radius: 9, color: black);
  img.fillCircle(canvas, x: x + 18, y: y + 11, radius: 8, color: white);
  img.fillRect(canvas, x1: x + 14, y1: y, x2: x + 18, y2: y + 19, color: black);
  img.fillRect(canvas, x1: x, y1: y, x2: x + 13, y2: y + 9, color: white);
}
