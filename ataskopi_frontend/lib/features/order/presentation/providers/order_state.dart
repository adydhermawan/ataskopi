import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';

class OrderFlowState {
  final OrderMode? mode;
  final String? tableId; // Changed from tableNumber to tableId (UUID)
  final String? tableNumber; // Display only
  final DateTime? pickupTime;
  final UserAddress? deliveryAddress; // Structured address

  OrderFlowState({
    this.mode,
    this.tableId,
    this.tableNumber,
    this.pickupTime,
    this.deliveryAddress,
  });

  OrderFlowState copyWith({
    OrderMode? mode,
    String? tableId,
    String? tableNumber,
    DateTime? pickupTime,
    UserAddress? deliveryAddress,
  }) {
    return OrderFlowState(
      mode: mode ?? this.mode,
      tableId: tableId ?? this.tableId,
      tableNumber: tableNumber ?? this.tableNumber,
      pickupTime: pickupTime ?? this.pickupTime,
      deliveryAddress: deliveryAddress ?? this.deliveryAddress,
    );
  }
}

class OrderFlowNotifier extends StateNotifier<OrderFlowState> {
  OrderFlowNotifier() : super(OrderFlowState());

  void setMode(OrderMode mode) {
    // Reset other fields when mode changes, or keep them? 
    // Usually cleaner to reset if switching context.
    state = OrderFlowState(mode: mode);
  }

  void setDineInData({required String tableId, required String tableNumber}) {
    state = state.copyWith(
      tableId: tableId, 
      tableNumber: tableNumber
    );
  }

  void setPickupData(DateTime time) {
    state = state.copyWith(pickupTime: time);
  }

  void setDeliveryAddress(UserAddress address) {
    state = state.copyWith(
      deliveryAddress: address,
    );
  }

  void reset() {
    state = OrderFlowState();
  }
}

final orderFlowProvider = StateNotifierProvider<OrderFlowNotifier, OrderFlowState>((ref) {
  return OrderFlowNotifier();
});
