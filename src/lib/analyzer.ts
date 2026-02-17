import { PageData, ScoreBreakdown, ScoreDetails, ScoreDetail, PageScore } from '@/types';

// 構造化データスコア (0-20)
function analyzeStructuredData(pages: PageData[]): ScoreDetail {
    let score = 0;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // JSON-LDの存在チェック（厳しめ：ただ存在するだけでは不十分）
    const hasJsonLd = pages.some(p => p.structuredData.length > 0);
    if (hasJsonLd) {
        score += 4; // 基本点を下げる（旧: 8）
        const totalStructured = pages.reduce((sum, p) => sum + p.structuredData.length, 0);
        if (totalStructured >= 5) score += 3;
        else if (totalStructured >= 3) score += 1;
        else {
            issues.push(`構造化データの総数が${totalStructured}件と少なく、AI検索への訴求力が弱い状態です`);
        }
    } else {
        issues.push('構造化データ（JSON-LD）が検出されませんでした。AI検索では致命的な欠落です');
        recommendations.push('Schema.orgに基づくJSON-LDマークアップを早急に追加してください（Organization、LocalBusiness、FAQ等）');
    }

    // Schema.orgの種類チェック（厳しく）
    const schemaTypes = new Set<string>();
    pages.forEach(p => {
        p.structuredData.forEach((d: any) => {
            if (d['@type']) schemaTypes.add(d['@type']);
        });
    });
    if (schemaTypes.size >= 4) score += 4;
    else if (schemaTypes.size >= 3) score += 3;
    else if (schemaTypes.size >= 2) score += 2;
    else if (schemaTypes.size === 1) score += 1;
    if (schemaTypes.size < 3) {
        issues.push(`構造化データの種類が${schemaTypes.size}種類のみです。AI検索で競合に大きく差をつけられています`);
        recommendations.push('Organization、BreadcrumbList、FAQPage、Product、LocalBusiness等の複数の構造化データを実装してください');
    }

    // FAQスキーマ（AIO対策の肝）
    if (schemaTypes.has('FAQPage') || schemaTypes.has('Question')) {
        score += 5;
    } else {
        issues.push('FAQスキーマが未実装です。AIが回答を直接引用する最も重要な要素が欠けています');
        recommendations.push('FAQPageスキーマを実装してください。AI検索での引用確率を劇的に向上させる最重要施策です');
    }

    // BreadcrumbList
    if (schemaTypes.has('BreadcrumbList')) {
        score += 2;
    } else {
        recommendations.push('BreadcrumbList構造化データを追加し、サイト階層をAIに正しく伝えてください');
    }

    // LocalBusiness（ローカルビジネスにとって重要）
    if (schemaTypes.has('LocalBusiness') || schemaTypes.has('Organization')) {
        score += 2;
    } else {
        issues.push('LocalBusinessまたはOrganization構造化データが未実装です');
        recommendations.push('LocalBusiness構造化データを追加し、住所・電話番号・営業時間等をマークアップしてください');
    }

    return {
        score: Math.min(score, 20),
        maxScore: 20,
        label: '構造化データ',
        comment: score >= 16 ? '構造化データが充実しており、AI検索に最適化されています' :
            score >= 12 ? '構造化データは実装されていますが、種類や網羅性に改善の余地があります' :
                score >= 7 ? '構造化データの実装が不十分です。AI検索での可視性が大幅に制限されています' :
                    '構造化データがほぼ未実装です。このままではAI検索で認識されず、競合に完全に埋もれます',
        issues,
        recommendations,
    };
}

// コンテンツ品質スコア (0-20)
function analyzeContentQuality(pages: PageData[]): ScoreDetail {
    let score = 0;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // テキスト量チェック（閾値を上げる）
    const avgWordCount = pages.reduce((sum, p) => sum + p.wordCount, 0) / Math.max(pages.length, 1);
    if (avgWordCount >= 3000) score += 5;
    else if (avgWordCount >= 2000) score += 3;
    else if (avgWordCount >= 1000) score += 2;
    else if (avgWordCount >= 500) score += 1;
    else {
        issues.push(`平均テキスト量が${Math.round(avgWordCount)}文字と大幅に不足しています。AI検索が参照するには情報量が圧倒的に足りません`);
    }
    if (avgWordCount < 2000) {
        recommendations.push('各ページに最低2000文字以上の専門的で有益なコンテンツを追加してください。AIが引用元として選ぶには十分な情報量が必要です');
    }

    // 見出し構造チェック（厳しく）
    const pagesWithH1 = pages.filter(p => p.headings.h1.length > 0);
    const h1Rate = pagesWithH1.length / Math.max(pages.length, 1);
    if (h1Rate >= 1.0) score += 3;
    else if (h1Rate >= 0.8) score += 2;
    else if (h1Rate >= 0.5) score += 1;
    else {
        issues.push(`H1タグが設定されているページが${Math.round(h1Rate * 100)}%のみです。基本的なSEO対策ができていません`);
    }
    if (h1Rate < 1.0) {
        recommendations.push('全ページにH1タグを必ず設定してください。AIがページの主題を理解する上で不可欠です');
    }

    // H2以下の見出し階層（厳しく）
    const pagesWithH2 = pages.filter(p => p.headings.h2.length > 0);
    const h2Rate = pagesWithH2.length / Math.max(pages.length, 1);
    if (h2Rate >= 0.8) score += 3;
    else if (h2Rate >= 0.5) score += 1;
    else {
        issues.push('H2タグによるコンテンツ構造化が大幅に不足しています。AIが情報を抽出できない状態です');
    }
    if (h2Rate < 0.8) {
        recommendations.push('H2・H3タグで情報を階層的に整理してください。AIが段落ごとに情報を理解・引用しやすくなります');
    }

    // 複数H1チェック（NG）
    const multipleH1Pages = pages.filter(p => p.headings.h1.length > 1);
    if (multipleH1Pages.length > 0) {
        score -= 1; // ペナルティ
        issues.push(`${multipleH1Pages.length}ページでH1タグが複数設定されています。ページの主題がAIに正しく伝わりません`);
        recommendations.push('各ページのH1タグは1つに統一してください。複数あるとAIが主題を誤認します');
    } else {
        score += 2;
    }

    // タイトルの長さ・存在チェック
    const pagesWithTitle = pages.filter(p => p.title.length > 0);
    if (pagesWithTitle.length === pages.length) score += 2;
    else {
        issues.push('タイトルが設定されていないページがあります。最も基本的なSEO要素が欠けています');
        recommendations.push('全ページに固有で描写的なタイトルを設定してください');
    }

    // 重複タイトルチェック
    const titles = pages.map(p => p.title).filter(t => t.length > 0);
    const uniqueTitles = new Set(titles);
    if (uniqueTitles.size === titles.length) score += 2;
    else {
        issues.push('重複するタイトルが検出されました。AIがページを区別できず、引用対象から外れやすくなります');
        recommendations.push('各ページに固有のタイトルを設定してください。同じタイトルはAI検索でマイナス評価です');
    }

    // キーワード密度（タイトルとH1の関連性）
    const pagesWithRelevantH1 = pages.filter(p => {
        if (p.headings.h1.length === 0 || !p.title) return false;
        const titleWords = p.title.toLowerCase().split(/\s+/);
        const h1Text = p.headings.h1[0].toLowerCase();
        return titleWords.some(w => w.length > 2 && h1Text.includes(w));
    });
    if (pagesWithRelevantH1.length > 0) score += 3;
    else {
        issues.push('タイトルとH1の関連性が低く、AIがページの主題を正確に理解できていない可能性があります');
    }

    return {
        score: Math.min(Math.max(score, 0), 20),
        maxScore: 20,
        label: 'コンテンツ品質',
        comment: score >= 16 ? 'コンテンツの品質と構造が優れており、AIが情報を抽出しやすい状態です' :
            score >= 12 ? 'コンテンツの基本は整っていますが、量と構造の両面で改善の余地があります' :
                score >= 7 ? 'コンテンツの品質・構造に複数の問題があり、AI検索での評価が低い状態です' :
                    'コンテンツの品質が大幅に不足しています。このままではAI検索で引用される見込みはほぼありません',
        issues,
        recommendations,
    };
}

// 技術的最適化スコア (0-20)
function analyzeTechnicalSEO(pages: PageData[]): ScoreDetail {
    let score = 0;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // メタディスクリプション（厳しく）
    const pagesWithDesc = pages.filter(p => p.metaDescription.length > 0);
    const descRate = pagesWithDesc.length / Math.max(pages.length, 1);
    if (descRate >= 1.0) score += 3;
    else if (descRate >= 0.8) score += 2;
    else if (descRate >= 0.5) score += 1;
    else {
        issues.push(`メタディスクリプションが設定されているページが${Math.round(descRate * 100)}%のみです。AIがページ内容を要約する手がかりが不足しています`);
    }
    if (descRate < 1.0) {
        recommendations.push('全ページにメタディスクリプションを設定してください（120〜160文字推奨）。AIの要約精度に直接影響します');
    }

    // OGP（厳しく）
    const pagesWithOGP = pages.filter(p => Object.keys(p.ogTags).length >= 3);
    const ogpRate = pagesWithOGP.length / Math.max(pages.length, 1);
    if (ogpRate >= 0.8) score += 3;
    else if (ogpRate >= 0.5) score += 1;
    else {
        issues.push('OGPタグ（Open Graph Protocol）の設定が不十分です。SNSやAI検索での表示品質が低下します');
    }
    if (ogpRate < 0.8) {
        recommendations.push('og:title, og:description, og:image, og:url を全ページに設定してください');
    }

    // canonical
    const pagesWithCanonical = pages.filter(p => p.canonical.length > 0);
    const canonicalRate = pagesWithCanonical.length / Math.max(pages.length, 1);
    if (canonicalRate >= 0.8) score += 2;
    else if (canonicalRate >= 0.5) score += 1;
    else {
        issues.push('canonicalタグが未設定のページが多数あります。重複コンテンツとみなされるリスクがあります');
        recommendations.push('重複コンテンツを防ぐため、全ページにcanonicalタグを設定してください');
    }

    // viewport
    const pagesWithViewport = pages.filter(p => p.viewport.length > 0);
    if (pagesWithViewport.length === pages.length) score += 3;
    else {
        issues.push('viewportメタタグが未設定のページがあります。モバイル対応が不完全でAI検索での評価が下がります');
        recommendations.push('全ページにviewportメタタグを設定してください。モバイルフレンドリーはAI検索の重要な評価基準です');
    }

    // SSL
    const pagesWithSSL = pages.filter(p => p.hasSSL);
    if (pagesWithSSL.length === pages.length) score += 3;
    else {
        issues.push('HTTPSに対応していないページがあります。セキュリティの欠如はAIの信頼性評価に直接マイナスです');
        recommendations.push('SSL証明書を導入し、全ページをHTTPS化してください。AI検索は安全なサイトを優先します');
    }

    // lang属性
    if (pages.some(p => p.lang.length > 0)) score += 2;
    else {
        issues.push('html要素にlang属性が設定されていません。AIが言語を正しく判定できません');
        recommendations.push('<html lang="ja">を設定してください');
    }

    // 画像alt属性（厳しく）
    const totalImages = pages.reduce((sum, p) => sum + p.images.length, 0);
    const imagesWithAlt = pages.reduce((sum, p) => sum + p.images.filter(i => i.alt.length > 0).length, 0);
    const altRate = totalImages > 0 ? imagesWithAlt / totalImages : 1;
    if (altRate >= 0.95) score += 2;
    else if (altRate >= 0.7) score += 1;
    else {
        issues.push(`画像のalt属性設定率が${Math.round(altRate * 100)}%と低いです。AIがコンテンツを正しく理解できません`);
        recommendations.push('全画像に描写的なalt属性を設定してください。AIの画像理解とアクセシビリティ向上に不可欠です');
    }

    // charset
    if (pages.some(p => p.charset.length > 0)) score += 2;
    else {
        issues.push('charset（文字エンコーディング）が指定されていません');
    }

    return {
        score: Math.min(score, 20),
        maxScore: 20,
        label: '技術的最適化',
        comment: score >= 16 ? '技術的なSEO対策が十分に行われています' :
            score >= 12 ? '基本的な技術対策はされていますが、不足している重要項目があります' :
                score >= 7 ? '技術的な最適化に複数の重大な問題点があり、AI検索での評価が大幅に低下しています' :
                    '技術的な最適化が致命的に不足しています。早急な対応が必要です',
        issues,
        recommendations,
    };
}

// 権威性・信頼性スコア (0-20)
function analyzeAuthority(pages: PageData[]): ScoreDetail {
    let score = 0;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // SSL
    if (pages.every(p => p.hasSSL)) {
        score += 3;
    } else {
        issues.push('HTTPS化されていないページがあり、信頼性が大幅に低下しています');
        recommendations.push('全ページをHTTPS化してください。AI検索はセキュアなサイトを優先的に引用します');
    }

    // 連絡先情報
    if (pages.some(p => p.hasContactInfo)) {
        score += 3;
    } else {
        issues.push('お問い合わせ情報が見つかりません。事業者の実在性が確認できず信頼性が低い状態です');
        recommendations.push('連絡先情報（メール、問い合わせフォーム）を明示してください');
    }

    // 住所
    if (pages.some(p => p.hasAddress)) {
        score += 3;
    } else {
        issues.push('所在地・住所情報が見つかりません。ローカルビジネスとしてAIに認識されません');
        recommendations.push('会社の所在地を明記し、LocalBusiness構造化データに含めてください');
    }

    // 電話番号
    if (pages.some(p => p.hasPhone)) {
        score += 2;
    } else {
        issues.push('電話番号が見つかりません。実在する事業者であることの証明が弱い状態です');
        recommendations.push('電話番号を掲載し、tel:リンクを設定してください');
    }

    // 外部リンク（権威あるサイトへの参照）（厳しく）
    const totalExternalLinks = pages.reduce((sum, p) => sum + p.externalLinks.length, 0);
    if (totalExternalLinks >= 10) score += 2;
    else if (totalExternalLinks >= 5) score += 1;
    else {
        issues.push('外部の権威あるサイトへのリンクが少なく、コンテンツの裏付けが弱い状態です');
        recommendations.push('信頼できる外部サイト（業界団体、公的機関等）へのリンクを追加すると権威性が向上します');
    }

    // ページ数（サイトの規模）（厳しく）
    if (pages.length >= 15) score += 3;
    else if (pages.length >= 10) score += 2;
    else if (pages.length >= 5) score += 1;
    else {
        issues.push(`クロール可能なページ数が${pages.length}ページと大幅に不足しています。サイトの情報量がAI検索の要求を満たしていません`);
        recommendations.push('最低でも10ページ以上のコンテンツを用意し、サイトの専門性と情報量をアピールしてください');
    }

    // 運営者情報ページの存在チェック
    const hasAboutPage = pages.some(p =>
        p.url.includes('about') || p.url.includes('company') ||
        p.title.includes('会社概要') || p.title.includes('企業情報') ||
        p.title.includes('About')
    );
    if (hasAboutPage) score += 2;
    else {
        issues.push('会社概要ページが見つかりません。E-E-A-T（信頼性）の観点で大きなマイナスです');
        recommendations.push('会社概要ページを作成し、代表者名・設立年・実績等を明記してください。AIは信頼性の高いソースを優先します');
    }

    // プライバシーポリシー・利用規約ページの存在チェック
    const hasPrivacyPage = pages.some(p =>
        p.url.includes('privacy') || p.url.includes('policy') ||
        p.title.includes('プライバシー') || p.title.includes('個人情報')
    );
    if (hasPrivacyPage) score += 2;
    else {
        issues.push('プライバシーポリシーページが見つかりません。信頼性と法的コンプライアンスの面で問題があります');
        recommendations.push('プライバシーポリシーページを作成してください');
    }

    return {
        score: Math.min(score, 20),
        maxScore: 20,
        label: '権威性・信頼性',
        comment: score >= 16 ? '権威性と信頼性を示す情報が十分に揃っています' :
            score >= 12 ? '基本的な信頼性情報はありますが、E-E-A-Tの観点で補強が必要です' :
                score >= 7 ? '信頼性を示す情報が不足しており、AIが引用元として選びにくい状態です' :
                    '権威性・信頼性の情報が致命的に不足しています。AI検索で引用される可能性は極めて低いです',
        issues,
        recommendations,
    };
}

// AI対応度スコア (0-20)
function analyzeAIReadiness(pages: PageData[]): ScoreDetail {
    let score = 0;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // FAQ構造（最重要）
    const hasFAQ = pages.some(p => p.hasFAQ);
    if (hasFAQ) {
        score += 4;
    } else {
        issues.push('FAQ（よくある質問）コンテンツが見つかりません。AIO対策の最重要要素が欠けています');
        recommendations.push('FAQページを作成し、FAQPage構造化データ付きで実装してください。AIが回答を生成する際に直接引用される最も効果的な対策です');
    }

    // 要約しやすい段落構成（厳しく）
    const pagesWithGoodStructure = pages.filter(p => {
        return p.headings.h2.length >= 3 && p.wordCount >= 800;
    });
    const structureRate = pagesWithGoodStructure.length / Math.max(pages.length, 1);
    if (structureRate >= 0.6) {
        score += 4;
    } else if (structureRate >= 0.3) {
        score += 2;
    } else {
        issues.push('AIが要約しやすいコンテンツ構造になっているページがほとんどありません');
        recommendations.push('H2見出しで段落を区切り、各セクションに800文字以上の充実した内容を配置してください');
    }

    // 明確な定義・説明文の存在
    const hasDefinitiveContent = pages.some(p => {
        const text = p.textContent.toLowerCase();
        return text.includes('とは') || text.includes('について') ||
            text.includes('特徴') || text.includes('メリット') ||
            text.includes('サービス内容');
    });
    if (hasDefinitiveContent) {
        score += 2;
    } else {
        issues.push('「〇〇とは」のような定義・説明コンテンツが見当たりません');
        recommendations.push('「〇〇とは」のような明確な定義・説明コンテンツを追加してください。AIが直接引用しやすい形式です');
    }

    // 箇条書き・リスト構造
    const hasLists = pages.some(p => {
        return p.textContent.includes('・') || p.headings.h3.length >= 3;
    });
    if (hasLists) score += 2;
    else {
        issues.push('箇条書き・リスト形式のコンテンツがありません');
        recommendations.push('情報を箇条書きやリスト形式で整理すると、AIが情報を抽出しやすくなります');
    }

    // 数値・具体的データの存在
    const hasSpecificData = pages.some(p => {
        return /\d+[%年月万円件]/.test(p.textContent);
    });
    if (hasSpecificData) score += 2;
    else {
        issues.push('具体的な数値データ（実績数、年数等）がありません。AIは具体性の高い情報を優先します');
        recommendations.push('具体的な数値データ（実績数、年数等）を掲載すると、AIの回答に引用されやすくなります');
    }

    // ページ読み込みの軽さ（テキスト/画像比率）（厳しく）
    const totalImages = pages.reduce((sum, p) => sum + p.images.length, 0);
    const totalText = pages.reduce((sum, p) => sum + p.wordCount, 0);
    if (totalText > 0 && (totalImages / Math.max(pages.length, 1)) <= 20) {
        score += 2;
    } else if (totalImages / Math.max(pages.length, 1) > 30) {
        issues.push('画像が多くテキストの比率が低い可能性があります。AIはテキスト情報を重視します');
    }

    // 内部リンク構造（厳しく）
    const avgInternalLinks = pages.reduce((sum, p) => sum + p.internalLinks.length, 0) / Math.max(pages.length, 1);
    if (avgInternalLinks >= 8) score += 3;
    else if (avgInternalLinks >= 5) score += 2;
    else if (avgInternalLinks >= 3) score += 1;
    else {
        issues.push('内部リンクが大幅に不足しています。AIがサイト全体の情報を把握できない状態です');
        recommendations.push('関連ページ同士を内部リンクで密接に接続してください。AIがサイト全体を巡回しやすくなります');
    }

    // 更新性の示唆（日付やニュースの存在）
    const hasDateContent = pages.some(p => {
        return /20\d{2}[年\/\-]/.test(p.textContent);
    });
    if (hasDateContent) score += 1;
    else {
        issues.push('コンテンツに日付情報がなく、情報の鮮度が不明です。AIは最新の情報を優先的に引用します');
        recommendations.push('コンテンツに更新日や公開日を明記し、定期的にコンテンツを更新してください');
    }

    return {
        score: Math.min(score, 20),
        maxScore: 20,
        label: 'AI対応度',
        comment: score >= 16 ? 'AI検索に最適化されたコンテンツ構造です' :
            score >= 12 ? 'AI対応の基本はできていますが、引用率を上げるにはさらなる最適化が必要です' :
                score >= 7 ? 'AI検索への対応が不十分です。このままでは競合にAI検索の顧客を奪われるリスクがあります' :
                    'AI検索で引用される可能性が極めて低い状態です。根本的な対策が急務です',
        issues,
        recommendations,
    };
}

// ページ別スコア算出（厳しめに調整）
function calculatePageScores(pages: PageData[]): PageScore[] {
    return pages.map(page => {
        let pageScore = 0;
        const pageIssues: string[] = [];

        if (page.title) pageScore += 8; else pageIssues.push('タイトル未設定');
        if (page.metaDescription) pageScore += 8; else pageIssues.push('メタディスクリプション未設定');
        if (page.headings.h1.length === 1) pageScore += 8;
        else if (page.headings.h1.length === 0) pageIssues.push('H1タグ未設定');
        else pageIssues.push('H1タグが複数設定');
        if (page.headings.h2.length >= 3) pageScore += 5;
        else if (page.headings.h2.length > 0) pageScore += 2;
        else pageIssues.push('H2タグ未設定');
        if (Object.keys(page.ogTags).length >= 4) pageScore += 8;
        else if (Object.keys(page.ogTags).length >= 3) pageScore += 4;
        else pageIssues.push('OGPタグ不足');
        if (page.structuredData.length >= 2) pageScore += 10;
        else if (page.structuredData.length > 0) pageScore += 4;
        else pageIssues.push('構造化データ未設定');
        if (page.canonical) pageScore += 4; else pageIssues.push('canonical未設定');
        if (page.viewport) pageScore += 4;
        else pageIssues.push('viewport未設定');
        if (page.wordCount >= 2000) pageScore += 10;
        else if (page.wordCount >= 1000) pageScore += 5;
        else if (page.wordCount >= 500) pageScore += 2;
        else pageIssues.push('テキスト量不足');
        if (page.images.length > 0) {
            const imagesWithAlt = page.images.filter(i => i.alt.length > 0).length;
            if (imagesWithAlt === page.images.length) pageScore += 5;
            else {
                pageIssues.push(`画像alt属性: ${imagesWithAlt}/${page.images.length}設定済み`);
            }
        }
        if (page.hasSSL) pageScore += 8;
        else pageIssues.push('SSL未対応');
        if (page.lang) pageScore += 4;
        else pageIssues.push('lang属性未設定');
        if (page.internalLinks.length >= 5) pageScore += 5;
        else if (page.internalLinks.length >= 3) pageScore += 2;
        else pageIssues.push('内部リンク不足');
        if (page.hasFAQ) pageScore += 8;
        else pageIssues.push('FAQ構造なし');

        return {
            url: page.url,
            title: page.title || '(タイトルなし)',
            score: Math.min(Math.round(pageScore), 100),
            issues: pageIssues,
        };
    });
}

// ランク判定（厳しめに変更）
function calculateRank(totalScore: number): string {
    if (totalScore >= 90) return 'A';
    if (totalScore >= 75) return 'B';
    if (totalScore >= 55) return 'C';
    if (totalScore >= 35) return 'D';
    return 'E';
}

// メイン分析関数
export function analyzePages(pages: PageData[]): {
    totalScore: number;
    rank: string;
    scores: ScoreBreakdown;
    scoreDetails: ScoreDetails;
    pageScores: PageScore[];
} {
    const structuredDataDetail = analyzeStructuredData(pages);
    const contentQualityDetail = analyzeContentQuality(pages);
    const technicalSEODetail = analyzeTechnicalSEO(pages);
    const authorityDetail = analyzeAuthority(pages);
    const aiReadinessDetail = analyzeAIReadiness(pages);

    const scores: ScoreBreakdown = {
        structuredData: structuredDataDetail.score,
        contentQuality: contentQualityDetail.score,
        technicalSEO: technicalSEODetail.score,
        authority: authorityDetail.score,
        aiReadiness: aiReadinessDetail.score,
    };

    const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);

    return {
        totalScore,
        rank: calculateRank(totalScore),
        scores,
        scoreDetails: {
            structuredData: structuredDataDetail,
            contentQuality: contentQualityDetail,
            technicalSEO: technicalSEODetail,
            authority: authorityDetail,
            aiReadiness: aiReadinessDetail,
        },
        pageScores: calculatePageScores(pages),
    };
}
