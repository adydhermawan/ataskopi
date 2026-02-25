"use client";

import { Menu } from "lucide-react";
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

export function Header() {
    const pathname = usePathname();

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
                        <div className="flex flex-col gap-1 p-4">
                            {navItems.map((item) => (
                                <Button
                                    key={item.href}
                                    asChild
                                    variant={pathname === item.href ? "secondary" : "ghost"}
                                    className={cn(
                                        "w-full justify-start gap-4",
                                        pathname === item.href ? "font-semibold" : "font-normal"
                                    )}
                                >
                                    <Link href={item.href}>
                                        <item.icon className="h-5 w-5" />
                                        {item.title}
                                    </Link>
                                </Button>
                            ))}
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
