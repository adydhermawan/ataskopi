import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, MoreHorizontal, Trash, Eye, Bell, Tag, Star, Info } from "lucide-react";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationSearch } from "./components/notification-search";
import { DeleteNotificationButton } from "./components/delete-notification-button";

const categoryIcons: Record<string, any> = {
    transaction: Bell,
    promo: Tag,
    loyalty: Star,
    info: Info,
};

const categoryColors: Record<string, string> = {
    transaction: "bg-blue-100 text-blue-700",
    promo: "bg-orange-100 text-orange-700",
    loyalty: "bg-yellow-100 text-yellow-700",
    info: "bg-gray-100 text-gray-700",
};

function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('id-ID');
}

import { PageHeader } from "@/components/layout/page-header";

export default async function NotificationsPage(props: {
    searchParams: Promise<{ search?: string; category?: string }>;
}) {
    const searchParams = await props.searchParams;
    const search = searchParams.search;
    const category = searchParams.category;

    const notifications = await db.notification.findMany({
        where: {
            ...(search && {
                OR: [
                    { title: { contains: search, mode: "insensitive" } },
                    { message: { contains: search, mode: "insensitive" } },
                ],
            }),
            ...(category && { category }),
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    phone: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
        take: 100,
    });

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Notifikasi"
                description="Kelola dan kirim notifikasi ke pelanggan."
            >
                <Button asChild>
                    <Link href="/notifications/new">
                        <Plus className="mr-2 h-4 w-4" /> Kirim Notifikasi
                    </Link>
                </Button>
            </PageHeader>

            <div className="flex items-center gap-4">
                <NotificationSearch />
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[120px]">Kategori</TableHead>
                            <TableHead>Judul</TableHead>
                            <TableHead>Penerima</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Waktu</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {notifications.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    Tidak ada notifikasi ditemukan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            notifications.map((notification) => {
                                const CategoryIcon = categoryIcons[notification.category] || Bell;
                                return (
                                    <TableRow key={notification.id}>
                                        <TableCell>
                                            <Badge className={categoryColors[notification.category] || categoryColors.info}>
                                                <CategoryIcon className="mr-1 h-3 w-3" />
                                                {notification.category.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{notification.title}</div>
                                            <div className="text-sm text-muted-foreground line-clamp-1">
                                                {notification.message}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {notification.user?.name || 'Unknown'}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {notification.user?.phone}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={notification.isRead ? "secondary" : "default"}>
                                                {notification.isRead ? "Dibaca" : "Belum dibaca"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {formatTimeAgo(notification.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DeleteNotificationButton notificationId={notification.id} />
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
