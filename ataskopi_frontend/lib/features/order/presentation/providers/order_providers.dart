import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';
import 'package:ataskopi_frontend/core/providers/api_providers.dart';
import 'package:ataskopi_frontend/core/providers/auth_provider.dart';

class CartItem {
  final Product product;
  final List<ProductOptionValue> selectedOptions;
  final List<ProductModifier> selectedModifiers;
  final int quantity;
  final String? notes;

  CartItem({
    required this.product,
    this.selectedOptions = const [],
    this.selectedModifiers = const [],
    this.quantity = 1,
    this.notes,
  });

  double get totalPrice {
    double price = product.basePrice;
    for (final opt in selectedOptions) {
      price += opt.priceModifier;
    }
    for (final mod in selectedModifiers) {
      price += mod.price;
    }
    return price * quantity;
  }

  CartItem copyWith({int? quantity, String? notes}) {
    return CartItem(
      product: product,
      selectedOptions: selectedOptions,
      selectedModifiers: selectedModifiers,
      quantity: quantity ?? this.quantity,
      notes: notes ?? this.notes,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'productId': product.id,
      'quantity': quantity,
      'notes': notes,
      'options': selectedOptions.map((e) => e.id).toList(),
      'modifiers': selectedModifiers.map((e) => e.id).toList(),
    };
  }
}

class CartNotifier extends StateNotifier<List<CartItem>> {
  CartNotifier() : super([]);

  void addItem(CartItem item) {
    // Basic logic: if same product + options + modifiers, increment quantity
    // For simplicity now, just add as new item
    state = [...state, item];
  }

  void removeItem(int index) {
    state = [
      for (int i = 0; i < state.length; i++)
        if (i != index) state[i]
    ];
  }

  void updateQuantity(int index, int quantity) {
    if (quantity <= 0) {
      removeItem(index);
      return;
    }
    state = [
      for (int i = 0; i < state.length; i++)
        if (i == index) state[i].copyWith(quantity: quantity) else state[i]
    ];
  }

  void clear() => state = [];

  double get subtotal => state.fold(0, (sum, item) => sum + item.totalPrice);
}

final cartProvider = StateNotifierProvider<CartNotifier, List<CartItem>>((ref) {
  return CartNotifier();
});

final selectedVoucherProvider = StateProvider<Voucher?>((ref) => null);
final pointsToRedeemProvider = StateProvider<int>((ref) => 0);
final selectedPaymentMethodProvider = StateProvider<String>((ref) => 'qris');

final orderCalculationProvider = Provider((ref) {
  final cart = ref.watch(cartProvider);
  final voucher = ref.watch(selectedVoucherProvider);
  final points = ref.watch(pointsToRedeemProvider);
  
  double subtotal = cart.fold(0, (sum, item) => sum + item.totalPrice);
  double discount = 0;
  
  if (voucher != null) {
    if (voucher.discountType == 'amount' || voucher.discountType == 'fixed') {
      discount = voucher.discountValue;
    } else {
      // Percentage
      discount = subtotal * (voucher.discountValue / 100);
      // Cap at maxDiscount if exists
      if (voucher.maxDiscount != null && voucher.maxDiscount! > 0) {
        if (discount > voucher.maxDiscount!) {
          discount = voucher.maxDiscount!;
        }
      }
    }
  }

  // Cap discount at subtotal
  if (discount > subtotal) {
    discount = subtotal;
  }
  
  double pointsDiscount = points * 1000.0; // Assume 1 point = Rp 1000
  double tax = subtotal * 0.11;
  double total = subtotal + tax - discount - pointsDiscount;
  if (total < 0) total = 0;
  
  return {
    'subtotal': subtotal,
    'tax': tax,
    'discount': discount,
    'pointsDiscount': pointsDiscount,
    'total': total,
  };
});

final orderDetailsProvider = FutureProvider.family<Order?, String>((ref, orderId) async {
  final repository = ref.watch(orderRepositoryProvider);
  final response = await repository.getOrderDetails(orderId);
  if (response.success && response.data != null) {
    return response.data;
  }
  throw Exception(response.message.isNotEmpty ? response.message : 'Gagal mengambil detail pesanan');
});

final activeOrdersProvider = FutureProvider<List<Order>>((ref) async {
  final authState = ref.watch(authProvider); // Wait for auth
  if (authState.user == null && !authState.isLoading) return [];

  final repository = ref.watch(orderRepositoryProvider);
  // Added waiting_pickup and on_the_way for delivery orders
  final response = await repository.getOrderHistory(status: 'pending,preparing,ready,waiting_pickup,on_the_way');
  if (response.success && response.data != null) {
    return response.data!;
  }
  throw Exception(response.message.isNotEmpty ? response.message : 'Failed to load active orders');
});

final historyOrdersProvider = FutureProvider<List<Order>>((ref) async {
  final authState = ref.watch(authProvider); // Wait for auth
  if (authState.user == null && !authState.isLoading) return [];

  final repository = ref.watch(orderRepositoryProvider);
  final response = await repository.getDedicatedOrderHistory();
  if (response.success && response.data != null) {
    return response.data!;
  }
  throw Exception(response.message.isNotEmpty ? response.message : 'Failed to load history');
});
