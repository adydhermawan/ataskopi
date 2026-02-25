import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ataskopi_frontend/core/providers/api_providers.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';
import 'package:ataskopi_frontend/features/home/presentation/providers/home_providers.dart';

final categoriesProvider = FutureProvider<List<ProductCategory>>((ref) async {
  final repository = ref.watch(catalogRepositoryProvider);
  final response = await repository.getCategories();
  if (response.success && response.data != null) {
    return response.data!;
  }
  return [];
});

final selectedCategoryIdProvider = StateProvider<String?>((ref) => null);

final productsByCategoryProvider = FutureProvider.family<List<Product>, String?>((ref, categoryId) async {
  final repository = ref.watch(catalogRepositoryProvider);
  final searchQuery = ref.watch(searchQueryProvider);
  final selectedOutlet = ref.watch(selectedOutletProvider);
  
  final response = await repository.getProducts(
    categoryId: categoryId, 
    search: searchQuery.isEmpty ? null : searchQuery,
    available: true, 
    outletId: selectedOutlet?.id,
  );
  
  if (response.success && response.data != null) {
    return response.data!;
  }
  return [];
});

final searchQueryProvider = StateProvider<String>((ref) => '');

final searchResultsProvider = FutureProvider<List<Product>>((ref) async {
  final query = ref.watch(searchQueryProvider);
  if (query.isEmpty) return [];
  
  final repository = ref.watch(catalogRepositoryProvider);
  final selectedOutlet = ref.watch(selectedOutletProvider);
  final response = await repository.getProducts(
    search: query,
    outletId: selectedOutlet?.id,
  );
  if (response.success && response.data != null) {
    return response.data!;
  }
  return [];
});

final productDetailProvider = FutureProvider.family<Product?, String>((ref, id) async {
  final repository = ref.watch(catalogRepositoryProvider);
  final response = await repository.getProductById(id);
  if (response.success && response.data != null) {
    return response.data;
  }
  return null;
});
