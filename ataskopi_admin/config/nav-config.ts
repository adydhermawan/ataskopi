import {
    LayoutDashboard,
    ShoppingBag,
    Coffee,
    Users,
    Settings,
    Store,
    History,
    Bell,
    Gift,
    Ticket,
    Megaphone,
    ShieldCheck,
    Package,
    ClipboardList,
    Receipt,
    Wallet,
    TrendingUp,
    ShoppingCart,
    FileText,
    ArrowDownUp,
    BookOpen
} from "lucide-react";

export interface NavItem {
    title: string;
    href?: string;
    icon: any;
    roles: string[]; // "admin", "owner", "kasir"
    children?: {
        title: string;
        href: string;
        icon: any;
        roles: string[];
    }[];
}

export const navItems: NavItem[] = [
    {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["admin", "owner", "kasir"],
    },
    {
        title: "Pesanan Masuk",
        href: "/orders/live",
        icon: ShoppingBag,
        roles: ["admin", "owner", "kasir"],
    },
    {
        title: "Riwayat Pesanan",
        href: "/orders/history",
        icon: History,
        roles: ["admin", "owner", "kasir"],
    },
    {
        title: "Produk & Menu",
        href: "/products",
        icon: Coffee,
        roles: ["admin", "owner"],
    },
    {
        title: "Kategori",
        href: "/categories",
        icon: LayoutDashboard,
        roles: ["admin", "owner"],
    },
    {
        title: "Pelanggan",
        href: "/customers",
        icon: Users,
        roles: ["admin", "owner"],
    },
    {
        title: "Staff & Team",
        href: "/staff",
        icon: ShieldCheck,
        roles: ["admin", "owner"],
    },
    {
        title: "Notifikasi",
        href: "/notifications",
        icon: Bell,
        roles: ["admin", "owner"],
    },
    {
        title: "Data Outlet",
        href: "/outlets",
        icon: Store,
        roles: ["admin", "owner"],
    },
    {
        title: "Stok & Pengeluaran",
        icon: Package,
        roles: ["admin", "owner", "kasir"],
        children: [
            {
                title: "Bahan Baku",
                href: "/inventory/materials",
                icon: Package,
                roles: ["admin", "owner", "kasir"],
            },
            {
                title: "Pembelian",
                href: "/inventory/purchases",
                icon: ShoppingCart,
                roles: ["admin", "owner", "kasir"],
            },
            {
                title: "Stock Opname",
                href: "/inventory/opname",
                icon: ClipboardList,
                roles: ["admin", "owner", "kasir"],
            },
            {
                title: "Laporan Stok",
                href: "/inventory/report",
                icon: FileText,
                roles: ["admin", "owner", "kasir"],
            },
            {
                title: "Pengeluaran",
                href: "/finance/expenses",
                icon: Receipt,
                roles: ["admin", "owner"],
            },
        ]
    },
    {
        title: "Laporan Keuangan",
        icon: TrendingUp,
        roles: ["admin", "owner"],
        children: [
            {
                title: "Catatan Kas Harian",
                href: "/finance/daily-cash",
                icon: BookOpen,
                roles: ["admin", "owner"],
            },
            {
                title: "Tutup Buku",
                href: "/finance/closing",
                icon: FileText,
                roles: ["admin", "owner"],
            },
            {
                title: "Laba Rugi",
                href: "/finance/profit",
                icon: TrendingUp,
                roles: ["admin", "owner"],
            },
            {
                title: "Arus Kas",
                href: "/finance/cash-flow",
                icon: ArrowDownUp,
                roles: ["admin", "owner"],
            },
            {
                title: "Neraca",
                href: "/finance/balance-sheet",
                icon: FileText,
                roles: ["admin", "owner"],
            },
            {
                title: "Aset & Balik Modal",
                href: "/finance/assets",
                icon: Wallet,
                roles: ["admin", "owner"],
            },
        ]
    },
    {
        title: "Loyalty Points",
        href: "/marketing/loyalty",
        icon: Gift,
        roles: ["admin", "owner"],
    },
    {
        title: "Vouchers",
        href: "/marketing/vouchers",
        icon: Ticket,
        roles: ["admin", "owner"],
    },
    {
        title: "Promos",
        href: "/marketing/promos",
        icon: Megaphone,
        roles: ["admin", "owner"],
    },
    {
        title: "Pengaturan",
        href: "/settings",
        icon: Settings,
        roles: ["admin", "owner", "kasir"],
    },
];
