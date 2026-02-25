"use client";

import { useState } from "react";
import { Product, OutletProduct, Category } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { updateOutletProductStatus } from "@/actions/outlet-products";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface StockManagementProps {
    outletId: string;
    products: (Product & { category: Category })[];
    initialOutletProducts: OutletProduct[];
}

export function StockManagement({ outletId, products, initialOutletProducts }: StockManagementProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [outletProducts, setOutletProducts] = useState<Record<string, boolean>>(
        initialOutletProducts.reduce((acc, curr) => ({
            ...acc,
            [curr.productId]: curr.isAvailable
        }), {} as Record<string, boolean>)
    );

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleToggle = async (productId: string, currentStatus: boolean) => {
        // Optimistic update
        setOutletProducts(prev => ({
            ...prev,
            [productId]: !currentStatus
        }));

        const result = await updateOutletProductStatus(outletId, productId, !currentStatus);

        if (!result.success) {
            // Revert on failure
            setOutletProducts(prev => ({
                ...prev,
                [productId]: currentStatus
            }));
            toast.error("Failed to update status");
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Stock Availability</CardTitle>
                <div className="flex w-full max-w-sm items-center space-x-2">
                    <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {filteredProducts.map((product) => {
                        // Default to true (available) if no record exists yet
                        // Or maybe default to true is risky? 
                        // The schema default is true. So if no record, it implies available? 
                        // Or implies "global default". 
                        // Let's assume if no record, it's available (default behavior).
                        const isAvailable = outletProducts[product.id] ?? true;

                        return (
                            <div key={product.id} className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <div className="text-sm font-medium">{product.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        <Badge variant="outline" className="mr-2">{product.category.name}</Badge>
                                        IDR {Number(product.basePrice).toLocaleString()}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className={`text-sm ${isAvailable ? "text-green-600 font-medium" : "text-red-500"}`}>
                                        {isAvailable ? "Available" : "Unavailable"}
                                    </span>
                                    <Switch
                                        checked={isAvailable}
                                        onCheckedChange={() => handleToggle(product.id, isAvailable)}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    {filteredProducts.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-6">
                            No products found
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
