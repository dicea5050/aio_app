'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface DiagnosisRow {
    id: string;
    url: string;
    industry: string;
    region: string;
    total_score: number;
    rank: string;
    pages_analyzed: number;
    created_at: string;
}

interface Stats {
    totalDiagnoses: number;
    averageScore: number;
    rankDistribution: Record<string, number>;
    recentCount: number;
}

export default function AdminDashboard() {
    const router = useRouter();
    const [diagnoses, setDiagnoses] = useState<DiagnosisRow[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        fetchDiagnoses();
    }, [page, search]);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/');
            return;
        }
        fetchStats();
    };

    const fetchDiagnoses = async () => {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...(search && { search }),
            });
            const res = await fetch(`/api/admin/diagnoses?${params}`);
            const data = await res.json();
            setDiagnoses(data.data || []);
            setTotal(data.total || 0);
        } catch (e) {
            console.error('診断履歴の取得に失敗:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/stats');
            const data = await res.json();
            setStats(data);
        } catch (e) {
            console.error('統計の取得に失敗:', e);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchDiagnoses();
    };

    const getRankBadgeClass = (rank: string) => {
        if (rank === 'A' || rank === 'B') return 'badge badge-success';
        if (rank === 'C') return 'badge badge-info';
        if (rank === 'D') return 'badge badge-warning';
        return 'badge badge-danger';
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, padding: '0 20px 60px' }}>
            {/* ヘッダー */}
            <div style={{
                maxWidth: '1200px', margin: '0 auto', padding: '20px 0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '20px', fontWeight: 700 }}>🔒 管理画面</span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-secondary" onClick={() => router.push('/admin/users')}>
                        👤 ユーザー管理
                    </button>
                    <button className="btn-primary" onClick={() => router.push('/admin/diagnose')}>
                        ＋ 新規診断
                    </button>
                    <button className="btn-secondary" onClick={handleLogout}>ログアウト</button>
                </div>
            </div>

            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* 統計カード */}
                {stats && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                        <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>総診断数</div>
                            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-blue)' }}>{stats.totalDiagnoses}</div>
                        </div>
                        <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>平均スコア</div>
                            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-cyan)' }}>{stats.averageScore}</div>
                        </div>
                        <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>直近30日</div>
                            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-green)' }}>{stats.recentCount}</div>
                        </div>
                        <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>ランク分布</div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
                                {Object.entries(stats.rankDistribution).sort().map(([rank, count]) => (
                                    <span key={rank} className={getRankBadgeClass(rank)}>
                                        {rank}: {count}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 検索 */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                    <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', flex: 1 }}>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="URL、業種、地域で検索..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ maxWidth: '400px' }}
                        />
                        <button type="submit" className="btn-secondary">検索</button>
                    </form>
                </div>

                {/* テーブル */}
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            読み込み中...
                        </div>
                    ) : diagnoses.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            診断履歴がありません
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>日時</th>
                                    <th>URL</th>
                                    <th>業種</th>
                                    <th>地域</th>
                                    <th>スコア</th>
                                    <th>ランク</th>
                                    <th>ページ数</th>
                                </tr>
                            </thead>
                            <tbody>
                                {diagnoses.map(d => (
                                    <tr key={d.id} style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                            router.push(`/result/${d.id}`);
                                        }}
                                    >
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            {new Date(d.created_at).toLocaleDateString('ja-JP')}
                                        </td>
                                        <td style={{ color: 'var(--accent-blue)', fontWeight: 500 }}>{d.url}</td>
                                        <td>{d.industry}</td>
                                        <td>{d.region}</td>
                                        <td style={{ fontWeight: 700 }}>{d.total_score}</td>
                                        <td>
                                            <span className={getRankBadgeClass(d.rank)}>{d.rank}</span>
                                        </td>
                                        <td>{d.pages_analyzed}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ページネーション */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
                        <button
                            className="btn-secondary"
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            ← 前
                        </button>
                        <span style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                            {page} / {totalPages}
                        </span>
                        <button
                            className="btn-secondary"
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                        >
                            次 →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
