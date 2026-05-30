import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const digest = searchParams.get("digest");

        if (!digest) {
            return NextResponse.json({ error: "Digest required" }, { status: 400 });
        }

        const log = await db.serverErrorLog.findUnique({
            where: { digest }
        });

        if (!log) {
            return NextResponse.json({ error: "Log not found" }, { status: 404 });
        }

        return NextResponse.json({
            message: log.message,
            stack: log.stack,
            path: log.path,
            createdAt: log.createdAt
        });
    } catch (error: any) {
        console.error("Error looking up digest:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
