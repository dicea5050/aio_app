'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface User {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string;
}

export default function UserManagementPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/');
            return;
        }
        fetchUsers();
    };

    const fetchUsers = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/admin/users', {
                headers: {
                    Authorization: session?.access_token || '',
                },
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setUsers(data);
        } catch (e: any) {
            setError('ユーザー一覧の取得に失敗しました: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setMessage(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: session?.access_token || '',
                },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setMessage('ユーザーを追加しました');
            setEmail('');
            setPassword('');
            fetchUsers();
        } catch (e: any) {
            setError('ユーザーの追加に失敗しました: ' + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setSubmitting(true);
        setError(null);
        setMessage(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: session?.access_token || '',
                },
                body: JSON.stringify({
                    email: editEmail,
                    ...(editPassword && { password: editPassword })
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setMessage('ユーザー情報を更新しました');
            setEditMode(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (e: any) {
            setError('ユーザー情報の更新に失敗しました: ' + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = async (id: string, userEmail: string) => {
        if (!confirm(`${userEmail} を削除してもよろしいですか？`)) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/users/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: session?.access_token || '',
                },
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setMessage('ユーザーを削除しました');
            if (selectedUser?.id === id) {
                setSelectedUser(null);
                setEditMode(false);
            }
            fetchUsers();
        } catch (e: any) {
            setError('ユーザーの削除に失敗しました: ' + e.message);
        }
    };

    const openEditMode = (user: User) => {
        setSelectedUser(user);
        setEditEmail(user.email);
        setEditPassword('');
        setEditMode(true);
        setError(null);
        setMessage(null);
    };

    const openDetails = (user: User) => {
        setSelectedUser(user);
        setEditMode(false);
        setError(null);
        setMessage(null);
    };

    return (
        <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, padding: '0 20px 60px' }}>
            <div style={{
                maxWidth: '1000px', margin: '0 auto', padding: '20px 0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button className="btn-secondary" onClick={() => router.push('/admin/dashboard')}>
                        ← 戻る
                    </button>
                    <span style={{ fontSize: '20px', fontWeight: 700 }}>👥 ユーザー管理</span>
                </div>
            </div>

            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                {error && (
                    <div style={{
                        padding: '12px 16px', borderRadius: '8px', backgroundColor: 'rgba(255, 59, 48, 0.1)',
                        color: '#ff3b30', marginBottom: '24px', border: '1px solid rgba(255, 59, 48, 0.2)'
                    }}>
                        {error}
                    </div>
                )}
                {message && (
                    <div style={{
                        padding: '12px 16px', borderRadius: '8px', backgroundColor: 'rgba(52, 199, 89, 0.1)',
                        color: '#34c759', marginBottom: '24px', border: '1px solid rgba(52, 199, 89, 0.2)'
                    }}>
                        {message}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                    <div>
                        {/* ユーザー一覧 */}
                        <div className="glass-card" style={{ padding: '0', overflow: 'hidden', marginBottom: '24px' }}>
                            <h3 style={{ margin: '24px 24px 16px', fontSize: '18px' }}>登録済みユーザー</h3>
                            {loading ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    読み込み中...
                                </div>
                            ) : users.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    ユーザーがいません
                                </div>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>メールアドレス</th>
                                            <th>作成日</th>
                                            <th style={{ textAlign: 'right' }}>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr key={u.id}>
                                                <td style={{ fontWeight: 500 }}>{u.email}</td>
                                                <td style={{ fontSize: '12px' }}>{new Date(u.created_at).toLocaleDateString('ja-JP')}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <button
                                                            className="badge badge-info"
                                                            style={{ border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                                                            onClick={() => openDetails(u)}
                                                        >
                                                            詳細
                                                        </button>
                                                        <button
                                                            className="badge badge-warning"
                                                            style={{ border: 'none', cursor: 'pointer', padding: '4px 8px', color: '#000' }}
                                                            onClick={() => openEditMode(u)}
                                                        >
                                                            編集
                                                        </button>
                                                        <button
                                                            className="badge badge-danger"
                                                            style={{ border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                                                            onClick={() => handleDeleteUser(u.id, u.email)}
                                                        >
                                                            削除
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    <div style={{ position: 'sticky', top: '24px' }}>
                        {/* 詳細・編集・追加フォーム */}
                        {editMode && selectedUser ? (
                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px' }}>ユーザー編集</h3>
                                    <button
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                        onClick={() => { setEditMode(false); setSelectedUser(null); }}
                                    >✕</button>
                                </div>
                                <form onSubmit={handleUpdateUser}>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>メールアドレス</label>
                                        <input
                                            type="email"
                                            className="input-field"
                                            value={editEmail}
                                            onChange={(e) => setEditEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>新しいパスワード（変更する場合のみ）</label>
                                        <input
                                            type="password"
                                            className="input-field"
                                            value={editPassword}
                                            onChange={(e) => setEditPassword(e.target.value)}
                                            placeholder="6文字以上"
                                            minLength={6}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={submitting}>
                                            {submitting ? '保存中...' : '保存'}
                                        </button>
                                        <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => { setEditMode(false); setSelectedUser(null); }}>
                                            キャンセル
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : !editMode && selectedUser ? (
                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px' }}>ユーザー詳細</h3>
                                    <button
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                        onClick={() => setSelectedUser(null)}
                                    >✕</button>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID</div>
                                    <div style={{ fontSize: '14px', wordBreak: 'break-all' }}>{selectedUser.id}</div>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>メールアドレス</div>
                                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{selectedUser.email}</div>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>作成日時</div>
                                    <div style={{ fontSize: '14px' }}>{new Date(selectedUser.created_at).toLocaleString('ja-JP')}</div>
                                </div>
                                <div style={{ marginBottom: '24px' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>最終ログイン</div>
                                    <div style={{ fontSize: '14px' }}>{selectedUser.last_sign_in_at ? new Date(selectedUser.last_sign_in_at).toLocaleString('ja-JP') : '未ログイン'}</div>
                                </div>
                                <button className="btn-primary" style={{ width: '100%' }} onClick={() => openEditMode(selectedUser)}>
                                    編集する
                                </button>
                            </div>
                        ) : (
                            <div className="glass-card" style={{ padding: '24px' }}>
                                <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>新規ユーザー追加</h3>
                                <form onSubmit={handleAddUser}>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>メールアドレス</label>
                                        <input
                                            type="email"
                                            className="input-field"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            placeholder="example@origina-inc.jp"
                                        />
                                    </div>
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>パスワード</label>
                                        <input
                                            type="password"
                                            className="input-field"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            placeholder="6文字以上"
                                            minLength={6}
                                        />
                                    </div>
                                    <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={submitting}>
                                        {submitting ? '追加中...' : 'ユーザー追加'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
