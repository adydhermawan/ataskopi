"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function NotificationSearch() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
    const [categoryValue, setCategoryValue] = useState(searchParams.get("category") || "all");

    const handleSearch = (value: string) => {
        setSearchValue(value);
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set("search", value);
            } else {
                params.delete("search");
            }
            router.push(`/notifications?${params.toString()}`);
        });
    };

    const handleCategoryChange = (value: string) => {
        setCategoryValue(value);
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (value && value !== "all") {
                params.set("category", value);
            } else {
                params.delete("category");
            }
            router.push(`/notifications?${params.toString()}`);
        });
    };

    return (
        <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Cari notifikasi..."
                    className="pl-10"
                    value={searchValue}
                    onChange={(e) => handleSearch(e.target.value)}
                />
            </div>
            <Select value={categoryValue} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    <SelectItem value="transaction">Transaksi</SelectItem>
                    <SelectItem value="promo">Promo</SelectItem>
                    <SelectItem value="loyalty">Loyalty</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
