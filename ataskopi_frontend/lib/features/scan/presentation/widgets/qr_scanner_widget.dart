// lib/features/scan/presentation/widgets/qr_scanner_widget.dart
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';
import 'package:ataskopi_frontend/features/order/presentation/providers/order_state.dart';
import 'package:ataskopi_frontend/features/home/presentation/providers/home_providers.dart';
import 'package:ataskopi_frontend/core/providers/tenant_provider.dart';
import '../providers/scan_providers.dart';
import '../controllers/scan_controller.dart';

class QrScannerWidget extends ConsumerStatefulWidget {
  const QrScannerWidget({Key? key}) : super(key: key);

  @override
  ConsumerState<QrScannerWidget> createState() => _QrScannerWidgetState();
}

class _QrScannerWidgetState extends ConsumerState<QrScannerWidget> with WidgetsBindingObserver {
  late final MobileScannerController controller;
  final ImagePicker _picker = ImagePicker();
  bool _isProcessing = false;
  bool _isCameraStarted = false;

  @override
  void initState() {
    super.initState();
    if (kIsWeb) {
      MobileScannerPlatform.instance.setBarcodeLibraryScriptUrl(
        'https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js',
      );
    }
    controller = MobileScannerController(
      facing: CameraFacing.back,
      formats: const [BarcodeFormat.qrCode],
      autoStart: !kIsWeb,
    );
    if (!kIsWeb) _isCameraStarted = true;
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
        if (code.contains('ATASKOPI-TABLE')) {
          await _processQrCode(code);
          break;
        }
      }
    }
  }

  Future<void> _processQrCode(String qrCode) async {
    setState(() => _isProcessing = true);
    final success = await ref.read(scanControllerProvider).handleQrCode(context, qrCode);
    if (!success && mounted) {
      setState(() => _isProcessing = false);
    }
  }

  Future<void> _pickImageAndScan() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
      if (image != null) {
        setState(() => _isProcessing = true);
        final BarcodeCapture? capture = await controller.analyzeImage(image.path);
        if (capture != null && capture.barcodes.isNotEmpty) {
          bool found = false;
          for (final barcode in capture.barcodes) {
            if (barcode.rawValue != null) {
              final String code = barcode.rawValue!;
              if (code.contains('ATASKOPI-TABLE')) {
                found = true;
                await _processQrCode(code);
                break;
              }
            }
          }
          if (!found) {
            _showErrorDialog('QR Code Ataskopi tidak ditemukan di gambar ini.');
            setState(() => _isProcessing = false);
          }
        } else {
          _showErrorDialog('Tidak ada QR Code yang terdeteksi di gambar.');
          setState(() => _isProcessing = false);
        }
      }
    } catch (e) {
      _showErrorDialog('Gagal memproses gambar: $e');
      setState(() => _isProcessing = false);
    }
  }

  void _showErrorDialog(String message) {
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Gagal Scan'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
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
                String number = _inputController.text.trim();
                if (int.tryParse(number) != null) number = number.padLeft(2, '0');
                String finalCode = number.startsWith('ATASKOPI-TABLE-') ? number : 'ATASKOPI-TABLE-$number';
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
    final tenant = ref.watch(tenantProvider);
    final primaryColor = tenant.primaryColor;
    final accentColor = tenant.accentColor;

    return Scaffold(
      backgroundColor: Colors.black,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: Container(
          margin: EdgeInsets.all(8.w),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.4),
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ),
        title: const Text(
          'Scan QR Meja', 
          style: TextStyle(
            color: Colors.white, 
            fontWeight: FontWeight.w600,
            letterSpacing: 0.5,
          )
        ),
        actions: [
          if (_isCameraStarted) ...[
            Container(
              margin: EdgeInsets.symmetric(vertical: 8.h, horizontal: 4.w),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.4),
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: const Icon(Icons.flip_camera_ios, color: Colors.white, size: 22),
                onPressed: () => controller.switchCamera(),
              ),
            ),
            Container(
              margin: EdgeInsets.only(top: 8.h, bottom: 8.h, right: 12.w, left: 4.w),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.4),
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: const Icon(Icons.flash_on, color: Colors.white, size: 22),
                onPressed: () => controller.toggleTorch(),
              ),
            ),
          ]
        ],
      ),
      body: Stack(
        children: [
          // 1. Camera Layer
          Positioned.fill(
            child: MobileScanner(
              controller: controller,
              fit: BoxFit.cover,
              onDetect: _onDetect,
              errorBuilder: (context, error, child) => _buildErrorOverlay(error),
              overlayBuilder: (context, constraints) => Container(
                decoration: ShapeDecoration(
                  shape: QrScannerOverlayShape(
                    borderColor: primaryColor,
                    borderRadius: 24,
                    borderLength: 40,
                    borderWidth: 8,
                    cutOutSize: MediaQuery.of(context).size.width * 0.7,
                  ),
                ),
              ),
            ),
          ),
          
          // 2. Initial "Start Camera" State Overlay (Crucial for iOS PWA)
          if (!_isCameraStarted)
            Positioned.fill(
              child: Container(
                color: const Color(0xFF1E1E1E), // Dark premium background
                child: SafeArea(
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: 24.w),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: EdgeInsets.all(24.w),
                          decoration: BoxDecoration(
                            color: primaryColor.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.qr_code_scanner_rounded, color: primaryColor, size: 80.w),
                        ),
                        SizedBox(height: 32.h),
                        Text(
                          'Mulai Scan QR',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 24.sp,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 12.h),
                        Text(
                          'Izinkan akses kamera untuk memindai QR code yang ada di meja Anda.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 14.sp,
                            height: 1.5,
                          ),
                        ),
                        SizedBox(height: 48.h),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: primaryColor,
                              foregroundColor: Colors.white,
                              padding: EdgeInsets.symmetric(vertical: 16.h),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16.r),
                              ),
                              elevation: 4,
                            ),
                            onPressed: () async {
                              setState(() => _isCameraStarted = true);
                              await controller.start();
                            },
                            child: const Text(
                              'Aktifkan Kamera', 
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

          // 3. Loading Overlay
          if (_isProcessing)
            Positioned.fill(
              child: Container(
                color: Colors.black54,
                child: const Center(
                  child: CircularProgressIndicator(),
                ),
              ),
            ),

          // 4. Floating Bottom Action Panel
          Positioned(
            bottom: kBottomNavigationBarHeight.h, // Lifted slightly
            left: 20.w,
            right: 20.w,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_isCameraStarted) ...[
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.6),
                      borderRadius: BorderRadius.circular(20.r),
                    ),
                    child: const Text(
                      'Arahkan kamera ke QR Code meja',
                      style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
                    ),
                  ),
                  SizedBox(height: 24.h),
                ],
                // Fallback action buttons card
                Container(
                  padding: EdgeInsets.all(16.w),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20.r),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.15),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: _buildActionButton(
                          icon: Icons.keyboard_alt_outlined,
                          label: 'Ketik Manual',
                          onTap: _showManualInputDialog,
                          color: primaryColor,
                        ),
                      ),
                      Container(
                        width: 1,
                        height: 40.h,
                        color: Colors.grey[200],
                        margin: EdgeInsets.symmetric(horizontal: 12.w),
                      ),
                      Expanded(
                        child: _buildActionButton(
                          icon: Icons.image_outlined,
                          label: 'Upload Foto',
                          onTap: _pickImageAndScan,
                          color: primaryColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon, 
    required String label, 
    required VoidCallback onTap, 
    required Color color
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12.r),
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: 8.h),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 28.w),
            SizedBox(height: 8.h),
            Text(
              label,
              style: TextStyle(
                color: Colors.black87,
                fontSize: 13.sp,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorOverlay(MobileScannerException error) {
    return Container(
      color: Colors.black87,
      child: Center(
        child: Padding(
          padding: EdgeInsets.all(32.w),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: EdgeInsets.all(16.w),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.no_photography_outlined, color: Colors.red, size: 64.w),
              ),
              SizedBox(height: 24.h),
              Text(
                'Akses Kamera Ditolak',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20.sp,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 12.h),
              Text(
                'Peramban Anda memblokir kamera atau izin belum diberikan.\n\nSilakan gunakan opsi Ketik Manual atau Upload Foto di bawah ini.',
                style: TextStyle(color: Colors.white70, fontSize: 14.sp, height: 1.5),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
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
    this.overlayColor = const Color.fromRGBO(0, 0, 0, 180), // Darker overlay for premium look
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
    final double width = rect.width;
    final double height = rect.height;
    final double leftOffset = (width - cutOutSize) / 2;
    // Shift the cutout up slightly to account for the large bottom panel
    final double topOffset = ((height - cutOutSize) / 2) - 40.h - cutOutBottomOffset; 
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
    final double topOffset = ((height - cutOutSize) / 2) - 40.h - cutOutBottomOffset;
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
      ..strokeWidth = borderWidth
      ..strokeCap = StrokeCap.round; // Rounded caps for premium feel
    
     final double borderLen = borderLength;
     
     // Top Left
     canvas.drawPath(
       Path()
         ..moveTo(cutOutRect.left, cutOutRect.top + borderLen)
         ..quadraticBezierTo(cutOutRect.left, cutOutRect.top, cutOutRect.left + borderLen, cutOutRect.top),
       borderPaint
     );
     // Top Right
     canvas.drawPath(
       Path()
         ..moveTo(cutOutRect.right - borderLen, cutOutRect.top)
         ..quadraticBezierTo(cutOutRect.right, cutOutRect.top, cutOutRect.right, cutOutRect.top + borderLen),
       borderPaint
     );
     // Bottom Left
     canvas.drawPath(
       Path()
         ..moveTo(cutOutRect.left, cutOutRect.bottom - borderLen)
         ..quadraticBezierTo(cutOutRect.left, cutOutRect.bottom, cutOutRect.left + borderLen, cutOutRect.bottom),
       borderPaint
     );
     // Bottom Right
     canvas.drawPath(
       Path()
         ..moveTo(cutOutRect.right - borderLen, cutOutRect.bottom)
         ..quadraticBezierTo(cutOutRect.right, cutOutRect.bottom, cutOutRect.right, cutOutRect.bottom - borderLen),
       borderPaint
     );
  }
}
