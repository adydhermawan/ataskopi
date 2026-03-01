import 'package:ataskopi_frontend/core/api/api_client.dart';
import 'package:ataskopi_frontend/core/api/api_config.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';

class LoyaltyRepository {
  final ApiClient _apiClient;

  LoyaltyRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Get loyalty summary and progress
  Future<ApiResponse<LoyaltyInfo>> getLoyaltyInfo() async {
    final response = await _apiClient.get<LoyaltyInfo>(
      ApiConfig.loyaltyEndpoint,
      requiresAuth: true,
      fromData: (data) {
        return LoyaltyInfo.fromJson(data);
      },
    );
    if (!response.success) {
    }
    return response;
  }

  /// Get available vouchers
  Future<ApiResponse<List<Voucher>>> getVouchers({String? status, bool includeUsed = false}) async {
    final query = status != null ? '?status=$status' : '';
    final usedQuery = includeUsed ? '&include_used=true' : '';
    return await _apiClient.get<List<Voucher>>(
      '${ApiConfig.vouchersEndpoint}$query$usedQuery',
      requiresAuth: true,
      fromData: (data) => (data['vouchers'] as List)
          .map((e) => Voucher.fromJson(e))
          .toList(),
    );
  }

  /// Get redeemable rewards
  Future<ApiResponse<List<Voucher>>> getRewards() async {
    return await _apiClient.get<List<Voucher>>(
      ApiConfig.rewardsEndpoint,
      requiresAuth: true,
      fromData: (data) => (data['rewards'] as List)
          .map((e) => Voucher.fromJson(e))
          .toList(),
    );
  }

  /// Redeem a reward
  Future<ApiResponse<bool>> redeemReward(String voucherId) async {
    return await _apiClient.post<bool>(
      ApiConfig.redeemRewardEndpoint,
      body: {'voucherId': voucherId},
      requiresAuth: true,
      fromData: (data) => true,
    );
  }
}
