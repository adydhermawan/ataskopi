import 'package:shared_preferences/shared_preferences.dart';
import 'package:ataskopi_frontend/core/api/api_client.dart';
import 'package:ataskopi_frontend/core/api/api_config.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';

/// Auth response containing user and token
class AuthResult {
  final User user;
  final String token;

  AuthResult({required this.user, required this.token});

  factory AuthResult.fromJson(Map<String, dynamic> json) {
    return AuthResult(
      user: User.fromJson(json['user']),
      token: json['token'] ?? '',
    );
  }
}

/// Phone check response
class PhoneCheckResult {
  final bool exists;
  final String? name;

  PhoneCheckResult({required this.exists, this.name});

  factory PhoneCheckResult.fromJson(Map<String, dynamic> json) {
    return PhoneCheckResult(
      exists: json['exists'] ?? false,
      name: json['name'],
    );
  }
}

/// Repository for authentication operations
class AuthRepository {
  final ApiClient _apiClient;
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'user_data';

  AuthRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Check if phone number is registered
  Future<ApiResponse<PhoneCheckResult>> checkPhone({
    required String phone,
    String tenantId = ApiConfig.defaultTenantId,
  }) async {
    return await _apiClient.post<PhoneCheckResult>(
      ApiConfig.checkPhoneEndpoint,
      body: {
        'phone': phone,
        'tenantId': tenantId,
      },
      fromData: (data) => PhoneCheckResult.fromJson(data),
    );
  }

  /// Register a new user
  Future<ApiResponse<AuthResult>> register({
    required String phone,
    required String name,
    required String pin,
    String? email,
    String tenantId = ApiConfig.defaultTenantId,
  }) async {
    final response = await _apiClient.post<AuthResult>(
      ApiConfig.registerEndpoint,
      body: {
        'phone': phone,
        'name': name,
        'email': email,
        'pin': pin,
        'tenantId': tenantId,
      },
      fromData: (data) => AuthResult.fromJson(data),
    );

    if (response.success && response.data != null) {
      await _saveAuthData(response.data!);
    }

    return response;
  }

  /// Login with phone and PIN
  Future<ApiResponse<AuthResult>> login({
    required String phone,
    required String pin,
    String tenantId = ApiConfig.defaultTenantId,
  }) async {
    final response = await _apiClient.post<AuthResult>(
      ApiConfig.loginEndpoint,
      body: {
        'phone': phone,
        'pin': pin,
        'tenantId': tenantId,
      },
      fromData: (data) => AuthResult.fromJson(data),
    );

    if (response.success && response.data != null) {
      await _saveAuthData(response.data!);
    }

    return response;
  }

  /// Get current user profile
  Future<ApiResponse<User>> getMe() async {
    return await _apiClient.get<User>(
      ApiConfig.meEndpoint,
      requiresAuth: true,
      fromData: (data) => User.fromJson(data),
    );
  }

  /// Check if user is logged in
  Future<bool> isLoggedIn() async {
    final token = await getStoredToken();
    return token != null && token.isNotEmpty;
  }

  /// Get stored auth token
  Future<String?> getStoredToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    return token;
  }

  /// Restore auth session from storage
  Future<bool> restoreSession() async {
    final token = await getStoredToken();
    if (token != null && token.isNotEmpty) {
      _apiClient.setAuthToken(token);
      return true;
    }
    return false;
  }

  /// Check session and validate with server
  Future<ApiResponse<User>> checkSession() async {
    final hasToken = await restoreSession();
    if (!hasToken) {
      return ApiResponse.error(message: 'No session found');
    }
    final response = await getMe();
    return response;
  }

  /// Logout and clear stored data
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
    _apiClient.setAuthToken(null);
  }

  /// Save auth data to local storage
  Future<void> _saveAuthData(AuthResult authResult) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, authResult.token);
    _apiClient.setAuthToken(authResult.token);
  }

  /// Test API health
  Future<bool> testConnection() async {
    final response = await _apiClient.get(ApiConfig.healthEndpoint);
    return response.success;
  }
}
