import '../domain/models/models.dart';

class MockData {
  static const List<ProductCategory> categories = [
    ProductCategory(id: '1', name: 'Coffee', icon: '☕'),
    ProductCategory(id: '2', name: 'Non-Coffee', icon: '🥤'),
    ProductCategory(id: '3', name: 'Food', icon: '🥐'),
    ProductCategory(id: '4', name: 'Beverage', icon: '🍹'),
  ];

  static const List<Product> products = [
    Product(
      id: '101',
      name: 'Caramel Macchiato',
      description: 'Freshly steamed milk with vanilla-flavored syrup marked with espresso and topped with a caramel drizzle.',
      basePrice: 35000,
      imageUrl: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?q=80&w=375&auto=format&fit=crop',
      categoryId: '1',
      isRecommended: true,
      variants: [
        ProductVariant(id: 'v1', name: 'Hot', priceModifier: 0),
        ProductVariant(id: 'v2', name: 'Ice', priceModifier: 2000),
      ],
    ),
    Product(
      id: '102',
      name: 'Ice Matcha Latte',
      description: 'Smooth and creamy matcha sweetened with sugar and served over ice.',
      basePrice: 32000,
      imageUrl: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?q=80&w=375&auto=format&fit=crop',
      categoryId: '2',
      isRecommended: true,
      variants: [
        ProductVariant(id: 'v3', name: 'Regular', priceModifier: 0),
      ],
    ),
    Product(
      id: '103',
      name: 'Iced Americano',
      description: 'Espresso shots topped with cold water produce a light layer of crema, then served over ice.',
      basePrice: 25000,
      imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=375&auto=format&fit=crop',
      categoryId: '1',
      variants: [
        ProductVariant(id: 'v4', name: 'Regular', priceModifier: 0),
      ],
    ),
    Product(
      id: '104',
      name: 'Croissant Butter',
      description: 'A flaky, buttery, and golden-brown French pastry.',
      basePrice: 22000,
      imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=375&auto=format&fit=crop',
      categoryId: '3',
    ),
  ];

  static const Store defaultStore = Store(
    id: 's1',
    name: 'AtasKopi Central Park',
    address: 'Lantai Ground, Central Park Mall, Jakarta Barat',
    latitude: -6.1774,
    longitude: 106.7907,
  );
}
