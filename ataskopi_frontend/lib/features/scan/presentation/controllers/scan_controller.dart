import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../features/order/presentation/providers/order_state.dart';
import '../../../../features/home/presentation/providers/home_providers.dart';
import '../../../../features/shared/domain/models/models.dart';
import '../../../../features/menu/presentation/screens/menu_catalog_screen.dart';
import '../providers/scan_providers.dart';

final scanControllerProvider = Provider((ref) => ScanController(ref));

class ScanController {
  final Ref _ref;

  ScanController(this._ref);

  Future<bool> handleQrCode(BuildContext context, String rawCode) async {
    try {
      // 1. Parse QR Code
      String qrCode = rawCode;
      
      // Check if it's a URL and extract 'qr' param
      // Expected format: https://ataskopi.web.app/?qr=ATASKOPI-TABLE-XX-YY
      if (rawCode.startsWith('http')) {
        try {
          final uri = Uri.parse(rawCode);
          if (uri.queryParameters.containsKey('qr')) {
            qrCode = uri.queryParameters['qr']!;
          }
        } catch (e) {
          // If parsing fails, treat as raw code
          print('Error parsing QR URL: $e');
        }
      }

      // 2. Validate with Backend
      final repository = _ref.read(tableRepositoryProvider);
      final response = await repository.getTableByQr(qrCode);

      if (response.success && response.data != null) {
        final table = response.data!;
        
        // 3. Set State
        _ref.read(orderFlowProvider.notifier).setMode(OrderMode.dineIn);
        _ref.read(orderFlowProvider.notifier).setDineInData(
          tableId: table.id, 
          tableNumber: table.tableNumber
        );
        
        // 4. Update Selected Outlet if available
        if (table.outlet != null) {
          _ref.read(selectedOutletProvider.notifier).state = table.outlet;
        }

        // 5. Navigate
        if (context.mounted) {
           ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Table ${table.tableNumber} Verified!')),
          );
          
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => const MenuCatalogScreen()),
          );
          return true;
        }
      } else {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
    return false;
  }
}
