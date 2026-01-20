import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Configuration for the current tenant.
/// In production, this can be set via --dart-define=TENANT_ID=xyz
class TenantConfig {
  static const String tenantId = String.fromEnvironment(
    'TENANT_ID',
    defaultValue: 'ataskopi-demo',
  );

  final String name;
  final String logoUrl;
  final Color primaryColor;
  final Color secondaryColor;
  final Color accentColor;
  final double borderRadius;
  final bool loyaltyEnabled;

  const TenantConfig({
    required this.name,
    required this.logoUrl,
    required this.primaryColor,
    required this.secondaryColor,
    required this.accentColor,
    this.borderRadius = 16.0,
    this.loyaltyEnabled = true,
  });

  static const defaultTenant = TenantConfig(
    name: 'AtasKopi',
    logoUrl: 'assets/icons/logo.png',
    primaryColor: Color(0xFF1250A5),
    secondaryColor: Colors.white,
    accentColor: Color(0xFFFFB400),
    borderRadius: 16.0,
  );
}

final tenantProvider = Provider<TenantConfig>((ref) {
  // Logic to fetch tenant config based on TenantConfig.tenantId
  // For now, returning default
  return TenantConfig.defaultTenant;
});
