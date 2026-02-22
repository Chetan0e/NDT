import React, { useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { predictGrowth } from '../api';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Legend, Filler
);

const CHART_OPTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: { color: '#7aa3cc', font: { size: 12, family: 'Inter' } },
        },
        tooltip: {
            backgroundColor: '#0e1a2e',
            borderColor: 'rgba(0,200,255,0.3)',
            borderWidth: 1,
            titleColor: '#e8f4ff',
            bodyColor: '#7aa3cc',
            callbacks: {
                label: ctx => ` ${ctx.parsed.y.toFixed(2)} cc`,
            },
        },
    },
    scales: {
        x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#4a6b8a', font: { size: 11 } },
        },
        y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#4a6b8a', font: { size: 11 } },
            title: {
                display: true,
                text: 'Volume (cc)',
                color: '#7aa3cc',
                font: { size: 11 },
            },
        },
    },
};

export default function Graph({ times, volumes, scanHistory }) {
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchPrediction = async () => {
        if (times.length < 2) return;
        setLoading(true);
        setError(null);
        try {
            const data = await predictGrowth(times, volumes);
            setPrediction(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Auto-run on mount if we have enough data
    useEffect(() => {
        if (times.length >= 2) fetchPrediction();
    }, [times.join(','), volumes.join(',')]);

    // Build chart datasets
    const labels = [
        ...scanHistory.map(s => s.date),
        'Day +30', 'Day +60', 'Day +90',
    ];

    const actualData = volumes.concat([null, null, null]);

    const predData = Array(volumes.length).fill(null).concat([
        prediction?.predictions?.day_30 || null,
        prediction?.predictions?.day_60 || null,
        prediction?.predictions?.day_90 || null,
    ]);

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Observed Volume',
                data: actualData,
                borderColor: '#00c8ff',
                backgroundColor: 'rgba(0,200,255,0.1)',
                pointBackgroundColor: '#00c8ff',
                pointRadius: 6,
                pointHoverRadius: 9,
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                spanGaps: false,
            },
            {
                label: 'Predicted Volume',
                data: predData,
                borderColor: '#7c4dff',
                backgroundColor: 'rgba(124,77,255,0.08)',
                pointBackgroundColor: '#7c4dff',
                pointRadius: 6,
                pointHoverRadius: 9,
                borderWidth: 2.5,
                borderDash: [6, 3],
                fill: true,
                tension: 0.4,
                spanGaps: false,
            },
        ],
    };

    const trendColor = (trend) => {
        if (!trend) return 'var(--text-secondary)';
        if (trend.toLowerCase().includes('rapid') || trend.toLowerCase().includes('aggressive')) return 'var(--red)';
        if (trend.toLowerCase().includes('moderate')) return 'var(--amber)';
        if (trend.toLowerCase().includes('stable') || trend.toLowerCase().includes('shrink')) return 'var(--green)';
        return 'var(--cyan)';
    };

    return (
        <div className="fade-in">
            <div className="section-header">
                <div>
                    <div className="section-title">Tumor Growth Analysis</div>
                    <div className="section-subtitle">
                        Longitudinal tracking + AI-powered growth prediction
                    </div>
                </div>
                <button className="btn btn-outline" onClick={fetchPrediction} disabled={loading}>
                    {loading ? '⏳ Predicting…' : '🔮 Refresh Prediction'}
                </button>
            </div>

            {error && (
                <div style={{ padding: '10px 14px', background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.3)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Stats Row */}
            {prediction && (
                <div className="grid-4" style={{ marginBottom: 20 }}>
                    <div className="card">
                        <div className="card-title">Trend</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: trendColor(prediction.trend) }}>
                            {prediction.trend}
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-title">+30 Day Forecast</div>
                        <div className="card-value" style={{ fontSize: 26 }}>
                            {prediction.predictions?.day_30?.toFixed(1) || '—'}
                        </div>
                        <div className="card-unit">cc</div>
                    </div>
                    <div className="card">
                        <div className="card-title">+60 Day Forecast</div>
                        <div className="card-value" style={{ fontSize: 26 }}>
                            {prediction.predictions?.day_60?.toFixed(1) || '—'}
                        </div>
                        <div className="card-unit">cc</div>
                    </div>
                    <div className="card">
                        <div className="card-title">Model Fit (R²)</div>
                        <div className="card-value" style={{ fontSize: 26, color: 'var(--green)' }}>
                            {prediction.r_squared?.toFixed(3) || '—'}
                        </div>
                    </div>
                </div>
            )}

            {/* Chart */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-title">Volume Timeline</div>
                <div className="chart-wrap" style={{ height: 320 }}>
                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <div className="spinner" />
                        </div>
                    ) : (
                        <Line data={chartData} options={CHART_OPTS} />
                    )}
                </div>
            </div>

            {/* Prediction Detail */}
            {prediction && (
                <div className="grid-2">
                    <div className="card">
                        <div className="card-title">Growth Model Details</div>
                        <div className="stat-row">
                            <span className="stat-label">Model Used</span>
                            <span className="stat-value">{prediction.model_used}</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Growth Rate</span>
                            <span className="stat-value">
                                {prediction.growth_rate_per_day?.toFixed(3)} cc/day
                            </span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Exponential Rate (r)</span>
                            <span className="stat-value">
                                {prediction.exponential_rate?.toFixed(5) || 'N/A'}
                            </span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Current Volume</span>
                            <span className="stat-value">{prediction.current_volume?.toFixed(2)} cc</span>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-title">Prediction Table</div>
                        {['30', '60', '90'].map(d => {
                            const pred = prediction.predictions?.[`day_${d}`];
                            const curr = prediction.current_volume;
                            const change = pred && curr ? ((pred - curr) / curr * 100).toFixed(1) : null;
                            return (
                                <div className="stat-row" key={d}>
                                    <span className="stat-label">Day +{d}</span>
                                    <div style={{ textAlign: 'right' }}>
                                        <span className="stat-value">{pred?.toFixed(1) || '—'} cc</span>
                                        {change && (
                                            <span style={{ fontSize: 11, marginLeft: 8, color: parseFloat(change) > 30 ? 'var(--red)' : 'var(--amber)' }}>
                                                +{change}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
