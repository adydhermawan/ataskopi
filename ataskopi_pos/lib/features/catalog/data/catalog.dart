int _money(Object? value) => (value as num? ?? 0).round();

class OptionValue {
  OptionValue.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        name = json['name'] as String,
        priceModifier = _money(json['priceModifier']),
        isDefault = json['isDefault'] == true;

  final String id;
  final String name;
  final int priceModifier;
  final bool isDefault;
}

class ProductOption {
  ProductOption.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        name = json['name'] as String,
        minSelect = json['minSelect'] as int? ?? 0,
        maxSelect = json['maxSelect'] as int? ?? 1,
        values = (json['values'] as List)
            .map((value) => OptionValue.fromJson(value as Map<String, dynamic>))
            .toList();

  final String id;
  final String name;
  final int minSelect;
  final int maxSelect;
  final List<OptionValue> values;
}

class ProductModifier {
  ProductModifier.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        name = json['name'] as String,
        price = _money(json['price']);

  final String id;
  final String name;
  final int price;
}

class Product {
  Product.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        categoryId = json['categoryId'] as String,
        name = json['name'] as String,
        basePrice = _money(json['basePrice']),
        isAvailable = json['isAvailable'] != false,
        soldLast30Days = json['soldLast30Days'] as int? ?? 0,
        channelPrices = (json['channelPrices'] as Map<String, dynamic>? ?? const {})
            .map((channel, price) => MapEntry(channel, _money(price))),
        options = (json['options'] as List? ?? const [])
            .map((option) => ProductOption.fromJson(option as Map<String, dynamic>))
            .toList(),
        modifiers = (json['modifiers'] as List? ?? const [])
            .map((modifier) => ProductModifier.fromJson(modifier as Map<String, dynamic>))
            .toList();

  final String id;
  final String categoryId;
  final String name;
  final int basePrice;
  final bool isAvailable;
  final int soldLast30Days;
  final Map<String, int> channelPrices;
  final List<ProductOption> options;
  final List<ProductModifier> modifiers;

  int priceFor(String channel) => channelPrices[channel] ?? basePrice;

  bool get hasChoices => options.isNotEmpty || modifiers.isNotEmpty;
}

class Category {
  Category.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        name = json['name'] as String;

  final String id;
  final String name;
}

class Catalog {
  Catalog.fromJson(Map<String, dynamic> json)
      : outletId = json['outlet']['id'] as String,
        outletName = json['outlet']['name'] as String,
        onlineOrdersPaused = json['outlet']['onlineOrdersPaused'] == true,
        taxEnabled = json['settings']['taxEnabled'] != false,
        qrisUrl = json['settings']['qrisQrCodeUrl'] as String?,
        categories = (json['categories'] as List)
            .map((category) => Category.fromJson(category as Map<String, dynamic>))
            .toList(),
        products = (json['products'] as List)
            .map((product) => Product.fromJson(product as Map<String, dynamic>))
            .toList();

  final String outletId;
  final String outletName;
  final bool onlineOrdersPaused;
  final bool taxEnabled;
  final String? qrisUrl;
  final List<Category> categories;
  final List<Product> products;

  /// Best sellers first, so the busiest tiles sit at the top of the grid.
  List<String> bestSellerOrder() {
    final ranked = [...products]
      ..sort((a, b) {
        final bySales = b.soldLast30Days.compareTo(a.soldLast30Days);
        return bySales != 0 ? bySales : a.name.compareTo(b.name);
      });
    return ranked.map((product) => product.id).toList();
  }
}

/// Matches plain text first, then letters in order, so "kopsu" finds Kopi Susu.
bool matchesMenuSearch(String name, String query) {
  final target = name.toLowerCase();
  final wanted = query.toLowerCase().replaceAll(' ', '');
  if (wanted.isEmpty || target.contains(query.toLowerCase().trim())) return true;

  var position = 0;
  for (final letter in wanted.split('')) {
    position = target.indexOf(letter, position);
    if (position < 0) return false;
    position++;
  }
  return true;
}
