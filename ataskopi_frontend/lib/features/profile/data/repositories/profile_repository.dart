import 'package:ataskopi_frontend/core/api/api_client.dart';
import 'package:ataskopi_frontend/core/api/api_config.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';

class ProfileRepository {
  final ApiClient _apiClient;

  ProfileRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Get profile info
  Future<ApiResponse<User>> getProfile() async {
    return await _apiClient.get<User>(
      ApiConfig.profileEndpoint,
      requiresAuth: true,
      fromData: (data) => User.fromJson(data),
    );
  }

  /// Update profile info
  Future<ApiResponse<User>> updateProfile({
    String? name,
    String? email,
  }) async {
    return await _apiClient.patch<User>(
      ApiConfig.profileEndpoint,
      requiresAuth: true,
      body: {
        if (name != null && name.isNotEmpty) 'name': name,
        if (email != null && email.isNotEmpty) 'email': email,
      },
      fromData: (data) => User.fromJson(data),
    );
  }

  /// Get notifications
  Future<ApiResponse<List<NotificationModel>>> getNotifications() async {
    return await _apiClient.get<List<NotificationModel>>(
      ApiConfig.notificationsEndpoint,
      requiresAuth: true,
      fromData: (data) => (data as List)
          .map((e) => NotificationModel.fromJson(e))
          .toList(),
    );
  }

  /// Get active addresses
  Future<ApiResponse<List<UserAddress>>> getAddresses() async {
    return await _apiClient.get<List<UserAddress>>(
      '${ApiConfig.baseUrl}/api/me/addresses',
      requiresAuth: true,
      fromData: (data) => (data as List)
          .map((e) => UserAddress.fromJson(e))
          .toList(),
    );
  }

  /// Add new address
  Future<ApiResponse<UserAddress>> addAddress({
    required String label,
    required String address,
    required double latitude,
    required double longitude,
    String? notes,
    bool isDefault = false,
  }) async {
    return await _apiClient.post<UserAddress>(
      '${ApiConfig.baseUrl}/api/me/addresses',
      requiresAuth: true,
      body: {
        'label': label,
        'address': address,
        'latitude': latitude,
        'longitude': longitude,
        'notes': notes,
        'isDefault': isDefault,
      },
      fromData: (data) => UserAddress.fromJson(data),
    );
  }

  /// Update address
  Future<ApiResponse<UserAddress>> updateAddress({
    required String id,
    String? label,
    String? address,
    double? latitude,
    double? longitude,
    String? notes,
    bool? isDefault,
  }) async {
    return await _apiClient.put<UserAddress>(
      '${ApiConfig.baseUrl}/api/me/addresses/$id',
      requiresAuth: true,
      body: {
        if (label != null) 'label': label,
        if (address != null) 'address': address,
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
        if (notes != null) 'notes': notes,
        if (isDefault != null) 'isDefault': isDefault,
      },
      fromData: (data) => UserAddress.fromJson(data),
    );
  }

  /// Delete address
  Future<ApiResponse<void>> deleteAddress(String id) async {
    return await _apiClient.delete(
      '${ApiConfig.baseUrl}/api/me/addresses/$id',
      requiresAuth: true,
    );
  }
}
