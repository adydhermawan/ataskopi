"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Coffee, Loader2 } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const [phone, setPhone] = useState("")
    const [pin, setPin] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, pin }),
            })

            const data = await res.json()

            if (data.success) {
                // Redirect to dashboard
                router.push("/dashboard")
                router.refresh()
            } else {
                setError(data.error || "Login failed")
            }
        } catch (err) {
            setError("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    // Quick login buttons for testing
    const quickLogin = (testPhone: string, testPin: string) => {
        setPhone(testPhone)
        setPin(testPin)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-900 dark:to-zinc-800 p-4">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                            <Coffee className="h-10 w-10" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-bold">AtasKopi Admin</CardTitle>
                    <CardDescription>Sign in to your account</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="+6281234567890"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pin">PIN</Label>
                            <Input
                                id="pin"
                                type="password"
                                placeholder="Enter your PIN"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                required
                                disabled={loading}
                                maxLength={6}
                            />
                        </div>

                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In
                        </Button>
                    </form>

                    {/* Test Users Quick Login */}
                    <div className="mt-6 pt-6 border-t">
                        <p className="text-xs text-muted-foreground mb-3 text-center">Quick Login (Testing)</p>
                        <div className="space-y-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => quickLogin("+6281234567891", "123456")}
                            >
                                <span className="font-semibold mr-2">Admin</span>
                                <span className="text-xs text-muted-foreground">Full Access</span>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => quickLogin("+6281234567892", "123456")}
                            >
                                <span className="font-semibold mr-2">Kasir</span>
                                <span className="text-xs text-muted-foreground">Orders Only</span>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => quickLogin("+6281234567890", "123456")}
                            >
                                <span className="font-semibold mr-2">Customer</span>
                                <span className="text-xs text-muted-foreground">Customer App</span>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
