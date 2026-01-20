import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ataskopi_frontend/shared/widgets/app_top_bar.dart';
import 'package:ataskopi_frontend/features/menu/presentation/screens/menu_catalog_screen.dart';

class MenuRobot {
  final WidgetTester tester;

  MenuRobot(this.tester);

  Future<void> verifyScreenLoaded() async {
    print('[DESIGN_CHECK] [Menu Screen] [Screen Load] : Verifying...');
    expect(find.byType(MenuCatalogScreen), findsOneWidget, reason: 'Menu Catalog Screen not found');
    print('[DESIGN_CHECK] [Menu Screen] [Screen Load] : PASS');
  }

  Future<void> verifyHeader() async {
    print('[DESIGN_CHECK] [Menu Screen] [Header] : Verifying...');
    expect(find.widgetWithText(AppTopBar, 'Menu Utama'), findsOneWidget, reason: 'AppTopBar with title "Menu Utama" not found');
    print('[DESIGN_CHECK] [Menu Screen] [Header] : PASS');
  }

  Future<void> verifySearchBar() async {
    print('[DESIGN_CHECK] [Menu Screen] [Search Bar] : Verifying...');
    expect(find.text('Cari menu favoritmu...'), findsOneWidget, reason: 'Search bar hint text not found');
    expect(find.byIcon(Icons.search_rounded), findsOneWidget, reason: 'Search icon not found');
    print('[DESIGN_CHECK] [Menu Screen] [Search Bar] : PASS');
  }

  Future<void> verifyCategories() async {
    print('[DESIGN_CHECK] [Menu Screen] [Categories] : Verifying...');
    expect(find.text('Semua'), findsOneWidget);
    // Assuming MockData has categories like 'Coffee', 'Non-Coffee' etc. which might translate to specific texts.
    // We check for the horizontal scrolling list
    expect(find.byType(ListView), findsAtLeastNWidgets(1));
    print('[DESIGN_CHECK] [Menu Screen] [Categories] : PASS');
  }

  Future<void> verifyProductList() async {
    print('[DESIGN_CHECK] [Menu Screen] [Product List] : Verifying...');
    // Check if there are products listed.
    // We look for the "add" button icon as a proxy for a product card being present
    expect(find.byIcon(Icons.add_rounded), findsAtLeastNWidgets(1), reason: 'No products found');
    print('[DESIGN_CHECK] [Menu Screen] [Product List] : PASS');
  }

  Future<void> verifyFloatingCart() async {
    print('[DESIGN_CHECK] [Menu Screen] [Floating Cart] : Verifying...');
    expect(find.text('Checkout'), findsOneWidget, reason: 'Floating cart checkout button not found');
    expect(find.byIcon(Icons.shopping_bag_outlined), findsOneWidget, reason: 'Shopping bag icon not found');
    print('[DESIGN_CHECK] [Menu Screen] [Floating Cart] : PASS');
  }

  Future<void> addItemToCart() async {
    print('[ACTION] Tapping "Add" button on a product');
    await tester.tap(find.byIcon(Icons.add_rounded).first);
    await tester.pumpAndSettle();
  }

  Future<void> tapCheckout() async {
    print('[ACTION] Tapping "Checkout" button');
    await tester.tap(find.text('Checkout'));
    await tester.pumpAndSettle();
  }
}
