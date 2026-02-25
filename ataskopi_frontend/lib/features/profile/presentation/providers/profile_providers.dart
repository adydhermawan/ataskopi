import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ataskopi_frontend/core/providers/api_providers.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';
import 'package:ataskopi_frontend/core/providers/auth_provider.dart';

final profileProvider = FutureProvider<User?>((ref) async {
  final repository = ref.watch(profileRepositoryProvider);
  final response = await repository.getProfile();
  if (response.success && response.data != null) {
    // Optionally update authProvider state with fresh user data
    return response.data;
  }
  return null;
});

final notificationsProvider = FutureProvider<List<NotificationModel>>((ref) async {
  final repository = ref.watch(profileRepositoryProvider);
  final response = await repository.getNotifications();
  if (response.success && response.data != null) {
    return response.data!;
  }
  return [];
});

class AddressNotifier extends StateNotifier<AsyncValue<List<UserAddress>>> {
  final Ref ref;

  AddressNotifier(this.ref) : super(const AsyncValue.loading()) {
    getAddresses();
  }

  Future<void> getAddresses() async {
    state = const AsyncValue.loading();
    try {
      final repository = ref.read(profileRepositoryProvider);
      final response = await repository.getAddresses();
      if (response.success && response.data != null) {
        state = AsyncValue.data(response.data!);
      } else {
        state = AsyncValue.error(response.message, StackTrace.current);
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<bool> addAddress({
    required String label,
    required String address,
    required double latitude,
    required double longitude,
    String? notes,
    bool isDefault = false,
  }) async {
    try {
      final repository = ref.read(profileRepositoryProvider);
      final response = await repository.addAddress(
        label: label,
        address: address,
        latitude: latitude,
        longitude: longitude,
        notes: notes,
        isDefault: isDefault,
      );

      if (response.success) {
        // Refresh list
        await getAddresses();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<bool> updateAddress({
    required String id,
    String? label,
    String? address,
    double? latitude,
    double? longitude,
    String? notes,
    bool? isDefault,
  }) async {
    try {
      final repository = ref.read(profileRepositoryProvider);
      final response = await repository.updateAddress(
        id: id,
        label: label,
        address: address,
        latitude: latitude,
        longitude: longitude,
        notes: notes,
        isDefault: isDefault,
      );

      if (response.success) {
        await getAddresses();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deleteAddress(String id) async {
    try {
      final repository = ref.read(profileRepositoryProvider);
      final response = await repository.deleteAddress(id);
      if (response.success) {
        await getAddresses();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}

final addressesProvider = StateNotifierProvider<AddressNotifier, AsyncValue<List<UserAddress>>>((ref) {
  return AddressNotifier(ref);
});
