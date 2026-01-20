enum OrderMode { dineIn, pickup, delivery }

class ProductCategory {
  final String id;
  final String name;
  final String? icon;

  const ProductCategory({
    required this.id,
    required this.name,
    this.icon,
  });
}

class Product {
  final String id;
  final String name;
  final String description;
  final double basePrice;
  final String imageUrl;
  final String categoryId;
  final bool isRecommended;
  final List<ProductVariant> variants;

  const Product({
    required this.id,
    required this.name,
    required this.description,
    required this.basePrice,
    required this.imageUrl,
    required this.categoryId,
    this.isRecommended = false,
    this.variants = const [],
  });
}

class ProductVariant {
  final String id;
  final String name;
  final double priceModifier;

  const ProductVariant({
    required this.id,
    required this.name,
    required this.priceModifier,
  });
}

class Store {
  final String id;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final bool isOpen;

  const Store({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    this.isOpen = true,
  });
}
