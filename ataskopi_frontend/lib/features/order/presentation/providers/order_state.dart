import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';

class OrderFlowState {
  final OrderMode? mode;
  final String? tableId; // Changed from tableNumber to tableId (UUID)
  final String? tableNumber; // Display only
  final DateTime? pickupTime;
  final UserAddress? deliveryAddress; // Structured address
  final String? guestName;

  OrderFlowState({
    this.mode,
    this.tableId,
    this.tableNumber,
    this.pickupTime,
    this.deliveryAddress,
    this.guestName,
  });

  OrderFlowState copyWith({
    OrderMode? mode,
    String? tableId,
    String? tableNumber,
    DateTime? pickupTime,
    UserAddress? deliveryAddress,
    String? guestName,
  }) {
    return OrderFlowState(
      mode: mode ?? this.mode,
      tableId: tableId ?? this.tableId,
      tableNumber: tableNumber ?? this.tableNumber,
      pickupTime: pickupTime ?? this.pickupTime,
      deliveryAddress: deliveryAddress ?? this.deliveryAddress,
      guestName: guestName ?? this.guestName,
    );
  }
}

class OrderFlowNotifier extends StateNotifier<OrderFlowState> {
  OrderFlowNotifier() : super(OrderFlowState());

  void setMode(OrderMode mode) {
    // Reset other fields when mode changes
    state = OrderFlowState(mode: mode);
  }

  void setDineInData({required String tableId, required String tableNumber}) {
    state = state.copyWith(
      tableId: tableId, 
      tableNumber: tableNumber,
      guestName: null,
    );
  }

  void setGuestName(String guestName) {
    state = state.copyWith(
      guestName: guestName,
      tableId: null,
      tableNumber: null,
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
