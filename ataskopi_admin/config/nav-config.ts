import {
    LayoutDashboard,
    ShoppingBag,
    Coffee,
    Users,
    Settings,
    Store,
    CreditCard,
    History,
    Bell,
    Gift,
    Ticket,
    Megaphone,
    ShieldCheck
} from "lucide-react";

export interface NavItem {
    title: string;
    href: string;
    icon: any;
    roles: string[]; // "admin", "owner", "kasir"
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

