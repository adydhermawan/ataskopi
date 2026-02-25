"use client";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

interface DeleteNotificationButtonProps {
    notificationId: string;
}

export function DeleteNotificationButton({ notificationId }: DeleteNotificationButtonProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleDelete = async () => {
        if (!confirm("Apakah Anda yakin ingin menghapus notifikasi ini?")) return;

        try {
            const res = await fetch(`/api/notifications/${notificationId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                startTransition(() => {
                    router.refresh();
                });
            } else {
                alert("Gagal menghapus notifikasi");
            }
        } catch (error) {
            console.error("Delete error:", error);
            alert("Terjadi kesalahan saat menghapus");
        }
    };

    return (
        <DropdownMenuItem
            className="text-destructive cursor-pointer"
            onClick={handleDelete}
            disabled={isPending}
        >
            <Trash className="mr-2 h-4 w-4" />
            {isPending ? "Menghapus..." : "Hapus"}
        </DropdownMenuItem>
    );
}
