import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:ataskopi_frontend/core/utils/platform_geolocation.dart';

class LocationState {
  final LatLng? location;
  final bool isLoading;
  final String? error;
  final bool permissionDenied;

  const LocationState({
    this.location,
    this.isLoading = false,
    this.error,
    this.permissionDenied = false,
  });

  LocationState copyWith({
    LatLng? location,
    bool? isLoading,
    String? error,
    bool? permissionDenied,
    bool forceNullLocation = false,
  }) {
    return LocationState(
      location: forceNullLocation ? null : (location ?? this.location),
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
      permissionDenied: permissionDenied ?? this.permissionDenied,
    );
  }
}

class LocationNotifier extends StateNotifier<LocationState> {
  LocationNotifier() : super(const LocationState()) {
    if (!kIsWeb) {
      // Auto-fetch ONLY on mobile. Safari iOS will block the entire session's
      // geolocation capability if requested without a user gesture.
      _initLocation();
    }
  }

  Future<void> _initLocation() async {
    // Check service enabled
    bool serviceEnabled = await PlatformGeolocation.isLocationServiceEnabled();

    if (!serviceEnabled) {
      state = state.copyWith(error: 'Location services are disabled');
      return;
    }

    // Check permissions
    LocationPermission permission = await PlatformGeolocation.checkPermission();

    if (permission == LocationPermission.denied) {
      permission = await PlatformGeolocation.requestPermission();
      if (permission == LocationPermission.denied) {
        state = state.copyWith(
          permissionDenied: true,
          error: 'Location permissions are denied',
        );
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      state = state.copyWith(
        permissionDenied: true,
        error: 'Location permissions are permanently denied',
      );
      return;
    }

    // Get location — use custom wrapper for precise platform APIs
    state = state.copyWith(isLoading: true);
    try {
      Position position = await PlatformGeolocation.getCurrentPosition();

      state = state.copyWith(
        location: LatLng(position.latitude, position.longitude),
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to get location: $e',
      );
    }
  }

  Future<void> refreshLocation() async {
    await _initLocation();
  }
}

final userLocationProvider =
    StateNotifierProvider<LocationNotifier, LocationState>((ref) {
  return LocationNotifier();
});
