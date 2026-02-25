import { OutletForm } from "../components/outlet-form";

export default function NewOutletPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">New Outlet</h2>
                    <p className="text-sm text-muted-foreground">Add a new location</p>
                </div>
            </div>
            <OutletForm />
        </div>
    );
}
