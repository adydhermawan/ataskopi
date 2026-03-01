#!/bin/bash

# Pastikan Flutter SDK ada di PATH
export PATH="$PATH:/usr/local/flutter/bin"

echo "====================================="
echo "🚀 Memulai Build Flutter Web..."
echo "====================================="

echo "🔧 Memperbaiki format flutter_bootstrap.js agar terhindar dari error Prettier/IDE..."
cat << 'EOF' > web/flutter_bootstrap.js
{{flutter_js}}
{{flutter_build_config}}

_flutter.loader.load({
    serviceWorkerSettings: {
        serviceWorkerVersion: {{flutter_service_worker_version}},
    },
    onEntrypointLoaded: async function (engineInitializer) {
        const appRunner = await engineInitializer.initializeEngine();
        const loadingElement = document.getElementById('loading');
        await appRunner.runApp();
        if (loadingElement) {
            loadingElement.style.opacity = '0';
            loadingElement.style.transition = 'opacity 0.4s ease-out';
            setTimeout(() => {
                loadingElement.remove();
            }, 400);
        }
    }
});
EOF

# Build aplikasi flutter untuk web dengan PWA offline-first caching
flutter build web --release --pwa-strategy offline-first

# Mengecek apakah proses build berhasil
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Build berhasil! Mengunggah ke Vercel..."
  echo "====================================="
  
  # Pindah ke direktori hasil build dan deploy pakai vercel cli
  cd build/web
  vercel deploy --prod
  
  echo ""
  echo "✨ Deployment selesai!"
else
  echo ""
  echo "❌ Build gagal, silakan cek error di atas."
  exit 1
fi
