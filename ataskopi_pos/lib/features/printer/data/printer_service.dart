import 'dart:async';

import 'package:permission_handler/permission_handler.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';

class PrinterDevice {
  const PrinterDevice(this.name, this.mac);

  final String name;
  final String mac;
}

/// Bar tickets jump ahead of waiting receipts and strips, so drinks never
/// wait for a photo. A job that is already printing is never interrupted.
enum PrintPriority { ticket, normal }

abstract class PrinterTransport {
  Future<bool> connect(String mac);

  Future<bool> write(List<int> bytes);
}

class BluetoothTransport implements PrinterTransport {
  @override
  Future<bool> connect(String mac) async {
    if (await PrintBluetoothThermal.connectionStatus) return true;
    return PrintBluetoothThermal.connect(macPrinterAddress: mac);
  }

  /// One call per job: the plugin puts a line feed in front of every write,
  /// which corrupts a photo split over several writes. It streams big jobs
  /// to the printer in pieces on its own.
  @override
  Future<bool> write(List<int> bytes) => PrintBluetoothThermal.writeBytes(bytes);
}

class _Job {
  _Job(this.mac, this.bytes, this.priority);

  final String? mac;
  final List<int> bytes;
  final PrintPriority priority;
  final done = Completer<bool>();
}

/// One printer serves everything, so jobs run strictly one after another.
class PrinterService {
  PrinterService([PrinterTransport? transport, this.tearGap = const Duration(seconds: 4)])
      : _transport = transport ?? BluetoothTransport();

  final PrinterTransport _transport;

  /// How long the next job waits after the last one was sent. A short job
  /// is sent long before the paper stops moving, and the printer has no
  /// cutter, so this gives the paper time to finish and the cashier time to
  /// tear it off.
  final Duration tearGap;

  final _waiting = <_Job>[];
  bool _running = false;
  DateTime? _lastSent;

  Future<bool> requestAccess() async {
    final results = await [Permission.bluetoothConnect, Permission.bluetoothScan].request();
    return results.values.every((status) => status.isGranted);
  }

  Future<List<PrinterDevice>> pairedPrinters() async {
    if (!await requestAccess()) return const [];
    final devices = await PrintBluetoothThermal.pairedBluetooths;
    return devices.map((device) => PrinterDevice(device.name, device.macAdress)).toList();
  }

  /// Resolves to false instead of throwing: a failed print never stops a sale.
  Future<bool> print(
    String? mac,
    List<int> bytes, {
    PrintPriority priority = PrintPriority.normal,
  }) {
    final job = _Job(mac, bytes, priority);
    _waiting.add(job);
    unawaited(_drain());
    return job.done.future;
  }

  Future<void> _drain() async {
    if (_running) return;
    _running = true;
    while (_waiting.isNotEmpty) {
      final last = _lastSent;
      if (last != null) {
        final wait = tearGap - DateTime.now().difference(last);
        if (wait > Duration.zero) await Future<void>.delayed(wait);
      }
      // Picked after the wait, so a ticket that arrived meanwhile goes next.
      final next = _waiting.firstWhere(
        (job) => job.priority == PrintPriority.ticket,
        orElse: () => _waiting.first,
      );
      _waiting.remove(next);
      final sent = await _send(next);
      if (sent) _lastSent = DateTime.now();
      next.done.complete(sent);
    }
    _running = false;
  }

  Future<bool> _send(_Job job) async {
    final mac = job.mac;
    if (mac == null) return false;
    try {
      return await _transport.connect(mac) && await _transport.write(job.bytes);
    } catch (_) {
      return false;
    }
  }
}
