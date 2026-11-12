import 'dart:convert';

import 'package:intl/intl.dart';

import '../../../core/utils/format.dart';
import '../../sale/domain/local_order.dart';

const _width = 32;

const _paymentLabels = {
  'cash': 'Tunai',
  'qris': 'QRIS',
  'shopeefood': 'ShopeeFood',
  'grab': 'Grab',
};

String paymentLabel(String method) => _paymentLabels[method] ?? method;

class TicketLine {
  const TicketLine(this.quantity, this.name, {this.extras = const [], this.notes});

  final int quantity;
  final String name;
  final List<String> extras;
  final String? notes;
}

/// Builds ESC/POS commands for a 58mm printer, which fits 32 characters a line.
class EscPos {
  final _bytes = <int>[0x1B, 0x40];

  List<int> get bytes => [..._bytes, 0x0A, 0x0A, 0x0A];

  void _align(int value) => _bytes.addAll([0x1B, 0x61, value]);

  void _bold(bool on) => _bytes.addAll([0x1B, 0x45, on ? 1 : 0]);

  void _size(int value) => _bytes.addAll([0x1D, 0x21, value]);

  void text(String value) => _bytes
    ..addAll(latin1.encode(_printable(value)))
    ..add(0x0A);

  void center(String value, {bool bold = false, bool big = false}) {
    _align(1);
    if (bold) _bold(true);
    if (big) _size(0x11);
    text(value);
    if (big) _size(0);
    if (bold) _bold(false);
    _align(0);
  }

  void row(String left, String right) {
    final room = _width - right.length - 1;
    final name = left.length > room ? left.substring(0, room) : left;
    text('${name.padRight(room)} $right');
  }

  void rule() => text('-' * _width);

  /// Commands built elsewhere, such as a photo raster.
  void raw(List<int> bytes) => _bytes.addAll(bytes);

  /// Word-wrapped, because the printer itself breaks lines mid-word.
  void paragraph(String value, {bool bold = false}) {
    final lines = <String>[];
    var current = '';
    for (final word in value.split(' ')) {
      if (current.isNotEmpty && current.length + 1 + word.length > _width) {
        lines.add(current);
        current = word;
      } else {
        current = current.isEmpty ? word : '$current $word';
      }
    }
    if (current.isNotEmpty) lines.add(current);
    for (final line in lines) {
      center(line, bold: bold);
    }
  }

  String _printable(String value) =>
      String.fromCharCodes(value.runes.map((code) => code < 256 ? code : 0x3F));
}

/// Goes to the bar: only what is needed to make the drinks.
List<int> buildTicket({
  required String number,
  required String heading,
  required List<TicketLine> lines,
  required DateTime time,
  String? name,
  String? detail,
}) {
  final out = EscPos()
    ..center(number, bold: true, big: true)
    ..center(heading);
  if (name != null) out.center(name, bold: true);
  if (detail != null) out.center(detail);
  out
    ..text(clock(time))
    ..rule();

  for (final line in lines) {
    out.text('${line.quantity}x ${line.name}');
    for (final extra in line.extras) {
      out.text('   + $extra');
    }
    if (line.notes != null) out.text('   ! ${line.notes}');
  }
  return out.bytes;
}

List<TicketLine> ticketLines(LocalOrder order) => [
      for (final line in order.lines)
        TicketLine(line.quantity, line.name, extras: line.requests, notes: line.notes),
    ];

List<int> buildOrderTicket(LocalOrder order) => buildTicket(
      number: order.queueNumber,
      heading: order.channel == 'walk_in' ? 'TIKET BAR' : 'TIKET ${paymentLabel(order.channel).toUpperCase()}',
      lines: ticketLines(order),
      time: order.createdAt,
      name: order.guestName,
    );

List<int> buildReceipt(
  LocalOrder order, {
  required String outletName,
  required String cashierName,
  List<int> logo = const [],
}) {
  final out = EscPos()
    ..raw(logo)
    ..center(outletName, bold: true)
    ..center(order.queueNumber, bold: true, big: true)
    ..text('${clock(order.createdAt)}  Kasir: $cashierName');
  if (order.guestName != null) out.text('Nama: ${order.guestName}');
  out.rule();
  _orderDetail(out, order);
  out
    ..rule()
    ..center('Terima kasih!');
  return out.bytes;
}

/// Takes the place of the receipt, so it carries the same order detail.
List<int> buildStrip(
  LocalOrder order, {
  required List<int> raster,
  required String caption,
  List<int> social = const [],
  required String outletName,
}) {
  final out = EscPos()
    ..raw(raster)
    ..center(order.queueNumber, bold: true, big: true);
  if (order.guestName != null) out.center(order.guestName!, bold: true);
  out.paragraph(caption);
  out.raw(social);
  out
    ..center('$outletName  ${DateFormat('dd/MM/yyyy HH:mm').format(order.createdAt.toLocal())}')
    ..rule();
  _orderDetail(out, order);
  return out.bytes;
}

void _orderDetail(EscPos out, LocalOrder order) {
  for (final line in order.lines) {
    out.row('${line.quantity}x ${line.name}', rupiah(line.lineTotal));
    for (final request in line.requests) {
      out.text('   + $request');
    }
    if (line.notes != null) out.text('   ! ${line.notes}');
  }

  out
    ..rule()
    ..row('Subtotal', rupiah(order.subtotal));
  if (order.discount > 0) out.row('Diskon', '-${rupiah(order.discount)}');
  if (order.tax > 0) out.row('Pajak', rupiah(order.tax));
  out.row('TOTAL', rupiah(order.total));

  for (final payment in order.payments) {
    out.row(paymentLabel(payment.method), rupiah(payment.tenderedAmount ?? payment.amount));
    final tendered = payment.tenderedAmount;
    if (tendered != null && tendered > payment.amount) {
      out.row('Kembali', rupiah(tendered - payment.amount));
    }
  }

  if (!order.isPaid) {
    out
      ..rule()
      ..center('BELUM LUNAS', bold: true, big: true)
      ..row('Sisa', rupiah(order.remaining));
  }
}
