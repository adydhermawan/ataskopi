import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Ping Supabase REST API to keep the project active
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
            // A simple lightweight REST request (e.g., retrieving 1 row from brand_settings)
            // This is purely to register activity on the Supabase free tier.
            await fetch(`${supabaseUrl}/rest/v1/brand_settings?select=id&limit=1`, {
                method: 'GET',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                },
                // Short timeout to prevent health check from hanging if Supabase is slow
                signal: AbortSignal.timeout(3000)
            }).catch(e => console.error("Supabase keep-alive warning:", e));
        }

        return NextResponse.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        });
    } catch (error) {
        console.error("Health check error:", error);
        return NextResponse.json({
            status: 'error',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        }, { status: 500 });
    }
}
