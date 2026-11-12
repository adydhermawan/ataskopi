import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../../core/api/api_client.dart';

const _cashierRoles = {'kasir', 'owner', 'admin'};

class Session {
  const Session({
    required this.token,
    required this.userId,
    required this.name,
    required this.phone,
    required this.role,
    required this.outletId,
  });

  Session.fromJson(Map<String, dynamic> json)
      : token = json['token'] as String,
        userId = json['userId'] as String,
        name = json['name'] as String,
        phone = json['phone'] as String,
        role = json['role'] as String,
        outletId = json['outletId'] as String;

  final String token;
  final String userId;
  final String name;
  final String phone;
  final String role;
  final String outletId;

  Map<String, dynamic> toJson() => {
        'token': token,
        'userId': userId,
        'name': name,
        'phone': phone,
        'role': role,
        'outletId': outletId,
      };
}

class AuthService {
  AuthService(this._api, {FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const _key = 'pos_session';

  final ApiClient _api;
  final FlutterSecureStorage _storage;

  Future<Session> login(String phone, String pin) async {
    final data = await _api.post('/api/auth/login', {'phone': phone, 'pin': pin}) as Map<String, dynamic>;
    final user = data['user'] as Map<String, dynamic>;

    if (!_cashierRoles.contains(user['role'])) {
      throw ApiException(403, 'Akun ini bukan akun kasir');
    }
    final outletId = user['outletId'] as String?;
    if (outletId == null) {
      throw ApiException(403, 'Akun ini belum terhubung ke outlet');
    }

    final session = Session(
      token: data['token'] as String,
      userId: user['id'] as String,
      name: user['name'] as String,
      phone: user['phone'] as String,
      role: user['role'] as String,
      outletId: outletId,
    );
    await _storage.write(key: _key, value: jsonEncode(session.toJson()));
    _api.token = session.token;
    return session;
  }

  Future<Session?> restore() async {
    final saved = await _storage.read(key: _key);
    if (saved == null) return null;

    final session = Session.fromJson(jsonDecode(saved) as Map<String, dynamic>);
    _api.token = session.token;
    return session;
  }

  Future<void> logout() async {
    await _storage.delete(key: _key);
    _api.token = null;
  }
}
