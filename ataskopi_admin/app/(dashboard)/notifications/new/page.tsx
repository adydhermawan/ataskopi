import { db } from "@/lib/db";
import { NotificationForm } from "../components/notification-form";

export default async function NewNotificationPage() {
    // Fetch customers for user selection
    const customers = await db.user.findMany({
        where: { role: "customer" },
        select: {
            id: true,
            name: true,
            phone: true,
        },
        orderBy: { name: "asc" },
        take: 500,
    });

    return (
        <div className="flex flex-col gap-6 max-w-2xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Kirim Notifikasi</h1>
                <p className="text-muted-foreground">
                    Kirim notifikasi ke satu pelanggan atau semua pelanggan sekaligus.
                </p>
            </div>

            <NotificationForm customers={customers} />
        </div>
    );
}
