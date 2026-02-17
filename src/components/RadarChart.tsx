'use client';

import { useEffect, useRef } from 'react';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { ScoreBreakdown } from '@/types';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface RadarChartProps {
    scores: ScoreBreakdown;
}

export default function RadarChart({ scores }: RadarChartProps) {
    const data = {
        labels: ['構造化データ', 'コンテンツ品質', '技術的最適化', '権威性・信頼性', 'AI対応度'],
        datasets: [
            {
                label: 'スコア',
                data: [
                    scores.structuredData,
                    scores.contentQuality,
                    scores.technicalSEO,
                    scores.authority,
                    scores.aiReadiness,
                ],
                backgroundColor: 'rgba(79, 70, 229, 0.12)',
                borderColor: '#4F46E5',
                borderWidth: 2,
                pointBackgroundColor: '#7C3AED',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(26, 26, 46, 0.95)',
                titleColor: '#ffffff',
                bodyColor: '#d0d0e0',
                borderColor: 'rgba(79, 70, 229, 0.3)',
                borderWidth: 1,
                padding: 12,
                callbacks: {
                    label: function (context: any) {
                        return `${context.parsed.r} / 20 点`;
                    }
                }
            },
        },
        scales: {
            r: {
                beginAtZero: true,
                max: 20,
                ticks: {
                    stepSize: 5,
                    color: 'rgba(0, 0, 0, 0.3)',
                    backdropColor: 'transparent',
                    font: { size: 10 },
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.06)',
                },
                angleLines: {
                    color: 'rgba(0, 0, 0, 0.06)',
                },
                pointLabels: {
                    color: '#4a4a6a',
                    font: {
                        size: 12,
                        family: "'Noto Sans JP', sans-serif",
                        weight: 'bold' as const,
                    },
                },
            },
        },
    };

    return (
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
            <Radar data={data} options={options} />
        </div>
    );
}
