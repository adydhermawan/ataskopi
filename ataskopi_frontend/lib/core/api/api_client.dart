import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_config.dart';

/// Standard API response wrapper
class ApiResponse<T> {
  final bool success;
  final String message;
  final T? data;
  final String? errorCode;

  ApiResponse({
    required this.success,
    required this.message,
    this.data,
    this.errorCode,
  });

  /// Convenience getter for checking success
  bool get isSuccess => success;

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic)? fromData,
  ) {
    return ApiResponse(
      success: json['success'] == true,
      message: json['message'] ?? json['error'] ?? '',
      data: json['data'] != null && fromData != null
          ? fromData(json['data'])
          : json['data'],
      errorCode: json['code'],
    );
  }

  factory ApiResponse.error({
    required String message,
    String? errorCode,
    T? data,
  }) {
    return ApiResponse(
      success: false,
      message: message,
      errorCode: errorCode,
      data: data,
    );
  }
}

/// HTTP API Client for AtasKopi Backend
class ApiClient {
  final http.Client _client;
  String? _authToken;

  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  /// Set the authentication token for subsequent requests
  void setAuthToken(String? token) {
    _authToken = token;
  }

  /// Get current auth token
  String? get authToken => _authToken;

  /// Build headers for API requests
  Map<String, String> _buildHeaders({bool requiresAuth = false}) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-tenant-id': ApiConfig.defaultTenantId,
    };

    if (requiresAuth) {
      if (_authToken != null) {
        headers['Authorization'] = 'Bearer $_authToken';
      }
    }

    return headers;
  }

  /// Perform GET request
  Future<ApiResponse<T>> get<T>(
    String url, {
    Map<String, dynamic>? queryParameters,
    bool requiresAuth = false,
    T Function(dynamic)? fromData,
  }) async {
    try {
      final uri = Uri.parse(url).replace(
          queryParameters: queryParameters != null 
              ? {...Uri.parse(url).queryParameters, ...queryParameters} 
              : null
      );
      
      final response = await _client
          .get(
            uri,
            headers: _buildHeaders(requiresAuth: requiresAuth),
          )
          .timeout(ApiConfig.requestTimeout);

      return _handleResponse(response, fromData);
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
        errorCode: 'NETWORK_ERROR',
      );
    }
  }


  /// Perform POST request
  Future<ApiResponse<T>> post<T>(
    String url, {
    Map<String, dynamic>? body,
    bool requiresAuth = false,
    T Function(dynamic)? fromData,
  }) async {
    try {
      final response = await _client
          .post(
            Uri.parse(url),
            headers: _buildHeaders(requiresAuth: requiresAuth),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(ApiConfig.requestTimeout);

      return _handleResponse(response, fromData);
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
        errorCode: 'NETWORK_ERROR',
      );
    }
  }

  /// Perform PATCH request
  Future<ApiResponse<T>> patch<T>(
    String url, {
    Map<String, dynamic>? body,
    bool requiresAuth = false,
    T Function(dynamic)? fromData,
  }) async {
    try {
      final response = await _client
          .patch(
            Uri.parse(url),
            headers: _buildHeaders(requiresAuth: requiresAuth),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(ApiConfig.requestTimeout);

      return _handleResponse(response, fromData);
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
        errorCode: 'NETWORK_ERROR',
      );
    }
  }

  /// Perform PUT request
  Future<ApiResponse<T>> put<T>(
    String url, {
    Map<String, dynamic>? body,
    bool requiresAuth = false,
    T Function(dynamic)? fromData,
  }) async {
    try {
      final response = await _client
          .put(
            Uri.parse(url),
            headers: _buildHeaders(requiresAuth: requiresAuth),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(ApiConfig.requestTimeout);

      return _handleResponse(response, fromData);
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
        errorCode: 'NETWORK_ERROR',
      );
    }
  }

  /// Perform DELETE request
  Future<ApiResponse<T>> delete<T>(
    String url, {
    bool requiresAuth = false,
  }) async {
    try {
      final response = await _client
          .delete(
            Uri.parse(url),
            headers: _buildHeaders(requiresAuth: requiresAuth),
          )
          .timeout(ApiConfig.requestTimeout);

      return _handleResponse(response, null);
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: ${e.toString()}',
        errorCode: 'NETWORK_ERROR',
      );
    }
  }

  /// Handle HTTP response
  ApiResponse<T> _handleResponse<T>(
    http.Response response,
    T Function(dynamic)? fromData,
  ) {
    try {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return ApiResponse.fromJson(json, fromData);
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Failed to parse response',
        errorCode: 'PARSE_ERROR',
      );
    }
  }

  /// Close the client when done
  void dispose() {
    _client.close();
  }
}
