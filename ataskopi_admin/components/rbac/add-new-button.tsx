"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { useCanPerform } from "@/hooks/use-current-user"

interface AddNewButtonProps {
    href: string
    resource: string
    label?: string
}

export function AddNewButton({ href, resource, label = "Add New" }: AddNewButtonProps) {
    const canCreate = useCanPerform('create', resource)

    if (!canCreate) return null

    return (
        <Button asChild>
            <Link href={href}>
                <Plus className="mr-2 h-4 w-4" /> {label}
            </Link>
        </Button>
    )
}
