import 'dart:async';
import 'dart:html' as html;
import 'package:geolocator/geolocator.dart';

class PlatformGeolocation {
  static Future<bool> isLocationServiceEnabled() async {
    return html.window.navigator.geolocation != null;
  }

  static Future<LocationPermission> checkPermission() async {
    if (html.window.navigator.permissions != null) {
      try {
        final status = await html.window.navigator.permissions!.query({'name': 'geolocation'});
        if (status.state == 'granted') return LocationPermission.always;
        if (status.state == 'denied') return LocationPermission.deniedForever;
      } catch (_) {}
    }
    return LocationPermission.denied;
  }

  static Future<LocationPermission> requestPermission() async {
    try {
      // Browsers prompt for permission when getCurrentPosition is called.
      // We do a quick check that forces the prompt, ignoring the result.
      final completer = Completer<LocationPermission>();
      html.window.navigator.geolocation.getCurrentPosition().then((_) {
        completer.complete(LocationPermission.always);
      }).catchError((e) {
        completer.complete(LocationPermission.deniedForever);
      });
      return await completer.future;
    } catch (e) {
      return LocationPermission.deniedForever;
    }
  }

  static Future<Position> getCurrentPosition() async {
    final completer = Completer<Position>();
    html.window.navigator.geolocation.getCurrentPosition(
      enableHighAccuracy: true,
      maximumAge: const Duration(minutes: 1),
    ).then((pos) {
      // Try to parse timestamp properly based on browser behavior
      DateTime timestamp = DateTime.now();
      if (pos.timestamp != null) {
        try {
          if (pos.timestamp is int) {
            timestamp = DateTime.fromMillisecondsSinceEpoch(pos.timestamp as int);
          } else if (pos.timestamp is double) {
            timestamp = DateTime.fromMillisecondsSinceEpoch((pos.timestamp as double).toInt());
          }
        } catch (_) {}
      }

      completer.complete(Position(
        longitude: pos.coords?.longitude?.toDouble() ?? 0.0,
        latitude: pos.coords?.latitude?.toDouble() ?? 0.0,
        timestamp: timestamp,
        accuracy: pos.coords?.accuracy?.toDouble() ?? 0.0,
        altitude: pos.coords?.altitude?.toDouble() ?? 0.0,
        altitudeAccuracy: pos.coords?.altitudeAccuracy?.toDouble() ?? 0.0,
        heading: pos.coords?.heading?.toDouble() ?? 0.0,
        headingAccuracy: 0.0,
        speed: pos.coords?.speed?.toDouble() ?? 0.0,
        speedAccuracy: 0.0,
        isMocked: false,
      ));
    }).catchError((e) {
      completer.completeError(e);
    });
    return completer.future;
  }
}
