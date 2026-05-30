'use client'

import { useEffect, useState } from 'react'
import { AlertOctagon, RefreshCw, ArrowLeft, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [realError, setRealError] = useState<{ message: string; stack?: string; path?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.error("Dashboard error caught:", error);
    if (error.digest) {
      setLoading(true);
      fetch(`/api/error-lookup?digest=${error.digest}`)
        .then(res => res.json())
        .then(data => {
          if (data.message) {
            setRealError(data);
          }
        })
        .catch(err => console.error("Error looking up digest:", err))
        .finally(() => setLoading(false));
    }
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
        {/* Top Gradient Header */}
        <div className="h-2 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />
        
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 rounded-xl">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">
                Terjadi Kesalahan Aplikasi
              </h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                Next.js mendeteksi kesalahan rendering saat memproses halaman ini di server.
              </p>
            </div>
          </div>

          {/* Diagnostic Display Card */}
          <div className="bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-slate-100 dark:border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
              <span>Detail Diagnostik</span>
              {loading ? (
                <span className="flex items-center gap-1.5 text-blue-500 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Menghubungkan...
                </span>
              ) : (
                <span>Production Mode</span>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm text-slate-700 dark:text-zinc-300 font-medium">
                Pesan Kesalahan:
              </div>
              <div className="p-3.5 bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800/80 rounded-lg text-sm text-red-600 dark:text-red-400 font-mono break-words leading-relaxed">
                {realError ? realError.message : (error.message || "Kesalahan tidak terduga.")}
              </div>
            </div>

            {realError?.path && (
              <div className="grid grid-cols-3 gap-2 py-2 border-t border-slate-100 dark:border-zinc-800/60 text-xs">
                <span className="font-medium text-slate-400 dark:text-zinc-500">Path Halaman:</span>
                <span className="col-span-2 text-slate-600 dark:text-zinc-400 font-mono break-all">{realError.path}</span>
              </div>
            )}

            {error.digest && (
              <div className="grid grid-cols-3 gap-2 py-2 border-t border-slate-100 dark:border-zinc-800/60 text-xs">
                <span className="font-medium text-slate-400 dark:text-zinc-500">Error Digest:</span>
                <span className="col-span-2 text-slate-600 dark:text-zinc-400 font-mono break-all">{error.digest}</span>
              </div>
            )}
          </div>

          {/* Stack trace if available (highly useful for developers in prod admin) */}
          {realError?.stack && (
            <details className="group space-y-2">
              <summary className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 cursor-pointer hover:text-slate-800 dark:hover:text-zinc-200 select-none">
                <Terminal className="w-4 h-4" />
                <span>Tampilkan Stack Trace</span>
              </summary>
              <pre className="p-4 bg-slate-900 text-zinc-300 text-xs font-mono rounded-lg overflow-x-auto max-h-60 border border-slate-800 leading-relaxed group-open:animate-in group-open:fade-in-50 duration-200">
                {realError.stack}
              </pre>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={() => reset()}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-950 font-medium px-5 py-2.5 rounded-xl shadow-sm transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Coba Ulangi Halaman
            </Button>
            <Button
              variant="outline"
              asChild
              className="flex items-center gap-2 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 px-5 py-2.5 rounded-xl font-medium transition-all"
            >
              <a href="/products">
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Daftar Produk
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
