
import 'package:ataskopi_frontend/core/api/api_client.dart';
import 'package:ataskopi_frontend/core/api/api_config.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';

class TableRepository {
  final ApiClient _apiClient;

  TableRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Get table details by QR Code string
  Future<ApiResponse<TableModel>> getTableByQr(String qrCode) async {
    // Endpoint: /api/tables?qrCode={qrCode}
    // Since /api/tables might not be in ApiConfig yet, we construct it.
    // Better to add it to ApiConfig, but for now we hardcode base + '/api/tables'
    
    // Using ApiConfig base URL which might be dynamic
    final baseUrl = ApiConfig.baseUrl; // http://... or https://...
    final url = '$baseUrl/api/tables?qrCode=$qrCode';

    return await _apiClient.get<TableModel>(
      url,
      requiresAuth: true, // Assuming user needs to be logged in to scan/order
      fromData: (data) => TableModel.fromJson(data),
    );
  }
}
