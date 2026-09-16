import React, { useState, useEffect, useRef } from 'react';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Legend, Filler, RadialLinearScale
} from 'chart.js';
import { Line, Radar } from 'react-chartjs-2';
import {
    ExternalLink, RefreshCw, LineChart as LineChartIcon,
    Settings, Network, Activity, Brain, MoreHorizontal, Maximize2, RotateCcw, ChevronDown, Check, ArrowDownRight, ArrowDown
} from 'lucide-react';
import { predictGrowth, simulateTwin, optimizeTherapy } from '../api';
import Viewer3D from './Viewer3D';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Legend, Filler, RadialLinearScale
);

// ── Real data integration ─────────────────────────────────────────────────────────────
// All data will be fetched from backend API based on actual patient records

// ── Chart defaults ────────────────────────────────────────────────────────
const darkChartOpts = (yLabel = 'Volume (cc)', xLabel = 'Days') => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
        legend: {
            labels: {
                color: '#94a3b8',
                font: { size: 10, family: 'Inter' },
                boxWidth: 12,
                padding: 12,
            },
        },
        tooltip: {
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderColor: 'rgba(56,130,220,0.3)',
            borderWidth: 1,
            titleColor: '#e1f0ff',
            bodyColor: '#94a3b8',
            padding: 10,
            callbacks: { label: ctx => ` ${ctx.parsed.y?.toFixed?.(2) ?? ctx.parsed.y} cc` },
        },
    },
    scales: {
        x: {
            grid: { color: 'rgba(15,23,42,0.04)' },
            ticks: { color: '#4a6080', font: { size: 10 } },
            title: { display: true, text: xLabel, color: '#4a6080', font: { size: 10 } },
        },
        y: {
            grid: { color: 'rgba(15,23,42,0.05)' },
            ticks: { color: '#4a6080', font: { size: 10 } },
            title: { display: true, text: yLabel, color: '#4a6080', font: { size: 10 } },
        },
    },
});

// ── SVG Sparkline ─────────────────────────────────────────────────────────
function Sparkline({ data, color = '#00b4d8', height = 36 }) {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const w = 100, h = height;
    const range = max - min || 1;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / range) * (h - 4) - 2;
        return `${x},${y}`;
    }).join(' ');
    const areaBase = `${w},${h} 0,${h}`;
    return (
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height }} aria-hidden>
            <defs>
                <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon points={`${pts} ${areaBase}`} fill={`url(#sg-${color.replace('#', '')})`} />
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
    );
}

// ── Survival mini KM ─────────────────────────────────────────────────────
function SurvivalMiniChart({ survivalData }) {
    // Use real survival data from backend prediction
    const medianOS = survivalData?.median_os_months || 0;
    const ci = survivalData?.confidence_interval_months || { lower: 0, upper: 0 };
    const kaplanMeierCurve = survivalData?.kaplan_meier_curve || {};
    
    // Convert KM curve dict to arrays for chart
    const months = Object.keys(kaplanMeierCurve).map(Number).sort((a, b) => a - b);
    const survProb = months.map(m => kaplanMeierCurve[m] || 0);
    
    const chartData = {
        labels: months.map(m => `${m}mo`),
        datasets: [{
            label: 'Survival',
            data: survProb,
            borderColor: '#fbbf24',
            backgroundColor: 'rgba(251,191,36,0.08)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
        }],
    };
    const opts = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(255,255,255,0.95)',
                borderColor: 'rgba(251,191,36,0.3)',
                borderWidth: 1,
                titleColor: '#e1f0ff',
                bodyColor: '#94a3b8',
                callbacks: { label: ctx => ` ${(ctx.parsed.y * 100).toFixed(0)}%` },
            },
        },
        scales: {
            x: {
                grid: { color: 'rgba(15,23,42,0.04)' },
                ticks: { color: '#4a6080', font: { size: 9 }, maxTicksLimit: 5 },
                title: { display: true, text: 'Months', color: '#4a6080', font: { size: 9 } },
            },
            y: {
                min: 0, max: 1,
                grid: { color: 'rgba(15,23,42,0.05)' },
                ticks: { color: '#4a6080', font: { size: 9 }, callback: v => `${(v * 100).toFixed(0)}%` },
                title: { display: true, text: 'Survival Prob', color: '#4a6080', font: { size: 9 } },
            },
        },
    };
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#fbbf24' }}>
                    {medianOS}<span style={{ fontSize: 13, fontWeight: 500 }}> mo</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Median OS</div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
                95% CI: {ci.lower}–{ci.upper}
            </div>
            <div className="chart-wrap" style={{ height: 100 }}>
                <Line data={chartData} options={opts} />
            </div>
        </div>
    );
}

// ── Biomarker Radar ───────────────────────────────────────────────────────
function BiomarkerRadar({ radiomics }) {
    // Extract real biomarker values from radiomics data
    const biomarkerLabels = ['Entropy', 'Contrast', 'Necrosis', 'Cellularity', 'Invasiveness', 'EGFR'];
    const biomarkerKeys = ['firstorder_Entropy', 'glcm_Contrast', 'firstorder_Energy', 'firstorder_Mean', 'shape_SurfaceVolumeRatio', 'shape_Elongation'];
    
    const biomarkerData = biomarkerKeys.map(key => {
        const val = radiomics?.[key];
        if (val === undefined || val === null) return 0;
        // Normalize to 0-1 range based on typical clinical ranges
        const ranges = {
            'firstorder_Entropy': [0, 10],
            'glcm_Contrast': [0, 500],
            'firstorder_Energy': [0, 100000],
            'firstorder_Mean': [0, 1],
            'shape_SurfaceVolumeRatio': [0, 1],
            'shape_Elongation': [0, 1],
        };
        const [min, max] = ranges[key] || [0, 1];
        return Math.min(1, Math.max(0, (val - min) / (max - min)));
    });

    const data = {
        labels: biomarkerLabels,
        datasets: [{
            label: 'Biomarkers',
            data: biomarkerData,
            backgroundColor: 'rgba(239,68,68,0.12)',
            borderColor: '#ef4444',
            borderWidth: 1.5,
            pointBackgroundColor: '#ef4444',
            pointRadius: 3,
        }],
    };
    const opts = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            r: {
                min: 0, max: 1,
                backgroundColor: 'rgba(15,23,42,0.02)',
                grid: { color: 'rgba(15,23,42,0.08)' },
                angleLines: { color: 'rgba(15,23,42,0.08)' },
                pointLabels: { color: '#4a6080', font: { size: 8 } },
                ticks: { display: false },
            },
        },
    };
    return (
        <div className="chart-wrap" style={{ height: 120 }}>
            <Radar data={data} options={opts} />
        </div>
    );
}

// ── MRI Slice visualization (Replaced by Volumetric Viewer3D) ──────────────
function MRIViewer({ activeSlice = 'Axial' }) {
    // Passes through to the shared 3D renderer in mini-mode
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 180, overflow: 'hidden', borderRadius: 6 }}>
            <Viewer3D volumeData={null} mini={true} />
            <div style={{ position: 'absolute', top: 12, left: 16, zIndex: 10, pointerEvents: 'none' }}>
                <div style={{ color: 'var(--cyan)', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
                    {activeSlice} VIEW
                </div>
            </div>
        </div>
    );
}

// ── Growth Prediction Chart ───────────────────────────────────────────────
function GrowthChart({ prediction, times, volumes }) {
    const historical = times || [];
    const histV = volumes || [];
    const futureLabels = prediction
        ? [30, 60, 90].map(d => `+${d}d`)
        : ['Day +30', 'Day +60', 'Day +90'];

    const allLabels = historical.map(d => `Day ${d}`).concat(futureLabels);
    const actualData = histV.concat([null, null, null]);
    const predictedData = histV.slice(0, -1).concat([histV[histV.length - 1] || 0]).concat([
        prediction?.predictions?.day_30 || null,
        prediction?.predictions?.day_60 || null,
        prediction?.predictions?.day_90 || null,
    ]);
    // Untreated line
    const untreated = historical.map((_, i) => histV[i] || 0).concat([
        (prediction?.predictions?.day_30 || 25) * 1.18,
        (prediction?.predictions?.day_60 || 28) * 1.28,
        (prediction?.predictions?.day_90 || 31) * 1.35,
    ]);

    const data = {
        labels: allLabels,
        datasets: [
            {
                label: 'Historical',
                data: actualData,
                borderColor: '#94a3b8',
                backgroundColor: 'rgba(148,163,184,0.05)',
                pointBackgroundColor: '#94a3b8',
                pointRadius: 4,
                borderWidth: 2,
                fill: false,
                spanGaps: false,
                tension: 0.3,
            },
            {
                label: 'Predicted (Untreated)',
                data: untreated,
                borderColor: '#f97316',
                backgroundColor: 'rgba(249,115,22,0.05)',
                borderDash: [5, 4],
                pointRadius: 0,
                borderWidth: 1.5,
                fill: false,
                tension: 0.4,
            },
            {
                label: 'With Therapy (RL Plan)',
                data: predictedData,
                borderColor: '#00e676',
                backgroundColor: 'rgba(0,230,118,0.06)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0,
                spanGaps: false,
            },
        ],
    };
    return (
        <Line
            data={data}
            options={{
                ...darkChartOpts('Tumor Volume (cc)', 'Days'),
                plugins: {
                    ...darkChartOpts().plugins,
                    tooltip: {
                        ...darkChartOpts().plugins.tooltip,
                        callbacks: { label: ctx => ` ${ctx.parsed.y?.toFixed?.(1) ?? ctx.parsed.y} cc` },
                    },
                },
            }}
        />
    );
}

// ── Digital Twin Chart ────────────────────────────────────────────────────
function TwinSimChart({ simResult }) {
    if (!simResult) {
        const days = Array.from({ length: 31 }, (_, i) => i * 4);
        const makeTraj = (alpha, beta) => days.map(d => Math.max(0, 23.4 * Math.exp((alpha - beta) * d)));
        const data = {
            labels: days.map(d => d),
            datasets: [
                { label: 'T-0 (No Tx)', data: makeTraj(0.008, 0), borderColor: '#ef4444', borderWidth: 1.8, fill: false, tension: 0.3, pointRadius: 0 },
                { label: 'T-1', data: makeTraj(0.008, 0.005), borderColor: '#94a3b8', borderWidth: 1.5, fill: false, tension: 0.3, pointRadius: 0, borderDash: [3, 3] },
                { label: 'T-2 (Standard)', data: makeTraj(0.008, 0.012), borderColor: '#3b82f6', borderWidth: 1.8, fill: false, tension: 0.3, pointRadius: 0 },
                { label: 'T-3 (Optimal RL)', data: makeTraj(0.008, 0.022), borderColor: '#00e676', borderWidth: 2, fill: false, tension: 0.3, pointRadius: 0 },
            ],
        };
        return <Line data={data} options={{
            ...darkChartOpts('Tumor Volume (cc)', 'Time'),
            plugins: {
                ...darkChartOpts().plugins,
                legend: { labels: { color: '#94a3b8', font: { size: 9 }, boxWidth: 10, padding: 8 } },
            },
        }} />;
    }
    const traj = simResult.simulation?.trajectory || [];
    const simDays = simResult.simulation?.days || traj.map((_, i) => i);
    const data = {
        labels: simDays,
        datasets: [{
            label: 'Simulation',
            data: traj,
            borderColor: '#00b4d8',
            backgroundColor: 'rgba(0,180,216,0.06)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
        }],
    };
    return <Line data={data} options={darkChartOpts('Tumor Volume (cc)', 'Day')} />;
}

// ═══════════════════════════════════════════════════════════════════
// Main Dashboard
// ═══════════════════════════════════════════════════════════════════
export default function Dashboard({ patient, uploadResult, setPatient, onNavigateTab }) {
    const [prediction, setPrediction] = useState(null);
    const [simResult, setSimResult] = useState(null);
    const [rlResult, setRlResult] = useState(null);
    const [survivalResult, setSurvivalResult] = useState(null);
    const [loadingPred, setLoadingPred] = useState(false);
    const [loadingRL, setLoadingRL] = useState(false);
    const [loadingSurvival, setLoadingSurvival] = useState(false);
    const [mriSlice, setMriSlice] = useState('Axial');
    const [mriMode, setMriMode] = useState('T1c');
    const [approving, setApproving] = useState(false);
    const [approved, setApproved] = useState(false);
    const [reanalyzing, setReanalyzing] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [realTimeData, setRealTimeData] = useState({ times: [], volumes: [] });

    // Synchronize real patient scans or upload result
    useEffect(() => {
        let t = [];
        let v = [];

        if (uploadResult?.times && uploadResult?.volumes) {
            t = uploadResult.times;
            v = uploadResult.volumes;
        } else if (patient?.scans && patient.scans.length >= 2) {
            const scanDates = patient.scans.map(s => new Date(s.scan_date).getTime());
            const firstDate = scanDates[0];
            t = scanDates.map(d => Math.round((d - firstDate) / (1000 * 60 * 60 * 24)));
            v = patient.scans.map(s => s.tumor_volume_cc || (s.tumor_volume_mm3 ? s.tumor_volume_mm3 / 1000.0 : 0));
        } else if (uploadResult?.volume_cc) {
            t = [0, 30];
            v = [uploadResult.volume_cc * 0.85, uploadResult.volume_cc];
        }

        if (t.length >= 2) {
            setRealTimeData({ times: t, volumes: v });

            // Auto-load prediction with patient data
            setLoadingPred(true);
            predictGrowth(t, v)
                .then(data => setPrediction(data))
                .catch(() => {})
                .finally(() => setLoadingPred(false));

            // Auto-run RL recommendation
            setLoadingRL(true);
            optimizeTherapy(t, v, 90, false)
                .then(data => setRlResult(data))
                .catch(() => {})
                .finally(() => setLoadingRL(false));
        }
    }, [uploadResult, patient]);

    const handleReanalyze = async () => {
        if (!realTimeData.times.length) return;
        
        setReanalyzing(true);
        setApproved(false);
        try {
            const [pd, sl] = await Promise.all([
                predictGrowth(realTimeData.times, realTimeData.volumes),
                simulateTwin(realTimeData.times, realTimeData.volumes, 120, 2),
            ]);
            setPrediction(pd);
            setSimResult(sl);
        } catch { /* error silently handled */ }
        finally { setReanalyzing(false); }
    };

    const handleExport = () => {
        if (!patient) return;
        
        setExporting(true);
        setTimeout(() => {
            const report = {
                patient: patient,
                tumor_volume_cc: realTimeData.volumes[realTimeData.volumes.length - 1] || 0,
                growth_rate: prediction?.exponential_rate || 0.0,
                radiomics: uploadResult?.radiomics || {},
                recommendation: rlResult?.recommendation || { best_therapy: 'Standard of Care' },
                generated_at: new Date().toISOString(),
            };
            const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `NDT_Report_${patient.patient_id || 'unknown'}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setExporting(false);
        }, 800);
    };

    const handleApprove = () => {
        setApproving(true);
        setTimeout(() => { setApproving(false); setApproved(true); }, 1200);
    };

    // KPI values derived from real data
    const tumorVol = realTimeData.volumes[realTimeData.volumes.length - 1] || 0;
    const growthR = prediction?.exponential_rate || 0.0;
    const riskScore = uploadResult?.radiomics?.risk_score || 0;
    const psvDim = uploadResult?.psv_dimension || 64;
    const medianOS = prediction?.median_survival_months || 0;

    // Therapy phases from RL recommendation
    const therapyPhases = rlResult?.recommendation?.therapy_phases || [
        { label: 'Month 1', desc: 'RT + TMZ (Temozolomide)', color: '#ef4444', intensity: 90, severity: 'High' },
        { label: 'Month 2-4', desc: 'Targeted + Immunotherapy', color: '#fbbf24', intensity: 65, severity: 'Moderate' },
        { label: 'Month 5+', desc: 'Maintenance Phase', color: '#00e676', intensity: 30, severity: 'Low' },
    ];

    const reduction = rlResult?.recommendation?.volume_reduction_pct || 0;
    const toxicity = rlResult?.recommendation?.therapy_intensity
        ? (rlResult.recommendation.therapy_intensity * 10 / 3).toFixed(1)
        : 'N/A';

    return (
        <div className="dashboard-layout fade-in">

            {/* ── Patient Header ─────────────────────────────────────────── */}
            {patient ? (
                <div className="dashboard-patient-header">
                    <div>
                        <div className="patient-id-tag">
                            Patient: ID <span>#{patient.patient_id}</span>
                        </div>
                        <div className="patient-subinfo">
                            <strong>{patient.diagnosis}</strong>
                            &nbsp;|&nbsp;{patient.gender}, {patient.age} yrs
                            &nbsp;|&nbsp;Diagnosis: {patient.diagnosis_date}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button
                            className={`topbar-btn ${exporting ? 'disabled' : ''}`}
                            onClick={handleExport}
                            id="export-report-btn"
                            disabled={exporting}
                            style={{ fontSize: 12 }}
                        >
                            {exporting ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> : <ExternalLink size={14} />}
                            Export Report
                        </button>
                        <button
                            className="topbar-btn primary"
                            onClick={handleReanalyze}
                            id="reanalyze-btn"
                            disabled={reanalyzing}
                            style={{ fontSize: 12 }}
                        >
                            {reanalyzing
                                ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
                                : <RefreshCw size={14} />}
                            Re-Analyze
                        </button>
                    </div>
                </div>
            ) : (
                <div className="card" style={{ textAlign: 'center', padding: 40, marginBottom: 20 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                        No Active Patient Selected
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
                        Select a patient from the clinical directory or load a demo case to begin digital twin simulation.
                    </div>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => onNavigateTab && onNavigateTab('patient')}
                        >
                            📋 Open Patient Directory
                        </button>
                        <button
                            className="btn btn-outline"
                            onClick={async () => {
                                try {
                                    const { getPatient } = await import('../api');
                                    const data = await getPatient('NDT-001');
                                    if (setPatient) {
                                        setPatient({
                                            ...data.patient,
                                            scans: data.scans,
                                            scan_count: data.scan_count,
                                            latest_scan: data.latest_scan,
                                            growth_record: data.growth_record,
                                        });
                                    }
                                } catch {
                                    if (onNavigateTab) onNavigateTab('patient');
                                }
                            }}
                        >
                            ⚡ Load Demo Case (NDT-001)
                        </button>
                    </div>
                </div>
            )}

            {/* ── KPI Row ────────────────────────────────────────────────── */}
            <div className="kpi-row">
                {/* Tumor Volume */}
                <div className="kpi-card" style={{ borderTop: '2px solid #00b4d8' }}>
                    <div className="kpi-label">Tumor Volume</div>
                    <div className="kpi-value">{tumorVol} <span className="kpi-unit">cc</span></div>
                    <div className="kpi-delta up">{realTimeData.volumes.length > 1 ? `↑ +${((realTimeData.volumes[realTimeData.volumes.length - 1] - realTimeData.volumes[realTimeData.volumes.length - 2]) / realTimeData.volumes[realTimeData.volumes.length - 2] * 100).toFixed(0)}% in 30 days` : 'No data'}</div>
                    <div className="kpi-icon" style={{ top: 8, right: 8, opacity: 0.35 }}><Brain size={28} /></div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                        <Sparkline data={realTimeData.volumes} color="#00b4d8" height={30} />
                    </div>
                </div>

                {/* Growth Rate */}
                <div className="kpi-card" style={{ borderTop: '2px solid #f97316' }}>
                    <div className="kpi-label">Growth Rate (α)</div>
                    <div className="kpi-value" style={{ color: '#f97316' }}>
                        {loadingPred ? '···' : growthR.toFixed(3)}
                        <span className="kpi-unit"> /day</span>
                    </div>
                    <div className="kpi-delta" style={{ color: growthR > 0.02 ? '#f97316' : '#10b981' }}>{growthR > 0.02 ? 'Rapid' : 'Stable'}</div>
                    <div className="kpi-icon" style={{ top: 8, right: 8, opacity: 0.3 }}><LineChartIcon size={26} /></div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                        <Sparkline data={[0.018, 0.021, 0.024, 0.025, 0.026, 0.027]} color="#f97316" height={30} />
                    </div>
                </div>

                {/* Radiomics Risk Score */}
                <div className="kpi-card" style={{ borderTop: '2px solid #ef4444' }}>
                    <div className="kpi-label">Radiomics Risk Score</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <div className="kpi-value" style={{ color: '#ef4444' }}>{riskScore}</div>
                        <div className="kpi-unit">/10</div>
                    </div>
                    <div className="kpi-delta" style={{ color: '#ef4444' }}>High Heterogeneity</div>
                    <div className="kpi-icon" style={{ bottom: 10, right: 8, top: 'auto', opacity: 0.3 }}><Settings size={22} /></div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                        <Sparkline data={[5.2, 6.1, 6.8, 7.2, 7.6, 7.8]} color="#ef4444" height={30} />
                    </div>
                </div>

                {/* PSV Embedding */}
                <div className="kpi-card" style={{ borderTop: '2px solid #7c3aed' }}>
                    <div className="kpi-label">PSV Embedding</div>
                    <div className="kpi-value" style={{ color: '#a78bfa' }}>{psvDim}<span className="kpi-unit">-Dim</span></div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>Patient State Vector</div>
                    <div className="kpi-icon" style={{ top: 8, right: 8, opacity: 0.3 }}><Network size={26} /></div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                        <Sparkline data={[32, 40, 48, 56, 60, 64]} color="#7c3aed" height={30} />
                    </div>
                </div>

                {/* Survival Probability */}
                <div className="kpi-card" style={{ borderTop: '2px solid #fbbf24' }}>
                    <div className="kpi-label">Survival Probability</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Median OS:</div>
                        <div className="kpi-value" style={{ color: '#fbbf24', fontSize: 22 }}>
                            {medianOS} <span className="kpi-unit">mo</span>
                        </div>
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                        <Sparkline data={[1, 0.9, 0.75, 0.6, 0.45, 0.32]} color="#fbbf24" height={30} />
                    </div>
                </div>
            </div>

            {/* ── Main 3-column grid ─────────────────────────────────────── */}
            <div className="dashboard-main-grid">

                {/* ──── Column 1: MRI + Radiomics ──────────────────────── */}
                <div className="dashboard-col">
                    {/* MRI & Segmentation */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title-colored">MRI &amp; Segmentation</div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button id="mri-options-btn" className="btn-ghost" style={{ padding: '2px 6px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted)', background: 'none' }}><MoreHorizontal size={12} /></button>
                                <button id="mri-expand-btn" className="btn-ghost" style={{ padding: '2px 6px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted)', background: 'none' }}><Maximize2 size={12} /></button>
                            </div>
                        </div>

                        {/* Sequence tabs */}
                        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                            {['T1', 'T1c', 'T2', 'FLAIR'].map(seq => (
                                <button
                                    key={seq}
                                    id={`mri-seq-${seq}`}
                                    onClick={() => setMriMode(seq)}
                                    style={{
                                        padding: '3px 8px',
                                        fontSize: 10,
                                        fontWeight: 700,
                                        borderRadius: 4,
                                        cursor: 'pointer',
                                        border: `1px solid ${mriMode === seq ? 'var(--cyan)' : 'var(--border)'}`,
                                        background: mriMode === seq ? 'rgba(0,180,216,0.15)' : 'rgba(15,23,42,0.04)',
                                        color: mriMode === seq ? 'var(--cyan)' : 'var(--text-muted)',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {seq}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                            {/* Main MRI */}
                            <div style={{ background: '#000', borderRadius: 8, overflow: 'hidden', minHeight: 160 }}>
                                <MRIViewer activeSlice={mriSlice} />
                            </div>

                            {/* Side views */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {['Sagittal', 'Coronal', 'Axial'].map(view => (
                                    <div
                                        key={view}
                                        id={`mri-view-${view}`}
                                        onClick={() => setMriSlice(view)}
                                        style={{
                                            background: '#000',
                                            borderRadius: 5,
                                            width: 56,
                                            height: 48,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            border: `1px solid ${mriSlice === view ? 'var(--cyan)' : 'var(--border)'}`,
                                            position: 'relative',
                                            overflow: 'hidden',
                                            transition: 'border-color 0.15s',
                                        }}
                                    >
                                        <canvas
                                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                                            ref={el => {
                                                if (!el) return;
                                                const ctx2 = el.getContext('2d');
                                                el.width = 56; el.height = 48;
                                                ctx2.fillStyle = '#060f1c';
                                                ctx2.fillRect(0, 0, 56, 48);
                                                // mini brain
                                                const grd = ctx2.createRadialGradient(28, 24, 4, 28, 24, 18);
                                                grd.addColorStop(0, '#4a5a6a'); grd.addColorStop(1, '#1a2a3a');
                                                ctx2.beginPath(); ctx2.ellipse(28, 24, 18, 16, 0, 0, Math.PI * 2); ctx2.fillStyle = grd; ctx2.fill();
                                                // mini tumor
                                                const tg = ctx2.createRadialGradient(36, 18, 1, 36, 18, 8);
                                                tg.addColorStop(0, '#ff9f00'); tg.addColorStop(1, 'rgba(200,50,50,0)');
                                                ctx2.beginPath(); ctx2.ellipse(36, 18, 8, 7, 0, 0, Math.PI * 2); ctx2.fillStyle = tg; ctx2.fill();
                                            }}
                                        />
                                        <span style={{ position: 'absolute', bottom: 2, left: 3, fontSize: 7, color: mriSlice === view ? 'var(--cyan)' : 'rgba(255,255,255,0.4)', fontWeight: 700, zIndex: 2 }}>
                                            {view}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Slice control */}
                        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Slice 82/155</span>
                            <input
                                type="range"
                                id="mri-slice-slider"
                                min={1} max={155} defaultValue={82}
                                style={{ flex: 1, accentColor: 'var(--cyan)', height: 3 }}
                            />
                            <button id="mri-refresh-btn" className="btn-ghost" style={{ padding: '4px 6px', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', background: 'none' }}><RotateCcw size={14} /></button>
                        </div>
                    </div>

                    {/* Radiomic Biomarkers */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title-colored">Radiomic Biomarkers</div>
                            <button id="biomarkers-collapse-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><ChevronDown size={14} /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12, alignItems: 'start' }}>
                            {/* Radar */}
                            <BiomarkerRadar radiomics={uploadResult?.radiomics} />

                            {/* Values */}
                            <div>
                                {uploadResult?.radiomics && Object.entries(uploadResult.radiomics).length > 0 ? (
                                    Object.entries(uploadResult.radiomics).map(([key, item]) => (
                                        <div key={key} className="biomarker-row">
                                            <span className="biomarker-name">• {item.label || key}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span className="biomarker-val" style={{
                                                    color: item.severity === 'High' ? 'var(--red)'
                                                        : item.severity === 'Elevated' ? 'var(--amber)'
                                                            : 'var(--green)',
                                                }}>
                                                    {item.val}{item.unit || ''}
                                                </span>
                                                <span className={`severity-${item.severity === 'High' ? 'high' : item.severity === 'Elevated' ? 'elevated' : 'normal'}`}>
                                                    {item.severity || 'Normal'}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                                        <div style={{ fontSize: 14, marginBottom: 8 }}>No radiomics data available</div>
                                        <div style={{ fontSize: 12 }}>Upload MRI data with radiomics extraction to see biomarker analysis</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ──── Column 2: Growth + Twin ────────────────────────── */}
                <div className="dashboard-col">
                    {/* Growth Prediction */}
                    <div className="card">
                        <div className="card-header">
                            <div style={{ display: 'flex', align: 'center', gap: 8, alignItems: 'center' }}>
                                <div className="card-title-colored">Growth Prediction</div>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(Next 90 Days)</span>
                                {loadingPred && <span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />}
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 10, color: 'var(--text-muted)' }}>
                                <span style={{ color: '#94a3b8' }}>● Historical</span>
                                <span style={{ color: '#f97316' }}>— Untreated</span>
                                <span style={{ color: '#00e676' }}>— RL Plan</span>
                            </div>
                        </div>

                        <div className="chart-wrap" style={{ height: 190 }}>
                            <GrowthChart prediction={prediction} times={realTimeData.times} volumes={realTimeData.volumes} />
                        </div>

                        {prediction && (
                            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                                <div style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)', borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>+30d</div>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)' }}>{prediction.predictions?.day_30?.toFixed(1) || '—'} <span style={{ fontSize: 10 }}>cc</span></div>
                                </div>
                                <div style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)', borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>+60d</div>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)' }}>{prediction.predictions?.day_60?.toFixed(1) || '—'} <span style={{ fontSize: 10 }}>cc</span></div>
                                </div>
                                <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>+90d (No Tx)</div>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: '#f97316' }}>+35% <span style={{ fontSize: 10 }}>est.</span></div>
                                </div>
                                <div style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)', borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>RL Benefit</div>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)' }}>-{reduction.toFixed(0)}%</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Digital Twin Simulation */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title-colored">Digital Twin Simulation</div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <span className="badge badge-cyan" style={{ fontSize: 10 }}>Untreated</span>
                                <span className="badge badge-green" style={{ fontSize: 10 }}>RL Optimized</span>
                            </div>
                        </div>

                        <div className="chart-wrap" style={{ height: 160 }}>
                            <TwinSimChart simResult={simResult} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 8 }}>
                            <div style={{ background: 'rgba(15,23,42,0.04)', borderRadius: 8, padding: '8px 6px', textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div className="twin-metric-label">Initial Vol</div>
                                <div className="twin-metric-val">23.4</div>
                                <div className="twin-metric-sub">cc</div>
                            </div>
                            <div style={{ background: 'rgba(239,68,68,0.06)', borderRadius: 8, padding: '8px 6px', textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <div className="twin-metric-label" style={{ color: 'var(--red)' }}>Untreated</div>
                                <div className="twin-metric-val" style={{ color: 'var(--red)' }}>54.2</div>
                                <div className="twin-metric-sub">cc</div>
                            </div>
                            <div style={{ background: 'rgba(0,230,118,0.06)', borderRadius: 8, padding: '8px 6px', textAlign: 'center', border: '1px solid rgba(0,230,118,0.2)' }}>
                                <div className="twin-metric-label" style={{ color: 'var(--green)' }}>RL Plan</div>
                                <div className="twin-metric-val" style={{ color: 'var(--green)' }}>17.3</div>
                                <div className="twin-metric-sub">cc · ↓ {reduction.toFixed(0)}%</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ──── Column 3: Therapy + Survival ──────────────────── */}
                <div className="dashboard-col">
                    {/* Therapy Recommendation */}
                    <div className="card" style={{
                        background: 'linear-gradient(145deg, rgba(0,60,40,0.35), rgba(0,40,30,0.2))',
                        border: '1px solid rgba(0,200,100,0.2)',
                    }}>
                        <div className="card-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: 'var(--green)', fontSize: 14 }}>◆</span>
                                <div className="card-title-colored">Therapy Recommendation</div>
                            </div>
                            <button id="therapy-rec-expand" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><ChevronDown size={14} /></button>
                        </div>

                        <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--green)', marginBottom: 2 }}>
                                ◆ OPTIMAL STRATEGY (RL + Digital Twin)
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-bright)', marginBottom: 8 }}>
                                {rlResult?.recommendation?.best_therapy?.split('(')[0]?.trim() || 'Adaptive Multi-Modal Therapy'}
                            </div>

                            <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                                <div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Expected Reduction</div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>{reduction.toFixed(0)}%</div>
                                </div>
                                <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 12 }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Toxicity Score</div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)2' }}>
                                        Low (<span style={{ color: 'var(--cyan)' }}>{toxicity}/10</span>)
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Phase breakdown */}
                        {therapyPhases.map((phase, i) => (
                            <div key={i} className="therapy-month-phase">
                                <div className="therapy-month-dot" style={{ background: phase.color }} />
                                <div className="therapy-month-label">
                                    <span style={{ fontWeight: 600 }}>{phase.label}</span>
                                    <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)' }}>{phase.desc}</span>
                                </div>
                                <div style={{ width: 60, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                                    <div style={{ width: `${phase.intensity}%`, height: '100%', background: phase.color, borderRadius: 2 }} />
                                </div>
                                <span style={{ fontSize: 9, color: phase.color, width: 44, textAlign: 'right', fontWeight: 700 }}>{phase.severity}</span>
                            </div>
                        ))}

                        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                            <button
                                id="approve-plan-btn"
                                className="btn btn-success"
                                style={{ flex: 1, fontSize: 12, padding: '9px' }}
                                onClick={handleApprove}
                                disabled={approving || approved}
                            >
                                {approving
                                    ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5, marginRight: 6 }} /> Approving…</>
                                    : approved
                                        ? <><Check size={14} style={{ marginRight: 4 }} /> Plan Approved</>
                                        : 'Approve Treatment Plan'}
                            </button>
                        </div>
                        <button
                            id="simulate-alternatives-btn"
                            className="btn btn-outline"
                            style={{ width: '100%', marginTop: 6, fontSize: 12, padding: '7px' }}
                            onClick={handleReanalyze}
                            disabled={reanalyzing}
                        >
                            {reanalyzing ? 'Simulating…' : 'Simulate Alternatives'}
                        </button>
                    </div>

                    {/* Survival Analysis */}
                    <div className="card">
                        <div className="card-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <ArrowDown size={14} color="var(--amber)" />
                                <div className="card-title-colored">Survival Analysis</div>
                            </div>
                            <button id="survival-options-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><MoreHorizontal size={14} /></button>
                        </div>

                        {/* KM tab switcher */}
                        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                            {['Kaplan Meier Curve', 'Risk Factors'].map((t, i) => (
                                <div
                                    key={t}
                                    id={`survival-tab-${i}`}
                                    style={{
                                        padding: '3px 10px',
                                        borderRadius: 6,
                                        fontSize: 10,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        background: i === 0 ? 'rgba(251,191,36,0.15)' : 'rgba(15,23,42,0.04)',
                                        color: i === 0 ? 'var(--amber)' : 'var(--text-muted)',
                                        border: `1px solid ${i === 0 ? 'rgba(251,191,36,0.3)' : 'var(--border)'}`,
                                    }}
                                >
                                    {t}
                                </div>
                            ))}
                        </div>

                        <SurvivalMiniChart survivalData={survivalResult} />
                    </div>
                </div>
            </div>

            {/* ── Bottom data source bar ─────────────────────────────────── */}
            <div className="data-footer">
                <div className="data-footer-dot" />
                Data Sources: BraTS2021 • TCGA • Hexprial EHR
                <span style={{ marginLeft: 'auto' }}>
                    AI Models: 3D:U Net • Radiomics • Twin-ODE • PPO-RL
                </span>
            </div>
        </div>
    );
}
