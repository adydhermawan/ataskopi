import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ataskopi_frontend/features/auth/data/auth_repository.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';
import 'package:ataskopi_frontend/core/providers/api_providers.dart';

class AuthState {
  final User? user;
  final bool isLoading;
  final String? error;

  AuthState({this.user, this.isLoading = false, this.error});

  AuthState copyWith({User? user, bool? isLoading, String? error}) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;

  AuthNotifier(this._repository) : super(AuthState(isLoading: true)) {
    _init();
  }

  Future<void> _init() async {
    final hasSession = await _repository.restoreSession();
    if (hasSession) {
      final response = await _repository.getMe();
      if (response.success && response.data != null) {
        state = AuthState(user: response.data);
      } else {
        await _repository.logout();
        state = AuthState(user: null);
      }
    } else {
      state = AuthState(user: null);
    }
  }

  Future<bool> login(String phone, String pin) async {
    state = state.copyWith(isLoading: true);
    final response = await _repository.login(phone: phone, pin: pin);
    
    if (response.success && response.data != null) {
      state = AuthState(user: response.data!.user);
      return true;
    } else {
      state = state.copyWith(isLoading: false, error: response.message);
      return false;
    }
  }

  Future<bool> register({
    required String phone,
    required String name,
    required String pin,
    String? email,
  }) async {
    state = state.copyWith(isLoading: true);
    final response = await _repository.register(
      phone: phone,
      name: name,
      pin: pin,
      email: email,
    );
    
    if (response.success && response.data != null) {
      state = AuthState(user: response.data!.user);
      return true;
    } else {
      state = state.copyWith(isLoading: false, error: response.message);
      return false;
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    state = AuthState(user: null);
  }

  Future<void> devLogin() async {
    state = state.copyWith(isLoading: true);
    // Hardcoded credentials for development
    const devPhone = '+6281234567890';
    const devPin = '123456';

    try {
      // 1. Check Phone
      final checkResponse = await _repository.checkPhone(phone: devPhone);
      if (!checkResponse.success || checkResponse.data == null || !checkResponse.data!.exists) {
        state = state.copyWith(isLoading: false, error: 'Dev User Not Found');
        return;
      }

      // 2. Login
      final loginResponse = await _repository.login(phone: devPhone, pin: devPin);
      if (loginResponse.success && loginResponse.data != null) {
        state = AuthState(user: loginResponse.data!.user);
      } else {
        state = state.copyWith(isLoading: false, error: loginResponse.message);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void updateUser(User user) {
    state = state.copyWith(user: user);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  return AuthNotifier(repository);
});
