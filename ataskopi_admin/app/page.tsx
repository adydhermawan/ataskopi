import LandingPageClient from "@/components/landing-page-client";
import { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "AtasKopi for Business - Sistem POS & Laporan Keuangan Coffee Shop",
  description: "Platform all-in-one kelas enterprise untuk coffee shop. Dilengkapi POS responsif handphone, Laporan Keuangan SAK EMKM otomatis, loyalty program, dan proyeksi stok bahan baku cerdas.",
  keywords: [
    "ataskopi",
    "ataskopi for business",
    "sistem pos coffee shop",
    "aplikasi kasir kafe",
    "laporan keuangan emkm",
    "manajemen stok kopi",
    "pos responsif hp",
    "loyalty program kafe",
    "sistem kasir online"
  ],
  alternates: {
    canonical: "https://admin.ataskopi.dadi.web.id",
  },
  openGraph: {
    title: "AtasKopi for Business - Sistem POS & Laporan Keuangan Coffee Shop",
    description: "Tingkatkan efisiensi coffee shop Anda dengan platform kasir dan akuntansi digital terbaik. Coba live demo gratis sekarang!",
    url: "https://admin.ataskopi.dadi.web.id",
    siteName: "AtasKopi",
    images: [
      {
        url: "/images/screen 16.png",
        width: 1200,
        height: 630,
        alt: "AtasKopi Dashboard Preview",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AtasKopi for Business - Sistem POS & Laporan Keuangan Coffee Shop",
    description: "Tingkatkan efisiensi coffee shop Anda dengan platform kasir dan akuntansi digital terbaik. Coba live demo gratis sekarang!",
    images: ["/images/screen 16.png"],
  },
};

export default function Page() {
  return <LandingPageClient />;
}
