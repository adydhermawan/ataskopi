# Implementation Plan: Aplikasi Kasir AtasKopi

Terakhir diperbarui: 7 November 2026
Status: Fase 0 menunggu tes di printer dan HP kasir.

## 1. Tujuan

Aplikasi kasir Android untuk outlet yang ramai, dengan tiga target utama:

1. **Input order sangat cepat.** Order 2–3 item selesai di bawah 15 detik.
2. **Order online masuk ke app yang sama.** Kasir dan bar cukup memantau satu antrian.
3. **Struk foto selfie.** Customer dapat print foto yang layak diposting, sebagai awareness di media sosial.

Input suara hanya dikerjakan kalau lolos tes di outlet. Kalau malah menambah salah input, fitur ini tidak dibuat.

## 2. Keputusan yang sudah final

| Topik | Keputusan |
|---|---|
| Perangkat | Samsung S10 sebagai HP kasir, printer Bluetooth portable 58mm yang sudah ada |
| Skala | 1 outlet berjalan, data tetap mendukung multi-outlet |
| Stasiun produksi | Hanya bar, tidak ada dapur |
| Pajak | Belum diterapkan. POS mengikuti `taxEnabled`, tanpa baris pajak saat nonaktif |
| Waktu bayar | Boleh di awal atau di akhir. Cetak struk tidak mewajibkan lunas |
| Order online | Kasir tap Terima untuk print dan mulai proses |
| Customer walk-in | Nomor HP tidak wajib, nama saja cukup |
| Kanal ojol | Harga ShopeeFood dan Grab berbeda dari harga outlet |
| Pembayaran walk-in | Tunai dan QRIS statis outlet |
| Otorisasi | Kasir boleh void, refund, dan diskon sendiri, tanpa PIN supervisor |
| Rilis | Kasir dan selfie rilis bersamaan di HP yang sama |

## 3. Arsitektur

Buat app Flutter baru di `ataskopi_pos/`, terpisah dari app customer. Backend tetap `ataskopi_admin` dengan endpoint khusus POS.

```text
App POS (Flutter, S10)
├── Database lokal: menu, order, antrian sync
├── Printer Bluetooth 58mm
├── Kamera selfie: foto tidak di-upload
└── Sync ke backend
        │
        ▼
Next.js API (ataskopi_admin) ──▶ PostgreSQL
        ▲
        │
App customer dan live board web
```

Alasan utama:

- **Flutter:** stack-nya sudah ada di repo dan bisa mengakses printer Bluetooth serta kamera.
- **App terpisah:** izin dan jadwal rilisnya tidak mengganggu app customer.
- **Offline-first:** order walk-in tersimpan di HP dulu, struk langsung keluar, lalu sync berjalan di background.

Live board web tetap dipertahankan sebagai cadangan.

## 4. Scope fitur

### Wajib untuk rilis

**Alur transaksi**

- Grid menu satu layar, urut menu terlaris dengan posisi tetap selama shift
- Tap sekali untuk menambah item dengan opsi default
- Tahan tile untuk mengubah opsi, topping, dan catatan
- Pencarian menu dengan nama panggilan, misalnya "kopsu" untuk Kopi Susu
- Open bill: simpan order, tambah pesanan, bayar nanti
- Pembayaran tunai dengan tombol Uang Pas, 50rb, dan 100rb
- Pembayaran QRIS statis dengan konfirmasi manual oleh kasir
- Split payment berdasarkan nominal, misalnya sebagian tunai dan sebagian QRIS
- Struk belum lunas diberi tanda "BELUM LUNAS"
- Cetak ulang struk

**Koreksi transaksi**

- Void dengan alasan wajib
- Refund dengan metode dan alasan wajib
- Diskon manual, voucher, dan poin
- Semua koreksi mencatat nama kasir dan waktu

**Operasional**

- Login PIN per kasir
- Buka dan tutup shift dengan modal awal, kas masuk-keluar, dan selisih kas
- Laporan ringkas di HP: penjualan hari ini per metode bayar dan per kasir
- Tandai menu habis per outlet
- Indikator online/offline dan jumlah order belum sync
- Status printer dan tombol print ulang

**Order online dan kanal**

- Tab Online dengan suara notifikasi dan badge
- Antrian gabungan untuk order kasir dan order online
- Pause Online per outlet
- Input manual order ShopeeFood dan Grab dengan harga per kanal

**Selfie**

- Ambil foto dari HP kasir
- Strip berisi foto, frame AtasKopi, nomor antrian, dan rincian order
- Struk biasa kalau customer tidak mau foto
- Mode rush untuk mematikan selfie saat outlet kewalahan

### Di luar scope rilis pertama

- QRIS dinamis dan payment gateway
- Split bill per item
- Struk digital via WhatsApp
- Kitchen display terpisah
- Integrasi otomatis GoFood, GrabFood, dan ShopeeFood
- Stok potong otomatis per resep
- Denah meja visual

## 5. Aturan supaya input tetap cepat

- Alur utama hanya **tap menu, bayar, selesai**.
- Fitur tambahan disembunyikan di tahan-tile atau menu Lainnya.
- Tidak ada dialog konfirmasi di alur utama, tetapi ada tombol undo beberapa detik.
- Keranjang tersimpan otomatis kalau app crash atau HP mati.
- Tombol Bayar anti double-tap, dan `clientOrderId` mencegah order tersimpan dua kali.
- Tutup shift diblok kalau masih ada order belum sync.
- Update app dilakukan bertahap di luar jam operasional.

## 6. Alur utama

### Order walk-in

1. Kasir memilih menu dan mengisi nama kalau perlu.
2. Order disimpan di HP dan mendapat nomor antrian, misalnya `A-047`.
3. Tiket bar ter-print, lalu minuman mulai dibuat.
4. Customer membayar sekarang atau nanti.
5. Customer selfie kalau mau.
6. Strip atau struk biasa ter-print.
7. Order sync ke server di background.

### Order online

1. Order masuk dari app customer dan HP kasir berbunyi.
2. Kasir tap **Terima**. Kalau belum lunas, kasir mengikuti aturan pembayaran order tersebut.
3. Order pindah ke `preparing` dan tiket ter-print dengan nomor seperti `O-012`.
4. Tiket menampilkan meja untuk dine-in, jam ambil untuk pickup, atau alamat untuk delivery.
5. Kasir mengubah status sampai selesai. Customer tetap mendapat notifikasi dan poin.

Pickup terjadwal ditahan di daftar dan muncul sebagai pengingat menjelang jam ambil.

### Internet putus

- Order walk-in tetap berjalan.
- Order online tidak bisa masuk karena datang lewat server.
- POS menampilkan banner merah yang jelas.
- Outlet otomatis ditandai tutup untuk order online kalau POS lama tidak terhubung, supaya customer tidak membayar order yang tidak terlihat.

## 7. Pekerjaan backend

### Masalah yang harus dibereskan

| Masalah | Lokasi | Perbaikan |
|---|---|---|
| Order tercatat atas nama user login, sehingga poin bisa masuk ke kasir | `ataskopi_admin/app/api/orders/route.ts`, `ataskopi_admin/actions/orders.ts` | Pakai customer atau user walk-in sistem, dan lewati pemberian poin untuk walk-in |
| Nomor order bisa dobel | `ataskopi_admin/app/api/orders/route.ts`, `ataskopi_admin/prisma/schema.prisma` | Tambah unique constraint dan penomoran atomik per outlet |
| Status bayar selalu `pending` saat order dibuat | `ataskopi_admin/app/api/orders/route.ts` | Endpoint POS menerima status bayar dan rincian pembayaran |
| Belum ada API update status | `ataskopi_admin/app/api/orders/[id]/route.ts` hanya punya GET | Pindahkan logika ke service bersama dan buka endpoint POS |
| Aturan "harus lunas dulu" hanya ada di UI web | `ataskopi_admin/app/(dashboard)/orders/live/components/order-board.tsx` | Pindahkan ke server, dengan pengecualian order kasir yang boleh bayar belakangan |
| Pengecekan izin di-comment pada update status dan pembayaran | `ataskopi_admin/actions/orders.ts` | Aktifkan pengecekan izin dan pastikan web tetap berjalan |
| Nama status tidak konsisten: `on_delivery` dan `on_the_way` | `ataskopi_admin/actions/orders.ts`, `ataskopi_admin/app/api/orders/route.ts` | Satukan daftar status |
| Menu habis per outlet tidak dicek saat order | `ataskopi_admin/app/api/orders/route.ts` | Cek `OutletProduct.isAvailable` |
| Toggle mode order berlaku global | `OrderModeSetting` di `ataskopi_admin/prisma/schema.prisma` | Tambah pengaturan Pause Online per outlet |
| Tabel `orders` belum punya index | `ataskopi_admin/prisma/schema.prisma` | Tambah index outlet, status, dan waktu update |
| `/api/upload` tidak mengecek auth di route-nya dan menghasilkan URL publik | `ataskopi_admin/app/api/upload/route.ts` | Jangan dipakai untuk selfie, dan tambahkan auth |

### Perubahan data

Nama di bawah masih usulan dan bisa berubah saat implementasi.

**Tambahan pada `Order`:**

- `source`: `pos` atau `customer_app`
- `channel`: `walk_in`, `shopeefood`, atau `grab`
- `clientOrderId`: unik, untuk sync yang aman diulang
- `queueNumber`: nomor antrian yang tampil di struk
- `cashierId` dan `shiftId`
- Kolom void: waktu, kasir, dan alasan

**Model baru:**

- `OrderPayment`: satu order bisa punya beberapa pembayaran
- `OrderRefund`: nominal, metode, kasir, dan alasan
- `Shift`: buka-tutup, modal awal, kas seharusnya, dan kas aktual
- `ShiftCashMovement`: kas masuk dan keluar selama shift
- `ProductChannelPrice`: harga produk per kanal
- `AuditLog`: void, refund, diskon, dan perubahan penting lain

### Endpoint POS

| Endpoint | Fungsi |
|---|---|
| `GET /api/pos/catalog` | Menu, opsi, harga kanal, dan status habis |
| `POST /api/pos/orders/sync` | Kirim order baru dan perubahan, aman diulang |
| `GET /api/pos/inbox?since=` | Ambil perubahan order online terbaru |
| `PATCH /api/pos/orders/:id/status` | Ubah status order lewat service bersama |
| `POST /api/pos/orders/:id/payments` | Catat pembayaran |
| `POST /api/pos/orders/:id/void` | Void order |
| `POST /api/pos/orders/:id/refund` | Refund order |
| `POST /api/pos/shifts` dan `PATCH /api/pos/shifts/:id` | Buka dan tutup shift |

Inbox memakai polling ringan tiap 5 detik. Supabase Realtime belum dipakai supaya data order tidak terbuka ke HP lewat aturan akses yang salah.

Kalau web dan POS menerima order yang sama, server hanya menerima update pertama. Tiket hanya di-print oleh perangkat yang berhasil.

## 8. Selfie

### Alur

Selfie tidak menahan produksi. Tiket bar keluar lebih dulu, sehingga minuman sudah dibuat saat customer berfoto.

### Teknis

- Lebar foto 384 dot untuk kertas 58mm
- Foto dipotong dekat ke wajah
- Foto diubah ke hitam-putih dengan dithering
- Pengiriman ke printer dibagi per potongan supaya printer murah tidak kehilangan data
- Strip dikirim lewat antrian print yang sama dengan tiket dan struk

### Privasi

- Foto hanya dibuat kalau customer setuju.
- Foto diproses di HP, di-print, lalu dihapus.
- Foto tidak di-upload ke server.

### Supaya diposting

- Frame dengan handle IG
- Caption lucu acak
- Bonus poin kalau customer tag outlet, dengan aturan yang ditentukan sebelum rilis

## 9. Voice

Voice tidak masuk build utama sampai lolos tes.

**Tes 1–2 hari:** rekam 50 order saat jam ramai, lalu cocokkan hasilnya dengan daftar menu dan nama panggilan.

**Syarat lanjut:**

- Minimal 90% order benar tanpa diedit
- Total waktunya lebih cepat dari tap

Kalau lolos, voice hanya mengisi keranjang dan tidak boleh otomatis membayar.

## 10. Tahapan development

Estimasi untuk satu orang, dan masih kasar.

| Fase | Pekerjaan | Estimasi | Lanjut kalau |
|---|---|---|---|
| **0. Tes hardware** | Tes `ataskopi_pos_spike` di S10 dan printer | 2–3 hari | Lolos kriteria di bawah |
| **1. Backend POS** | Perbaikan bagian 7, model data, endpoint, dan tes | 9–13 hari | Poin tidak masuk ke kasir, laporan tidak dobel, sync aman diulang |
| **2. App kasir** | Semua fitur wajib selain selfie | 4–5,5 minggu | Target di bawah 15 detik tercapai |
| **3. Selfie** | Kamera, frame, strip, mode rush, dan antrian print | 1–2 minggu | Strip tidak menahan operasional |
| **4. Pilot dan rilis** | Jam sepi, lalu jam ramai, dengan cara lama sebagai cadangan | 1 minggu | Satu minggu tanpa order hilang atau selisih kas |

Total sekitar **8–12 minggu kerja**. Tes voice dilakukan setelah rilis stabil.

### Kriteria lolos Fase 0

- Satu strip selesai maksimal 15 detik
- Wajah jelas dikenali
- 10 strip berturut-turut berjalan lancar tanpa gagal atau printer kepanasan

Kalau gagal, opsinya:

1. Kecilkan foto ke tinggi 4 cm.
2. Matikan foto saat ramai lewat mode rush.
3. Tambah printer khusus foto.

## 11. Risiko utama

| Risiko | Mitigasi |
|---|---|
| Satu printer 58mm menjadi bottleneck | Ukur di Fase 0, tiket bar diprioritaskan, dan mode rush tersedia |
| Baterai atau koneksi printer putus saat ramai | Status printer, print ulang, dan charger selalu terpasang saat shift |
| QRIS statis rawan bukti bayar palsu | Kasir mengecek notifikasi masuk, bukan hanya layar customer |
| Selisih POS dan dashboard | Laporan memakai data order yang sama, dan shift tidak bisa ditutup sebelum sync selesai |
| Order hilang saat offline | Order tersimpan lokal dan `clientOrderId` membuat sync aman diulang |
| Order online tidak terlihat saat POS offline | Banner offline dan outlet otomatis tutup untuk order online |

## 12. Yang masih perlu dipastikan

- [ ] Hasil tes Fase 0: waktu print, kualitas foto, dan setting chunk
- [ ] Setting `taxEnabled` di admin sudah nonaktif. Default database aktif, dan kode order memakai 11% saat aktif
- [ ] Order ojol dicatat sebagai nilai kotor atau bersih setelah komisi
- [ ] Definisi final "kasir bisa menentukan": saat ini berarti kasir boleh void, refund, dan diskon tanpa persetujuan orang lain
- [ ] Desain frame, caption, dan aturan bonus poin tag IG
