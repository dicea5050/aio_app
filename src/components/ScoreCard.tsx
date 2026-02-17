'use client';

import { ScoreDetail } from '@/types';

interface ScoreCardProps {
    detail: ScoreDetail;
    icon: string;
}

export default function ScoreCard({ detail, icon }: ScoreCardProps) {
    const getScoreColor = (score: number, max: number) => {
        const pct = (score / max) * 100;
        if (pct >= 75) return 'var(--accent-green)';
        if (pct >= 50) return 'var(--accent-cyan)';
        if (pct >= 25) return 'var(--accent-orange)';
        return 'var(--accent-red)';
    };

    const color = getScoreColor(detail.score, detail.maxScore);
    const pct = (detail.score / detail.maxScore) * 100;

    return (
        <div className="glass-card" style={{ padding: '24px', display: 'flex', gap: '24px' }}>
            {/* 左側：基本情報とスコア */}
            <div style={{ flex: '0 0 280px', borderRight: '1px solid rgba(0,0,0,0.05)', paddingRight: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '24px' }}>{icon}</span>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {detail.label}
                    </div>
                </div>

                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '32px', fontWeight: 800, color }}>{detail.score}</span>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}> / {detail.maxScore}</span>
                </div>

                {/* プログレスバー */}
                <div style={{ height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', marginBottom: '12px' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.8s ease' }} />
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    {detail.comment}
                </div>
            </div>

            {/* 右側：詳細分析内容 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 問題点 */}
                {detail.issues.length > 0 && (
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-red)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>⚠</span> 問題点
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {detail.issues.map((issue, i) => (
                                <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '6px 10px', background: 'rgba(239,68,68,0.05)', borderRadius: '4px', borderLeft: '3px solid rgba(239,68,68,0.3)' }}>
                                    {issue}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 改善提案 */}
                {detail.recommendations.length > 0 && (
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-green)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>💡</span> 改善提案
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {detail.recommendations.map((rec, i) => (
                                <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '6px 10px', background: 'rgba(16,185,129,0.05)', borderRadius: '4px', borderLeft: '3px solid rgba(16,185,129,0.3)' }}>
                                    {rec}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
