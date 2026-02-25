"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Coffee, LayoutGrid, ShieldCheck, Smartphone, Users, Zap, CheckCircle2, MonitorPlay } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export const dynamic = 'force-dynamic';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function LandingPage() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });



  return (
    <div className="flex min-h-screen flex-col font-sans bg-white text-zinc-900 selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      {/* Header / Navbar */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 w-full border-b border-zinc-100 bg-white/80 backdrop-blur-md"
      >
        <div className="container mx-auto max-w-7xl h-20 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            {/* Real Logo */}
            <div className="relative h-10 w-10">
              <Image src="/logo.png" alt="AtasKopi Logo" fill className="object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-blue-900">AtasKopi <span className="text-zinc-400 font-normal">for Business</span></span>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-zinc-600">
            <Link href="#solutions" className="hover:text-blue-700 transition-colors">Solusi</Link>
            <Link href="#ecosystem" className="hover:text-blue-700 transition-colors">Ekosistem</Link>
            <Link href="#demo" className="hover:text-blue-700 transition-colors">Live Demo</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-blue-700">
              Login Mitra
            </Link>
            <Button asChild className="rounded-full bg-blue-700 hover:bg-blue-800 text-white px-6 shadow-md hover:shadow-lg transition-all">
              <Link href="/register">
                Daftar Gratis
              </Link>
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 lg:pt-40 lg:pb-48 overflow-hidden">
          {/* Vivid Background Blobs */}
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-0 right-0 -translate-y-12 translate-x-1/2 w-[900px] h-[900px] bg-gradient-to-br from-blue-100 to-blue-50 rounded-full blur-3xl -z-10"
          />
          <div className="absolute bottom-0 left-0 translate-y-20 -translate-x-1/3 w-[600px] h-[600px] bg-gradient-to-tr from-amber-50 to-orange-50 rounded-full blur-3xl -z-10" />

          <div className="container mx-auto max-w-7xl px-4 md:px-8 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

              {/* Text Content */}
              <motion.div
                className="flex-1 space-y-8 text-center lg:text-left"
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
              >
                <motion.div variants={fadeInUp} className="inline-flex items-center rounded-full border border-blue-200 bg-white px-5 py-2 text-sm font-medium text-blue-800 mx-auto lg:mx-0 shadow-sm">
                  <Zap className="h-4 w-4 mr-2 fill-blue-600 text-blue-600" />
                  <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent font-bold">#1 POS System</span>
                  <span className="text-blue-900 ml-1">untuk Coffee Shop Modern</span>
                </motion.div>
                <motion.h1 variants={fadeInUp} className="text-5xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl xl:text-7xl/none leading-[1.1]">
                  Kelola Bisnis Kopi <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-blue-500">Lebih Cerdas.</span>
                </motion.h1>
                <motion.p variants={fadeInUp} className="max-w-[600px] text-zinc-500 md:text-xl leading-relaxed mx-auto lg:mx-0">
                  Platform all-in-one untuk manajemen pesanan, stok, dan pelanggan. Tingkatkan efisiensi operasional dan kepuasan pelanggan dalam satu aplikasi.
                </motion.p>
                <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 w-full justify-center lg:justify-start pt-4">
                  <Button size="lg" className="h-14 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white px-10 text-base shadow-xl hover:-translate-y-1 transition-all duration-300">
                    Coba Gratis Sekarang
                  </Button>
                  <Button variant="outline" size="lg" className="h-14 rounded-full border-zinc-200 text-zinc-900 bg-white hover:bg-zinc-50 px-8 text-base shadow-sm hover:shadow-md transition-all">
                    <MonitorPlay className="mr-2 h-4 w-4 text-blue-600" /> Lihat Video Demo
                  </Button>
                </motion.div>
              </motion.div>

              {/* Hero Visuals (Layered Composition) */}
              <motion.div
                className="flex-1 w-full max-w-lg lg:max-w-none relative perspective-1000"
                initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
              >
                <div className="relative aspect-square lg:aspect-[4/3] transform transition-transform hover:scale-[1.02] duration-500">
                  {/* Main Screen (Dashboard) */}
                  <div className="absolute top-0 right-0 w-[90%] rounded-2xl shadow-2xl border-[6px] border-zinc-900 bg-zinc-900 overflow-hidden z-20">
                    <Image src="/images/screen 16.png" alt="AtasKopi Dashboard" width={800} height={600} className="object-cover" />
                  </div>

                  {/* Secondary Screen (Mobile App) */}
                  <div className="absolute -bottom-6 left-4 w-[35%] rounded-[2.5rem] shadow-2xl border-[6px] border-zinc-900 bg-zinc-900 overflow-hidden z-30">
                    <div className="aspect-[9/19]">
                      <Image src="/images/screen 5.png" alt="AtasKopi Customer App" fill className="object-cover" />
                    </div>
                  </div>

                  {/* Floating Insights Card */}
                  <motion.div
                    className="absolute bottom-32 -right-6 bg-white p-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-zinc-100 z-40 max-w-[220px]"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-zinc-900">Total Member</p>
                        <p className="text-[10px] text-zinc-500">Update Real-time</p>
                      </div>
                    </div>
                    <p className="text-3xl font-extrabold text-blue-900">1,240</p>
                    <p className="text-xs text-green-600 mt-1 flex items-center bg-green-50 w-fit px-2 py-0.5 rounded-full font-medium">
                      <Zap className="h-3 w-3 mr-1 fill-current" /> +12% minggu ini
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Bento Grid Features (The "Visual Upgrade") */}
        <section id="ecosystem" className="py-24 bg-zinc-50/50" ref={sectionRef}>
          <div className="container mx-auto max-w-7xl px-4 md:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-blue-900">
                Ekosistem Digital Terintegrasi
              </h2>
              <p className="text-zinc-500 text-lg">
                Tinggalkan cara lama. Kami menyediakan semua tools yang Anda butuhkan dalam satu platform modern.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 grid-rows-2 gap-6 h-auto md:h-[600px]">

              {/* 1. Large Feature (POS) - 2x2 */}
              <motion.div
                className="md:col-span-2 md:row-span-2 relative rounded-3xl overflow-hidden bg-white border border-zinc-100 shadow-sm group"
                whileHover={{ y: -5, shadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
              >
                <div className="p-8 h-full flex flex-col z-10 relative">
                  <div className="h-12 w-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mb-6">
                    <LayoutGrid className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-zinc-900">POS Modern & Cepat</h3>
                  <p className="text-zinc-500 mb-6 max-w-sm">Proses pesanan dalam hitungan detik. Tampilan visual memudahkan kasir bekerja saat jam sibuk.</p>
                  <div className="flex-1 relative mt-4 rounded-t-xl overflow-hidden shadow-inner border border-zinc-100 bg-zinc-50">
                    <Image src="/images/screen 16.png" alt="POS Visual" fill className="object-cover object-top" />
                  </div>
                </div>
              </motion.div>

              {/* 2. Medium Feature (Analytics) - 1x2 */}
              <motion.div
                className="md:col-span-1 md:row-span-2 relative rounded-3xl overflow-hidden bg-zinc-900 text-white shadow-sm group"
                whileHover={{ y: -5 }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-zinc-900 z-0"></div>
                <div className="p-8 h-full flex flex-col relative z-10">
                  <div className="h-12 w-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white mb-6">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Real-time Analytics</h3>
                  <p className="text-zinc-400 text-sm mb-6">Pantau omzet dari mana saja via HP.</p>

                  {/* Abstract Chart Visual */}
                  <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-4">
                    {[40, 70, 50, 90, 65, 85].map((h, i) => (
                      <motion.div
                        key={i}
                        className="w-full bg-blue-500 rounded-t-md opacity-80"
                        initial={{ height: 0 }}
                        whileInView={{ height: `${h}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* 3. Small Feature (Loyalty) - 1x1 */}
              <motion.div
                className="bg-blue-50 rounded-3xl p-6 border border-blue-100 flex flex-col justify-between group cursor-default"
                whileHover={{ scale: 1.02 }}
              >
                <ShieldCheck className="h-8 w-8 text-blue-600 mb-2" />
                <div>
                  <h3 className="text-lg font-bold text-blue-900">Loyalty Program</h3>
                  <p className="text-sm text-blue-700/80 mt-1">Retensi pelanggan otomatis.</p>
                </div>
              </motion.div>

              {/* 4. Small Feature (Inventory) - 1x1 */}
              <motion.div
                className="bg-white rounded-3xl p-6 border border-zinc-100 flex flex-col justify-between group shadow-sm"
                whileHover={{ scale: 1.02 }}
              >
                <Coffee className="h-8 w-8 text-amber-600 mb-2" />
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">Inventory</h3>
                  <p className="text-sm text-zinc-500 mt-1">Stok sinkron otomatis.</p>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* Mobile Simulator Section */}
        <section id="demo" className="py-32 bg-zinc-900 overflow-hidden relative">
          <div className="container mx-auto max-w-7xl px-4 md:px-8 relative z-10">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-16">

              {/* Copy */}
              <div className="flex-1 space-y-8 text-white">
                <h2 className="text-4xl font-bold tracking-tighter">
                  Coba Aplikasi Pelanggan <br />
                  <span className="text-blue-400">Langsung di Sini.</span>
                </h2>
                <p className="text-zinc-400 text-lg max-w-md">
                  Rasakan pengalaman memesan yang mulus seperti pelanggan Anda. Tidak perlu install, langsung coba live demo-nya.
                </p>
                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span>Live Server Running</span>
                  </div>
                </div>

                {/* QR Code for Mobile Users */}
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm max-w-sm mt-8 hidden lg:block">
                  <p className="text-sm font-bold text-white mb-2">Scan untuk coba di HP</p>
                  <p className="text-xs text-zinc-400">Pengalaman terbaik di layar portrait.</p>
                </div>
              </div>

              {/* Phone Simulator Frame */}
              <div className="flex-1 flex justify-center lg:justify-end">
                <motion.div
                  className="relative w-[320px] h-[640px] bg-zinc-950 rounded-[3rem] border-8 border-zinc-900 shadow-2xl overflow-hidden ring-1 ring-white/20"
                >
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-zinc-900 rounded-b-2xl z-20"></div>

                  {/* Iframe */}
                  <iframe
                    src="http://localhost:4001/"
                    className="w-full h-full border-0 bg-white"
                    title="App Demo"
                  />

                  {/* Mobile Only Overlay (Visbile only on small screens if iframe acts up, but we hide it for now) */}
                  <div className="lg:hidden absolute inset-0 bg-black/80 flex items-center justify-center text-center p-6 z-30 opacity-0 pointer-events-none">
                    <p className="text-white">Buka di Desktop untuk simulasi, atau akses langsung di browser HP Anda.</p>
                  </div>
                </motion.div>
              </div>

            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-zinc-100 bg-white py-16">
          <div className="container mx-auto max-w-7xl px-4 md:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-3">
                <div className="relative h-8 w-8">
                  <Image src="/logo.png" alt="AtasKopi Logo" fill className="object-contain" />
                </div>
                <span className="text-xl font-bold text-blue-900">AtasKopi <span className="text-zinc-400 font-normal">for Business</span></span>
              </div>
              <p className="text-sm text-zinc-500">
                © 2026
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
