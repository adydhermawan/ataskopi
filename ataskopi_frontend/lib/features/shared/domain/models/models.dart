import 'package:ataskopi_frontend/core/api/api_config.dart';

enum OrderMode { 
  dineIn, 
  pickup, 
  delivery 
}

extension OrderModeExtension on OrderMode {
  String get value {
    switch (this) {
      case OrderMode.dineIn: return 'dine_in';
      case OrderMode.pickup: return 'pickup';
      case OrderMode.delivery: return 'delivery';
    }
  }

  static OrderMode fromString(String value) {
    switch (value) {
      case 'dine_in': return OrderMode.dineIn;
      case 'pickup': return OrderMode.pickup;
      case 'delivery': return OrderMode.delivery;
      default: return OrderMode.dineIn;
    }
  }
}

class User {
  final String id;
  final String name;
  final String phone;
  final String? email;
  final String role;
  final int loyaltyPoints;
  final String? currentTierId;

  const User({
    required this.id,
    required this.name,
    required this.phone,
    this.email,
    required this.role,
    this.loyaltyPoints = 0,
    this.currentTierId,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      name: json['name'],
      phone: json['phone'],
      email: json['email'],
      role: json['role'] ?? 'customer',
      loyaltyPoints: json['loyaltyPoints'] ?? 0,
      currentTierId: json['currentTierId'],
    );
  }
}

class ProductCategory {
  final String id;
  final String name;
  final String slug;
  final int productCount;

  const ProductCategory({
    required this.id,
    required this.name,
    required this.slug,
    this.productCount = 0,
  });

  factory ProductCategory.fromJson(Map<String, dynamic> json) {
    return ProductCategory(
      id: json['id'],
      name: json['name'],
      slug: json['slug'] ?? '',
      productCount: json['_count']?['products'] ?? 0,
    );
  }
}

class Product {
  final String id;
  final String name;
  final String description;
  final double basePrice;
  final String? imageUrl;
  final bool isRecommended;
  final bool isAvailable;
  final String? categoryId;
  final List<ProductOption> options;
  final List<ProductModifier> modifiers;

  const Product({
    required this.id,
    required this.name,
    required this.description,
    required this.basePrice,
    this.categoryId,
    this.imageUrl,
    this.isRecommended = false,
    this.isAvailable = true,
    this.options = const [],
    this.modifiers = const [],
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'],
      name: json['name'],
      description: json['description'] ?? '',
      basePrice: (json['basePrice'] as num).toDouble(),
      categoryId: json['categoryId'],
      imageUrl: ApiConfig.fullImageUrl(json['imageUrl']),
      isRecommended: json['isRecommended'] ?? false,
      isAvailable: json['isAvailable'] ?? true,
      options: (json['options'] as List? ?? [])
          .map((e) => ProductOption.fromJson(e))
          .toList(),
      modifiers: (json['modifiers'] as List? ?? [])
          .map((e) => ProductModifier.fromJson(e))
          .toList(),
    );
  }
}

class ProductOption {
  final String id;
  final String name;
  final int minSelect;
  final int maxSelect;
  final List<ProductOptionValue> values;

  const ProductOption({
    required this.id,
    required this.name,
    this.minSelect = 1,
    this.maxSelect = 1,
    this.values = const [],
  });

  factory ProductOption.fromJson(Map<String, dynamic> json) {
    return ProductOption(
      id: json['id'],
      name: json['name'],
      minSelect: json['minSelect'] ?? 1,
      maxSelect: json['maxSelect'] ?? 1,
      values: (json['values'] as List? ?? [])
          .map((e) => ProductOptionValue.fromJson(e))
          .toList(),
    );
  }
}

class ProductOptionValue {
  final String id;
  final String name;
  final double priceModifier;
  final bool isDefault;

  const ProductOptionValue({
    required this.id,
    required this.name,
    required this.priceModifier,
    this.isDefault = false,
  });

  factory ProductOptionValue.fromJson(Map<String, dynamic> json) {
    return ProductOptionValue(
      id: json['id'],
      name: json['name'],
      priceModifier: (json['priceModifier'] as num).toDouble(),
      isDefault: json['isDefault'] ?? false,
    );
  }
}

class ProductModifier {
  final String id;
  final String name;
  final double price;
  final bool isAvailable;

  const ProductModifier({
    required this.id,
    required this.name,
    required this.price,
    this.isAvailable = true,
  });

  factory ProductModifier.fromJson(Map<String, dynamic> json) {
    return ProductModifier(
      id: json['id'],
      name: json['name'],
      price: (json['price'] as num).toDouble(),
      isAvailable: json['isAvailable'] ?? true,
    );
  }
}

class Store {
  final String id;
  final String name;
  final String address;
  final String? phone;
  final double? latitude;
  final double? longitude;
  final String? openingHours;
  final double? distance;
  final bool isActive;

  const Store({
    required this.id,
    required this.name,
    required this.address,
    this.phone,
    this.latitude,
    this.longitude,
    this.openingHours,
    this.distance,
    this.isActive = true,
  });

  factory Store.fromJson(Map<String, dynamic> json) {
    return Store(
      id: json['id'],
      name: json['name'],
      address: json['address'] ?? '',
      phone: json['phone'],
      latitude: json['latitude'] != null ? (json['latitude'] as num).toDouble() : null,
      longitude: json['longitude'] != null ? (json['longitude'] as num).toDouble() : null,
      openingHours: json['openingHours'],
      distance: json['distance'] != null ? (json['distance'] as num).toDouble() : null,
      isActive: json['isActive'] ?? true,
    );
  }
}

class Order {
  final String id;
  final String orderNumber;
  final String orderType;
  final String paymentStatus;
  final String orderStatus;
  final double subtotal;
  final double tax;
  final double discount;
  final double pointsDiscount;
  final int earnedPoints;
  final double total;
  final DateTime createdAt;
  final List<OrderItem> items;
  final Store? outlet;
  final TableModel? table;
  final UserAddress? deliveryAddress;
  final String? paymentMethod;

  const Order({
    required this.id,
    required this.orderNumber,
    required this.orderType,
    required this.paymentStatus,
    required this.orderStatus,
    required this.subtotal,
    required this.tax,
    required this.discount,
    required this.pointsDiscount,
    required this.earnedPoints,
    required this.total,
    required this.createdAt,
    this.items = const [],
    this.outlet,
    this.table,
    this.deliveryAddress,
    this.paymentMethod,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'],
      orderNumber: json['orderNumber'] ?? '',
      orderType: json['orderType'] ?? '',
      paymentStatus: json['paymentStatus'] ?? '',
      orderStatus: json['orderStatus'] ?? '',
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0.0,
      tax: (json['tax'] as num?)?.toDouble() ?? 0.0,
      discount: (json['discount'] as num?)?.toDouble() ?? 0.0,
      pointsDiscount: (json['pointsDiscount'] as num?)?.toDouble() ?? 0.0,
      earnedPoints: json['earnedPoints'] ?? 0,
      total: (json['total'] as num?)?.toDouble() ?? 0.0,
      createdAt: DateTime.parse(json['createdAt']),
      items: (json['items'] as List? ?? [])
          .map((e) => OrderItem.fromJson(e))
          .toList(),
      outlet: json['outlet'] != null ? Store.fromJson(json['outlet']) : null,
      table: json['table'] != null ? TableModel.fromJson(json['table']) : null,
      deliveryAddress: json['deliveryAddress'] != null ? UserAddress.fromJson(json['deliveryAddress']) : null,
      paymentMethod: json['paymentMethod'],
    );
  }
}

class OrderItem {
  final String id;
  final String productId;
  final String productName;
  final int quantity;
  final double unitPrice;
  final String? notes;
  final String? productImageUrl;
  final List<String> selectedOptions;
  final List<String> selectedModifiers;

  const OrderItem({
    required this.id,
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
    this.notes,
    this.productImageUrl,
    this.selectedOptions = const [],
    this.selectedModifiers = const [],
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id'],
      productId: json['productId'],
      productName: json['product']?['name'] ?? '',
      quantity: json['quantity'] ?? 1,
      unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0.0,
      notes: json['notes'],
      productImageUrl: ApiConfig.fullImageUrl(json['product']?['imageUrl']),
      selectedOptions: (json['selectedOptions'] as List? ?? [])
          .map((e) => e['value']?['name'] as String)
          .toList(),
      selectedModifiers: (json['selectedModifiers'] as List? ?? [])
          .map((e) => e['modifier']?['name'] as String)
          .toList(),
    );
  }
}

class LoyaltyInfo {
  final int loyaltyPoints;
  final double totalSpent;
  final Tier? currentTier;
  final TierProgress? progressToNextTier;
  final List<LoyaltyTransaction> recentTransactions;
  final LoyaltySettings? loyaltySettings;
  final List<Tier> allTiers;

  const LoyaltyInfo({
    required this.loyaltyPoints,
    required this.totalSpent,
    this.currentTier,
    this.progressToNextTier,
    this.recentTransactions = const [],
    this.loyaltySettings,
    this.allTiers = const [],
  });

  factory LoyaltyInfo.fromJson(Map<String, dynamic> json) {
    return LoyaltyInfo(
      loyaltyPoints: json['loyaltyPoints'] ?? 0,
      totalSpent: (json['totalSpent'] as num).toDouble(),
      currentTier: json['currentTier'] != null ? Tier.fromJson(json['currentTier']) : null,
      progressToNextTier: json['progressToNextTier'] != null ? TierProgress.fromJson(json['progressToNextTier']) : null,
      recentTransactions: (json['recentTransactions'] as List? ?? [])
          .map((e) => LoyaltyTransaction.fromJson(e))
          .toList(),
      loyaltySettings: json['loyaltySettings'] != null ? LoyaltySettings.fromJson(json['loyaltySettings']) : null,
      allTiers: (json['allTiers'] as List? ?? [])
          .map((e) => Tier.fromJson(e))
          .toList(),
    );
  }
}

class LoyaltySettings {
  final bool isEnabled;
  final double pointValueIdr;
  final int minPointsToRedeem;
  final int? maxPointsPerTransaction;
  final int maxRedemptionPercentage;

  const LoyaltySettings({
    required this.isEnabled,
    required this.pointValueIdr,
    required this.minPointsToRedeem,
    this.maxPointsPerTransaction,
    this.maxRedemptionPercentage = 50,
  });

  factory LoyaltySettings.fromJson(Map<String, dynamic> json) {
    return LoyaltySettings(
      isEnabled: json['isEnabled'] ?? true,
      pointValueIdr: (json['pointValueIdr'] as num?)?.toDouble() ?? 1000.0,
      minPointsToRedeem: json['minPointsToRedeem'] ?? 10,
      maxPointsPerTransaction: json['maxPointsPerTransaction'],
      maxRedemptionPercentage: json['maxRedemptionPercentage'] ?? 50,
    );
  }
}

class Tier {
  final String id;
  final String name;
  final int minPoints;
  final String? benefitsDescription;
  final bool isCurrentTier;

  const Tier({
    required this.id,
    required this.name,
    required this.minPoints,
    this.benefitsDescription,
    this.isCurrentTier = false,
  });

  factory Tier.fromJson(Map<String, dynamic> json) {
    return Tier(
      id: json['id'],
      name: json['tierName'] ?? json['name'] ?? '',
      minPoints: json['minPoints'] ?? json['minSpend']?.toInt() ?? 0,
      benefitsDescription: json['benefitsDescription'] ?? json['benefits'],
      isCurrentTier: json['isCurrentTier'] ?? false,
    );
  }
}

class TierProgress {
  final Tier? nextTier;
  final double currentSpend;
  final double remainingSpend;
  final double progressPercentage;

  const TierProgress({
    this.nextTier,
    required this.currentSpend,
    required this.remainingSpend,
    required this.progressPercentage,
  });

  factory TierProgress.fromJson(Map<String, dynamic> json) {
    return TierProgress(
      nextTier: json['nextTier'] != null ? Tier.fromJson(json['nextTier']) : null,
      currentSpend: (json['currentSpend'] as num?)?.toDouble() ?? 0.0,
      remainingSpend: (json['remainingSpend'] as num?)?.toDouble() ?? 0.0,
      progressPercentage: (json['progressPercentage'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class LoyaltyTransaction {
  final String id;
  final String type; // earn, redeem
  final int points;
  final String description;
  final DateTime createdAt;

  const LoyaltyTransaction({
    required this.id,
    required this.type,
    required this.points,
    required this.description,
    required this.createdAt,
  });

  factory LoyaltyTransaction.fromJson(Map<String, dynamic> json) {
    return LoyaltyTransaction(
      id: json['id'],
      type: json['transactionType'] ?? json['type'] ?? 'earned',
      points: json['pointsChange'] ?? json['points'] ?? 0,
      description: json['notes'] ?? json['description'] ?? '',
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}

class Voucher {
  final String id;
  final String code;
  final String name;
  final String description;
  final String discountType;
  final double discountValue;
  final double? maxDiscount;
  final double? minOrder;
  final int? pointsRequired; // mapped from pointCost
  final bool isAvailable;
  final String? userVoucherId; // For owned vouchers
  final DateTime? validUntil;
  final String? status;
  final List<String> termsAndConditions;

  const Voucher({
    required this.id,
    required this.code,
    required this.name,
    required this.description,
    required this.discountType,
    required this.discountValue,
    this.maxDiscount,
    this.minOrder,
    this.pointsRequired,
    required this.isAvailable,
    this.userVoucherId,
    this.validUntil,
    this.status,
    this.termsAndConditions = const [],
  });

  factory Voucher.fromJson(Map<String, dynamic> json) {
    return Voucher(
      id: json['id'],
      code: json['code'],
      name: json['name'] ?? json['code'],
      description: json['description'] ?? '',
      discountType: json['discountType'],
      discountValue: (json['discountValue'] as num).toDouble(),
      maxDiscount: json['maxDiscount'] != null ? (json['maxDiscount'] as num).toDouble() : null,
      minOrder: json['minOrder'] != null ? (json['minOrder'] as num).toDouble() : null,
      pointsRequired: json['pointCost'], // Map pointCost to pointsRequired
      isAvailable: json['status'] is String 
          ? json['status'] == 'active' 
          : (json['status']?['isAvailable'] ?? true),
      userVoucherId: json['userVoucherId'],
      validUntil: json['validUntil'] != null ? DateTime.parse(json['validUntil']) : null,
      status: json['status'] is String ? json['status'] : null,
      termsAndConditions: (json['termsAndConditions'] as List? ?? []).map((e) => e as String).toList(),
    );
  }
}

class Banner {
  final String id;
  final String title;
  final String? description;
  final String bannerUrl;
  final String? linkUrl;

  const Banner({
    required this.id,
    required this.title,
    this.description,
    required this.bannerUrl,
    this.linkUrl,
  });

  factory Banner.fromJson(Map<String, dynamic> json) {
    return Banner(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      bannerUrl: json['bannerUrl'],
      linkUrl: json['linkUrl'],
    );
  }
}

class NotificationModel {
  final String id;
  final String category;
  final String title;
  final String message;
  final bool isRead;
  final DateTime createdAt;

  const NotificationModel({
    required this.id,
    required this.category,
    required this.title,
    required this.message,
    required this.isRead,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'],
      category: json['category'] ?? 'info',
      title: json['title'],
      message: json['message'] ?? '',
      isRead: json['isRead'] ?? false,
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}

class TableModel {
  final String id;
  final String tableNumber;
  final String qrCode;
  final bool isOccupied;
  final Store? outlet;

  const TableModel({
    required this.id,
    required this.tableNumber,
    required this.qrCode,
    required this.isOccupied,
    this.outlet,
  });

  factory TableModel.fromJson(Map<String, dynamic> json) {
    return TableModel(
      id: json['id'],
      tableNumber: json['tableNumber'],
      qrCode: json['qrCode'] ?? '',
      isOccupied: json['isOccupied'] ?? false,
      outlet: json['outlet'] != null ? Store.fromJson(json['outlet']) : null,
    );
  }
}

class UserAddress {
  final String id;
  final String label;
  final String address;
  final double latitude;
  final double longitude;
  final String? notes;
  final bool isDefault;

  const UserAddress({
    required this.id,
    required this.label,
    required this.address,
    required this.latitude,
    required this.longitude,
    this.notes,
    this.isDefault = false,
  });

  factory UserAddress.fromJson(Map<String, dynamic> json) {
    return UserAddress(
      id: json['id'] ?? '',
      label: json['label'] ?? 'Alamat Pengiriman',
      address: json['address'] ?? '',
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      notes: json['notes'],
      isDefault: json['isDefault'] ?? false,
    );
  }
}
