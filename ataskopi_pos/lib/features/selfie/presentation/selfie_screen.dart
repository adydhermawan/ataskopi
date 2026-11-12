import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../printer/data/logo.dart';
import '../../sale/domain/local_order.dart';
import '../data/selfie_settings.dart';
import '../data/selfie_store.dart';
import '../domain/strip.dart';

/// Returns the photo to save and print, or null when the customer skips it.
Future<SelfieShot?> showSelfie(BuildContext context, LocalOrder order) => Navigator.of(context).push(
      MaterialPageRoute(fullscreenDialog: true, builder: (_) => SelfieScreen(order: order)),
    );

/// Plenty for a 376-dot photo, and small enough to process in a moment.
const _decodeWidth = 1000;

/// The camera's file is deleted as soon as it is read. Only the printed
/// version is kept, on this phone, so the strip can be printed again; nothing
/// is uploaded.
class SelfieScreen extends ConsumerStatefulWidget {
  const SelfieScreen({super.key, required this.order});

  final LocalOrder order;

  @override
  ConsumerState<SelfieScreen> createState() => _SelfieScreenState();
}

class _SelfieScreenState extends ConsumerState<SelfieScreen> with WidgetsBindingObserver {
  List<CameraDescription> _cameras = const [];
  CameraController? _camera;
  bool _opening = false;
  bool _released = false;
  int _cameraIndex = 0;
  String? _error;
  int? _countdown;
  bool _processing = false;
  RenderedStrip? _strip;
  String _caption = randomCaption();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(_start());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_camera?.dispose());
    super.dispose();
  }

  /// Lets go of the camera only when the app really leaves the screen: a
  /// permission prompt also makes it inactive, and must not close the camera.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused && !_opening) {
      final camera = _camera;
      if (camera == null) return;
      _camera = null;
      _released = true;
      unawaited(camera.dispose());
      if (mounted) setState(() => _countdown = null);
    } else if (state == AppLifecycleState.resumed && _released) {
      _released = false;
      if (_strip == null) unawaited(_open());
    }
  }

  Future<void> _start() async {
    try {
      _cameras = await availableCameras();
    } on CameraException catch (error) {
      return _fail(error);
    }
    if (_cameras.isEmpty) {
      if (mounted) setState(() => _error = 'HP ini tidak punya kamera yang bisa dipakai.');
      return;
    }
    final front = _cameras.indexWhere((camera) => camera.lensDirection == CameraLensDirection.front);
    _cameraIndex = front < 0 ? 0 : front;
    await _open();
  }

  Future<void> _open() async {
    if (_opening) return;
    _opening = true;
    try {
      await _openCamera();
    } finally {
      _opening = false;
    }
  }

  Future<void> _openCamera() async {
    final camera = CameraController(
      _cameras[_cameraIndex],
      ResolutionPreset.high,
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.jpeg,
    );
    try {
      await camera.initialize();
    } on CameraException catch (error) {
      await camera.dispose();
      return _fail(error);
    }
    if (!mounted) {
      await camera.dispose();
      return;
    }
    final previous = _camera;
    setState(() {
      _camera = camera;
      _error = null;
    });
    await previous?.dispose();
  }

  void _fail(CameraException error) {
    if (!mounted) return;
    setState(() => _error = error.code == 'CameraAccessDenied'
        ? 'Izin kamera ditolak. Aktifkan di Pengaturan HP > Aplikasi > Kasir AtasKopi.'
        : 'Kamera tidak bisa dibuka (${error.description ?? error.code}).');
  }

  Future<void> _switchCamera() async {
    if (_cameras.length < 2 || _countdown != null) return;
    _cameraIndex = (_cameraIndex + 1) % _cameras.length;
    await _open();
  }

  bool get _isFront => _cameras.isNotEmpty && _cameras[_cameraIndex].lensDirection == CameraLensDirection.front;

  /// Three seconds is enough for the customer to pose after the cashier taps.
  Future<void> _shoot() async {
    final camera = _camera;
    if (camera == null || _countdown != null || _processing) return;
    for (var count = 3; count > 0; count--) {
      // Leaving the app or switching cameras replaces the controller.
      if (!mounted || _camera != camera) return;
      setState(() => _countdown = count);
      await Future<void>.delayed(const Duration(seconds: 1));
    }
    if (!mounted || _camera != camera) return;

    setState(() {
      _countdown = null;
      _processing = true;
    });
    try {
      final file = await camera.takePicture();
      final photo = await file.readAsBytes();
      unawaited(File(file.path).delete().catchError((_) => File(file.path)));
      await camera.pausePreview();

      final settings = ref.read(selfieProvider);
      final preview = camera.value.previewSize!;
      final strip = await compute(
        renderStrip,
        StripRequest(
          pixels: await _decodeSmall(photo),
          previewAspect: preview.shortestSide / preview.longestSide,
          logo: await logoPng(),
          photoHeight: settings.photoHeight,
          brightness: settings.brightness,
          mirror: _isFront,
          handle: settings.handle,
        ),
      );
      if (mounted) setState(() => _strip = strip);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Foto gagal: $error')));
      }
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  /// The phone's own decoder is far faster than decoding in Dart, applies the
  /// camera's rotation, and scales the picture down as it decodes.
  Future<PhotoPixels> _decodeSmall(Uint8List encoded) async {
    final codec = await ui.instantiateImageCodec(encoded, targetWidth: _decodeWidth);
    final image = (await codec.getNextFrame()).image;
    try {
      final data = await image.toByteData(format: ui.ImageByteFormat.rawRgba);
      return PhotoPixels(data!.buffer.asUint8List(), image.width, image.height);
    } finally {
      image.dispose();
      codec.dispose();
    }
  }

  Future<void> _retake() async {
    setState(() {
      _strip = null;
      _caption = randomCaption();
    });
    final camera = _camera;
    if (camera == null) return _open();
    await camera.resumePreview();
  }

  void _print() {
    final strip = _strip;
    if (strip == null) return;
    Navigator.of(context).pop(SelfieShot(
      raster: strip.raster,
      social: strip.social,
      preview: strip.preview,
      caption: _caption,
    ));
  }

  void _shuffleCaption() {
    var next = randomCaption();
    while (next == _caption && captions.length > 1) {
      next = randomCaption();
    }
    setState(() => _caption = next);
  }

  @override
  Widget build(BuildContext context) {
    final strip = _strip;
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text('Selfie ${widget.order.queueNumber}'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Lewati', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
      body: SafeArea(child: strip == null ? _captureView() : _reviewView(strip)),
    );
  }

  Widget _captureView() {
    final error = _error;
    if (error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(error, style: const TextStyle(color: Colors.white), textAlign: TextAlign.center),
        ),
      );
    }

    final camera = _camera;
    final height = ref.watch(selfieProvider).photoHeight;
    return Column(
      children: [
        Expanded(
          child: Center(
            child: camera == null || !camera.value.isInitialized
                ? const CircularProgressIndicator()
                : Stack(
                    alignment: Alignment.center,
                    children: [
                      _framedPreview(camera, photoWidth / height),
                      if (_countdown != null)
                        Text(
                          '$_countdown',
                          style: const TextStyle(fontSize: 120, color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      if (_processing) const CircularProgressIndicator(),
                    ],
                  ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              IconButton(
                onPressed: _cameras.length > 1 ? _switchCamera : null,
                icon: const Icon(Icons.cameraswitch, color: Colors.white, size: 32),
                tooltip: 'Ganti kamera',
              ),
              GestureDetector(
                onTap: _shoot,
                child: Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 5),
                    color: _countdown == null ? Colors.white24 : Colors.white70,
                  ),
                ),
              ),
              const SizedBox(width: 48),
            ],
          ),
        ),
      ],
    );
  }

  /// Shows exactly the part of the picture that lands on paper.
  Widget _framedPreview(CameraController camera, double aspect) {
    final size = camera.value.previewSize!;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: AspectRatio(
        aspectRatio: aspect,
        child: ClipRect(
          child: FittedBox(
            fit: BoxFit.cover,
            child: SizedBox(width: size.height, height: size.width, child: CameraPreview(camera)),
          ),
        ),
      ),
    );
  }

  Widget _reviewView(RenderedStrip strip) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Container(
              color: Colors.white,
              padding: const EdgeInsets.all(8),
              child: Image.memory(strip.preview, filterQuality: FilterQuality.none, gaplessPlayback: true),
            ),
          ),
        ),
        ListTile(
          title: Text(_caption, style: const TextStyle(color: Colors.white)),
          subtitle: const Text('Caption, tap untuk ganti', style: TextStyle(color: Colors.white70)),
          trailing: const Icon(Icons.shuffle, color: Colors.white),
          onTap: _shuffleCaption,
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(foregroundColor: Colors.white),
                  onPressed: _retake,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Ulangi'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton.icon(onPressed: _print, icon: const Icon(Icons.print), label: const Text('Print')),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
