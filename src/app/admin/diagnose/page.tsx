'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from '@/app/page.module.css';

export default function AdminDiagnose() {
    const router = useRouter();
    const [url, setUrl] = useState('');
    const [industry, setIndustry] = useState('');
    const [region, setRegion] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const [isAuthChecking, setIsAuthChecking] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/');
            return;
        }
        setIsAuthChecking(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!url.trim()) {
            setError('URLを入力してください');
            return;
        }
        if (!industry.trim()) {
            setError('業種を入力してください');
            return;
        }
        if (!region.trim()) {
            setError('地域を入力してください');
            return;
        }

        setLoading(true);
        setProgress(10);
        setStatusText('サイトに接続中...');

        // プログレスアニメーション
        const progressSteps = [
            { percent: 20, text: 'ページをクロール中...' },
            { percent: 40, text: 'メタタグ・構造化データを分析中...' },
            { percent: 55, text: 'コンテンツ品質を評価中...' },
            { percent: 70, text: 'AI引用テストを実行中...' },
            { percent: 85, text: '競合分析を実行中...' },
            { percent: 92, text: 'レポートを生成中...' },
        ];

        let stepIndex = 0;
        const progressTimer = setInterval(() => {
            if (stepIndex < progressSteps.length) {
                setProgress(progressSteps[stepIndex].percent);
                setStatusText(progressSteps[stepIndex].text);
                stepIndex++;
            }
        }, 3000);

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url.trim(), industry: industry.trim(), region: region.trim() }),
            });

            clearInterval(progressTimer);

            if (!response.ok) {
                let errorMessage = '分析に失敗しました';
                try {
                    const data = await response.json();
                    errorMessage = data.error || errorMessage;
                } catch (parseError) {
                    // JSONパースに失敗した場合（HTMLのタイムアウト画面など）
                    if (response.status === 504 || response.status === 500) {
                        errorMessage = 'サーバーで処理タイムアウトが発生しました。しばらく待ってから再度お試しください。';
                    }
                }
                throw new Error(errorMessage);
            }

            let result;
            try {
                result = await response.json();
            } catch (parseError) {
                throw new Error('データの読み込みに失敗しました。サーバーでエラーが発生した可能性があります。');
            }
            setProgress(100);
            setStatusText('完了！結果画面に移動します...');

            // 結果をsessionStorageに保存して結果ページへ
            sessionStorage.setItem(`diagnosis_${result.id}`, JSON.stringify(result));

            setTimeout(() => {
                router.push(`/result/${result.id}`);
            }, 500);
        } catch (err: any) {
            clearInterval(progressTimer);
            setLoading(false);
            setProgress(0);
            setError(err.message || '分析中にエラーが発生しました。URLを確認してもう一度お試しください。');
        }
    };

    if (isAuthChecking) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>読み込み中...</div>;
    }

    return (
        <>
            {loading && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.spinner} />
                    <div className={styles.loadingText}>AI診断を実行中</div>
                    <div className={styles.loadingSubText}>{statusText}</div>
                    <div className={styles.progressBarContainer}>
                        <div className={styles.progressBar} style={{ width: `${progress}%` }} />
                    </div>
                </div>
            )}

            <main className={styles.hero}>
                <div className={styles.heroContent}>
                    <div style={{ textAlign: 'left', marginBottom: '32px' }}>
                        <button
                            onClick={() => router.push('/admin/dashboard')}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '0',
                                marginBottom: '24px'
                            }}
                        >
                            ← ダッシュボードに戻る
                        </button>
                    </div>

                    <div className={styles.logo}>
                        <span className={styles.logoIcon}>⚡</span>
                        AIO DIAGNOSTIC
                    </div>

                    <h1 className={styles.title}>
                        新規AI診断
                    </h1>

                    <p className={styles.subtitle}>
                        診断するサイトの情報を入力してください
                    </p>

                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.inputGroup}>
                            <label className="input-label" htmlFor="url">
                                🌐 診断するURL（ドメイン）
                            </label>
                            <input
                                id="url"
                                type="text"
                                className="input-field"
                                placeholder="例: example.com"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className={styles.inputRow}>
                            <div className={styles.inputGroup}>
                                <label className="input-label" htmlFor="industry">
                                    🏢 業種
                                </label>
                                <input
                                    id="industry"
                                    type="text"
                                    className="input-field"
                                    placeholder="例: Web制作"
                                    value={industry}
                                    onChange={(e) => setIndustry(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className="input-label" htmlFor="region">
                                    📍 地域
                                </label>
                                <input
                                    id="region"
                                    type="text"
                                    className="input-field"
                                    placeholder="例: 宮崎市"
                                    value={region}
                                    onChange={(e) => setRegion(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {error && <div className={styles.errorMessage}>{error}</div>}

                        <button
                            type="submit"
                            className={`btn-primary ${styles.submitButton}`}
                            disabled={loading}
                        >
                            {loading ? '診断中...' : '🔍 AI診断を開始'}
                        </button>
                    </form>
                </div>
            </main>
        </>
    );
}
