import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { UserProvider } from "@/hooks/use-current-user";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <UserProvider>
            <div className="flex min-h-screen w-full relative">
                <Sidebar className="hidden lg:block fixed left-0 top-0 bottom-0 z-30 w-72 h-screen" />

                <div className="flex-1 flex flex-col min-h-screen lg:pl-72 transition-all duration-300 ease-in-out">
                    <Header />
                    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 dark:bg-zinc-900/50">
                        {children}
                    </main>
                </div>
            </div>
        </UserProvider>
    );
}
