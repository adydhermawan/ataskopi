import '../../catalog/data/catalog.dart';

const taxRate = 0.11;

class SelectedOption {
  const SelectedOption({required this.optionId, required this.valueId, required this.label, this.isDefault = false});

  SelectedOption.fromJson(Map<String, dynamic> json)
      : optionId = json['optionId'] as String,
        valueId = json['valueId'] as String,
        label = json['label'] as String,
        isDefault = json['isDefault'] as bool? ?? false;

  final String optionId;
  final String valueId;
  final String label;

  /// The choice a single tap makes anyway, so receipts leave it out.
  final bool isDefault;

  Map<String, dynamic> toJson() => {'optionId': optionId, 'valueId': valueId, 'label': label, 'isDefault': isDefault};
}

class SelectedModifier {
  const SelectedModifier({required this.modifierId, required this.quantity, required this.label});

  SelectedModifier.fromJson(Map<String, dynamic> json)
      : modifierId = json['modifierId'] as String,
        quantity = json['quantity'] as int,
        label = json['label'] as String;

  final String modifierId;
  final int quantity;
  final String label;

  Map<String, dynamic> toJson() => {'modifierId': modifierId, 'quantity': quantity, 'label': label};
}

class CartLine {
  const CartLine({
    required this.productId,
    required this.name,
    required this.quantity,
    required this.unitPrice,
    this.options = const [],
    this.modifiers = const [],
    this.notes,
  });

  CartLine.fromJson(Map<String, dynamic> json)
      : productId = json['productId'] as String,
        name = json['name'] as String,
        quantity = json['quantity'] as int,
        unitPrice = json['unitPrice'] as int,
        options = (json['options'] as List)
            .map((option) => SelectedOption.fromJson(option as Map<String, dynamic>))
            .toList(),
        modifiers = (json['modifiers'] as List)
            .map((modifier) => SelectedModifier.fromJson(modifier as Map<String, dynamic>))
            .toList(),
        notes = json['notes'] as String?;

  final String productId;
  final String name;
  final int quantity;
  final int unitPrice;
  final List<SelectedOption> options;
  final List<SelectedModifier> modifiers;
  final String? notes;

  int get lineTotal => unitPrice * quantity;

  /// Lines with the same key are the same drink and stack into one row.
  String get key => [
        productId,
        ...options.map((option) => option.valueId),
        ...modifiers.map((modifier) => '${modifier.modifierId}x${modifier.quantity}'),
        notes ?? '',
      ].join('|');

  List<String> get extras => [
        ...options.map((option) => option.label),
        ...modifiers.map((modifier) => modifier.label),
      ];

  /// What the customer asked for beyond the standard drink, such as less
  /// sugar or an extra shot.
  List<String> get requests => [
        ...options.where((option) => !option.isDefault).map((option) => option.label),
        ...modifiers.map((modifier) => modifier.label),
      ];

  CartLine withQuantity(int value) => CartLine(
        productId: productId,
        name: name,
        quantity: value,
        unitPrice: unitPrice,
        options: options,
        modifiers: modifiers,
        notes: notes,
      );

  Map<String, dynamic> toJson() => {
        'productId': productId,
        'name': name,
        'quantity': quantity,
        'unitPrice': unitPrice,
        'options': options.map((option) => option.toJson()).toList(),
        'modifiers': modifiers.map((modifier) => modifier.toJson()).toList(),
        'notes': notes,
      };

  /// The shape the server validates against its own price calculation.
  Map<String, dynamic> toSyncJson() => {
        'productId': productId,
        'quantity': quantity,
        'unitPrice': unitPrice,
        'notes': notes,
        'selectedOptions': options
            .map((option) => {'optionId': option.optionId, 'valueId': option.valueId})
            .toList(),
        'selectedModifiers': modifiers
            .map((modifier) => {'modifierId': modifier.modifierId, 'quantity': modifier.quantity})
            .toList(),
      };
}

/// Builds a line with the choices made, adding up the same way the server does.
CartLine buildLine(
  Product product, {
  required String channel,
  List<(ProductOption, OptionValue)> options = const [],
  List<ProductModifier> modifiers = const [],
  int quantity = 1,
  String? notes,
}) {
  var unitPrice = product.priceFor(channel);
  for (final (_, value) in options) {
    unitPrice += value.priceModifier;
  }
  for (final modifier in modifiers) {
    unitPrice += modifier.price;
  }

  return CartLine(
    productId: product.id,
    name: product.name,
    quantity: quantity,
    unitPrice: unitPrice,
    notes: notes,
    options: [
      for (final (option, value) in options)
        SelectedOption(
          optionId: option.id,
          valueId: value.id,
          label: value.name,
          isDefault: value.id == defaultValue(option)?.id,
        ),
    ],
    modifiers: [
      for (final modifier in modifiers)
        SelectedModifier(modifierId: modifier.id, quantity: 1, label: modifier.name),
    ],
  );
}

/// The value a single tap picks for a required option.
OptionValue? defaultValue(ProductOption option) {
  if (option.minSelect == 0 || option.values.isEmpty) return null;
  return option.values.firstWhere((value) => value.isDefault, orElse: () => option.values.first);
}

/// The choices a single tap uses: each required option's default value.
List<(ProductOption, OptionValue)> defaultOptions(Product product) => [
      for (final option in product.options)
        if (defaultValue(option) case final value?) (option, value),
    ];

class Cart {
  const Cart({
    this.lines = const [],
    this.channel = 'walk_in',
    this.orderType = 'pickup',
    this.guestName,
    this.discount = 0,
  });

  Cart.fromJson(Map<String, dynamic> json)
      : lines = (json['lines'] as List)
            .map((line) => CartLine.fromJson(line as Map<String, dynamic>))
            .toList(),
        channel = json['channel'] as String,
        orderType = json['orderType'] as String,
        guestName = json['guestName'] as String?,
        discount = json['discount'] as int? ?? 0;

  final List<CartLine> lines;
  final String channel;
  final String orderType;
  final String? guestName;
  final int discount;

  bool get isEmpty => lines.isEmpty;

  int get itemCount => lines.fold(0, (sum, line) => sum + line.quantity);

  int get subtotal => lines.fold(0, (sum, line) => sum + line.lineTotal);

  int tax(bool taxEnabled) => taxEnabled ? (subtotal * taxRate).round() : 0;

  int total(bool taxEnabled) => subtotal - discount + tax(taxEnabled);

  Cart copyWith({List<CartLine>? lines, String? channel, String? orderType, String? guestName, int? discount}) =>
      Cart(
        lines: lines ?? this.lines,
        channel: channel ?? this.channel,
        orderType: orderType ?? this.orderType,
        guestName: guestName ?? this.guestName,
        discount: discount ?? this.discount,
      );

  Cart add(CartLine line) {
    final index = lines.indexWhere((existing) => existing.key == line.key);
    if (index < 0) return copyWith(lines: [...lines, line]);

    final updated = [...lines];
    updated[index] = updated[index].withQuantity(updated[index].quantity + line.quantity);
    return copyWith(lines: updated);
  }

  /// Swaps a line for its edited version, stacking it onto an identical line.
  Cart replace(String key, CartLine line) =>
      copyWith(lines: [for (final existing in lines) if (existing.key != key) existing]).add(line);

  Cart changeQuantity(String key, int delta) {
    final updated = <CartLine>[];
    for (final line in lines) {
      if (line.key != key) {
        updated.add(line);
      } else if (line.quantity + delta > 0) {
        updated.add(line.withQuantity(line.quantity + delta));
      }
    }
    return copyWith(lines: updated);
  }

  Map<String, dynamic> toJson() => {
        'lines': lines.map((line) => line.toJson()).toList(),
        'channel': channel,
        'orderType': orderType,
        'guestName': guestName,
        'discount': discount,
      };
}
