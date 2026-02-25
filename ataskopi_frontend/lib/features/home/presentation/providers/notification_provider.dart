import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';
import 'package:ataskopi_frontend/features/home/data/repositories/notification_repository.dart';
import 'package:ataskopi_frontend/core/providers/api_providers.dart';

/// Provider for NotificationRepository
final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return NotificationRepository(apiClient: apiClient);
});

/// Provider for notifications list with optional category filter
final notificationsProvider = FutureProvider.family<List<NotificationModel>, String?>((ref, category) async {
  final repository = ref.watch(notificationRepositoryProvider);
  
  final response = await repository.getNotifications(
    category: category == 'all' ? null : category,
  );
  
  if (response.isSuccess && response.data != null) {
    return response.data!;
  }
  
  throw Exception(response.message);
});

/// Provider for unread notification count (for badge)
final unreadNotificationCountProvider = FutureProvider<int>((ref) async {
  final repository = ref.watch(notificationRepositoryProvider);
  return await repository.getUnreadCount();
});

/// Notification state notifier for managing read/unread state
class NotificationStateNotifier extends StateNotifier<AsyncValue<List<NotificationModel>>> {
  final NotificationRepository _repository;
  final Ref _ref;

  NotificationStateNotifier(this._repository, this._ref) : super(const AsyncValue.loading());

  Future<void> loadNotifications({String? category}) async {
    state = const AsyncValue.loading();
    try {
      final response = await _repository.getNotifications(
        category: category == 'all' ? null : category,
      );
      if (response.isSuccess && response.data != null) {
        state = AsyncValue.data(response.data!);
      } else {
        state = AsyncValue.error(Exception(response.message), StackTrace.current);
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<bool> markAsRead(String notificationId) async {
    try {
      final response = await _repository.markAsRead(notificationId);
      if (response.isSuccess) {
        // Update local state
        state.whenData((notifications) {
          final updated = notifications.map((n) {
            if (n.id == notificationId) {
              return NotificationModel(
                id: n.id,
                category: n.category,
                title: n.title,
                message: n.message,
                isRead: true,
                createdAt: n.createdAt,
              );
            }
            return n;
          }).toList();
          state = AsyncValue.data(updated);
        });
        // Refresh unread count
        _ref.invalidate(unreadNotificationCountProvider);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<bool> markAllAsRead() async {
    try {
      final response = await _repository.markAllAsRead();
      if (response.isSuccess) {
        // Update local state - mark all as read
        state.whenData((notifications) {
          final updated = notifications.map((n) {
            return NotificationModel(
              id: n.id,
              category: n.category,
              title: n.title,
              message: n.message,
              isRead: true,
              createdAt: n.createdAt,
            );
          }).toList();
          state = AsyncValue.data(updated);
        });
        // Refresh unread count
        _ref.invalidate(unreadNotificationCountProvider);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}

/// StateNotifierProvider for notification state management
final notificationStateProvider = StateNotifierProvider<NotificationStateNotifier, AsyncValue<List<NotificationModel>>>((ref) {
  final repository = ref.watch(notificationRepositoryProvider);
  return NotificationStateNotifier(repository, ref);
});
