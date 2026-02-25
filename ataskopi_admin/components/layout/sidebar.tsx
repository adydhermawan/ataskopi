"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "@/config/nav-config";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrentUser } from "@/hooks/use-current-user";
import Image from "next/image";

interface SidebarProps {
    className?: string;
}

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();
    const { user, loading } = useCurrentUser();

    // Filter nav items based on user role
    const filteredNavItems = navItems.filter(item => {
        if (!user) return false;
        return item.roles.includes(user.role);
    });

    return (
        <div className={cn("relative h-screen border-r pt-16 md:w-72 lg:block hidden", className)}>

            <div className="fixed top-0 left-0 z-50 flex h-16 w-72 items-center border-b border-r bg-background/80 px-6 backdrop-blur-xl">
                <Link href="/dashboard" className="flex items-center gap-3 font-bold text-xl">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden bg-white">
                        <Image src="/logo.png" alt="AtasKopi" width={40} height={40} className="object-contain" />
                    </div>
                    <span>AtasKopi</span>
                </Link>
            </div>

            <ScrollArea className="h-full py-6">
                <div className="space-y-4 py-4">
                    <div className="px-3 py-2">
                        {loading ? (
                            <div className="text-sm text-muted-foreground px-3">Loading...</div>
                        ) : (
                            <div className="space-y-1">
                                {filteredNavItems.map((item) => (
                                    <Button
                                        key={item.href}
                                        asChild
                                        variant={pathname === item.href ? "secondary" : "ghost"}
                                        className={cn(
                                            "w-full justify-start gap-4",
                                            pathname === item.href ? "font-semibold bg-secondary/80" : "font-normal"
                                        )}
                                    >
                                        <Link href={item.href}>
                                            <item.icon className="h-5 w-5" />
                                            {item.title}
                                        </Link>
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
