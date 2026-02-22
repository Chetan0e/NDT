import React, { useState } from 'react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { simulateTwin, compareTherapies } from '../api';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Legend, Filler
);

const CHART_OPTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { labels: { color: '#475569', font: { size: 12 } } },
        tooltip: {
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            titleColor: '#0f172a',
            bodyColor: '#475569',
        },
    },
    scales: {
        x: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { color: '#64748b', font: { size: 10 }, maxTicksLimit: 10 },
            title: { display: true, text: 'Day', color: '#475569', font: { size: 11 } },
        },
        y: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { color: '#64748b', font: { size: 11 } },
            title: { display: true, text: 'Volume (cc)', color: '#475569', font: { size: 11 } },
        },
    },
};

const THERAPY_LEVELS = [
    { label: 'No Treatment', value: 0, color: '#ef4444' },
    { label: 'Mild Chemo', value: 1, color: '#f59e0b' },
    { label: 'Standard Chemo+RT', value: 2, color: '#0284c7' },
    { label: 'Aggressive', value: 3, color: '#10b981' },
];

export default function TwinSimulator({ times, volumes }) {
    const [simDays, setSimDays] = useState(90);
    const [therapy, setTherapy] = useState(0);
    const [result, setResult] = useState(null);
    const [comparison, setComparison] = useState(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('single');
    const [error, setError] = useState(null);

    const runSimulation = async () => {
        if (times.length < 2) return;
        setLoading(true);
        setError(null);
        try {
            if (tab === 'compare') {
                const data = await compareTherapies(times, volumes, simDays);
                setComparison(data);
                setResult(null);
            } else {
                const data = await simulateTwin(times, volumes, simDays, therapy);
                setResult(data);
                setComparison(null);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Build trajectory chart
    const buildSingleChart = () => {
        if (!result) return null;
        const traj = result.simulation.trajectory;
        const labels = result.simulation.days.map(d => `D${d}`);
        return {
            labels,
            datasets: [{
                label: `Trajectory (T=${therapy})`,
                data: traj,
                borderColor: THERAPY_LEVELS.find(t => t.value === therapy)?.color || '#0284c7',
                backgroundColor: '#f0f9ff',
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
            }],
        };
    };

    const buildCompareChart = () => {
        if (!comparison) return null;
        const entries = Object.entries(comparison.therapy_comparison);
        const maxDays = simDays;
        const labels = Array.from({ length: maxDays + 1 }, (_, i) => `D${i}`);

        const datasets = entries.map(([name, data], idx) => ({
            label: name.split('(')[0].trim(),
            data: Array(labels.length).fill(null).map((_, i) => {
                if (i === 0) return comparison.initial_volume;
                return data.final_volume; // simplified
            }),
            borderColor: THERAPY_LEVELS[idx]?.color || '#0284c7',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 0,
        }));

        return { labels, datasets };
    };

    const chartData = tab === 'compare' ? buildCompareChart() : buildSingleChart();

    const changeLabel = result?.simulation?.volume_change_pct;
    const changeLabelColor = !changeLabel ? 'var(--text-secondary)'
        : changeLabel < -20 ? 'var(--green)'
            : changeLabel < 10 ? 'var(--green)'
                : changeLabel < 40 ? 'var(--amber)'
                    : 'var(--red)';

    return (
        <div className="fade-in">
            <div className="section-header">
                <div>
                    <div className="section-title">Digital Twin Simulation</div>
                    <div className="section-subtitle">
                        Patient-specific ODE model: dV/dt = αV(1 − V/K) − βT
                    </div>
                </div>
                <span className="badge badge-violet">Logistic Growth + Therapy</span>
            </div>

            <div className="grid-2" style={{ marginBottom: 20 }}>
                {/* Controls */}
                <div className="card">
                    <div className="card-title">Simulation Parameters</div>

                    <div className="tab-nav">
                        <button className={`tab-btn ${tab === 'single' ? 'active' : ''}`} onClick={() => setTab('single')}>
                            Single Therapy
                        </button>
                        <button className={`tab-btn ${tab === 'compare' ? 'active' : ''}`} onClick={() => setTab('compare')}>
                            Compare All
                        </button>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label className="input-label">Simulation Horizon (days)</label>
                        <input
                            type="range" min={30} max={180} step={10}
                            value={simDays}
                            onChange={e => setSimDays(Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--cyan)' }}
                        />
                        <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--cyan)', fontWeight: 600 }}>
                            {simDays} days
                        </div>
                    </div>

                    {tab === 'single' && (
                        <div style={{ marginBottom: 16 }}>
                            <label className="input-label">Therapy Intensity</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {THERAPY_LEVELS.map(t => (
                                    <div
                                        key={t.value}
                                        className={`therapy-card ${therapy === t.value ? 'selected' : ''}`}
                                        onClick={() => setTherapy(t.value)}
                                    >
                                        <div
                                            className="therapy-name"
                                            style={{ color: therapy === t.value ? t.color : 'var(--text-primary)' }}
                                        >
                                            {t.label}
                                        </div>
                                        <div className="therapy-metric">Level {t.value} / 3</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        onClick={runSimulation}
                        disabled={loading || times.length < 2}
                    >
                        {loading ? '⏳ Simulating…' : '▶️ Run Simulation'}
                    </button>

                    {error && (
                        <div style={{ marginTop: 12, padding: '10px 14px', background: '#fee2e2', border: '1px solid rgba(255,82,82,0.3)', borderRadius: 8, fontSize: 13, color: 'var(--red)' }}>
                            ⚠️ {error}
                        </div>
                    )}
                </div>

                {/* Results */}
                {result && (
                    <div className="card">
                        <div className="card-title">Simulation Results</div>
                        <div className="stat-row">
                            <span className="stat-label">Initial Volume</span>
                            <span className="stat-value">{result.simulation.initial_volume.toFixed(2)} cc</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Final Volume ({simDays}d)</span>
                            <span className="stat-value">{result.simulation.final_volume.toFixed(2)} cc</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Peak Volume</span>
                            <span className="stat-value">{result.simulation.peak_volume.toFixed(2)} cc</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Volume Change</span>
                            <span className="stat-value" style={{ color: changeLabelColor }}>
                                {changeLabel > 0 ? '+' : ''}{changeLabel?.toFixed(1)}%
                            </span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Assessment</span>
                            <span className="stat-value" style={{ fontSize: 12 }}>{result.simulation.growth_label}</span>
                        </div>
                        <div className="separator" />
                        <div className="stat-row">
                            <span className="stat-label">Growth Rate (α)</span>
                            <span className="stat-value">{result.growth_parameters?.alpha?.toFixed(5)}</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Carrying Capacity (K)</span>
                            <span className="stat-value">{result.growth_parameters?.carrying_capacity?.toFixed(0)} cc</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Risk Level</span>
                            <span className={`risk-badge risk-${result.clinical_assessment?.risk_level}`}>
                                {result.clinical_assessment?.risk_level}
                            </span>
                        </div>
                    </div>
                )}

                {comparison && (
                    <div className="card">
                        <div className="card-title">Therapy Comparison</div>
                        {Object.entries(comparison.therapy_comparison).map(([name, data]) => (
                            <div key={name} className="stat-row">
                                <span className="stat-label" style={{ fontSize: 12 }}>{name.split('(')[0].trim()}</span>
                                <div>
                                    <span className="stat-value">{data.final_volume?.toFixed(1)} cc</span>
                                    <span style={{ fontSize: 11, marginLeft: 8, color: data.volume_reduction_pct > 0 ? 'var(--green)' : 'var(--amber)' }}>
                                        {data.volume_reduction_pct > 0 ? '-' : '+'}{Math.abs(data.volume_reduction_pct).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Chart */}
            {chartData && (
                <div className="card">
                    <div className="card-title">Tumor Volume Trajectory</div>
                    <div className="chart-wrap" style={{ height: 300 }}>
                        <Line data={chartData} options={CHART_OPTS} />
                    </div>
                </div>
            )}
        </div>
    );
}
