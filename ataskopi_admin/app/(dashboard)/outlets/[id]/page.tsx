import { db as prisma } from "@/lib/db";
import { OutletForm } from "../components/outlet-form";
import { TableManagement } from "../components/table-management";
import { StockManagement } from "../components/stock-management";
import { notFound } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function EditOutletPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const outlet = await prisma.outlet.findUnique({
        where: {
            id: params.id,
        },
        include: {
            tables: {
                orderBy: {
                    tableNumber: 'asc',
                },
            },
        },
    });

    if (!outlet) {
        notFound();
    }

    const formattedOutlet = {
        ...outlet,
        latitude: outlet.latitude ? Number(outlet.latitude) : null,
        longitude: outlet.longitude ? Number(outlet.longitude) : null,
    };

    const [products, outletProducts] = await Promise.all([
        prisma.product.findMany({
            include: { category: true },
            orderBy: { name: 'asc' },
            where: { isAvailable: true } // Only show enabled products to manage? Or all? Usually all to enable availability. But let's assume isAvailable on Product is 'global master switch'. If globally disabled, maybe hide? Let's show all for now or just active.
        }),
        prisma.outletProduct.findMany({
            where: { outletId: params.id }
        })
    ]);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Edit Outlet</h2>
                    <p className="text-sm text-muted-foreground">Manage location details, tables, and stock</p>
                </div>
            </div>

            <Tabs defaultValue="details" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="stock">Stock Management</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="space-y-4">
                    <div className="grid gap-8">
                        <OutletForm initialData={formattedOutlet} />
                        <TableManagement outletId={formattedOutlet.id} initialTables={formattedOutlet.tables} />
                    </div>
                </TabsContent>
                <TabsContent value="stock">
                    <StockManagement
                        outletId={formattedOutlet.id}
                        products={products}
                        initialOutletProducts={outletProducts}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
