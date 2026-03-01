import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:ataskopi_frontend/core/utils/platform_geolocation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:ataskopi_frontend/core/providers/tenant_provider.dart';
import 'package:ataskopi_frontend/features/profile/presentation/providers/profile_providers.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';
import 'package:ataskopi_frontend/shared/widgets/app_top_bar.dart';
import '../../../../shared/widgets/location_picker_map.dart';


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

  @override
  void initState() {
    super.initState();
    if (widget.address != null) {
      _labelController.text = widget.address!.label;
      _notesController.text = widget.address!.notes ?? '';
      _isDefault = widget.address!.isDefault;
      _center = LatLng(widget.address!.latitude, widget.address!.longitude);
      _addressText = widget.address!.address;
    } else {
      WidgetsBinding.instance.addPostFrameCallback((_) => _getCurrentLocation());
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

  void _showLocationError(String message) {
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Akses Lokasi'),
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

  Future<void> _getCurrentLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await PlatformGeolocation.isLocationServiceEnabled();
    
    if (!serviceEnabled) {
      _showLocationError('Layanan lokasi tidak aktif. Silakan aktifkan di pengaturan perangkat Anda.');
      return;
    }

    permission = await PlatformGeolocation.checkPermission();

    if (permission == LocationPermission.denied) {
      permission = await PlatformGeolocation.requestPermission();
      if (permission == LocationPermission.denied) {
        _showLocationError('Akses lokasi ditolak. Untuk menggunakan fitur ini, izinkan akses lokasi di browser/perangkat Anda.');
        return;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      _showLocationError('Akses lokasi diblokir secara permanen. Silakan atur ulang perizinan browser/perangkat Anda untuk melanjutkan.');
      return;
    }

    setState(() => _isLoading = true);
    try {
      Position position = await PlatformGeolocation.getCurrentPosition();
      
      final targetLatLng = LatLng(position.latitude, position.longitude);
      _mapController.move(targetLatLng, 17.0);
      setState(() {
        _center = targetLatLng;
        _currentZoom = 17.0;
      });
      await _getAddressFromLatLng(targetLatLng);
    } catch (e) {
      if (mounted) {
        _showLocationError('Gagal mendapatkan lokasi: $e\nSilakan periksa izin atau coba lagi.');
      }
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
          
          _mapController.move(targetLatLng, 17.0);
          setState(() {
            _center = targetLatLng;
            _currentZoom = 17.0;
          });
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
        _center = position.center!;
        _currentZoom = position.zoom ?? _currentZoom;
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
      body: Column(
        children: [
          // Map layer
          Expanded(
            child: LocationPickerMap(
              mapController: _mapController,
              center: _center,
              currentZoom: _currentZoom,
              onMapMoved: _onMapPositionChanged,
              onMapMoveEnd: (event) {
                if (event is MapEventMoveEnd && !event.source.name.contains('fitCamera')) {
                   _getAddressFromLatLng(event.camera.center);
                }
              },
              tenant: tenant,
              pinColor: tenant.primaryColor,
              searchController: _searchController,
              onSearchSubmitted: _searchAddress,
              isSearching: _isSearching,
              onClearSearch: () {
                _searchController.clear();
                FocusScope.of(context).unfocus();
              },
              onGetCurrentLocation: _getCurrentLocation,
              isLocating: _isLoading,
              locationFailed: false,
              onZoomIn: _zoomIn,
              onZoomOut: _zoomOut,
              searchHint: 'Cari lokasi (cth: Monas)',
            ),
          ),

          // Bottom panel
          Container(
            padding: EdgeInsets.fromLTRB(20.w, 16.h, 20.w, 24.h),
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

                // Label
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10.r),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: TextField(
                    controller: _labelController,
                    decoration: InputDecoration(
                      hintText: 'Label alamat (Rumah, Kantor, dll.)',
                      hintStyle: TextStyle(
                          color: const Color(0xFF94A3B8), fontSize: 13.sp),
                      prefixIcon: Icon(Icons.label_outline_rounded,
                          color: const Color(0xFF94A3B8), size: 20.w),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(
                          horizontal: 14.w, vertical: 12.h),
                    ),
                  ),
                ),
                SizedBox(height: 10.h),
                
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

                // Checkbox
                Row(
                  children: [
                    SizedBox(
                      height: 24.w,
                      width: 24.w,
                      child: Checkbox(
                        value: _isDefault, 
                        activeColor: tenant.primaryColor,
                        onChanged: (val) => setState(() => _isDefault = val ?? false),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4.r)),
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                    ),
                    SizedBox(width: 8.w),
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
                  height: 48.h,
                  child: ElevatedButton(
                    onPressed: _isSaving ? null : _handleSave,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: tenant.primaryColor,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
                      elevation: 0,
                    ),
                    child: _isSaving
                        ? SizedBox(width: 20.w, height: 20.w, child: const CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Text(
                            'Simpan Alamat',
                            style: TextStyle(
                              fontSize: 15.sp,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
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

