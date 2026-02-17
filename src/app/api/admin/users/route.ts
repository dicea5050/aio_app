import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

// クライアント用の認証チェック用
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization') || '';
        const token = authHeader.replace('Bearer ', '');

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ユーザー一覧取得
        const { data, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) throw error;

        return NextResponse.json(data.users);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization') || '';
        const token = authHeader.replace('Bearer ', '');

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        // ユーザー作成
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true // 自動で確認済みにする
        });

        if (error) throw error;

        return NextResponse.json(data.user);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
