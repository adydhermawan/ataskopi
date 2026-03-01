
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';
import 'package:ataskopi_frontend/features/order/presentation/providers/order_state.dart';
import 'package:ataskopi_frontend/features/home/presentation/providers/home_providers.dart';
import '../providers/scan_providers.dart';
import '../controllers/scan_controller.dart';

class QrScannerScreen extends ConsumerStatefulWidget {
  const QrScannerScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends ConsumerState<QrScannerScreen> with WidgetsBindingObserver {
  late final MobileScannerController controller;
  bool _isProcessing = false;
  bool _isCameraStarted = false;

  @override
  void initState() {
    super.initState();
    // Use unpkg mirror instead of jsdelivr which might be blocked in ID
    if (kIsWeb) {
      MobileScannerPlatform.instance.setBarcodeLibraryScriptUrl(
        'https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js',
      );
    }
    controller = MobileScannerController(
      facing: CameraFacing.back,
      formats: const [BarcodeFormat.qrCode],
      autoStart: !kIsWeb, // Do not auto-start on Web to avoid Safari autoplay block
    );
    if (!kIsWeb) {
      _isCameraStarted = true;
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) async {
    if (_isProcessing) return;
    
    final List<Barcode> barcodes = capture.barcodes;
    for (final barcode in barcodes) {
      if (barcode.rawValue != null) {
        final String code = barcode.rawValue!;
        // Simple check: Must contain ATASKOPI-TABLE
        if (code.contains('ATASKOPI-TABLE')) {
           _processQrCode(code);
           break;
        }
      }
    }
  }

  Future<void> _processQrCode(String qrCode) async {
    setState(() {
      _isProcessing = true;
    });

    final success = await ref.read(scanControllerProvider).handleQrCode(context, qrCode);
    
    // If successful, handleQrCode navigates away (pushReplacement to Menu).
    // But if we are in QrScannerScreen, we might want to pop instead so the back stack is clean, 
    // OR we let the controller handle logic.
    // However, handleQrCode does pushReplacement. 
    // If called from here (QrScannerScreen), pushReplacement adds Menu on top of previous screen (likely Home), replacing Scanner. 
    // This is acceptable.

    if (!success && mounted) {
       setState(() {
        _isProcessing = false;
      });
    }
  }

  Future<void> _showManualInputDialog() async {
    final TextEditingController _inputController = TextEditingController();
    
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Input Nomor Meja'),
        content: TextField(
          controller: _inputController,
          keyboardType: TextInputType.number,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Contoh: 01',
            labelText: 'Nomor Meja',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              if (_inputController.text.isNotEmpty) {
                // Synthesize QR Code format: ATASKOPI-TABLE-XX
                // Pad left with 0 ensures '1' becomes '01', matching seed logic
                String number = _inputController.text.trim();
                // Ensure 2 digits padding
                if (int.tryParse(number) != null) {
                   number = number.padLeft(2, '0');
                }
                
                // If user typed just number e.g '01', prefix it.
                // If they typed full code, leave it.
                String finalCode = number;
                if (!number.startsWith('ATASKOPI-TABLE-')) {
                  finalCode = 'ATASKOPI-TABLE-$number';
                }
                
                _processQrCode(finalCode);
              }
            },
            child: const Text('Lanjutkan'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text('Scan Table QR', style: TextStyle(color: Colors.white)),
        actions: [
          IconButton(
            color: Colors.white,
            icon: const Icon(Icons.flip_camera_ios),
            iconSize: 32.0,
            onPressed: () => controller.switchCamera(),
          ),
          IconButton(
            color: Colors.white,
            icon: const Icon(Icons.flash_on),
            iconSize: 32.0,
            onPressed: () => controller.toggleTorch(),
          ),
        ],
      ),
      body: Stack(
        children: [
          Positioned.fill(
            child: MobileScanner(
              controller: controller,
              fit: BoxFit.cover,
              onDetect: _onDetect,
              errorBuilder: (context, error, child) {
                return Center(
                  child: Padding(
                    padding: EdgeInsets.all(24.w),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.error_outline_rounded, color: Colors.white, size: 48.w),
                        SizedBox(height: 16.h),
                        Text(
                          'Akses kamera ditolak atau tidak tersedia.\nError: ${error.errorCode?.name ?? error.toString()}\nSilakan gunakan input manual.',
                          style: const TextStyle(color: Colors.white, fontSize: 14),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                );
              },
              overlayBuilder: (context, constraints) {
                 return Container(
                   decoration: ShapeDecoration(
                     shape: QrScannerOverlayShape(
                       borderColor: Colors.blue,
                       borderRadius: 10,
                       borderLength: 30,
                       borderWidth: 10,
                       cutOutSize: 240.w,
                     ),
                   ),
                 );
              },
            ),
          ),
          if (!_isCameraStarted)
            Container(
              color: Colors.black.withOpacity(0.8),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.camera_alt_rounded, color: Colors.white, size: 48.w),
                    SizedBox(height: 16.h),
                    const Text(
                      'Ketuk untuk mengaktifkan kamera',
                      style: TextStyle(color: Colors.white, fontSize: 14),
                    ),
                    SizedBox(height: 16.h),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20.r)),
                        padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 12.h),
                      ),
                      onPressed: () async {
                        setState(() => _isCameraStarted = true);
                        await controller.start();
                      },
                      child: const Text('Mulai Kamera', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            ),
          if (_isProcessing)
            Container(
              color: Colors.black54,
              child: const Center(
                child: CircularProgressIndicator(),
              ),
            ),
          Positioned(
            bottom: 40.h,
            left: 0,
            right: 0,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Arahkan kamera ke QR Code di meja',
                  style: TextStyle(color: Colors.white, fontSize: 15),
                ),
                SizedBox(height: 12.h),
                TextButton(
                  onPressed: _showManualInputDialog,
                  style: TextButton.styleFrom(
                    backgroundColor: Colors.white.withOpacity(0.2),
                    padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 12.h),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30.r),
                      side: const BorderSide(color: Colors.white, width: 1),
                    ),
                  ),
                  child: const Text(
                    'Input Manual No. Meja',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// Simple Overlay Shape class standard for scanners
class QrScannerOverlayShape extends ShapeBorder {
  final Color borderColor;
  final double borderWidth;
  final Color overlayColor;
  final double borderRadius;
  final double borderLength;
  final double cutOutSize;
  final double cutOutBottomOffset;

  const QrScannerOverlayShape({
    this.borderColor = Colors.red,
    this.borderWidth = 10.0,
    this.overlayColor = const Color.fromRGBO(0, 0, 0, 80),
    this.borderRadius = 0,
    this.borderLength = 40,
    this.cutOutSize = 250,
    this.cutOutBottomOffset = 0,
  });

  @override
  EdgeInsetsGeometry get dimensions => EdgeInsets.zero;

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) {
    return Path()
      ..fillType = PathFillType.evenOdd
      ..addPath(getOuterPath(rect), Offset.zero);
  }

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) {
    // For simplicity, just returning the path with the cutout
    final double width = rect.width;
    final double height = rect.height;
    final double leftOffset = (width - cutOutSize) / 2;
    final double topOffset = (height - cutOutSize) / 2 - cutOutBottomOffset;
    final Rect cutOutRect = Rect.fromLTWH(leftOffset, topOffset, cutOutSize, cutOutSize);

    final Path path = Path()
      ..fillType = PathFillType.evenOdd
      ..addRect(rect)
      ..addRRect(RRect.fromRectAndRadius(cutOutRect, Radius.circular(borderRadius)));
    return path;
  }

  @override
  ShapeBorder scale(double t) {
    return QrScannerOverlayShape(
      borderColor: borderColor,
      borderWidth: borderWidth * t,
      overlayColor: overlayColor,
      borderRadius: borderRadius * t,
      borderLength: borderLength * t,
      cutOutSize: cutOutSize * t,
      cutOutBottomOffset: cutOutBottomOffset * t,
    );
  }

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {
    final double width = rect.width;
    final double height = rect.height;
    final double leftOffset = (width - cutOutSize) / 2;
    final double topOffset = (height - cutOutSize) / 2 - cutOutBottomOffset;
    final Rect cutOutRect = Rect.fromLTWH(leftOffset, topOffset, cutOutSize, cutOutSize);

    final Paint paint = Paint()
      ..color = overlayColor
      ..style = PaintingStyle.fill;

    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        Path()..addRect(rect),
        Path()..addRRect(RRect.fromRectAndRadius(cutOutRect, Radius.circular(borderRadius))),
      ),
      paint,
    );

    final Paint borderPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = borderWidth;
    
    // Draw corners
     final double borderLen = borderLength; // Resolves variable shadowing config confusion
     
     // Top Left
     canvas.drawPath(
       Path()
         ..moveTo(cutOutRect.left, cutOutRect.top + borderLen)
         ..lineTo(cutOutRect.left, cutOutRect.top)
         ..lineTo(cutOutRect.left + borderLen, cutOutRect.top),
       borderPaint
     );
     // Top Right
     canvas.drawPath(
       Path()
         ..moveTo(cutOutRect.right - borderLen, cutOutRect.top)
         ..lineTo(cutOutRect.right, cutOutRect.top)
         ..lineTo(cutOutRect.right, cutOutRect.top + borderLen),
       borderPaint
     );
     // Bottom Left
     canvas.drawPath(
       Path()
         ..moveTo(cutOutRect.left, cutOutRect.bottom - borderLen)
         ..lineTo(cutOutRect.left, cutOutRect.bottom)
         ..lineTo(cutOutRect.left + borderLen, cutOutRect.bottom),
       borderPaint
     );
     // Bottom Right
     canvas.drawPath(
       Path()
         ..moveTo(cutOutRect.right - borderLen, cutOutRect.bottom)
         ..lineTo(cutOutRect.right, cutOutRect.bottom)
         ..lineTo(cutOutRect.right, cutOutRect.bottom - borderLen),
       borderPaint
     );
  }
}
