# Kasir AtasKopi

Android cashier app for AtasKopi outlets. It sells offline first: every order is
saved on the phone, then synced to `ataskopi_admin` (`/api/pos/*`) in the background.

## Run against the local dev server

```bash
# from ataskopi_admin, with the local database running
npm run dev

# from ataskopi_pos; the emulator reaches the host at 10.0.2.2
flutter run --profile
```

Use `--profile` on the emulator; debug builds are too slow there to judge the app.
For a phone on the same Wi-Fi, pass the laptop's address:

```bash
flutter run --profile --dart-define=API_BASE_URL=http://192.168.1.16:3000
```

Release builds need an `https` URL; plain `http` is only allowed in debug and profile.

## Tests

```bash
flutter test test/cart_test.dart test/selfie_test.dart

# end-to-end sync against a local server only; it leaves test rows behind
POS_E2E_URL=http://127.0.0.1:3000 POS_E2E_PHONE=+62... POS_E2E_PIN=... \
  flutter test test/sync_e2e_test.dart
```

## Selfie strip

The payment sheet has a "Struk selfie" switch for walk-in orders. With it on,
the bar ticket prints and the camera opens; the strip replaces the receipt, so
the order prints once. With it off, ticket and receipt print right away. An
unpaid order prints only the bar ticket; the receipt or strip comes when it is
paid in full from Antrian. Tickets, receipts and strips list only
what differs from the standard drink, plus notes.
The strip replaces the receipt and carries the same order detail. Orders in
Antrian also have a Selfie button for customers who decide later.

- The photo stays in memory: the camera file is deleted as soon as it is read,
  and nothing is uploaded.
- Bar tickets jump ahead of waiting strips in the print queue.
- Lainnya > Selfie holds rush mode (selfie off), the Instagram handle, photo
  size and brightness.
- Each print job goes to the printer in a single write. The Bluetooth plugin
  puts a line feed in front of every write, so splitting a photo across writes
  corrupts it.
- Lainnya > Selfie > Tes strip takes a photo and times the print. Use it for the
  hardware check: one strip within 15 seconds, faces recognisable, 10 in a row
  without failures.
- Captions are drafts in `lib/features/selfie/data/selfie_settings.dart`.
