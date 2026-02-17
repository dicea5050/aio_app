'use client';

import { useEffect, useState, useRef } from 'react';

interface ScoreGaugeProps {
    score: number;
    maxScore: number;
    size?: number;
    label?: string;
    rank?: string;
}

export default function ScoreGauge({ score, maxScore, size = 200, label, rank }: ScoreGaugeProps) {
    const [animatedScore, setAnimatedScore] = useState(0);
    const ref = useRef<SVGSVGElement>(null);

    const radius = (size - 20) / 2;
    const circumference = 2 * Math.PI * radius;
    const percentage = (animatedScore / maxScore) * 100;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    useEffect(() => {
        const timer = setTimeout(() => {
            let current = 0;
            const increment = score / 40;
            const interval = setInterval(() => {
                current += increment;
                if (current >= score) {
                    current = score;
                    clearInterval(interval);
                }
                setAnimatedScore(Math.round(current));
            }, 25);
            return () => clearInterval(interval);
        }, 300);
        return () => clearTimeout(timer);
    }, [score]);

    const getColor = () => {
        if (percentage >= 85) return '#10B981';
        if (percentage >= 70) return '#06B6D4';
        if (percentage >= 50) return '#F59E0B';
        if (percentage >= 30) return '#F97316';
        return '#EF4444';
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* 背景円 */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(0,0,0,0.06)"
                    strokeWidth="10"
                />
                {/* グラデーション定義 */}
                <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#4F46E5" />
                        <stop offset="100%" stopColor={getColor()} />
                    </linearGradient>
                </defs>
                {/* スコア円 */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="url(#scoreGradient)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
                {/* スコアテキスト */}
                <text
                    x={size / 2}
                    y={size / 2 - 10}
                    textAnchor="middle"
                    fill="var(--text-primary)"
                    fontSize={size / 4}
                    fontWeight="800"
                    fontFamily="Inter"
                >
                    {animatedScore}
                </text>
                <text
                    x={size / 2}
                    y={size / 2 + 18}
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    fontSize={size / 10}
                    fontWeight="500"
                >
                    / {maxScore}
                </text>
                {rank && (
                    <text
                        x={size / 2}
                        y={size / 2 + 45}
                        textAnchor="middle"
                        fill={getColor()}
                        fontSize={size / 7}
                        fontWeight="800"
                    >
                        {rank}
                    </text>
                )}
            </svg>
            {label && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>
                    {label}
                </div>
            )}
        </div>
    );
}
