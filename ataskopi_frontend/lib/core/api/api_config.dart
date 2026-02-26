/// API Configuration for AtasKopi Mobile App
/// 
/// This file contains the base URL and environment configuration
/// for connecting to the backend API.

class ApiConfig {
  // Development: Use Cloudflare Tunnel URL
  // Production: Use production domain
  static const bool isProduction = true;

  static const String _devBaseUrl = 'https://devataskopi.dadi.web.id'; // Local Network IP with domain tunnel
  static const String _prodBaseUrl = 'https://ataskopi.dadi.web.id';

  static String get baseUrl => isProduction ? _prodBaseUrl : _devBaseUrl;
  
  // Helper to format full image URL
  static String fullImageUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/')) return '$baseUrl$path';
    return '$baseUrl/$path';
  }

  // API Endpoints
  static String get healthEndpoint => '$baseUrl/api/health';
  static String get registerEndpoint => '$baseUrl/api/auth/register';
  static String get loginEndpoint => '$baseUrl/api/auth/login';
  static String get meEndpoint => '$baseUrl/api/me';
  static String get checkPhoneEndpoint => '$baseUrl/api/auth/check-phone';
  static String get categoriesEndpoint => '$baseUrl/api/categories';
  static String get productsEndpoint => '$baseUrl/api/products';
  static String get promosEndpoint => '$baseUrl/api/promos';
  static String get outletsEndpoint => '$baseUrl/api/outlets';
  static String get ordersEndpoint => '$baseUrl/api/orders';
  static String get ordersHistoryEndpoint => '$baseUrl/api/orders/history'; // Dedicated endpoint
  static String get loyaltyEndpoint => '$baseUrl/api/me/loyalty';
  static String get vouchersEndpoint => '$baseUrl/api/me/vouchers';
  static String get rewardsEndpoint => '$baseUrl/api/rewards';
  static String get redeemRewardEndpoint => '$baseUrl/api/rewards/redeem';
  static String get profileEndpoint => '$baseUrl/api/me/profile';
  static String get notificationsEndpoint => '$baseUrl/api/notifications';

  // Default tenant for development
  static const String defaultTenantId = 'demo';

  // Timeout settings
  static const Duration requestTimeout = Duration(seconds: 30);
}
