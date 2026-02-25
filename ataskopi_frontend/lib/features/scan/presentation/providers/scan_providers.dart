import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/repositories/table_repository.dart';
import 'package:ataskopi_frontend/core/providers/api_providers.dart';

final tableRepositoryProvider = Provider<TableRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return TableRepository(apiClient: apiClient);
});
