'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DiagnosisResult } from '@/types';
import ScoreGauge from '@/components/ScoreGauge';
import RadarChart from '@/components/RadarChart';
import ScoreCard from '@/components/ScoreCard';
import { supabase } from '@/lib/supabase';
import styles from '../result.module.css';

export default function ResultPage() {
    const params = useParams();
    const router = useRouter();
    const [result, setResult] = useState<DiagnosisResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const dashboardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/');
            return;
        }

        const id = params.id as string;
        const stored = sessionStorage.getItem(`diagnosis_${id}`);
        if (stored) {
            setResult(JSON.parse(stored));
            setLoading(false);
        } else {
            // セッションストレージにない場合はDBから取得
            try {
                const res = await fetch(`/api/diagnoses/${id}`);
                if (!res.ok) {
                    throw new Error('診断結果が見つかりませんでした');
                }
                const data = await res.json();
                setResult(data);
            } catch (err) {
                console.error('診断結果の取得に失敗:', err);
                router.push('/admin/dashboard');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDownloadPDF = async () => {
        if (!dashboardRef.current || !result || isGeneratingPDF) return;

        setIsGeneratingPDF(true);
        try {
            const scrollY = window.scrollY;
            window.scrollTo(0, 0);

            await document.fonts.ready;

            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;

            const pdf = new jsPDF('p', 'mm', 'a4');
            const sheets = dashboardRef.current.querySelectorAll(`.${styles.sheet}`);

            for (let i = 0; i < sheets.length; i++) {
                if (i > 0) pdf.addPage();

                const sheet = sheets[i] as HTMLElement;
                const canvas = await html2canvas(sheet, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    allowTaint: true,
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/png');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();

                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            }

            const safeDomain = result.url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 30);
            const date = new Date().toISOString().split('T')[0];
            const fileName = `AIO_Report_${safeDomain}_${date}.pdf`;

            // Vercelの制限(4.5MB)を避けるため、サーバーを介さずブラウザで直接保存する
            pdf.save(fileName);

            window.scrollTo(0, scrollY);

        } catch (error) {
            console.error('PDF generation error:', error);
            alert('PDFの生成中にエラーが発生しました。');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    if (loading || !result) {
        return (
            <div className={styles.loading}>
                <div className={styles.loadingSpinner} />
                <div>結果を読み込み中...</div>
            </div>
        );
    }

    const scoreIcons: Record<string, string> = {
        structuredData: '🏗️',
        contentQuality: '📝',
        technicalSEO: '⚙️',
        authority: '🛡️',
        aiReadiness: '🤖',
    };

    const getRankComment = (rank: string, score: number) => {
        switch (rank) {
            case 'A': return `総合スコア${score}点。AI検索への最適化が高いレベルで達成されています。ただし競合も対策を進めているため、油断は禁物です。`;
            case 'B': return `総合スコア${score}点。AI検索への基本対応はできていますが、このままでは競合に差をつけられるリスクがあります。重点的な改善が推奨されます。`;
            case 'C': return `総合スコア${score}点。AI検索への対応が不十分な状態です。このままではAI経由の集客機会を逃し、競合に顧客を奪われる恐れがあります。早期の改善が必要です。`;
            case 'D': return `総合スコア${score}点。AI検索での可視性が非常に低い状態です。ホームページがAI検索で表示されず、潜在顧客にリーチできていません。基本的な対策から早急に取り組む必要があります。`;
            case 'E': return `総合スコア${score}点。AI検索で認識される可能性がほぼゼロの危機的な状態です。現状のホームページでは、AI時代の集客に全く対応できておらず、ビジネスへの深刻な影響が懸念されます。至急の対策が不可欠です。`;
            default: return '';
        }
    };

    const getPageScoreColor = (score: number) => {
        if (score >= 80) return 'var(--accent-green)';
        if (score >= 60) return 'var(--accent-cyan)';
        if (score >= 40) return 'var(--accent-orange)';
        return 'var(--accent-red)';
    };

    const ITEMS_PER_PAGE = 15;
    const pageChunks = [];
    for (let i = 0; i < result.pageScores.length; i += ITEMS_PER_PAGE) {
        pageChunks.push(result.pageScores.slice(i, i + ITEMS_PER_PAGE));
    }

    return (
        <div className={styles.sheetWrapper} ref={dashboardRef}>
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                padding: '10px 20px', background: 'rgba(0,0,0,0.8)', color: 'white',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                backdropFilter: 'blur(5px)'
            }}>
                <div>
                    <button
                        onClick={() => router.push('/admin/dashboard')}
                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '14px' }}
                    >
                        ← ダッシュボードに戻る
                    </button>
                    <span style={{ marginLeft: '20px', fontSize: '14px' }}>プレビューモード</span>
                </div>
                <button
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                    style={{
                        background: 'var(--accent-blue)', color: 'white', border: 'none',
                        padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
                    }}
                >
                    {isGeneratingPDF ? '生成中...' : 'PDFダウンロード'}
                </button>
            </div>
            <div style={{ height: '40px' }}></div>

            <Sheet pageNum={1} result={result}>
                <div style={{
                    marginBottom: '40px', padding: '30px',
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>診断対象ウェブサイト</div>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '20px', wordBreak: 'break-all' }}>
                        {result.url}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                        <div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>診断日時</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#334155' }}>
                                {new Date(result.createdAt).toLocaleString('ja-JP')}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>業種</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#334155' }}>
                                {result.industry || '-'}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>地域</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#334155' }}>
                                {result.region || '-'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.heroSection} style={{ display: 'block' }}>
                    <div className={styles.scoreHero} style={{
                        padding: '30px', border: '1px solid #eee', borderRadius: '12px',
                        marginBottom: '30px', background: 'white'
                    }}>
                        <ScoreGauge score={result.totalScore} maxScore={100} size={200} rank={result.rank} label="総合AIOスコア" />
                        <div className={styles.scoreComment} style={{
                            fontSize: '14px', marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px'
                        }}>
                            {getRankComment(result.rank, result.totalScore)}
                        </div>
                    </div>

                    <div className={styles.radarSection} style={{
                        padding: '20px', border: '1px solid #eee', borderRadius: '12px',
                        display: 'flex', justifyContent: 'center', height: '300px'
                    }}>
                        <RadarChart scores={result.scores} />
                    </div>
                </div>
            </Sheet>

            <Sheet pageNum={2} result={result}>
                <div className={styles.sectionTitle}>
                    <span className={styles.sectionIcon}>📊</span> 詳細スコア分析
                </div>
                <div className={styles.scoreGrid} style={{ marginBottom: '50px' }}>
                    {Object.entries(result.scoreDetails).map(([key, detail]) => (
                        <ScoreCard key={key} detail={detail as any} icon={scoreIcons[key] || '📋'} />
                    ))}
                </div>
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', marginTop: 'auto', paddingBottom: '20px' }}>
                    ※ 次ページにAIによる詳細分析結果が続きます
                </div>
            </Sheet>

            {result.aiCheck && (
                <Sheet pageNum={3} result={result}>
                    <div className={styles.sectionTitle}>
                        <span className={styles.sectionIcon}>🤖</span> AI検索対応分析
                    </div>

                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '20px', padding: '25px',
                        background: result.aiCheck.isCited ? '#f0fdf4' : '#fef2f2',
                        border: result.aiCheck.isCited ? '1px solid #bbf7d0' : '1px solid #fecaca',
                        borderRadius: '12px', marginBottom: '30px'
                    }}>
                        <span style={{ fontSize: '40px' }}>{result.aiCheck.isCited ? '✅' : '❌'}</span>
                        <div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: result.aiCheck.isCited ? '#15803d' : '#b91c1c', marginBottom: '8px' }}>
                                {result.aiCheck.isCited ? 'AIの回答にサイトが引用されました' : 'AIの回答にサイトが引用されませんでした'}
                            </div>
                            <div style={{ fontSize: '14px', color: '#475569' }}>{result.aiCheck.citationContext}</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px' }}>実行された検索クエリ（一部）</div>
                        {result.aiCheck.queries.slice(0, 2).map((q, i) => (
                            <div key={i} className={styles.queryItem} style={{ fontSize: '12px', padding: '10px' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Q: {q.query}</div>
                                <div style={{ color: '#666' }}>{q.response.substring(0, 80)}...</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginBottom: '30px', padding: '20px', background: '#f8fafc', borderRadius: '8px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '16px' }}>AIからの総合評価</div>
                        <div className={styles.assessmentText} style={{ fontSize: '13px', lineHeight: '1.8' }}>{result.aiCheck.overallAssessment}</div>
                    </div>

                    {result.aiCheck.improvementSuggestions.length > 0 && (
                        <div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--accent-green)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>💡</span> AIからの改善提案
                            </div>
                            <ul className={styles.suggestionList}>
                                {result.aiCheck.improvementSuggestions.map((s, i) => (
                                    <li key={i} className={styles.suggestionItem} style={{ fontSize: '13px', padding: '12px', marginBottom: '10px' }}>
                                        {s}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </Sheet>
            )}

            {pageChunks.map((chunk, index) => (
                <Sheet key={index} pageNum={index + (result.aiCheck ? 4 : 3)} result={result}>
                    <div className={styles.sectionTitle}>
                        <span className={styles.sectionIcon}>📋</span>
                        ページ別分析 ({index + 1}/{pageChunks.length})
                    </div>
                    <div className={styles.detailCard} style={{ overflow: 'visible' }}>
                        <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                                    <th style={{ padding: '10px' }}>ページ</th>
                                    <th style={{ padding: '10px', width: '80px' }}>スコア</th>
                                    <th style={{ padding: '10px' }}>検出された問題点</th>
                                </tr>
                            </thead>
                            <tbody>
                                {chunk.map((page, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '10px' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{page.title}</div>
                                            <div style={{ color: '#999', fontSize: '10px', marginTop: '4px' }}>{page.url}</div>
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '14px', color: getPageScoreColor(page.score) }}>{page.score}</span>
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            {page.issues.length > 0 ? (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                    {page.issues.map((issue, j) => (
                                                        <span key={j} style={{
                                                            background: '#fffbeb', color: '#92400e',
                                                            padding: '4px 8px', borderRadius: '4px', fontSize: '11px',
                                                            border: '1px solid #fcd34d'
                                                        }}>{issue}</span>
                                                    ))}
                                                </div>
                                            ) : <span style={{ color: '#15803d', fontWeight: 'bold', fontSize: '12px' }}>問題なし</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Sheet>
            ))}

            <div style={{ textAlign: 'center', color: '#aaa', fontSize: '12px', paddingBottom: '60px' }}>End of Report</div>
        </div>
    );
}

const Sheet = ({ children, pageNum, result, className = '' }: { children: React.ReactNode, pageNum: number, result: DiagnosisResult, className?: string }) => (
    <div className={`${styles.sheet} ${className}`}>
        <div className={styles.sheetHeader}>
            <div>
                <div className={styles.sheetTitle}>AIO Diagnosis Report</div>
                <div className={styles.sheetDate}>{new Date(result.createdAt).toLocaleDateString('ja-JP')} 診断 | {result.url}</div>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{result.industry} / {result.region}</div>
        </div>
        <div style={{ flex: 1 }}>
            {children}
        </div>
        <div className={styles.pageNumber}>{pageNum}</div>
    </div>
);
