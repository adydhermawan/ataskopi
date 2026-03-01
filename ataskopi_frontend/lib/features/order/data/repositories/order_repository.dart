import 'package:ataskopi_frontend/core/api/api_client.dart';
import 'package:ataskopi_frontend/core/api/api_config.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';

class OrderRepository {
  final ApiClient _apiClient;

  OrderRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Create a new order
  Future<ApiResponse<Order>> createOrder({
    required String outletId,
    required String orderType,
    String? tableId,
    String? scheduledTime,
    dynamic deliveryAddress,
    required List<Map<String, dynamic>> items,
    required String paymentMethod,
    int? pointsToRedeem,
    String? voucherCode,
  }) async {
    return await _apiClient.post<Order>(
      ApiConfig.ordersEndpoint,
      requiresAuth: true,
      body: {
        'outletId': outletId,
        'orderType': orderType,
        'tableId': tableId,
        'scheduledTime': scheduledTime,
        'deliveryAddress': deliveryAddress,
        'items': items,
        'paymentMethod': paymentMethod,
        'pointsToRedeem': pointsToRedeem,
        'voucherCode': voucherCode,
      },
      fromData: (data) => Order.fromJson(data),
    );
  }

  /// Get order history
  Future<ApiResponse<List<Order>>> getOrderHistory({
    String? status,
    int limit = 20,
    int offset = 0,
  }) async {
    final query = 'limit=$limit&offset=$offset${status != null ? '&status=$status' : ''}';
    return await _apiClient.get<List<Order>>(
      '${ApiConfig.ordersEndpoint}?$query',
      requiresAuth: true,
      fromData: (data) {
        // Handle backend pagination structure: { items: [...], total: ... }
        final list = (data is Map && data.containsKey('items')) ? data['items'] : data;
        return (list as List).map((e) {
          try {
            return Order.fromJson(e);
          } catch (e) {
            rethrow;
          }
        }).toList();
      },
    );
  }

  /// Get order details by ID
  Future<ApiResponse<Order>> getOrderDetails(String orderId) async {
    return await _apiClient.get<Order>(
      '${ApiConfig.ordersEndpoint}/$orderId',
      requiresAuth: true,
      fromData: (data) => Order.fromJson(data),
    );
  }


  /// Get dedicated order history (Completed/Cancelled)
  Future<ApiResponse<List<Order>>> getDedicatedOrderHistory({
    int limit = 20,
    int offset = 0,
  }) async {
    return await _apiClient.get<List<Order>>(
      '${ApiConfig.ordersHistoryEndpoint}?limit=$limit&offset=$offset',
      requiresAuth: true,
      fromData: (data) {
        // Handle backend pagination structure: { items: [...], total: ... } OR direct list
        final list = (data is Map && data.containsKey('items')) ? data['items'] : data;
        
        return (list as List).map((e) => Order.fromJson(e)).toList();
      },
    );
  }
}
