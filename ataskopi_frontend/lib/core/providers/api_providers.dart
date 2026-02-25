import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ataskopi_frontend/core/api/api_client.dart';
import 'package:ataskopi_frontend/features/auth/data/auth_repository.dart';
import 'package:ataskopi_frontend/features/menu/data/repositories/catalog_repository.dart';
import 'package:ataskopi_frontend/features/order/data/repositories/order_repository.dart';
import 'package:ataskopi_frontend/features/home/data/repositories/loyalty_repository.dart';
import 'package:ataskopi_frontend/features/profile/data/repositories/profile_repository.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient();
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return AuthRepository(apiClient: apiClient);
});

final catalogRepositoryProvider = Provider<CatalogRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return CatalogRepository(apiClient: apiClient);
});

final orderRepositoryProvider = Provider<OrderRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return OrderRepository(apiClient: apiClient);
});

final loyaltyRepositoryProvider = Provider<LoyaltyRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return LoyaltyRepository(apiClient: apiClient);
});

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ProfileRepository(apiClient: apiClient);
});
