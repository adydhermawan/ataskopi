import 'package:flutter_riverpod/flutter_riverpod.dart';
// Trigger Rebuild
import 'package:ataskopi_frontend/core/api/api_config.dart';
import 'package:ataskopi_frontend/core/providers/api_providers.dart';
import 'package:ataskopi_frontend/core/providers/auth_provider.dart';
import 'package:ataskopi_frontend/core/providers/location_provider.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';

final bannersProvider = FutureProvider<List<Banner>>((ref) async {
  final repository = ref.watch(catalogRepositoryProvider);
  final response = await repository.getPromos();
  if (response.success && response.data != null) {
    return response.data!;
  }
  return [];
});

final outletsProvider = FutureProvider<List<Store>>((ref) async {
  final repository = ref.watch(apiClientProvider);
  final locationState = ref.watch(userLocationProvider);
  
  Map<String, dynamic>? queryParams;
  
  if (locationState.location != null) {
    queryParams = {
      'latitude': locationState.location!.latitude.toString(),
      'longitude': locationState.location!.longitude.toString(),
    };
  }

  final response = await repository.get<List<Store>>(
    ApiConfig.outletsEndpoint,
    queryParameters: queryParams,
    fromData: (data) => (data as List).map((e) => Store.fromJson(e)).toList(),
  );
  if (response.success && response.data != null) {
    return response.data!;
  }
  return [];
});

final selectedOutletProvider = StateProvider<Store?>((ref) {
  final outletsAsync = ref.watch(outletsProvider);
  
  // Only set initial value if data is loaded and current state is null
  return outletsAsync.when(
    data: (outlets) {
      if (outlets.isNotEmpty) {
        return outlets.first;
      }
      return null;
    },
    loading: () => null,
    error: (_, __) => null,
  );
});

final loyaltyInfoProvider = FutureProvider<LoyaltyInfo?>((ref) async {
  final authState = ref.watch(authProvider); // Wait for auth
  if (authState.user == null && !authState.isLoading) return null; // If no user, return null
  
  final repository = ref.watch(loyaltyRepositoryProvider);
  final response = await repository.getLoyaltyInfo();
  if (response.success && response.data != null) {
    return response.data;
  }
  return null;
});

final vouchersProvider = FutureProvider<List<Voucher>>((ref) async {
  final authState = ref.watch(authProvider); // Wait for auth
  
  final repository = ref.watch(loyaltyRepositoryProvider);
  final response = await repository.getVouchers(status: 'active');
  if (response.success && response.data != null) {
    return response.data!;
  }
  return [];
});

final rewardsProvider = FutureProvider<List<Voucher>>((ref) async {
  final authState = ref.watch(authProvider);
  if (authState.user == null) return [];
  
  final repository = ref.watch(loyaltyRepositoryProvider);
  final response = await repository.getRewards();
  if (response.success && response.data != null) {
    return response.data!;
  }
  return [];
});


final recommendedProductsProvider = FutureProvider<List<Product>>((ref) async {
  final repository = ref.watch(catalogRepositoryProvider);
  final response = await repository.getProducts(recommended: true);
  if (response.success && response.data != null) {
    return response.data!;
  }
  return [];
});

final homeTabIndexProvider = StateProvider<int>((ref) => 0);
