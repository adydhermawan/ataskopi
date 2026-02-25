"use client";

import { useState } from "react";
import { Table as TableIcon, Plus, Trash } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTable, updateTable, deleteTable } from "@/actions/tables";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Table {
    id: string;
    tableNumber: string;
    qrCode: string;
}

interface TableManagementProps {
    outletId: string;
    initialTables: Table[];
}

export function TableManagement({ outletId, initialTables }: TableManagementProps) {
    const router = useRouter();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tableNumber, setTableNumber] = useState("");

    // For simplicity, we auto-generate QR code content as a URL or unique ID
    // In production, this might link to the customer app with outlet/table params
    // Generate a full URL that the PWA/App can intercept or the browser can open
    // Format: https://devappataskopi.dadi.web.id/?qr=ATASKOPI-TABLE-[NUMBER]-[OUTLET_ID]
    // The "ATASKOPI-TABLE" prefix is kept for backward compatibility if needed, 
    // but effectively the whole string is passed in the ?qr= parameter.
    const generateQrCode = (num: string) =>
        `https://devappataskopi.dadi.web.id/?qr=ATASKOPI-TABLE-${num}-${outletId}`;

    async function onAdd() {
        if (!tableNumber) return;
        setLoading(true);
        try {
            const res = await createTable({
                outletId,
                tableNumber,
                qrCode: generateQrCode(tableNumber),
            });
            if (res.success) {
                toast.success("Table added");
                setTableNumber("");
                setIsAddOpen(false);
                router.refresh();
            } else {
                toast.error(res.error || "Failed to add table");
            }
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    async function onDelete(id: string) {
        if (!confirm("Are you sure you want to delete this table?")) return;
        setLoading(true);
        try {
            const res = await deleteTable(id);
            if (res.success) {
                toast.success("Table deleted");
                router.refresh();
            } else {
                toast.error(res.error || "Failed to delete table");
            }
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="mt-8">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle className="text-xl">Tables Management</CardTitle>
                    <CardDescription>
                        Generate QR codes for dine-in tables.
                    </CardDescription>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Table
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Table</DialogTitle>
                            <DialogDescription>
                                Enter a table number to generate a QR code.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="tableNumber">Table Number</Label>
                                <Input
                                    id="tableNumber"
                                    placeholder="e.g. 01, A1"
                                    value={tableNumber}
                                    onChange={(e) => setTableNumber(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={onAdd} disabled={loading || !tableNumber}>
                                {loading ? "Adding..." : "Add Table"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {initialTables.map((table) => (
                        <div
                            key={table.id}
                            className="flex flex-col items-center p-4 border rounded-lg bg-slate-50 relative group"
                        >


                            <div className="bg-white p-2 rounded border mb-2">
                                <QRCodeSVG
                                    value={table.qrCode}
                                    size={100}
                                    level="M"
                                    includeMargin={true}
                                />
                            </div>
                            <span className="font-bold text-lg">Table {table.tableNumber}</span>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => onDelete(table.id)}
                                    disabled={loading}
                                >
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {initialTables.length === 0 && (
                        <div className="col-span-full py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                            No tables found. Add your first table to get started.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
