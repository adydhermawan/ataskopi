import 'package:ataskopi_frontend/core/api/api_client.dart';
import 'package:ataskopi_frontend/core/api/api_config.dart';
import 'package:ataskopi_frontend/features/shared/domain/models/models.dart';

class CatalogRepository {
  final ApiClient _apiClient;

  CatalogRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Fetch all categories
  Future<ApiResponse<List<ProductCategory>>> getCategories({
    String tenantId = ApiConfig.defaultTenantId,
  }) async {
    return await _apiClient.get<List<ProductCategory>>(
      ApiConfig.categoriesEndpoint,
      fromData: (data) => (data as List)
          .map((e) => ProductCategory.fromJson(e))
          .toList(),
    );
  }

  /// Fetch products with optional filters
  Future<ApiResponse<List<Product>>> getProducts({
    String? categoryId,
    String? search,
    bool? recommended,
    bool? available,
    String? outletId,
    String tenantId = ApiConfig.defaultTenantId,
  }) async {
    final Map<String, String> queryParams = {};
    if (categoryId != null) queryParams['categoryId'] = categoryId;
    if (search != null) queryParams['search'] = search;
    if (recommended != null) queryParams['recommended'] = recommended.toString();
    if (available != null) queryParams['available'] = available.toString();
    if (outletId != null) queryParams['outletId'] = outletId;

    final queryString = queryParams.isEmpty 
        ? '' 
        : '?' + queryParams.entries.map((e) => '${e.key}=${e.value}').join('&');

    return await _apiClient.get<List<Product>>(
      '${ApiConfig.productsEndpoint}$queryString',
      fromData: (data) => (data as List)
          .map((e) => Product.fromJson(e))
          .toList(),
    );
  }

  /// Fetch product by ID
  Future<ApiResponse<Product>> getProductById(String id) async {
    return await _apiClient.get<Product>(
      '${ApiConfig.productsEndpoint}/$id',
      fromData: (data) => Product.fromJson(data),
    );
  }

  /// Fetch active banners/promos
  Future<ApiResponse<List<Banner>>> getPromos() async {
    return await _apiClient.get<List<Banner>>(
      ApiConfig.promosEndpoint,
      fromData: (data) => (data as List)
          .map((e) => Banner.fromJson(e))
          .toList(),
    );
  }
}
