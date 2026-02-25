import 'package:ataskopi_frontend/core/api/api_client.dart';
import 'package:ataskopi_frontend/core/api/api_config.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';

class NotificationRepository {
  final ApiClient _apiClient;

  NotificationRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Get user notifications with optional category filter
  Future<ApiResponse<List<NotificationModel>>> getNotifications({
    String? category,
  }) async {
    String url = ApiConfig.notificationsEndpoint;
    if (category != null && category.isNotEmpty) {
      url += '?category=$category';
    }
    
    return await _apiClient.get<List<NotificationModel>>(
      url,
      requiresAuth: true,
      fromData: (data) {
        final list = data is List ? data : (data['data'] ?? []);
        return (list as List).map((e) => NotificationModel.fromJson(e)).toList();
      },
    );
  }

  /// Mark a single notification as read
  Future<ApiResponse<NotificationModel>> markAsRead(String notificationId) async {
    return await _apiClient.patch<NotificationModel>(
      '${ApiConfig.notificationsEndpoint}/$notificationId',
      requiresAuth: true,
      fromData: (data) => NotificationModel.fromJson(data),
    );
  }

  /// Mark all notifications as read
  Future<ApiResponse<Map<String, dynamic>>> markAllAsRead() async {
    return await _apiClient.patch<Map<String, dynamic>>(
      '${ApiConfig.notificationsEndpoint}/read-all',
      requiresAuth: true,
      fromData: (data) => data as Map<String, dynamic>,
    );
  }

  /// Get count of unread notifications
  Future<int> getUnreadCount() async {
    final response = await getNotifications();
    if (response.isSuccess && response.data != null) {
      return response.data!.where((n) => !n.isRead).length;
    }
    return 0;
  }
}
