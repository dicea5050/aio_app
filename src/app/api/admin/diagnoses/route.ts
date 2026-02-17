import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// 診断結果一覧取得
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search') || '';
        const offset = (page - 1) * limit;

        let query = supabaseAdmin
            .from('diagnoses')
            .select('id, url, industry, region, total_score, rank, pages_analyzed, created_at', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (search) {
            query = query.or(`url.ilike.%${search}%,industry.ilike.%${search}%,region.ilike.%${search}%`);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('DB取得エラー:', error);
            return NextResponse.json({ data: [], total: 0 });
        }

        return NextResponse.json({ data: data || [], total: count || 0 });
    } catch (error) {
        console.error('管理API エラー:', error);
        return NextResponse.json({ data: [], total: 0 });
    }
}
