import { GoogleGenAI } from '@google/genai';
import { AICheckResult } from '@/types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// レートリミット対策: 遅延関数
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// レートリミット対策: リトライ付きAPI呼び出し
async function generateWithRetry(
    contents: string,
    useGrounding: boolean = false,
    maxRetries = 3
): Promise<{ text: string; groundingMetadata?: any }> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const config: any = {};
            if (useGrounding) {
                config.tools = [{ googleSearch: {} }];
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents,
                config,
            });

            return {
                text: response.text || '',
                groundingMetadata: response.candidates?.[0]?.groundingMetadata,
            };
        } catch (error: any) {
            const is429 = error?.message?.includes('429') || error?.message?.includes('quota');
            if (is429 && attempt < maxRetries - 1) {
                const waitTime = Math.min(5000 * Math.pow(2, attempt), 30000);
                console.log(`Gemini API レートリミット - ${waitTime / 1000}秒後にリトライ (${attempt + 1}/${maxRetries})`);
                await delay(waitTime);
            } else {
                throw error;
            }
        }
    }
    throw new Error('リトライ上限に達しました');
}

export async function checkAICitation(
    url: string,
    industry: string,
    region: string,
    siteTitle: string,
    siteDescription: string
): Promise<AICheckResult> {
    try {
        // 業種×地域に関連する質問を生成（Groundingあり）
        const queries = [
            `${region}で${industry}のおすすめの会社を教えてください`,
            `${region}の${industry}について詳しく教えてください`,
            `${industry}を${region}で探しています。どこがいいですか？`,
        ];

        const results: { query: string; response: string; cited: boolean }[] = [];
        let citedCount = 0;

        for (let i = 0; i < queries.length; i++) {
            const query = queries[i];

            // レートリミット対策: クエリ間に3秒の遅延
            if (i > 0) {
                await delay(3000);
            }

            try {
                const result = await generateWithRetry(query, true);
                const response = result.text;

                // URLまたはサイト名が回答に含まれるかチェック（厳格判定）
                const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '');
                const cited: boolean = response.includes(domain) ||
                    (!!siteTitle && siteTitle.length >= 3 && response.includes(siteTitle));

                if (cited) citedCount++;

                results.push({
                    query,
                    response: response.substring(0, 500) + (response.length > 500 ? '...' : ''),
                    cited,
                });
            } catch (apiError: any) {
                console.error('Gemini API個別クエリエラー:', apiError?.message || apiError);
                results.push({
                    query,
                    response: `（API応答エラー: ${apiError?.message || '不明なエラー'}）`,
                    cited: false,
                });
            }
        }

        // 引用率の評価文
        const citationRate = citedCount / queries.length;
        let citationLevel: string;
        if (citationRate === 0) {
            citationLevel = '引用率0%で、AI検索において全く認識されていない深刻な状態です';
        } else if (citationRate < 0.5) {
            citationLevel = `引用率${Math.round(citationRate * 100)}%で、AI検索での認知度は非常に低い状態です`;
        } else if (citationRate < 1.0) {
            citationLevel = `引用率${Math.round(citationRate * 100)}%で、一部のクエリでは認識されていますが不十分です`;
        } else {
            citationLevel = '全てのテスト質問でAIに引用されており、良好な状態です';
        }

        // 全体的な評価を生成
        const assessmentPrompt = `
以下のウェブサイトのAI検索最適化（AIO）の状態を厳しく評価してください。
改善が必要な点を中心に、率直で具体的な指摘をお願いします。
日本語で200文字以内で回答してください。

【評価条件】
- AI検索での引用テスト結果: ${queries.length}件の質問中${citedCount}件でのみ言及あり（${citationLevel}）
- 引用されなかった場合は「このままではAI検索で競合に顧客を奪われるリスクが高い」旨を含めてください
- 甘い評価は避け、具体的な問題点と危機感を伝えてください

【サイト情報】
URL: ${url}
業種: ${industry}
地域: ${region}
サイトタイトル: ${siteTitle}
サイト概要: ${siteDescription}

評価と改善の緊急性を述べてください。`;

        let overallAssessment = '';
        let improvementSuggestions: string[] = [];

        try {
            await delay(3000);
            const assessResult = await generateWithRetry(assessmentPrompt, false);
            overallAssessment = assessResult.text;
        } catch {
            overallAssessment = citedCount === 0
                ? `${queries.length}件のAI検索テストで一度も引用されませんでした。現状のままではAI検索で完全に無視される状態であり、競合他社に顧客を奪われるリスクが極めて高いです。`
                : `${queries.length}件のテスト中${citedCount}件でサイトが言及されましたが、引用率は不十分です。`;
        }

        // 改善提案生成
        try {
            const suggestPrompt = `
以下のウェブサイトのAI検索最適化（AIO）のために、最も緊急度の高い改善提案を5つ箇条書きで述べてください。
日本語で回答してください。
AI検索テストでの引用率: ${queries.length}件中${citedCount}件（${Math.round(citationRate * 100)}%）
具体的で実行可能な提案を、緊急度の高い順に述べてください。

URL: ${url}
業種: ${industry}
地域: ${region}

箇条書きのみで回答してください（「・」で始めてください）`;

            await delay(3000);
            const suggestResult = await generateWithRetry(suggestPrompt, false);
            improvementSuggestions = suggestResult.text
                .split('\n')
                .filter(line => line.trim().startsWith('・') || line.trim().startsWith('-') || line.trim().startsWith('*'))
                .map(line => line.replace(/^[・\-\*]\s*/, '').trim())
                .filter(line => line.length > 0)
                .slice(0, 5);
        } catch {
            improvementSuggestions = [
                '【最優先】FAQページを作成し、FAQPage構造化データを実装する',
                '【緊急】業種特有の専門用語を含む詳細なコンテンツを2000文字以上で作成する',
                '【重要】地域名×業種名を含むローカルSEO対策を強化する',
                '【推奨】定期的にコンテンツを更新し、AIが参照する情報の鮮度を維持する',
                '【推奨】業界団体や公的機関からの被リンクを獲得する',
            ];
        }

        return {
            isCited: citedCount > 0,
            citationContext: `${queries.length}件のテスト質問中${citedCount}件でサイトが言及されました（${citationLevel}）`,
            queries: results,
            overallAssessment,
            improvementSuggestions,
        };
    } catch (error) {
        return {
            isCited: false,
            citationContext: 'Gemini APIに接続できませんでした。APIキーを確認してください。',
            queries: [],
            overallAssessment: 'AI引用チェックを実行できませんでした。.env.localのGEMINI_API_KEYを設定してください。',
            improvementSuggestions: [
                '【最優先】FAQ構造化データを実装する',
                '【緊急】業種特有の専門コンテンツを充実させる',
                '【重要】地域名を含むローカルSEO対策を行う',
            ],
        };
    }
}
