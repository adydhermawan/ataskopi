import 'package:geolocator/geolocator.dart';

class PlatformGeolocation {
  static Future<bool> isLocationServiceEnabled() async {
    return Geolocator.isLocationServiceEnabled();
  }

  static Future<LocationPermission> checkPermission() async {
    return Geolocator.checkPermission();
  }

  static Future<LocationPermission> requestPermission() async {
    return Geolocator.requestPermission();
  }

  static Future<Position> getCurrentPosition() async {
    return Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
  }
}
