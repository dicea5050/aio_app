import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// 統計データ取得
export async function GET(request: NextRequest) {
    try {
        const { data: diagnoses, error } = await supabaseAdmin
            .from('diagnoses')
            .select('total_score, rank, created_at');

        if (error || !diagnoses) {
            return NextResponse.json({
                totalDiagnoses: 0,
                averageScore: 0,
                rankDistribution: {},
                recentCount: 0,
            });
        }

        const totalDiagnoses = diagnoses.length;
        const averageScore = totalDiagnoses > 0
            ? Math.round(diagnoses.reduce((sum, d) => sum + d.total_score, 0) / totalDiagnoses)
            : 0;

        const rankDistribution: Record<string, number> = {};
        diagnoses.forEach(d => {
            rankDistribution[d.rank] = (rankDistribution[d.rank] || 0) + 1;
        });

        // 直近30日
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentCount = diagnoses.filter(
            d => new Date(d.created_at) >= thirtyDaysAgo
        ).length;

        return NextResponse.json({
            totalDiagnoses,
            averageScore,
            rankDistribution,
            recentCount,
        });
    } catch (error) {
        console.error('統計API エラー:', error);
        return NextResponse.json({
            totalDiagnoses: 0,
            averageScore: 0,
            rankDistribution: {},
            recentCount: 0,
        });
    }
}
