"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "@/config/nav-config";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrentUser } from "@/hooks/use-current-user";
import Image from "next/image";
import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface SidebarProps {
    className?: string;
}

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();
    const { user, loading } = useCurrentUser();
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Filter nav items based on user role
    const filteredNavItems = navItems.filter(item => {
        if (!user) return false;
        return item.roles.includes(user.role);
    });

    // Auto-expand active groups on path change
    useEffect(() => {
        if (user) {
            filteredNavItems.forEach(item => {
                if (item.children) {
                    const hasActiveChild = item.children.some(child => pathname === child.href);
                    if (hasActiveChild) {
                        setExpandedGroups(prev => ({ ...prev, [item.title]: true }));
                    }
                }
            });
        }
    }, [pathname, user]);

    const toggleGroup = (title: string) => {
        setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
    };

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
                                {filteredNavItems.map((item) => {
                                    if (item.children) {
                                        const isExpanded = !!expandedGroups[item.title];
                                        return (
                                            <div key={item.title} className="space-y-1">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => toggleGroup(item.title)}
                                                    className="w-full justify-between gap-4 font-normal hover:bg-secondary/40"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <item.icon className="h-5 w-5" />
                                                        <span>{item.title}</span>
                                                    </div>
                                                    {isExpanded ? (
                                                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </Button>
                                                {isExpanded && (
                                                    <div className="pl-6 mt-1 space-y-1 border-l ml-5 border-slate-200 dark:border-zinc-800">
                                                        {item.children
                                                            .filter(child => !user || child.roles.includes(user.role))
                                                            .map((child) => (
                                                                <Button
                                                                    key={child.href}
                                                                    asChild
                                                                    variant={pathname === child.href ? "secondary" : "ghost"}
                                                                    className={cn(
                                                                        "w-full justify-start gap-4 h-9 px-3",
                                                                        pathname === child.href ? "font-semibold bg-secondary/80 text-secondary-foreground" : "font-normal text-muted-foreground hover:text-foreground"
                                                                    )}
                                                                >
                                                                    <Link href={child.href}>
                                                                        <child.icon className="h-4 w-4" />
                                                                        <span className="text-sm">{child.title}</span>
                                                                    </Link>
                                                                </Button>
                                                            ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    return (
                                        <Button
                                            key={item.href}
                                            asChild
                                            variant={pathname === item.href ? "secondary" : "ghost"}
                                            className={cn(
                                                "w-full justify-start gap-4",
                                                pathname === item.href ? "font-semibold bg-secondary/80" : "font-normal"
                                            )}
                                        >
                                            <Link href={item.href!}>
                                                <item.icon className="h-5 w-5" />
                                                {item.title}
                                            </Link>
                                        </Button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
