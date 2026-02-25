"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const routeMap: Record<string, string> = {
    dashboard: "Dashboard",
    orders: "Pesanan",
    live: "Masuk",
    history: "Riwayat",
    products: "Produk & Menu",
    categories: "Kategori",
    customers: "Pelanggan",
    notifications: "Notifikasi",
    outlets: "Data Outlet",
    marketing: "Marketing",
    vouchers: "Vouchers",
    promos: "Promos",
    loyalty: "Loyalty Points",
    settings: "Pengaturan",
    new: "Baru",
};

export function Breadcrumbs() {
    const pathname = usePathname();
    const paths = pathname.split("/").filter((path) => path !== "");

    return (
        <nav className="flex items-center space-x-1 text-sm font-medium text-muted-foreground">
            <Link
                href="/dashboard"
                className="flex items-center hover:text-foreground transition-colors"
            >
                <Home className="h-4 w-4" />
            </Link>
            {paths.map((path, index) => {
                const href = `/${paths.slice(0, index + 1).join("/")}`;
                const isLast = index === paths.length - 1;
                const label = routeMap[path] || path.charAt(0).toUpperCase() + path.slice(1);

                return (
                    <div key={path} className="flex items-center">
                        <ChevronRight className="h-4 w-4 mx-1" />
                        {isLast ? (
                            <span className="text-foreground font-semibold">{label}</span>
                        ) : (
                            <Link
                                href={href}
                                className="hover:text-foreground transition-colors capitalize"
                            >
                                {label}
                            </Link>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
