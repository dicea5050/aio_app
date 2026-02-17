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
        <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>{icon}</span>
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {detail.label}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {detail.comment}
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '28px', fontWeight: 800, color }}>{detail.score}</span>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}> / {detail.maxScore}</span>
                </div>
            </div>

            {/* プログレスバー */}
            <div style={{ height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '2px', marginBottom: '16px' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.8s ease' }} />
            </div>

            {/* 問題点 */}
            {detail.issues.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-red)', marginBottom: '6px' }}>⚠ 問題点</div>
                    {detail.issues.map((issue, i) => (
                        <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '4px 0', paddingLeft: '12px', borderLeft: '2px solid rgba(239,68,68,0.3)' }}>
                            {issue}
                        </div>
                    ))}
                </div>
            )}

            {/* 改善提案 */}
            {detail.recommendations.length > 0 && (
                <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-green)', marginBottom: '6px' }}>💡 改善提案</div>
                    {detail.recommendations.map((rec, i) => (
                        <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '4px 0', paddingLeft: '12px', borderLeft: '2px solid rgba(16,185,129,0.3)' }}>
                            {rec}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
