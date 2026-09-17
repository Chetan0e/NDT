import React, { useState } from 'react';
import { optimizeTherapy } from '../api';

const THERAPY_LEVELS = [
    { label: 'No Treatment', icon: '🚫', desc: 'Watch & wait. Suitable for indolent tumors.', color: '#64748b' },
    { label: 'Mild Chemotherapy', icon: '💊', desc: 'Low-dose temozolomide. Minimal toxicity.', color: '#f59e0b' },
    { label: 'Standard Chemo + RT', icon: '☢️', desc: 'Stupp protocol. Clinical standard of care.', color: '#0284c7' },
    { label: 'Aggressive Multi-modal', icon: '🔬', desc: 'Combined immunotherapy + chemoradiation.', color: '#10b981' },
];

function ScoreBar({ value, max = 100, color }) {
    return (
        <div className="progress-bar">
            <div
                className="progress-fill"
                style={{
                    width: `${Math.min(100, Math.max(0, (value / max) * 100))}%`,
                    background: `linear-gradient(90deg, ${color}88, ${color})`,
                }}
            />
        </div>
    );
}

export default function RLOptimizer({ times, volumes }) {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [useRL, setUseRL] = useState(false);
    const [days, setDays] = useState(60);
    const [budget, setBudget] = useState(2.0);
    const [error, setError] = useState(null);

    const handleOptimize = async () => {
        if (times.length < 2) {
            setError('At least 2 historical scans are needed for optimization.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await optimizeTherapy(times, volumes, days, useRL, budget);
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const bestTherapy = result?.recommendation?.best_therapy || '';
    const therapyLevel = bestTherapy
        ? THERAPY_LEVELS.find(t =>
            t.label.toLowerCase().includes(
                bestTherapy.split('(')[0].trim().toLowerCase().split(' ')[0]
            )
        ) || THERAPY_LEVELS[2]
        : null;

    const reductionColor = (pct) => {
        if (pct > 40) return 'var(--green)';
        if (pct > 10) return 'var(--cyan)';
        if (pct > 0) return 'var(--amber)';
        return 'var(--red)';
    };

    return (
        <div className="fade-in">
            <div className="section-header">
                <div>
                    <div className="section-title">RL Therapy Optimizer</div>
                    <div className="section-subtitle">
                        AI-driven treatment strategy optimization using digital twin simulation
                    </div>
                </div>
                <span className="badge badge-violet">PPO Agent</span>
            </div>

            <div className="grid-2" style={{ marginBottom: 20 }}>
                {/* Config */}
                <div className="card">
                    <div className="card-title">Optimization Configuration</div>

                    {/* Mode toggle */}
                    <div style={{ marginBottom: 20 }}>
                        <div className="input-label">Optimization Mode</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {[
                                { id: false, label: '🎯 Heuristic', desc: 'Fast, deterministic' },
                                { id: true, label: '🤖 PPO Agent', desc: 'RL training (slower)' },
                            ].map(opt => (
                                <div
                                    key={String(opt.id)}
                                    onClick={() => setUseRL(opt.id)}
                                    style={{
                                        flex: 1,
                                        padding: '12px 14px',
                                        border: `1px solid ${useRL === opt.id ? 'var(--cyan)' : 'var(--border)'}`,
                                        borderRadius: 10,
                                        cursor: 'pointer',
                                        background: useRL === opt.id ? '#e0f2fe' : 'transparent',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <div style={{ fontSize: 14, fontWeight: 700, color: useRL === opt.id ? 'var(--cyan)' : 'var(--text-primary)', marginBottom: 4 }}>
                                        {opt.label}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{opt.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Horizon */}
                    <div style={{ marginBottom: 16 }}>
                        <label className="input-label">Optimization Horizon: <strong style={{ color: 'var(--cyan)' }}>{days} days</strong></label>
                        <input
                            type="range" min={30} max={120} step={10}
                            value={days}
                            onChange={e => setDays(Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--cyan)' }}
                        />
                    </div>

                    {/* Toxicity budget */}
                    <div style={{ marginBottom: 20 }}>
                        <label className="input-label">
                            Toxicity Budget: <strong style={{ color: 'var(--amber)' }}>{budget.toFixed(1)}/3.0</strong>
                        </label>
                        <input
                            type="range" min={0.5} max={3.0} step={0.5}
                            value={budget}
                            onChange={e => setBudget(Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--amber)' }}
                        />
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            Maximum therapy intensity the optimizer is allowed to select
                        </div>
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        onClick={handleOptimize}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                {useRL ? 'Training RL Agent…' : 'Optimizing…'}
                            </>
                        ) : '🚀 Optimize Therapy'}
                    </button>

                    {error && (
                        <div style={{ marginTop: 12, padding: '10px 14px', background: '#fee2e2', border: '1px solid rgba(255,82,82,0.3)', borderRadius: 8, fontSize: 13, color: 'var(--red)' }}>
                            ⚠️ {error}
                        </div>
                    )}
                </div>

                {/* Recommendation */}
                {result && (
                    <div className="card">
                        <div className="card-title">AI Recommendation</div>

                        <div style={{
                            padding: '16px',
                            background: `${therapyLevel?.color}15`,
                            border: `1px solid ${therapyLevel?.color}44`,
                            borderRadius: 12,
                            marginBottom: 16,
                        }}>
                            <div style={{ fontSize: 28, marginBottom: 8 }}>{therapyLevel?.icon}</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: therapyLevel?.color, marginBottom: 4 }}>
                                {result.recommendation.best_therapy.split('(')[0].trim()}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                {therapyLevel?.desc}
                            </div>
                        </div>

                        <div className="stat-row">
                            <span className="stat-label">Intensity</span>
                            <span className="stat-value">{result.recommendation.therapy_intensity?.toFixed(1)} / 3.0</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Predicted Final Volume</span>
                            <span className="stat-value">{result.recommendation.final_volume?.toFixed(2)} cc</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Expected Reduction</span>
                            <span className="stat-value" style={{ color: reductionColor(result.recommendation.volume_reduction_pct) }}>
                                {result.recommendation.volume_reduction_pct?.toFixed(1)}%
                            </span>
                        </div>

                        <div className="separator" />

                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
                            💬 {result.recommendation.clinical_explanation}
                        </div>
                    </div>
                )}
            </div>

            {/* Strategy comparison table */}
            {result?.strategy_comparison && Object.keys(result.strategy_comparison).length > 0 && (
                <div className="card">
                    <div className="card-title">Strategy Comparison</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {['Strategy', 'Intensity', 'Final Volume', 'Reduction', 'Effectiveness'].map(h => (
                                    <th key={h} style={{
                                        textAlign: 'left', padding: '8px 12px',
                                        fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
                                        borderBottom: '1px solid var(--border)',
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(result.strategy_comparison).map(([name, data], idx) => {
                                const isRec = name.toLowerCase().includes(
                                    (result.recommendation.best_therapy || '').toLowerCase().split(' ')[0]
                                );
                                return (
                                    <tr
                                        key={name}
                                        style={{
                                            background: isRec ? 'rgba(0,200,255,0.05)' : 'transparent',
                                            transition: 'background 0.2s',
                                        }}
                                    >
                                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: isRec ? 700 : 400, color: isRec ? 'var(--cyan)' : 'var(--text-primary)' }}>
                                            {isRec ? '⭐ ' : ''}{name.split('(')[0].trim()}
                                        </td>
                                        <td style={{ padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                                            {data.intensity?.toFixed(1)}
                                        </td>
                                        <td style={{ padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                                            {data.final_volume?.toFixed(2)} cc
                                        </td>
                                        <td style={{ padding: '10px 12px', fontSize: 13, color: reductionColor(data.volume_reduction_pct) }}>
                                            {data.volume_reduction_pct?.toFixed(1)}%
                                        </td>
                                        <td style={{ padding: '10px 12px', minWidth: 120 }}>
                                            <ScoreBar
                                                value={Math.max(0, data.volume_reduction_pct || 0)}
                                                max={80}
                                                color={reductionColor(data.volume_reduction_pct)}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Disclaimer */}
            <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(255,171,64,0.08)', border: '1px solid rgba(255,171,64,0.25)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 600, marginBottom: 4 }}>
                    ⚠️ Research Use Only
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    This AI model is not clinically validated. All therapy recommendations are
                    for research and demonstration purposes only. Always consult a qualified
                    neuro-oncologist before making any treatment decisions.
                </div>
            </div>
        </div>
    );
}
