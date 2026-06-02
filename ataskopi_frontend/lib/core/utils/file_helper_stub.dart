// ignore_for_file: avoid_print
import 'package:url_launcher/url_launcher.dart';

class FileHelper {
  static Future<void> downloadImage(String url, {String filename = 'qris_payment.png'}) async {
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        throw 'Could not launch $url';
      }
    } catch (e) {
      print('Error launching URL: $e');
    }
  }
}
