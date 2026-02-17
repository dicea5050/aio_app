// AIO診断アプリ 共通型定義

export interface DiagnosisRequest {
  url: string;
  industry: string;
  region: string;
}

export interface PageData {
  url: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  ogTags: Record<string, string>;
  canonical: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
    h5: string[];
    h6: string[];
  };
  structuredData: object[];
  textContent: string;
  wordCount: number;
  images: { src: string; alt: string }[];
  internalLinks: string[];
  externalLinks: string[];
  hasSSL: boolean;
  hasFAQ: boolean;
  hasContactInfo: boolean;
  hasAddress: boolean;
  hasPhone: boolean;
  viewport: string;
  charset: string;
  lang: string;
}

export interface ScoreBreakdown {
  structuredData: number;   // 構造化データ (0-20)
  contentQuality: number;   // コンテンツ品質 (0-20)
  technicalSEO: number;     // 技術的最適化 (0-20)
  authority: number;        // 権威性・信頼性 (0-20)
  aiReadiness: number;      // AI対応度 (0-20)
}

export interface ScoreDetail {
  score: number;
  maxScore: number;
  label: string;
  comment: string;
  issues: string[];
  recommendations: string[];
}

export interface ScoreDetails {
  structuredData: ScoreDetail;
  contentQuality: ScoreDetail;
  technicalSEO: ScoreDetail;
  authority: ScoreDetail;
  aiReadiness: ScoreDetail;
}

export interface AICheckResult {
  isCited: boolean;
  citationContext: string;
  queries: {
    query: string;
    response: string;
    cited: boolean;
  }[];
  overallAssessment: string;
  improvementSuggestions: string[];
}



export interface PageScore {
  url: string;
  title: string;
  score: number;
  issues: string[];
}

export interface DiagnosisResult {
  id: string;
  url: string;
  industry: string;
  region: string;
  totalScore: number;
  rank: string;
  scores: ScoreBreakdown;
  scoreDetails: ScoreDetails;
  aiCheck: AICheckResult | null;
  pageScores: PageScore[];
  pagesAnalyzed: number;
  createdAt: string;
}
