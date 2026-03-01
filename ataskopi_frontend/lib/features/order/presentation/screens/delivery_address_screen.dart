import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:ataskopi_frontend/core/utils/platform_geolocation.dart';
import 'package:http/http.dart' as http;

import '../../../../core/providers/tenant_provider.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_top_bar.dart';
import '../../../menu/presentation/screens/menu_catalog_screen.dart';
import '../../../shared/domain/models/models.dart';
import '../../../profile/presentation/providers/profile_providers.dart';
import '../../../profile/presentation/screens/address_list_screen.dart';
import '../providers/order_state.dart';

class DeliveryAddressScreen extends ConsumerStatefulWidget {
  const DeliveryAddressScreen({super.key});

  @override
  ConsumerState<DeliveryAddressScreen> createState() =>
      _DeliveryAddressScreenState();
}

class _DeliveryAddressScreenState
    extends ConsumerState<DeliveryAddressScreen> {
  final TextEditingController _notesController = TextEditingController();
  final TextEditingController _searchController = TextEditingController();
  final MapController _mapController = MapController();

  // Default Monas Jakarta until GPS is ready
  LatLng _center = const LatLng(-6.175392, 106.827153);
  double _currentZoom = 14.0;
  String _addressText = 'Menentukan lokasi...';
  String _cityText = '';
  bool _isLocating = false;
  bool _isSearching = false;
  bool _locationFailed = false;
  bool _showLocationPrompt = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _getCurrentLocation());
  }

  @override
  void dispose() {
    _notesController.dispose();
    _searchController.dispose();
    _mapController.dispose();
    super.dispose();
  }

  // ── GPS ──────────────────────────────────────────────────────────────────

  Future<void> _getCurrentLocation() async {
    if (!mounted) return;
    setState(() {
      _showLocationPrompt = false; // Hide banner once initiated
      _isLocating = true;
      _locationFailed = false;
      _addressText = 'Menentukan lokasi...';
      _cityText = '';
    });

    try {
      bool serviceEnabled = await PlatformGeolocation.isLocationServiceEnabled();

      if (!serviceEnabled) {
        _onLocationFailed('Layanan lokasi tidak aktif');
        return;
      }

      LocationPermission perm = await PlatformGeolocation.checkPermission();
      
      if (perm == LocationPermission.denied) {
        perm = await PlatformGeolocation.requestPermission();
      }

      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        _onLocationFailed('Izin lokasi ditolak');
        return;
      }

      Position pos = await PlatformGeolocation.getCurrentPosition();

      if (!mounted) return;
      final latLng = LatLng(pos.latitude, pos.longitude);
      setState(() => _center = latLng);
      _mapController.move(latLng, 17.0);
      await _reverseGeocode(latLng);
    } catch (e) {
      _onLocationFailed('Error: $e');
    } finally {
      if (mounted) setState(() => _isLocating = false);
    }
  }

  void _onLocationFailed(String msg) {
    if (!mounted) return;
    setState(() {
      _isLocating = false;
      _locationFailed = true;
      _addressText = msg;
      _cityText = 'Tap ikon lokasi untuk coba lagi';
    });
  }

  // ── Geocoding ─────────────────────────────────────────────────────────────

  Future<void> _reverseGeocode(LatLng point) async {
    // On web, native geocoding package is unavailable — use OSM directly
    if (!kIsWeb) {
      try {
        final marks = await placemarkFromCoordinates(
            point.latitude, point.longitude);
        if (marks.isNotEmpty && mounted) {
          final p = marks[0];
          final street = [p.street, p.subLocality]
              .where((s) => s != null && s!.isNotEmpty)
              .join(', ');
          final city = [p.locality, p.country]
              .where((s) => s != null && s!.isNotEmpty)
              .join(', ');
          setState(() {
            _addressText = street.isEmpty ? 'Lokasi terpilih' : street;
            _cityText = city;
          });
          return;
        }
      } catch (_) {
        // fall through to OSM
      }
    }
    await _reverseGeocodeOsm(point);
  }

  Future<void> _reverseGeocodeOsm(LatLng point) async {
    try {
      final url = Uri.parse(
        'https://nominatim.openstreetmap.org/reverse'
        '?format=json'
        '&lat=${point.latitude}'
        '&lon=${point.longitude}'
        '&zoom=18'
        '&addressdetails=1',
      );
      final res =
          await http.get(url, headers: {'User-Agent': 'com.ataskopi.app'});
      if (res.statusCode == 200 && mounted) {
        final data = json.decode(res.body) as Map<String, dynamic>;
        final addr = data['address'] as Map<String, dynamic>? ?? {};
        final displayParts =
            (data['display_name'] as String? ?? '').split(',');
        final street = displayParts.take(2).join(',').trim();
        final city = (addr['city'] ??
                addr['town'] ??
                addr['village'] ??
                addr['county'] ??
                '') as String;
        final country = (addr['country'] ?? '') as String;
        setState(() {
          _addressText = street.isEmpty ? 'Lokasi terpilih' : street;
          _cityText =
              [city, country].where((s) => s.isNotEmpty).join(', ');
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _addressText =
              '${point.latitude.toStringAsFixed(5)}, ${point.longitude.toStringAsFixed(5)}';
          _cityText = '';
        });
      }
    }
  }

  // ── Search ────────────────────────────────────────────────────────────────

  Future<void> _searchAddress(String query) async {
    if (query.trim().isEmpty) return;
    setState(() => _isSearching = true);
    try {
      final url = Uri.parse(
        'https://nominatim.openstreetmap.org/search'
        '?format=json'
        '&q=${Uri.encodeComponent(query)}'
        '&limit=1',
      );
      final res =
          await http.get(url, headers: {'User-Agent': 'com.ataskopi.app'});
      if (res.statusCode == 200) {
        final data = json.decode(res.body) as List;
        if (data.isNotEmpty) {
          final lat = double.parse(data[0]['lat'] as String);
          final lon = double.parse(data[0]['lon'] as String);
          final latLng = LatLng(lat, lon);
          setState(() => _center = latLng);
          _mapController.move(latLng, 16.0);
          await _reverseGeocode(latLng);
        } else if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Lokasi tidak ditemukan')),
          );
        }
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _isSearching = false);
    }
  }

  // ── Map Events ────────────────────────────────────────────────────────────

  void _onMapMoved(MapPosition position, bool hasGesture) {
    if (position.center != null) {
      setState(() {
        _center = position.center!;
        _currentZoom = position.zoom ?? _currentZoom;
      });
    }
  }

  void _onMapMoveEnd(MapEvent event) {
    if (event is MapEventMoveEnd) {
      _reverseGeocode(_center);
    }
  }

  // ── Confirm ───────────────────────────────────────────────────────────────

  void _onConfirm() async {
    final fullAddress = _addressText +
        (_notesController.text.isNotEmpty
            ? ' (${_notesController.text})'
            : '');

    // Auto-save if not duplicate (fire-and-forget)
    try {
      final existing = ref.read(addressesProvider).value ?? [];
      final isDup = existing.any((a) =>
          Geolocator.distanceBetween(
              _center.latitude, _center.longitude, a.latitude, a.longitude) <
          50);
      if (!isDup) {
        await ref.read(addressesProvider.notifier).addAddress(
              label: 'Alamat Pengiriman',
              address: fullAddress,
              latitude: _center.latitude,
              longitude: _center.longitude,
              notes: _notesController.text,
              isDefault: false,
            );
      }
    } catch (_) {}

    if (!mounted) return;
    final address = UserAddress(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      label: 'Alamat Pengiriman',
      address: fullAddress,
      latitude: _center.latitude,
      longitude: _center.longitude,
      notes: _notesController.text,
      isDefault: false,
    );
    ref.read(orderFlowProvider.notifier).setMode(OrderMode.delivery);
    ref.read(orderFlowProvider.notifier).setDeliveryAddress(address);
    Navigator.push(
        context, MaterialPageRoute(builder: (_) => const MenuCatalogScreen()));
  }

  void _selectSavedAddress() async {
    final selected = await Navigator.push(
      context,
      MaterialPageRoute(
          builder: (_) => const AddressListScreen(isSelectionMode: true)),
    );
    if (selected is UserAddress && mounted) {
      ref.read(orderFlowProvider.notifier).setMode(OrderMode.delivery);
      ref.read(orderFlowProvider.notifier).setDeliveryAddress(selected);
      Navigator.push(context,
          MaterialPageRoute(builder: (_) => const MenuCatalogScreen()));
    }
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantProvider);
    final pinColor =
        _locationFailed ? Colors.red.shade400 : tenant.primaryColor;

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: const AppTopBar(title: 'Atur Alamat'),
      body: Column(
        children: [
          // ── Map area ────────────────────────────────────────────────────
          Expanded(
            child: Stack(
              children: [
                // Map
                FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: _center,
                    initialZoom: _currentZoom,
                    onPositionChanged: _onMapMoved,
                    onMapEvent: _onMapMoveEnd,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.ataskopi.app',
                    ),
                  ],
                ),

                // Centre pin — fixed in screen space, tip at exact centre
                // Icon(location_on) renders with its visual tip at the
                // bottom-centre of the bounding box, so we nudge it up by
                // half its height so the tip lands on the map centre.
                IgnorePointer(
                  child: Center(
                    child: Transform.translate(
                      offset: const Offset(0, -24), // half of 48px icon
                      child: Icon(
                        Icons.location_on_rounded,
                        color: pinColor,
                        size: 48,
                      ),
                    ),
                  ),
                ),

                // Search bar
                Positioned(
                  top: 12.h,
                  left: 12.w,
                  right: 12.w,
                  child: Column(
                    children: [
                      Container(
                        height: 46.h,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12.r),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.1),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: TextField(
                          controller: _searchController,
                          textInputAction: TextInputAction.search,
                          onSubmitted: _searchAddress,
                          decoration: InputDecoration(
                            hintText: 'Cari lokasi...',
                            hintStyle: TextStyle(
                                color: const Color(0xFF94A3B8), fontSize: 13.sp),
                            prefixIcon: Icon(Icons.search_rounded,
                                color: const Color(0xFF94A3B8), size: 20.w),
                            suffixIcon: _isSearching
                                ? Padding(
                                    padding: const EdgeInsets.all(12),
                                    child: SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: tenant.primaryColor),
                                    ),
                                  )
                                : null,
                            border: InputBorder.none,
                            contentPadding: EdgeInsets.symmetric(
                                horizontal: 16.w, vertical: 13.h),
                          ),
                        ),
                      ),
                      
                    ],
                  ),
                ),

                // My-location FAB
                Positioned(
                  right: 12.w,
                  bottom: 16.h,
                  child: Material(
                    color: Colors.white,
                    elevation: 4,
                    shape: const CircleBorder(),
                    child: InkWell(
                      onTap: _isLocating ? null : _getCurrentLocation,
                      customBorder: const CircleBorder(),
                      child: Padding(
                        padding: const EdgeInsets.all(10),
                        child: _isLocating
                            ? SizedBox(
                                width: 22.w,
                                height: 22.w,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2.5,
                                    color: tenant.primaryColor),
                              )
                            : Icon(
                                _locationFailed
                                    ? Icons.location_off_rounded
                                    : Icons.my_location_rounded,
                                size: 22.w,
                                color: _locationFailed
                                    ? Colors.red
                                    : const Color(0xFF475569),
                              ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Bottom panel ──────────────────────────────────────────────────
          Container(
            padding:
                EdgeInsets.fromLTRB(20.w, 16.h, 20.w, 24.h),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.07),
                  blurRadius: 20,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Address row
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 40.w,
                      height: 40.w,
                      decoration: BoxDecoration(
                        color: tenant.primaryColor.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.pin_drop_rounded,
                          color: tenant.primaryColor, size: 20.w),
                    ),
                    SizedBox(width: 12.w),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _addressText.isEmpty
                                ? 'Geser peta untuk memilih lokasi'
                                : _addressText,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 15.sp,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                          if (_cityText.isNotEmpty) ...[
                            SizedBox(height: 2.h),
                            Text(
                              _cityText,
                              style: TextStyle(
                                fontSize: 12.sp,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 12.h),

                // Notes
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10.r),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: TextField(
                    controller: _notesController,
                    decoration: InputDecoration(
                      hintText: 'Detail alamat (Gedung, lantai, dll.)',
                      hintStyle: TextStyle(
                          color: const Color(0xFF94A3B8), fontSize: 13.sp),
                      prefixIcon: Icon(Icons.edit_note_rounded,
                          color: const Color(0xFF94A3B8), size: 20.w),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(
                          horizontal: 14.w, vertical: 12.h),
                    ),
                  ),
                ),
                SizedBox(height: 10.h),

                // Saved address button
                SizedBox(
                  width: double.infinity,
                  height: 42.h,
                  child: OutlinedButton.icon(
                    onPressed: _selectSavedAddress,
                    icon: Icon(Icons.bookmark_border_rounded, size: 18.w),
                    label: Text(
                      'Pilih Alamat Tersimpan',
                      style: TextStyle(
                          fontSize: 13.sp, fontWeight: FontWeight.w700),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: tenant.primaryColor,
                      side: BorderSide(color: tenant.primaryColor),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10.r)),
                    ),
                  ),
                ),
                SizedBox(height: 10.h),
                AppButton(text: 'Simpan & Lanjutkan', onPressed: _onConfirm),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
