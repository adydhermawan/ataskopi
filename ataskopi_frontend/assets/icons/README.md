# 📱 App Icons - AtasKopi

Folder ini berisi file icon master untuk generate app icon di semua platform.

## 📁 File yang Diperlukan

| File | Ukuran | Format | Keterangan |
|------|--------|--------|------------|
| `icon-1024.png` | **1024x1024** | PNG | Master icon utama (wajib) |
| `icon-512.png` | **512x512** | PNG | Icon untuk web/PWA |
| `icon-foreground.png` | **1024x1024** | PNG | Foreground untuk Android Adaptive Icon |

## 🎨 Panduan Desain

### Icon Utama (`icon-1024.png`)
- **Ukuran**: 1024x1024 pixel
- **Format**: PNG (tanpa transparansi/alpha)
- **Background**: Solid color (#1E3A5F - AtasKopi primary)
- **Safe Zone**: Logo utama di 70% area tengah

### Android Adaptive Icon (`icon-foreground.png`)
- **Ukuran**: 1024x1024 pixel  
- **Format**: PNG dengan transparansi
- **Konten**: Hanya logo/symbol tanpa background
- **Safe Zone**: Logo di 66% area tengah (akan di-crop melingkar)

```
┌──────────────────────────┐
│                          │
│    ┌──────────────┐      │
│    │              │      │
│    │   LOGO AREA  │      │  ← 66% safe zone
│    │    (safe)    │      │
│    │              │      │
│    └──────────────┘      │
│                          │
└──────────────────────────┘
     Full 1024x1024
```

## 🚀 Cara Generate Icons

Setelah menempatkan file icon di folder ini, jalankan:

```bash
cd ataskopi_frontend
dart run flutter_launcher_icons
```

Perintah ini akan otomatis generate semua ukuran icon untuk:
- ✅ Android (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- ✅ iOS (semua ukuran iPhone & iPad)
- ✅ Web (favicon, PWA icons)
- ✅ macOS
- ✅ Windows

## 📋 Checklist Sebelum Generate

- [ ] `icon-1024.png` sudah ada (1024x1024, tanpa transparansi)
- [ ] `icon-512.png` sudah ada (512x512, untuk web)
- [ ] `icon-foreground.png` sudah ada (1024x1024, dengan transparansi)
- [ ] Logo berada di safe zone (70% tengah)
- [ ] Tidak ada teks kecil yang sulit dibaca

## 🎯 Hasil Generate

Setelah menjalankan perintah, icon akan di-generate ke:

```
android/app/src/main/res/
├── mipmap-mdpi/
├── mipmap-hdpi/
├── mipmap-xhdpi/
├── mipmap-xxhdpi/
└── mipmap-xxxhdpi/

ios/Runner/Assets.xcassets/AppIcon.appiconset/

web/
├── favicon.png
└── icons/
```

## 🔗 Referensi Warna AtasKopi

| Nama | Hex | Penggunaan |
|------|-----|------------|
| Primary | `#1E3A5F` | Background icon |
| Accent | `#D4A574` | Highlight/accent |
| White | `#FFFFFF` | Logo/text |
