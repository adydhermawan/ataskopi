import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:latlong2/latlong.dart';
import '../../core/providers/tenant_provider.dart';

class LocationPickerMap extends StatelessWidget {
  final MapController mapController;
  final LatLng center;
  final double currentZoom;
  final void Function(MapPosition, bool) onMapMoved;
  final void Function(MapEvent) onMapMoveEnd;
  final TenantConfig tenant;
  final Color pinColor;
  
  final TextEditingController searchController;
  final void Function(String) onSearchSubmitted;
  final bool isSearching;
  final VoidCallback onClearSearch;
  
  final VoidCallback onGetCurrentLocation;
  final bool isLocating;
  final bool locationFailed;
  
  // Optional features
  final VoidCallback? onZoomIn;
  final VoidCallback? onZoomOut;
  final String searchHint;

  const LocationPickerMap({
    super.key,
    required this.mapController,
    required this.center,
    required this.currentZoom,
    required this.onMapMoved,
    required this.onMapMoveEnd,
    required this.tenant,
    required this.pinColor,
    required this.searchController,
    required this.onSearchSubmitted,
    required this.isSearching,
    required this.onClearSearch,
    required this.onGetCurrentLocation,
    required this.isLocating,
    required this.locationFailed,
    this.onZoomIn,
    this.onZoomOut,
    this.searchHint = 'Cari lokasi...',
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // 1. Flutter Map
        FlutterMap(
          mapController: mapController,
          options: MapOptions(
            initialCenter: center,
            initialZoom: currentZoom,
            onPositionChanged: onMapMoved,
            onMapEvent: onMapMoveEnd,
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.ataskopi.app',
            ),
          ],
        ),

        // 2. Central Pin Icon — tip exactly at map center
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

        // 3. Search Bar
        Positioned(
          top: 12.h,
          left: 12.w,
          right: 12.w,
          child: Container(
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
              controller: searchController,
              textInputAction: TextInputAction.search,
              onSubmitted: onSearchSubmitted,
              decoration: InputDecoration(
                hintText: searchHint,
                hintStyle: TextStyle(
                    color: const Color(0xFF94A3B8), fontSize: 13.sp),
                prefixIcon: Icon(Icons.search_rounded,
                    color: const Color(0xFF94A3B8), size: 20.w),
                suffixIcon: isSearching
                    ? Padding(
                        padding: const EdgeInsets.all(12),
                        child: SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: tenant.primaryColor),
                        ),
                      )
                    : IconButton(
                        icon: Icon(Icons.close_rounded,
                            color: const Color(0xFF94A3B8), size: 18.w),
                        onPressed: onClearSearch,
                      ),
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(
                    horizontal: 16.w, vertical: 13.h),
              ),
            ),
          ),
        ),

        // 4. Zoom Controls (Optional)
        if (onZoomIn != null && onZoomOut != null)
          Positioned(
            right: 12.w,
            top: 76.h,
            child: Column(
              children: [
                GestureDetector(
                  onTap: onZoomIn,
                  child: Container(
                    width: 44.w,
                    height: 44.w,
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
                    child: Icon(Icons.add_rounded,
                        color: const Color(0xFF475569), size: 24.w),
                  ),
                ),
                Container(
                    width: 44.w, height: 1.h, color: const Color(0xFFF1F5F9)),
                GestureDetector(
                  onTap: onZoomOut,
                  child: Container(
                    width: 44.w,
                    height: 44.w,
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
                    child: Icon(Icons.remove_rounded,
                        color: const Color(0xFF475569), size: 24.w),
                  ),
                ),
              ],
            ),
          ),

        // 5. My-location FAB
        Positioned(
          right: 12.w,
          bottom: 16.h,
          child: Material(
            color: Colors.white,
            elevation: 4,
            shape: const CircleBorder(),
            child: InkWell(
              onTap: isLocating ? null : onGetCurrentLocation,
              customBorder: const CircleBorder(),
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: isLocating
                    ? SizedBox(
                        width: 22.w,
                        height: 22.w,
                        child: CircularProgressIndicator(
                            strokeWidth: 2.5, color: tenant.primaryColor),
                      )
                    : Icon(
                        locationFailed
                            ? Icons.location_off_rounded
                            : Icons.my_location_rounded,
                        size: 22.w,
                        color: locationFailed
                            ? Colors.red
                            : const Color(0xFF475569),
                      ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
