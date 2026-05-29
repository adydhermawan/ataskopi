import 'package:ataskopi_frontend/core/api/api_client.dart';
import 'package:ataskopi_frontend/core/api/api_config.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';

class SettingsRepository {
  final ApiClient _apiClient;

  SettingsRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Get active order mode settings
  Future<ApiResponse<OrderModeSettings>> getOrderModeSettings() async {
    return await _apiClient.get<OrderModeSettings>(
      ApiConfig.settingsEndpoint,
      requiresAuth: false,
      fromData: (data) => OrderModeSettings.fromJson(data),
    );
  }
}
