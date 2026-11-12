import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;

/// A printed photo, kept so the strip can be printed again with the photo.
class SelfieShot {
  const SelfieShot({required this.raster, required this.social, required this.preview, required this.caption});

  factory SelfieShot.fromJson(Map<String, dynamic> json) => SelfieShot(
        raster: base64Decode(json['raster'] as String),
        social: base64Decode(json['social'] as String),
        preview: base64Decode(json['preview'] as String),
        caption: json['caption'] as String,
      );

  /// Printer commands for the photo, ready to go into the strip.
  final Uint8List raster;
  final Uint8List social;

  /// The photo as it looks on paper, to show on screen.
  final Uint8List preview;
  final String caption;

  Map<String, dynamic> toJson() => {
        'raster': base64Encode(raster),
        'social': base64Encode(social),
        'preview': base64Encode(preview),
        'caption': caption,
      };
}

/// Photos stay in the app's private folder on this phone and are never
/// uploaded. They are deleted after [keepFor], long after the shift is over.
class SelfieStore {
  SelfieStore._(this._dir, this.ids);

  static const keepFor = Duration(days: 7);

  final Directory _dir;

  /// Orders with a saved photo.
  final Set<String> ids;

  static Future<SelfieStore> open(String path, {DateTime? now}) async {
    final dir = Directory(path);
    await dir.create(recursive: true);

    final cutoff = (now ?? DateTime.now()).subtract(keepFor);
    final ids = <String>{};
    await for (final entity in dir.list()) {
      if (entity is! File || p.extension(entity.path) != '.json') continue;
      try {
        if ((await entity.lastModified()).isBefore(cutoff)) {
          await entity.delete();
        } else {
          ids.add(p.basenameWithoutExtension(entity.path));
        }
      } on FileSystemException catch (error) {
        debugPrint('Foto selfie lama tidak terbaca: $error');
      }
    }
    return SelfieStore._(dir, ids);
  }

  File _file(String clientOrderId) => File(p.join(_dir.path, '$clientOrderId.json'));

  Future<void> save(String clientOrderId, SelfieShot shot) async {
    await _file(clientOrderId).writeAsString(jsonEncode(shot.toJson()), flush: true);
    ids.add(clientOrderId);
  }

  Future<SelfieShot?> load(String clientOrderId) async {
    final file = _file(clientOrderId);
    try {
      return SelfieShot.fromJson(jsonDecode(await file.readAsString()) as Map<String, dynamic>);
    } on Object catch (error) {
      debugPrint('Foto selfie $clientOrderId tidak terbaca: $error');
      ids.remove(clientOrderId);
      return null;
    }
  }
}
