import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:math';
import 'package:ataskopi_frontend/core/providers/tenant_provider.dart';
import 'package:ataskopi_frontend/features/profile/presentation/providers/profile_providers.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';
import 'package:ataskopi_frontend/shared/widgets/app_top_bar.dart';


class AddressFormScreen extends ConsumerStatefulWidget {
  final UserAddress? address;

  const AddressFormScreen({super.key, this.address});

  @override
  ConsumerState<AddressFormScreen> createState() => _AddressFormScreenState();
}

class _AddressFormScreenState extends ConsumerState<AddressFormScreen> {
  final TextEditingController _labelController = TextEditingController();
  final TextEditingController _notesController = TextEditingController();
  final TextEditingController _searchController = TextEditingController();
  final MapController _mapController = MapController();

  // Default to Monas Jakarta if no location
  LatLng _center = const LatLng(-6.175392, 106.827153);
  double _currentZoom = 15.0;
  String _addressText = 'Pilih lokasi di peta';
  String _cityText = 'Indonesia';
  bool _isDefault = false;
  bool _isLoading = false;
  bool _isSaving = false;
  bool _isSearching = false;
  
  // Pin offset from screen center (half of the bottom padding)
  double get _pinOffsetY => 140.h; // Higher offset for address form due to taller bottom sheet

  @override
  void initState() {
    super.initState();
    if (widget.address != null) {
      // Editing existing address
      _labelController.text = widget.address!.label;
      _notesController.text = widget.address!.notes ?? '';
      _isDefault = widget.address!.isDefault;
      _center = LatLng(widget.address!.latitude, widget.address!.longitude);
      _addressText = widget.address!.address;
    } else {
      // New address - get current location
      _getCurrentLocation();
    }
  }

  @override
  void dispose() {
    _labelController.dispose();
    _notesController.dispose();
    _searchController.dispose();
    _mapController.dispose();
    super.dispose();
  }
  
  /// Gets the LatLng at the visual pin's tip position (offset from screen center)
  LatLng _getLatLngAtPin() {
    final camera = _mapController.camera;
    final screenSize = camera.nonRotatedSize;
    final pinScreenPoint = Offset(screenSize.x / 2, screenSize.y / 2 - _pinOffsetY);
    return camera.pointToLatLng(Point(pinScreenPoint.dx, pinScreenPoint.dy));
  }
  
  /// Moves the map so that the given target LatLng is under the pin's tip
  void _moveMapToPinLocation(LatLng target, double zoom) {
    final metersPerPixel = 156543.03392 * cos(target.latitude * pi / 180) / pow(2, zoom);
    final offsetMeters = _pinOffsetY * metersPerPixel;
    final offsetDegrees = offsetMeters / 111320;
    final adjustedCenter = LatLng(target.latitude - offsetDegrees, target.longitude);
    _mapController.move(adjustedCenter, zoom);
    setState(() {
      _center = target;
      _currentZoom = zoom;
    });
  }


  Future<void> _getCurrentLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }
    
    if (permission == LocationPermission.deniedForever) return;

    setState(() => _isLoading = true);
    try {
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      final targetLatLng = LatLng(position.latitude, position.longitude);
      _moveMapToPinLocation(targetLatLng, 17.0);
      await _getAddressFromLatLng(targetLatLng);
    } catch (e) {

    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }


  Future<void> _getAddressFromLatLng(LatLng point) async {
    try {
      final url = Uri.parse(
          'https://nominatim.openstreetmap.org/reverse?format=json&lat=${point.latitude}&lon=${point.longitude}&zoom=18&addressdetails=1');
      
      final response = await http.get(url, headers: {'User-Agent': 'com.ataskopi.app'});

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final address = data['address'];
        
        if (mounted) {
          setState(() {
            _addressText = data['display_name'].split(',').take(2).join(',');
            String city = address['city'] ?? address['town'] ?? address['village'] ?? address['county'] ?? '';
            String country = address['country'] ?? '';
            _cityText = [city, country].where((e) => e.isNotEmpty).join(', ');
          });
        }
      }
    } catch (e) {

      if (mounted) {
         setState(() {
          _addressText = 'Lat: ${point.latitude.toStringAsFixed(5)}, Lng: ${point.longitude.toStringAsFixed(5)}';
          _cityText = 'Unknown Location';
        });
      }
    }
  }

  Future<void> _searchAddress(String query) async {
    if (query.isEmpty) return;
    
    setState(() => _isSearching = true);
    try {
      final url = Uri.parse(
          'https://nominatim.openstreetmap.org/search?format=json&q=$query&limit=1&addressdetails=1');
      
      final response = await http.get(url, headers: {'User-Agent': 'com.ataskopi.app'});

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data is List && data.isNotEmpty) {
          final result = data.first;
          final lat = double.parse(result['lat']);
          final lon = double.parse(result['lon']);
          final targetLatLng = LatLng(lat, lon);
          
          _moveMapToPinLocation(targetLatLng, 17.0);
          await _getAddressFromLatLng(targetLatLng);
        } else {
           if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Lokasi tidak ditemukan')),
            );
          }
        }
      }
    } catch (e) {

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal mencari lokasi: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSearching = false);
    }
  }


  void _onMapPositionChanged(MapPosition position, bool hasGesture) {
      if (position.center != null) {
        setState(() {
          _currentZoom = position.zoom ?? _currentZoom;
        });
        
        // Get the actual location under the pin tip
        final pinLatLng = _getLatLngAtPin();
        setState(() {
          _center = pinLatLng;
        });
      }
  }


  void _zoomIn() {
    setState(() {
      _currentZoom = (_currentZoom + 1).clamp(2.0, 18.0);
    });
    _mapController.move(_center, _currentZoom);
  }

  void _zoomOut() {
    setState(() {
      _currentZoom = (_currentZoom - 1).clamp(2.0, 18.0);
    });
    _mapController.move(_center, _currentZoom);
  }

  void _handleSave() async {
    // Validate label
    if (_labelController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Label alamat wajib diisi')),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final notifier = ref.read(addressesProvider.notifier);
      bool success;
      
      final fullAddress = _addressText + (_notesController.text.isNotEmpty ? ' (${_notesController.text})' : '');

      if (widget.address == null) {
        success = await notifier.addAddress(
          label: _labelController.text,
          address: fullAddress,
          latitude: _center.latitude,
          longitude: _center.longitude,
          notes: _notesController.text,
          isDefault: _isDefault,
        );
      } else {
        success = await notifier.updateAddress(
          id: widget.address!.id,
          label: _labelController.text,
          address: fullAddress,
          latitude: _center.latitude,
          longitude: _center.longitude,
          notes: _notesController.text,
          isDefault: _isDefault,
        );
      }

      if (success) {
        if (mounted) Navigator.pop(context);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Gagal menyimpan alamat. Coba lagi.')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Terjadi kesalahan: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantProvider);
    final isEditing = widget.address != null;

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppTopBar(title: isEditing ? 'Edit Alamat' : 'Tambah Alamat'),
      body: Stack(
        children: [
          // Flutter Map OSM
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _center,
              initialZoom: _currentZoom,
              onPositionChanged: _onMapPositionChanged,
              onMapEvent: (event) {
                if (event is MapEventMoveEnd && !event.source.name.contains('fitCamera')) {
                   _getAddressFromLatLng(event.camera.center);
                }
              },
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.ataskopi.app',
              ),
            ],
          ),
          
          // Search Bar
          Positioned(
            top: 20.h,
            left: 16.w,
            right: 16.w,
            child: Container(
              height: 48.h,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12.r),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 15,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: TextField(
                controller: _searchController,
                textInputAction: TextInputAction.search,
                onSubmitted: _searchAddress,
                decoration: InputDecoration(
                  hintText: 'Cari lokasi (cth: Monas)',
                  hintStyle: TextStyle(color: const Color(0xFF94A3B8), fontSize: 13.sp),
                  prefixIcon: Icon(Icons.search_rounded, color: const Color(0xFF94A3B8), size: 18.w),
                  suffixIcon: _isSearching 
                    ? SizedBox(width: 12.w, height: 12.w, child: const Center(child: CircularProgressIndicator(strokeWidth: 2)))
                    : IconButton(
                        icon: Icon(Icons.close_rounded, color: const Color(0xFF94A3B8), size: 18.w),
                        onPressed: () {
                          _searchController.clear();
                          FocusScope.of(context).unfocus();
                        },
                      ),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
                ),
              ),
            ),
          ),

          // Zoom Controls (Moved higher to side)
          Positioned(
            right: 16.w,
            top: 100.h,
            child: Column(
              children: [
                GestureDetector(
                  onTap: _zoomIn,
                  child: Container(
                    width: 40.w,
                    height: 40.w,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(8.r),
                        topRight: Radius.circular(8.r),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Icon(Icons.add_rounded, color: const Color(0xFF475569), size: 24.w),
                  ),
                ),
                Container(width: 40.w, height: 1.h, color: const Color(0xFFF1F5F9)),
                GestureDetector(
                  onTap: _zoomOut,
                  child: Container(
                    width: 40.w,
                    height: 40.w,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.only(
                        bottomLeft: Radius.circular(8.r),
                        bottomRight: Radius.circular(8.r),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Icon(Icons.remove_rounded, color: const Color(0xFF475569), size: 24.w),
                  ),
                ),
              ],
            ),
          ),

          // Map Controls (Recenter - Moved higher to side)
          Positioned(
            right: 16.w,
            top: 200.h,
            child: GestureDetector(
              onTap: _getCurrentLocation,
              child: Container(
                width: 44.w,
                height: 44.w,
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: _isLoading 
                  ? Padding(padding: EdgeInsets.all(12.w), child: const CircularProgressIndicator(strokeWidth: 2))
                  : Icon(Icons.my_location_rounded, color: const Color(0xFF475569), size: 22.w),
              ),
            ),
          ),

          // Central Pin Icon
          Center(
            child: Padding(
              padding: EdgeInsets.only(bottom: 280.h), // Account for bottom sheet height
              child: Icon(
                Icons.location_on_rounded,
                color: tenant.primaryColor,
                size: 56.w,
              ),
            ),
          ),
          
          // Floating Label (Above Pin)
          Center(
            child: Padding(
              padding: EdgeInsets.only(bottom: 360.h), // adjusted to be above the new pin position
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8.r),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Text(
                  'Geser peta untuk mengubah',
                  style: TextStyle(
                    fontSize: 12.sp,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF1E293B),
                  ),
                ),
              ),
            ),
          ),

          // Bottom Sheet

          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              padding: EdgeInsets.fromLTRB(24.w, 12.h, 24.w, 32.h),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24.r)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 20,
                    offset: const Offset(0, -5),
                  ),
                ],
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 48.w,
                      height: 5.h,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(100),
                      ),
                    ),
                    SizedBox(height: 16.h),
                    
                    // Location Display
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 44.w,
                          height: 44.w,
                          decoration: BoxDecoration(
                            color: tenant.primaryColor.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.pin_drop_rounded, color: tenant.primaryColor, size: 24.w),
                        ),
                        SizedBox(width: 16.w),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'LOKASI TERPILIH',
                                style: TextStyle(
                                  fontSize: 10.sp,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF94A3B8),
                                  letterSpacing: 1.2,
                                ),
                              ),
                              SizedBox(height: 4.h),
                              Text(
                                _addressText,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 15.sp,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF0F172A),
                                ),
                              ),
                              SizedBox(height: 2.h),
                              Text(
                                _cityText,
                                style: TextStyle(
                                  fontSize: 12.sp,
                                  color: const Color(0xFF64748B),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 16.h),
                    Divider(height: 1.h, color: const Color(0xFFF1F5F9)),
                    SizedBox(height: 16.h),
                    
                    // Label Field
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Label Alamat',
                          style: TextStyle(
                            fontSize: 13.sp,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF475569),
                          ),
                        ),
                        SizedBox(height: 8.h),
                        Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12.r),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: TextField(
                            controller: _labelController,
                            decoration: InputDecoration(
                              hintText: 'Contoh: Rumah, Kantor',
                              hintStyle: TextStyle(color: const Color(0xFF94A3B8), fontSize: 14.sp),
                              border: InputBorder.none,
                              contentPadding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
                            ),
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 12.h),

                    // Notes Field
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Detail Alamat (Opsional)',
                          style: TextStyle(
                            fontSize: 13.sp,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF475569),
                          ),
                        ),
                        SizedBox(height: 8.h),
                        Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12.r),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: TextField(
                            controller: _notesController,
                            decoration: InputDecoration(
                              hintText: 'Contoh: Gedung A, Lt. 5, Pagar hitam',
                              hintStyle: TextStyle(color: const Color(0xFF94A3B8), fontSize: 14.sp),
                              border: InputBorder.none,
                              contentPadding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
                            ),
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 12.h),

                    // Default Checkbox
                    Row(
                      children: [
                        Checkbox(
                          value: _isDefault, 
                          activeColor: tenant.primaryColor,
                          onChanged: (val) => setState(() => _isDefault = val ?? false),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4.r)),
                        ),
                        Text(
                          'Jadikan Alamat Utama',
                          style: TextStyle(
                            fontSize: 13.sp,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF0F172A),
                          ),
                        )
                      ],
                    ),
                    SizedBox(height: 16.h),

                    // Save Button
                    SizedBox(
                      width: double.infinity,
                      height: 54.h,
                      child: ElevatedButton(
                        onPressed: _isSaving ? null : _handleSave,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: tenant.primaryColor,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14.r)),
                          elevation: 0,
                        ),
                        child: _isSaving
                            ? SizedBox(width: 24.w, height: 24.w, child: const CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : Text(
                                'Simpan Alamat',
                                style: TextStyle(
                                  fontSize: 16.sp,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

