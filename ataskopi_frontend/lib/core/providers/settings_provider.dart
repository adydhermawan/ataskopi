import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ataskopi_frontend/core/providers/api_providers.dart';
import 'package:ataskopi_frontend/features/home/data/repositories/settings_repository.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';

final settingsRepositoryProvider = Provider<SettingsRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return SettingsRepository(apiClient: apiClient);
});

final orderModeSettingsProvider = FutureProvider<OrderModeSettings>((ref) async {
  final repository = ref.watch(settingsRepositoryProvider);
  final response = await repository.getOrderModeSettings();
  
  if (response.success && response.data != null) {
    return response.data!;
  } else {
    // Return a default active config if the API fails or is not ready yet
    return const OrderModeSettings(
      dineInEnabled: true,
      pickupEnabled: true,
      deliveryEnabled: true,
      dineInMethod: 'GUEST_NAME_ONLY',
      taxEnabled: true,
      qrisEnabled: true,
      cashEnabled: true,
      defaultPaymentMethod: 'qris',
      qrisQrCodeUrl: null,
    );
  }
});
