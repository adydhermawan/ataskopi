"use client";

import React, { createContext, useContext, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Package, ShoppingCart, TrendingUp, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

// --- MOCK USER CONTEXT ---
const MockUserContext = createContext({
    user: {
        id: "mock-id",
        name: "Budi Santoso",
        email: "owner@ataskopi.com",
        phone: "08123456789",
        role: "owner"
    },
    loading: false
});

const MockUserProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <MockUserContext.Provider value={{
            user: { id: "1", name: "Budi Santoso", role: "owner", email: "owner@ataskopi.com", phone: "08123456789" },
            loading: false
        }}>
            {children}
        </MockUserContext.Provider>
    );
};

// We need to override the hook import in Sidebar/Header. 
// Since we can't easily dependency inject module imports, we will just relying on the fact that 
// if I wrap this in my own Provider, the real hook *might* pick it up IF it uses the same Context object.
// BUT, the real hook imports `UserContext` from the file.
// So, the real `Sidebar` will try to use the real `UserContext`. 
// To make this work without changing real code, I might have to duplicate Sidebar/Header code here or 
// rely on the real `UserProvider` but mock the API response.
//
// MOCKING API RESPONSE IS EASIER! 
// I will just intercept the fetch in useEffect? No, that's messy.
//
// BETTER APPROACH: Just copy the Sidebar/Header code I need for the visual?
// Or, just make a "Simulated" layout here.
//
// Let's copy a simplified version of Sidebar and Header here to be safe and self-contained.

function MockSidebar() {
    return (
        <div className="hidden lg:block fixed left-0 top-0 bottom-0 z-30 w-72 h-screen border-r bg-white pt-16">
            <div className="fixed top-0 left-0 z-50 flex h-16 w-72 items-center border-b border-r bg-white px-6">
                <div className="flex items-center gap-3 font-bold text-xl text-blue-900">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-white">A</div>
                    <span>AtasKopi</span>
                </div>
            </div>
            <div className="p-4 space-y-1">
                <div className="px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded-lg flex gap-3 text-sm">Overview</div>
                <div className="px-4 py-2 text-zinc-600 hover:bg-zinc-50 rounded-lg flex gap-3 text-sm">Pesanan</div>
                <div className="px-4 py-2 text-zinc-600 hover:bg-zinc-50 rounded-lg flex gap-3 text-sm">Menu / Produk</div>
                <div className="px-4 py-2 text-zinc-600 hover:bg-zinc-50 rounded-lg flex gap-3 text-sm">Pelanggan</div>
                <div className="px-4 py-2 text-zinc-600 hover:bg-zinc-50 rounded-lg flex gap-3 text-sm">Laporan</div>
                <div className="px-4 py-2 text-zinc-600 hover:bg-zinc-50 rounded-lg flex gap-3 text-sm">Pengaturan</div>
            </div>
        </div>
    )
}

function MockHeader() {
    return (
        <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-white/80 px-6 backdrop-blur-xl">
            <div className="flex items-center text-sm text-zinc-500">
                Dashboard &gt; <span className="text-zinc-900 font-medium ml-1">Overview</span>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-medium">Budi Santoso</p>
                        <p className="text-xs text-zinc-500">Owner</p>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">BS</div>
                </div>
            </div>
        </header>
    )
}


// --- MOCK DASHBOARD CLIENT ---
function MockDashboard() {
    const data = {
        today: { totalRevenue: 15450000, totalOrders: 128, totalItems: 342, averageTicket: 120703 },
        history: [
            { date: "Sen", revenue: 12500000, orders: 110 },
            { date: "Sel", revenue: 13200000, orders: 115 },
            { date: "Rab", revenue: 14800000, orders: 130 },
            { date: "Kam", revenue: 14100000, orders: 125 },
            { date: "Jum", revenue: 18500000, orders: 160 },
            { date: "Sab", revenue: 21000000, orders: 195 },
            { date: "Min", revenue: 19800000, orders: 180 },
        ],
        pieData: [
            { name: "QRIS", value: 65 },
            { name: "Cash", value: 20 },
            { name: "Debit", value: 15 },
        ],
        topProducts: [
            { name: "Kopi Susu Gula Aren", qty: 450, revenue: 11250000 },
            { name: "Croissant Butter", qty: 210, revenue: 5250000 },
            { name: "Americano Iced", qty: 180, revenue: 4500000 },
            { name: "Matcha Latte", qty: 150, revenue: 4200000 },
            { name: "Caramel Macchiato", qty: 120, revenue: 4200000 },
        ]
    };

    const formatIDR = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
    const COLORS = ["#3b82f6", "#10b981", "#f59e0b"];

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-600 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue Hari Ini</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatIDR(data.today.totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground">+12% dari kemarin</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-sky-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pesanan</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-sky-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.today.totalOrders}</div>
                        <p className="text-xs text-muted-foreground">Order masuk hari ini</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Produk Terjual</CardTitle>
                        <Package className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.today.totalItems}</div>
                        <p className="text-xs text-muted-foreground">Item keluar dari stok</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rata-rata Tiket</CardTitle>
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatIDR(data.today.averageTicket)}</div>
                        <p className="text-xs text-muted-foreground">Nilai keranjang rata-rata</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 shadow-sm">
                    <CardHeader>
                        <CardTitle>Tren Penjualan (Mingguan)</CardTitle>
                        <CardDescription>Grafik pendapatan outlet 7 hari terakhir</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.history}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `Rp${val / 1000000}jt`} />
                                <Tooltip formatter={(val: any) => formatIDR(val as number)} cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="col-span-3 shadow-sm">
                    <CardHeader>
                        <CardTitle>Produk Terlaris</CardTitle>
                        <CardDescription>Top 5 menu minggu ini</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {data.topProducts.map((p, i) => (
                                <div key={i} className="flex items-center">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-500">
                                        {i + 1}
                                    </div>
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">{p.name}</p>
                                        <p className="text-xs text-muted-foreground">{p.qty} terjual</p>
                                    </div>
                                    <div className="ml-auto font-medium text-sm text-green-600">
                                        {formatIDR(p.revenue)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function ScreenshotDashboardPage() {
    return (
        <div className="flex min-h-screen w-full bg-slate-50">
            <MockSidebar />
            <div className="flex-1 flex flex-col min-h-screen lg:pl-72">
                <MockHeader />
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="mb-6 flex items-center justify-between">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500 bg-white px-3 py-1 rounded-md border shadow-sm">Outlet: Pusat (Jakarta)</span>
                        </div>
                    </div>
                    <MockDashboard />
                </main>
            </div>
        </div>
    )
}
