import { NextRequest, NextResponse } from 'next/server';
import { crawlDomain } from '@/lib/crawler';
import { analyzePages } from '@/lib/analyzer';
import { checkAICitation } from '@/lib/gemini';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { DiagnosisResult } from '@/types';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url, industry, region } = body;

        if (!url || !industry || !region) {
            return NextResponse.json(
                { error: 'URL、業種、地域は必須です' },
                { status: 400 }
            );
        }

        // 1. クロール
        const pages = await crawlDomain(url);
        if (pages.length === 0) {
            return NextResponse.json(
                { error: 'サイトのクロールに失敗しました。URLを確認してください。' },
                { status: 400 }
            );
        }

        // 2. ルールベース分析
        const analysis = analyzePages(pages);

        // 3. Gemini AI引用チェック（Grounding with Google Search）
        const siteTitle = pages[0]?.title || '';
        const siteDescription = pages[0]?.metaDescription || '';
        const aiCheck = await checkAICitation(url, industry, region, siteTitle, siteDescription);

        // 4. AI引用結果をスコアに反映
        //    AIに引用されていない場合、スコアを大幅に減点する
        //    （100点満点のルールベーススコアに対して、AI引用結果で補正）
        let adjustedScore = analysis.totalScore;
        let adjustedRank = analysis.rank;
        let adjustedScores = { ...analysis.scores };
        let adjustedScoreDetails = JSON.parse(JSON.stringify(analysis.scoreDetails)); // Deep copy
        let adjustedPageScores = [...analysis.pageScores]; // Shallow copy of array is enough as we map new objects

        if (aiCheck) {
            const citedCount = aiCheck.queries.filter(q => q.cited).length;
            const totalQueries = aiCheck.queries.length || 1;
            const citationRate = citedCount / totalQueries;
            let penaltyMultiplier = 1.0;

            if (citationRate === 0) {
                // AI引用率0%: AIOスコアなのにAIに全く認識されていない → 大幅減点
                // 例: 76点 → 30点(E), 60点 → 24点(E), 90点 → 36点(D)
                penaltyMultiplier = 0.40;
            } else if (citationRate < 0.5) {
                // AI引用率50%未満: かなり厳しい補正
                // 例: 76点 → 46点(D)
                penaltyMultiplier = 0.60;
            } else if (citationRate < 1.0) {
                // AI引用率50%以上100%未満: 中程度の補正
                // 例: 76点 → 61点(C)
                penaltyMultiplier = 0.80;
            }
            // AI引用率100%: 減点なし

            // 総合スコアの補正
            adjustedScore = Math.max(10, Math.round(adjustedScore * penaltyMultiplier));

            // 詳細スコア（5軸）の補正
            Object.keys(adjustedScores).forEach(key => {
                const k = key as keyof typeof adjustedScores;
                adjustedScores[k] = Math.max(2, Math.round(adjustedScores[k] * penaltyMultiplier));
            });

            // 詳細スコア詳細情報の補正
            Object.keys(adjustedScoreDetails).forEach(key => {
                const k = key as keyof typeof adjustedScoreDetails;
                adjustedScoreDetails[k].score = Math.max(2, Math.round(adjustedScoreDetails[k].score * penaltyMultiplier));
            });

            // ページ別スコアの補正
            adjustedPageScores = adjustedPageScores.map(page => ({
                ...page,
                score: Math.max(5, Math.round(page.score * penaltyMultiplier))
            }));

            // 補正後のランク再判定
            if (adjustedScore >= 90) adjustedRank = 'A';
            else if (adjustedScore >= 75) adjustedRank = 'B';
            else if (adjustedScore >= 55) adjustedRank = 'C';
            else if (adjustedScore >= 35) adjustedRank = 'D';
            else adjustedRank = 'E';
        }

        // 5. IDを生成
        const id = crypto.randomUUID();

        // 6. 結果を構築
        const result: DiagnosisResult = {
            id,
            url,
            industry,
            region,
            totalScore: adjustedScore,
            rank: adjustedRank,
            scores: adjustedScores,
            scoreDetails: adjustedScoreDetails,
            aiCheck,
            pageScores: adjustedPageScores,
            pagesAnalyzed: pages.length,
            createdAt: new Date().toISOString(),
        };

        // 7. Supabaseに保存（エラーが出ても結果は返す）
        try {
            await supabaseAdmin.from('diagnoses').insert({
                id,
                url,
                industry,
                region,
                total_score: adjustedScore,
                rank: adjustedRank,
                scores: adjustedScores,
                score_details: adjustedScoreDetails,
                ai_check: aiCheck,
                page_scores: adjustedPageScores,
                pages_analyzed: pages.length,
            });
        } catch (dbError) {
            console.error('DB保存エラー:', dbError);
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('分析エラー:', error);
        return NextResponse.json(
            { error: '分析中にエラーが発生しました' },
            { status: 500 }
        );
    }
}
