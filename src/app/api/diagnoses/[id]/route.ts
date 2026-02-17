import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        if (!id) {
            return NextResponse.json(
                { error: 'IDは必須です' },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('diagnoses')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('DB取得エラー:', error);
            return NextResponse.json(
                { error: '診断結果が見つかりませんでした' },
                { status: 404 }
            );
        }

        // DBのフィールド名（snake_case）を型定義（camelCase）に変換
        const result = {
            id: data.id,
            url: data.url,
            industry: data.industry,
            region: data.region,
            totalScore: data.total_score,
            rank: data.rank,
            scores: data.scores,
            scoreDetails: data.score_details,
            aiCheck: data.ai_check,
            pageScores: data.page_scores,
            pagesAnalyzed: data.pages_analyzed,
            createdAt: data.created_at,
        };

        return NextResponse.json(result);
    } catch (error) {
        console.error('診断結果取得エラー:', error);
        return NextResponse.json(
            { error: '診断結果の取得中にエラーが発生しました' },
            { status: 500 }
        );
    }
}
