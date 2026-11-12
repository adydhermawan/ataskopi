import 'package:intl/intl.dart';

final _rupiah = NumberFormat.decimalPattern('id_ID');

String rupiah(num value) => 'Rp ${_rupiah.format(value.round())}';

String clock(DateTime time) => DateFormat('HH:mm').format(time.toLocal());
