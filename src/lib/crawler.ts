import * as cheerio from 'cheerio';
import { PageData } from '@/types';

const MAX_PAGES = 20;
const TIMEOUT = 10000;

// URLを正規化
function normalizeUrl(base: string, href: string): string | null {
    try {
        const url = new URL(href, base);
        url.hash = '';
        url.search = '';
        return url.toString();
    } catch {
        return null;
    }
}

// 同一ドメインかチェック
function isSameDomain(baseUrl: string, targetUrl: string): boolean {
    try {
        const base = new URL(baseUrl);
        const target = new URL(targetUrl);
        return base.hostname === target.hostname;
    } catch {
        return false;
    }
}

// HTMLを取得
async function fetchHTML(url: string): Promise<string | null> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'AIO-Diagnostic-Bot/1.0 (Website Analysis Tool)',
                'Accept': 'text/html,application/xhtml+xml',
            },
        });
        clearTimeout(timeoutId);
        if (!response.ok) return null;
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) return null;
        return await response.text();
    } catch {
        return null;
    }
}

// 1ページを解析
function parsePage(url: string, html: string): PageData {
    const $ = cheerio.load(html);

    // メタタグ
    const title = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
    const canonical = $('link[rel="canonical"]').attr('href') || '';
    const viewport = $('meta[name="viewport"]').attr('content') || '';
    const charset = $('meta[charset]').attr('charset') || $('meta[http-equiv="Content-Type"]').attr('content') || '';
    const lang = $('html').attr('lang') || '';

    // OGPタグ
    const ogTags: Record<string, string> = {};
    $('meta[property^="og:"]').each((_, el) => {
        const prop = $(el).attr('property') || '';
        const content = $(el).attr('content') || '';
        if (prop) ogTags[prop] = content;
    });

    // 見出しタグ
    const headings = {
        h1: $('h1').map((_, el) => $(el).text().trim()).get(),
        h2: $('h2').map((_, el) => $(el).text().trim()).get(),
        h3: $('h3').map((_, el) => $(el).text().trim()).get(),
        h4: $('h4').map((_, el) => $(el).text().trim()).get(),
        h5: $('h5').map((_, el) => $(el).text().trim()).get(),
        h6: $('h6').map((_, el) => $(el).text().trim()).get(),
    };

    // 構造化データ (JSON-LD)
    const structuredData: object[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            const data = JSON.parse($(el).html() || '');
            structuredData.push(data);
        } catch {
            // パースエラーは無視
        }
    });

    // リンク (コンテンツ削除前に取得)
    const internalLinks: string[] = [];
    const externalLinks: string[] = [];
    $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const normalizedUrl = normalizeUrl(url, href);
        if (normalizedUrl) {
            if (isSameDomain(url, normalizedUrl)) {
                if (!internalLinks.includes(normalizedUrl)) {
                    internalLinks.push(normalizedUrl);
                }
            } else {
                if (!externalLinks.includes(normalizedUrl)) {
                    externalLinks.push(normalizedUrl);
                }
            }
        }
    });

    // テキストコンテンツ（不要なタグを除外）
    $('script, style, noscript, nav, footer, header').remove();
    const textContent = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = textContent.length;

    // 画像
    const images: { src: string; alt: string }[] = [];
    $('img').each((_, el) => {
        images.push({
            src: $(el).attr('src') || '',
            alt: $(el).attr('alt') || '',
        });
    });

    // その他チェック
    const hasSSL = url.startsWith('https://');
    const bodyText = textContent.toLowerCase();
    const hasFAQ = bodyText.includes('よくある質問') || bodyText.includes('faq') || bodyText.includes('q&a') || structuredData.some((d: any) => d['@type'] === 'FAQPage');
    const hasContactInfo = bodyText.includes('お問い合わせ') || bodyText.includes('contact') || $('a[href^="mailto:"]').length > 0;
    const hasAddress = bodyText.includes('所在地') || bodyText.includes('住所') || $('address').length > 0;
    const hasPhone = bodyText.includes('tel') || bodyText.includes('電話') || $('a[href^="tel:"]').length > 0;

    return {
        url, title, metaDescription, metaKeywords, ogTags, canonical,
        headings, structuredData, textContent, wordCount, images,
        internalLinks, externalLinks, hasSSL, hasFAQ,
        hasContactInfo, hasAddress, hasPhone, viewport, charset, lang,
    };
}

// メインクロール関数
export async function crawlDomain(domainUrl: string): Promise<PageData[]> {
    // URLを正規化
    let startUrl = domainUrl.trim();
    if (!startUrl.startsWith('http://') && !startUrl.startsWith('https://')) {
        startUrl = 'https://' + startUrl;
    }
    // 末尾のスラッシュを保証
    if (!startUrl.endsWith('/') && !startUrl.includes('.html') && !startUrl.includes('.php')) {
        startUrl += '/';
    }

    const visited = new Set<string>();
    const toVisit: string[] = [startUrl];
    const pages: PageData[] = [];

    while (toVisit.length > 0 && pages.length < MAX_PAGES) {
        const url = toVisit.shift()!;
        if (visited.has(url)) continue;
        visited.add(url);

        const html = await fetchHTML(url);
        if (!html) continue;

        const pageData = parsePage(url, html);
        pages.push(pageData);

        // 内部リンクをキューに追加
        for (const link of pageData.internalLinks) {
            if (!visited.has(link) && !toVisit.includes(link) && pages.length + toVisit.length < MAX_PAGES) {
                toVisit.push(link);
            }
        }
    }

    return pages;
}
