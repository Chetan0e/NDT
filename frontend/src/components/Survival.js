import React, { useState } from 'react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const API = (process.env.REACT_APP_API_URL || 'http://localhost:8000');

const RISK_COLORS = {
    'Low': { bg: 'rgba(0,230,118,0.1)', border: '#00e676', text: '#00e676' },
    'Intermediate': { bg: 'rgba(0,180,216,0.1)', border: '#00b4d8', text: '#00b4d8' },
    'High': { bg: 'rgba(251,191,36,0.1)', border: '#fbbf24', text: '#fbbf24' },
    'Very High': { bg: 'rgba(239,68,68,0.1)', border: '#ef4444', text: '#ef4444' },
};

const CHART_OPTS = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
        legend: { labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12, padding: 12 } },
        tooltip: {
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderColor: 'rgba(56,130,220,0.3)',
            borderWidth: 1,
            titleColor: '#e1f0ff',
            bodyColor: '#94a3b8',
            callbacks: {
                label: ctx => ` ${(ctx.parsed.y * 100).toFixed(1)}% survival`,
            },
        },
    },
    scales: {
        x: {
            grid: { color: 'rgba(15,23,42,0.04)' },
            ticks: { color: '#4a6080', font: { size: 10 } },
            title: { display: true, text: 'Months', color: '#4a6080', font: { size: 10 } },
        },
        y: {
            min: 0, max: 1,
            grid: { color: 'rgba(15,23,42,0.05)' },
            ticks: {
                color: '#4a6080', font: { size: 10 },
                callback: v => `${(v * 100).toFixed(0)}%`,
            },
            title: { display: true, text: 'Survival Probability', color: '#4a6080', font: { size: 10 } },
        },
    },
};

const REF_COHORTS = {
    'GBM_IDHwt_MGMT_unmethylated': { label: 'GBM IDHwt / MGMT−', color: '#ef4444' },
    'GBM_IDHwt_MGMT_methylated': { label: 'GBM IDHwt / MGMT+', color: '#f59e0b' },
    'GBM_IDHmut': { label: 'GBM IDHmut', color: '#0284c7' },
    'Grade3_IDHmut': { label: 'Grade III IDHmut', color: '#10b981' },
};

export default function Survival({ patient }) {
    const [form, setForm] = useState({
        age: patient?.age || 55,
        kps_score: patient?.kps_score || 80,
        tumor_grade: patient?.tumor_grade || 4,
        idh_mutation: patient?.idh_mutation || false,
        mgmt_methylation: patient?.mgmt_methylation || false,
        egfr_amplification: false,
        tp53_mutation: false,
        tumor_volume_cc: 30.0,
        growth_rate_alpha: 0.02,
        extent_of_resection: 'subtotal',
        recurrent: false,
    });
    const [result, setResult] = useState(null);
    const [refCurves, setRefCurves] = useState(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('predict');
    const [error, setError] = useState(null);

    const predict = async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${API}/survival/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    timepoints_months: [1, 3, 6, 9, 12, 18, 24, 30, 36],
                }),
            });
            if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
            setResult(await res.json());
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    const loadRef = async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${API}/survival/reference`);
            setRefCurves(await res.json());
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    const F = (k) => form[k];
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    // Patient KM chart
    const kmChart = result ? {
        labels: Object.keys(result.kaplan_meier_curve).map(t => `${t}mo`),
        datasets: [{
            label: 'Patient Survival Curve',
            data: Object.values(result.kaplan_meier_curve),
            borderColor: RISK_COLORS[result.risk_level]?.border || '#0284c7',
            backgroundColor: RISK_COLORS[result.risk_level]?.bg || '#e0f2fe',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
        }],
    } : null;

    // Reference KM chart
    const refChart = refCurves ? {
        labels: Object.keys(Object.values(refCurves.cohorts)[0].curve).map(t => `${t}mo`),
        datasets: Object.entries(refCurves.cohorts).map(([key, coh]) => ({
            label: REF_COHORTS[key]?.label || key,
            data: Object.values(coh.curve),
            borderColor: REF_COHORTS[key]?.color || '#475569',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            borderWidth: 2.5,
            pointRadius: 3,
        })),
    } : null;

    const riskStyle = RISK_COLORS[result?.risk_level] || {};

    return (
        <div className="fade-in">
            <div className="section-header">
                <div>
                    <div className="section-title">Survival Analysis</div>
                    <div className="section-subtitle">
                        Cox PH + Weibull survival curves · Based on TCGA-GBM & Stupp 2005 hazard ratios
                    </div>
                </div>
                <span className="badge badge-violet">Research Mode</span>
            </div>

            {/* Tab nav */}
            <div className="tab-nav" style={{ marginBottom: 20 }}>
                <button className={`tab-btn ${tab === 'predict' ? 'active' : ''}`} onClick={() => setTab('predict')}>
                    🧬 Patient Prediction
                </button>
                <button className={`tab-btn ${tab === 'reference' ? 'active' : ''}`} onClick={() => { setTab('reference'); loadRef(); }}>
                    📊 Reference Curves
                </button>
            </div>

            {error && (
                <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid rgba(255,82,82,0.3)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* ── PREDICTION TAB ── */}
            {tab === 'predict' && (
                <>
                    <div className="grid-2" style={{ marginBottom: 20 }}>
                        {/* Input form */}
                        <div className="card">
                            <div className="card-title">Clinical Parameters</div>

                            {/* Demographics */}
                            <div style={{ marginBottom: 12 }}>
                                <label className="input-label">Age: <strong style={{ color: 'var(--cyan)' }}>{F('age')}</strong></label>
                                <input type="range" min={18} max={85} value={F('age')} onChange={e => set('age', +e.target.value)} style={{ width: '100%', accentColor: 'var(--cyan)' }} />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <label className="input-label">KPS Score: <strong style={{ color: 'var(--cyan)' }}>{F('kps_score')}</strong></label>
                                <input type="range" min={10} max={100} step={10} value={F('kps_score')} onChange={e => set('kps_score', +e.target.value)} style={{ width: '100%', accentColor: 'var(--cyan)' }} />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <label className="input-label">Tumor Volume (cc): <strong style={{ color: 'var(--amber)' }}>{F('tumor_volume_cc')}</strong></label>
                                <input type="range" min={1} max={150} value={F('tumor_volume_cc')} onChange={e => set('tumor_volume_cc', +e.target.value)} style={{ width: '100%', accentColor: 'var(--amber)' }} />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <label className="input-label">Growth Rate (α): <strong style={{ color: 'var(--amber)' }}>{F('growth_rate_alpha').toFixed(3)}</strong></label>
                                <input type="range" min={0.001} max={0.1} step={0.001} value={F('growth_rate_alpha')} onChange={e => set('growth_rate_alpha', +e.target.value)} style={{ width: '100%', accentColor: 'var(--amber)' }} />
                            </div>

                            {/* Extent */}
                            <div style={{ marginBottom: 14 }}>
                                <label className="input-label">Extent of Resection</label>
                                <select className="input" value={F('extent_of_resection')} onChange={e => set('extent_of_resection', e.target.value)}>
                                    <option value="gross_total">Gross Total Resection (GTR)</option>
                                    <option value="subtotal">Subtotal Resection (STR)</option>
                                    <option value="biopsy">Biopsy Only</option>
                                </select>
                            </div>

                            {/* Grade */}
                            <div style={{ marginBottom: 14 }}>
                                <label className="input-label">WHO Tumor Grade</label>
                                <select className="input" value={F('tumor_grade')} onChange={e => set('tumor_grade', +e.target.value)}>
                                    {[1, 2, 3, 4].map(g => <option key={g} value={g}>Grade {g}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Genomic toggles */}
                        <div className="card">
                            <div className="card-title">Genomic & Molecular Markers</div>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                                Molecular biomarkers have the strongest individual impact on survival.
                                Toggle to see how each affects the predicted curve.
                            </p>

                            {[
                                { key: 'idh_mutation', label: 'IDH1/2 Mutation', hr: 0.30, type: 'favorable', note: 'Strongest single favorable marker' },
                                { key: 'mgmt_methylation', label: 'MGMT Promoter Methylation', hr: 0.50, type: 'favorable', note: 'Predicts TMZ response' },
                                { key: 'egfr_amplification', label: 'EGFR Amplification', hr: 1.40, type: 'adverse', note: 'Aggressive growth driver' },
                                { key: 'tp53_mutation', label: 'TP53 Mutation', hr: 0.85, type: 'favorable', note: 'Mildly protective in GBM' },
                                { key: 'recurrent', label: 'Recurrent Disease', hr: 1.80, type: 'adverse', note: 'At first recurrence' },
                            ].map(f => (
                                <div
                                    key={f.key}
                                    onClick={() => set(f.key, !F(f.key))}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                                        padding: '10px 14px', borderRadius: 10, marginBottom: 8,
                                        border: `1px solid ${F(f.key) ? (f.type === 'favorable' ? 'var(--green)' : 'var(--red)') : 'var(--border)'}`,
                                        background: F(f.key) ? (f.type === 'favorable' ? 'rgba(0,230,118,0.08)' : 'rgba(255,82,82,0.08)') : 'transparent',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <div style={{
                                        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                                        background: F(f.key) ? (f.type === 'favorable' ? 'var(--green)' : 'var(--red)') : 'transparent',
                                        border: `2px solid ${F(f.key) ? 'transparent' : 'var(--text-muted)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {F(f.key) && <span style={{ fontSize: 10, fontWeight: 900, color: '#000' }}>✓</span>}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.note}</div>
                                    </div>
                                    <div style={{
                                        fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                                        color: f.type === 'favorable' ? 'var(--green)' : 'var(--red)',
                                    }}>
                                        HR={f.hr}
                                    </div>
                                </div>
                            ))}

                            <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={predict} disabled={loading}>
                                {loading ? <>⏳ Computing…</> : '🔮 Predict Survival'}
                            </button>
                        </div>
                    </div>

                    {/* Results */}
                    {result && (
                        <>
                            {/* Summary cards */}
                            <div className="grid-4" style={{ marginBottom: 20 }}>
                                <div className="card" style={{ border: `1px solid ${riskStyle.border}40`, background: riskStyle.bg }}>
                                    <div className="card-title">Risk Level</div>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: riskStyle.text }}>{result.risk_level}</div>
                                </div>
                                <div className="card">
                                    <div className="card-title">Median OS</div>
                                    <div className="card-value">{result.median_os_months}</div>
                                    <div className="card-unit">months</div>
                                </div>
                                <div className="card">
                                    <div className="card-title">1-Year Survival</div>
                                    <div className="card-value" style={{ color: 'var(--cyan)' }}>
                                        {result.survival_probabilities['12m'] ? `${(result.survival_probabilities['12m'] * 100).toFixed(0)}%` : '—'}
                                    </div>
                                </div>
                                <div className="card">
                                    <div className="card-title">2-Year Survival</div>
                                    <div className="card-value" style={{ color: 'var(--violet)' }}>
                                        {result.survival_probabilities['24m'] ? `${(result.survival_probabilities['24m'] * 100).toFixed(0)}%` : '—'}
                                    </div>
                                </div>
                            </div>

                            {/* Chart + factors */}
                            <div className="grid-2" style={{ marginBottom: 20 }}>
                                <div className="card">
                                    <div className="card-title">Estimated Kaplan-Meier Curve</div>
                                    <div className="chart-wrap" style={{ height: 280 }}>
                                        <Line data={kmChart} options={CHART_OPTS} />
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                                        95% CI: [{result.confidence_interval_months.lower}–{result.confidence_interval_months.upper} months]
                                        · HR={result.cumulative_hazard_ratio}
                                    </div>
                                </div>

                                <div className="card">
                                    <div className="card-title">Prognostic Factor Analysis</div>
                                    {result.favorable_factors.length > 0 && (
                                        <div style={{ marginBottom: 12 }}>
                                            <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                                                ✅ Favorable ({result.favorable_factors.length})
                                            </div>
                                            {result.favorable_factors.map((f, i) => (
                                                <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid var(--green)' }}>
                                                    {f}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {result.adverse_factors.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                                                ⚠️ Adverse ({result.adverse_factors.length})
                                            </div>
                                            {result.adverse_factors.map((f, i) => (
                                                <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid var(--red)' }}>
                                                    {f}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Explanation */}
                            <div className="card">
                                <div className="card-title">Clinical Interpretation</div>
                                <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                                    {result.clinical_explanation}
                                </p>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* ── REFERENCE TAB ── */}
            {tab === 'reference' && refCurves && (
                <div className="card">
                    <div className="card-title">Population Reference Kaplan-Meier Curves</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                        Source: {refCurves.source}
                    </div>
                    <div className="chart-wrap" style={{ height: 380 }}>
                        <Line data={refChart} options={CHART_OPTS} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 20 }}>
                        {Object.entries(refCurves.cohorts).map(([key, coh]) => (
                            <div key={key} style={{
                                padding: '12px 14px', borderRadius: 10, border: `1px solid ${REF_COHORTS[key]?.color}44`,
                                background: `${REF_COHORTS[key]?.color}0d`,
                            }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: REF_COHORTS[key]?.color }}>
                                    {REF_COHORTS[key]?.label}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{coh.description}</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 6 }}>
                                    {coh.median_os_months} mo
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Disclaimer */}
            <div style={{ marginTop: 24, padding: '12px 16px', background: 'rgba(255,171,64,0.06)', border: '1px solid rgba(255,171,64,0.2)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 600, marginBottom: 3 }}>⚠️ Research Use Only</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    Survival estimates are derived from published GBM hazard ratios (TCGA, EORTC, Stupp 2005).
                    Individual patient outcomes depend on many factors not modeled here. This tool is not
                    validated for clinical decision-making.
                </div>
            </div>
        </div>
    );
}
