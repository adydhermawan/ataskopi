"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Tag, Star, Info, Users, User } from "lucide-react";

interface Customer {
    id: string;
    name: string;
    phone: string;
}

interface NotificationFormProps {
    customers: Customer[];
}

export function NotificationForm({ customers }: NotificationFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [sendToAll, setSendToAll] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [category, setCategory] = useState("info");
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!title.trim() || !message.trim()) {
            setError("Judul dan pesan wajib diisi");
            return;
        }

        if (!sendToAll && !selectedUserId) {
            setError("Pilih penerima notifikasi");
            return;
        }

        try {
            const res = await fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: sendToAll ? null : selectedUserId,
                    category,
                    title: title.trim(),
                    message: message.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Gagal mengirim notifikasi");
                return;
            }

            startTransition(() => {
                router.push("/notifications");
                router.refresh();
            });
        } catch (err) {
            console.error("Submit error:", err);
            setError("Terjadi kesalahan saat mengirim notifikasi");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {error}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Penerima
                    </CardTitle>
                    <CardDescription>
                        Pilih siapa yang akan menerima notifikasi ini.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Kirim ke Semua Pelanggan</Label>
                            <p className="text-sm text-muted-foreground">
                                {sendToAll
                                    ? `Notifikasi akan dikirim ke ${customers.length} pelanggan`
                                    : "Pilih pelanggan spesifik di bawah"}
                            </p>
                        </div>
                        <Switch checked={sendToAll} onCheckedChange={setSendToAll} />
                    </div>

                    {!sendToAll && (
                        <div className="space-y-2">
                            <Label>Pilih Pelanggan</Label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih pelanggan..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map((customer) => (
                                        <SelectItem key={customer.id} value={customer.id}>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                <span>{customer.name}</span>
                                                <span className="text-muted-foreground">
                                                    ({customer.phone})
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Detail Notifikasi
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="category">Kategori</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="transaction">
                                    <div className="flex items-center gap-2">
                                        <Bell className="h-4 w-4 text-blue-600" />
                                        <span>Transaksi</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="promo">
                                    <div className="flex items-center gap-2">
                                        <Tag className="h-4 w-4 text-orange-600" />
                                        <span>Promo</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="loyalty">
                                    <div className="flex items-center gap-2">
                                        <Star className="h-4 w-4 text-yellow-600" />
                                        <span>Loyalty</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="info">
                                    <div className="flex items-center gap-2">
                                        <Info className="h-4 w-4 text-gray-600" />
                                        <span>Info</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Judul Notifikasi</Label>
                        <Input
                            id="title"
                            placeholder="Contoh: Pesanan Anda sudah siap!"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="message">Pesan</Label>
                        <Textarea
                            id="message"
                            placeholder="Tulis pesan notifikasi di sini..."
                            rows={4}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex gap-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isPending}
                >
                    Batal
                </Button>
                <Button type="submit" disabled={isPending}>
                    {isPending ? "Mengirim..." : "Kirim Notifikasi"}
                </Button>
            </div>
        </form>
    );
}
