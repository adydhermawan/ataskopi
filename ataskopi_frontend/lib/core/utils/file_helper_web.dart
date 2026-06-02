// ignore_for_file: avoid_web_libraries_in_flutter, avoid_print, deprecated_member_use
import 'dart:html' as html;
import 'package:http/http.dart' as http;

class FileHelper {
  static Future<void> downloadImage(String url, {String filename = 'qris_payment.png'}) async {
    try {
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final blob = html.Blob([response.bodyBytes], 'image/png');
        final blobUrl = html.Url.createObjectUrlFromBlob(blob);
        html.AnchorElement(href: blobUrl)
          ..setAttribute("download", filename)
          ..click();
        html.Url.revokeObjectUrl(blobUrl);
      } else {
        throw Exception('Failed to load image: status ${response.statusCode}');
      }
    } catch (e) {
      // Fallback: open in new tab if CORS or other error occurs
      try {
        html.window.open(url, '_blank');
      } catch (err) {
        print('Error opening fallback URL: $err');
      }
    }
  }
}
