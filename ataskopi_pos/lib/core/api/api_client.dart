import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'api_config.dart';

/// The server answered and refused the request.
class ApiException implements Exception {
  ApiException(this.statusCode, this.message);

  final int statusCode;
  final String message;

  bool get isUnauthorized => statusCode == 401;

  @override
  String toString() => message;
}

/// The server could not be reached, so the request is safe to retry later.
class OfflineException implements Exception {
  @override
  String toString() => 'Tidak ada koneksi ke server';
}

class ApiClient {
  ApiClient({http.Client? client, this.baseUrl = ApiConfig.baseUrl})
      : _client = client ?? http.Client();

  final http.Client _client;
  final String baseUrl;
  String? token;

  Future<dynamic> get(String path) => _send('GET', path);

  Future<dynamic> post(String path, Object body) => _send('POST', path, body);

  Future<dynamic> patch(String path, Object body) => _send('PATCH', path, body);

  Future<dynamic> _send(String method, String path, [Object? body]) async {
    final request = http.Request(method, Uri.parse('$baseUrl$path'))
      ..headers['Content-Type'] = 'application/json'
      ..headers['Accept'] = 'application/json';
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    if (body != null) request.body = jsonEncode(body);

    final http.Response response;
    try {
      final streamed = await _client.send(request).timeout(ApiConfig.requestTimeout);
      response = await http.Response.fromStream(streamed);
    } on SocketException {
      throw OfflineException();
    } on TimeoutException {
      throw OfflineException();
    } on http.ClientException {
      throw OfflineException();
    }

    final Object? decoded;
    try {
      decoded = jsonDecode(response.body);
    } on FormatException {
      if (response.statusCode >= 500) throw OfflineException();
      throw ApiException(response.statusCode, 'Respons server tidak dikenali');
    }

    final json = decoded is Map<String, dynamic> ? decoded : const <String, dynamic>{};
    if (response.statusCode >= 500) throw OfflineException();
    if (response.statusCode >= 400 || json['success'] != true) {
      final message = json['error'] ?? json['message'] ?? 'Permintaan gagal';
      throw ApiException(response.statusCode, message.toString());
    }
    return json['data'];
  }
}
