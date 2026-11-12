import 'package:ataskopi_pos/features/catalog/data/catalog.dart';
import 'package:ataskopi_pos/features/sale/domain/cart.dart';
import 'package:ataskopi_pos/features/sale/domain/local_order.dart';
import 'package:ataskopi_pos/features/sale/presentation/payment_sheet.dart';
import 'package:flutter_test/flutter_test.dart';

Product latte() => Product.fromJson({
      'id': 'p1',
      'categoryId': 'c1',
      'name': 'Latte',
      'basePrice': 20000,
      'isAvailable': true,
      'soldLast30Days': 3,
      'channelPrices': {'grab': 26000},
      'options': [
        {
          'id': 'o1',
          'name': 'Ukuran',
          'minSelect': 1,
          'maxSelect': 1,
          'values': [
            {'id': 'v1', 'name': 'Regular', 'priceModifier': 0, 'isDefault': true},
            {'id': 'v2', 'name': 'Large', 'priceModifier': 5000, 'isDefault': false},
          ],
        },
      ],
      'modifiers': [
        {'id': 'm1', 'name': 'Extra shot', 'price': 4000},
      ],
    });

void main() {
  group('buildLine', () {
    test('adds option and modifier prices to the base price', () {
      final product = latte();
      final line = buildLine(
        product,
        channel: 'walk_in',
        options: [(product.options.first, product.options.first.values.last)],
        modifiers: product.modifiers,
      );
      expect(line.unitPrice, 29000);
      expect(line.extras, ['Large', 'Extra shot']);
    });

    test('uses the channel price when one exists', () {
      expect(buildLine(latte(), channel: 'grab').unitPrice, 26000);
      expect(buildLine(latte(), channel: 'shopeefood').unitPrice, 20000);
    });

    test('a single tap picks the default of each required option', () {
      final picked = defaultOptions(latte());
      expect(picked.single.$2.name, 'Regular');
    });

    test('only what the customer changed counts as a request', () {
      final product = latte();
      final standard = buildLine(product, channel: 'walk_in', options: defaultOptions(product));
      final large = buildLine(
        product,
        channel: 'walk_in',
        options: [(product.options.first, product.options.first.values.last)],
        modifiers: product.modifiers,
      );

      expect(standard.extras, ['Regular']);
      expect(standard.requests, isEmpty);
      expect(large.requests, ['Large', 'Extra shot']);
      expect(CartLine.fromJson(standard.toJson()).requests, isEmpty);
    });
  });

  group('Cart', () {
    final regular = buildLine(latte(), channel: 'walk_in', options: defaultOptions(latte()));

    test('an edited line replaces the old one and stacks onto a twin', () {
      final product = latte();
      final large = buildLine(product, channel: 'walk_in', options: [(product.options.first, product.options.first.values.last)]);
      final cart = const Cart().add(regular).add(large);

      final edited = cart.replace(regular.key, large.withQuantity(1));
      expect(edited.lines.single.key, large.key);
      expect(edited.lines.single.quantity, 2);
    });

    test('stacks identical drinks into one line', () {
      final cart = const Cart().add(regular).add(regular);
      expect(cart.lines, hasLength(1));
      expect(cart.itemCount, 2);
      expect(cart.subtotal, 40000);
    });

    test('keeps different notes apart', () {
      final noSugar = buildLine(latte(), channel: 'walk_in', notes: 'tanpa gula');
      expect(const Cart().add(regular).add(noSugar).lines, hasLength(2));
    });

    test('drops a line when its quantity reaches zero', () {
      final cart = const Cart().add(regular).changeQuantity(regular.key, -1);
      expect(cart.isEmpty, isTrue);
    });

    test('adds no tax while tax is off', () {
      final cart = const Cart().add(regular);
      expect(cart.tax(false), 0);
      expect(cart.total(false), 20000);
    });

    test('total always equals subtotal minus discount plus tax', () {
      final cart = const Cart().add(regular).copyWith(discount: 3333);
      expect(cart.total(true), cart.subtotal - cart.discount + cart.tax(true));
    });

    test('survives being saved and restored', () {
      final cart = const Cart().add(regular).copyWith(guestName: 'Budi');
      final restored = Cart.fromJson(cart.toJson());
      expect(restored.subtotal, cart.subtotal);
      expect(restored.guestName, 'Budi');
      expect(restored.lines.single.key, regular.key);
    });
  });

  group('matchesMenuSearch', () {
    test('finds plain text', () => expect(matchesMenuSearch('Matcha Latte', 'latte'), isTrue));
    test('finds a nickname', () => expect(matchesMenuSearch('Kopi Susu', 'kopsu'), isTrue));
    test('skips unrelated menu', () => expect(matchesMenuSearch('Matcha Latte', 'kopsu'), isFalse));
  });

  test('LocalOrder tracks what is left to pay', () {
    final order = LocalOrder(
      clientOrderId: 'o',
      shiftRef: 's',
      queueNumber: 'A-001',
      orderType: 'pickup',
      channel: 'walk_in',
      lines: const [],
      subtotal: 20000,
      discount: 0,
      tax: 0,
      total: 20000,
      createdAt: DateTime(2026),
      payments: [
        LocalPayment(clientPaymentId: 'p', method: 'cash', amount: 5000, paidAt: DateTime(2026)),
      ],
    );
    expect(order.remaining, 15000);
    expect(order.isPaid, isFalse);
    expect(LocalOrder.fromJson(order.toJson()).paid, 5000);
  });

  group('cash suggestions', () {
    test('an odd bill offers the next ten, fifty and hundred thousand', () {
      expect(cashSuggestions(26000), [30000, 50000, 100000]);
      expect(cashSuggestions(26500), [30000, 50000, 100000]);
      expect(cashSuggestions(123000), [130000, 150000, 200000]);
    });

    test('a round bill skips its own amount, which "Uang pas" covers', () {
      expect(cashSuggestions(30000), [50000, 100000]);
      expect(cashSuggestions(50000), [100000]);
      expect(cashSuggestions(100000), isEmpty);
      expect(cashSuggestions(0), isEmpty);
    });

    test('short labels', () {
      expect(shortRupiah(30000), '30rb');
      expect(shortRupiah(4500), '4.500');
    });
  });
}
