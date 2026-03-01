import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client (Keys can be sourced from Vercel env or local .env)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
    try {
        if (!supabaseUrl || !supabaseKey) {
            console.error('Supabase credentials missing in env');
            return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const extension = file.name.split('.').pop() || 'jpg';
        const filename = `${crypto.randomUUID()}.${extension}`;

        // We will default to a bucket named 'images'
        const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'images';

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(filename, buffer, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Supabase storage error:', error);
            return NextResponse.json({ error: `Upload to Supabase failed: ${error.message}` }, { status: 500 });
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filename);

        return NextResponse.json({
            success: true,
            url: publicUrl
        });
    } catch (error: any) {
        console.error('Server upload error:', error);
        return NextResponse.json({ error: error.message || 'Upload failed due to server error' }, { status: 500 });
    }
}
