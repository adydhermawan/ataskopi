import { db } from "@/lib/db";

export async function onRequestError(
    err: any,
    request: any,
    context: any
) {
    try {
        if (err && err.digest) {
            // Check if it already exists to avoid duplicate constraint errors
            const existing = await db.serverErrorLog.findUnique({
                where: { digest: err.digest }
            });
            if (!existing) {
                await db.serverErrorLog.create({
                    data: {
                        digest: err.digest,
                        message: err.message || String(err),
                        stack: err.stack || null,
                        path: request?.url || null,
                    }
                });
            }
        }
    } catch (e) {
        console.error("Failed to write server error log to database:", e);
    }
}
