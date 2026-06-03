"use client";

import { Menu, ChevronDown, ChevronUp } from "lucide-react";
import { UserNav } from "@/components/layout/user-nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/sidebar";
import { navItems } from "@/config/nav-config";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Coffee } from "lucide-react";
import { Breadcrumbs } from "./breadcrumbs";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useState, useEffect } from "react";

export function Header() {
    const pathname = usePathname();
    const { user, loading } = useCurrentUser();
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Filter nav items based on user role
    const filteredNavItems = user ? navItems.filter(item => item.roles.includes(user.role)) : [];

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
        <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-background/60 px-6 backdrop-blur-xl transition-all supports-[backdrop-filter]:bg-background/60">

            {/* Mobile Menu Trigger */}
            <div className="flex items-center gap-2 lg:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Toggle Menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[80vw] sm:w-[350px] p-0">
                        <SheetTitle className="sr-only">Menu Navigasi</SheetTitle> {/* Accessibility Fix */}
                        <SheetDescription className="sr-only">Menu utama aplikasi</SheetDescription>
                        <div className="flex h-16 items-center border-b px-6">
                            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <Coffee className="h-5 w-5" />
                                </div>
                                <span>AtasKopi</span>
                            </Link>
                        </div>
                        <div className="flex flex-col gap-1 p-4 max-h-[calc(100vh-5rem)] overflow-y-auto">
                            {loading ? (
                                <div className="text-sm text-muted-foreground px-3">Loading...</div>
                            ) : (
                                filteredNavItems.map((item) => {
                                    if (item.children) {
                                        const isExpanded = !!expandedGroups[item.title];
                                        return (
                                            <div key={item.title} className="space-y-1">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => toggleGroup(item.title)}
                                                    className="w-full justify-between gap-4 font-normal hover:bg-secondary/40 animate-none"
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
                                                    <div className="pl-6 mt-1 space-y-1 border-l ml-5 border-slate-200 dark:border-zinc-800 animate-none">
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
                                })
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
                {/* Mobile Logo Text only */}
                <span className="font-bold text-lg md:hidden">AtasKopi</span>
            </div>

            {/* Desktop/Tablet Breadcrumbs */}
            <div className="hidden lg:flex items-center">
                <Breadcrumbs />
            </div>

            <div className="flex items-center gap-4">
                {/* Add Theme Toggle Here if needed */}
                <UserNav />
            </div>
        </header>
    );
}
