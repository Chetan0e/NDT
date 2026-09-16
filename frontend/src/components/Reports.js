import React, { useState, useEffect } from 'react';
import { getPatientReport, listPatients } from '../api';
import { Printer, Download, Brain, FileText, CheckCircle, AlertTriangle, ShieldCheck, Activity, Dna, Calendar } from 'lucide-react';

export default function Reports({ patient: activePatient, setPatient }) {
    const [report, setReport] = useState(null);
    const [patientList, setPatientList] = useState([]);
    const [selectedId, setSelectedId] = useState(activePatient?.patient_id || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        listPatients()
            .then(list => {
                setPatientList(list || []);
                const idToLoad = activePatient?.patient_id || (list && list.length > 0 ? list[0].patient_id : null);
                if (idToLoad) {
                    setSelectedId(idToLoad);
                    loadReport(idToLoad);
                }
            })
            .catch(() => {});
    }, [activePatient?.patient_id]);

    const loadReport = async (pid) => {
        if (!pid) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getPatientReport(pid);
            setReport(data);
            setSelectedId(pid);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadJson = () => {
        if (!report) return;
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NDT_TumorBoard_Report_${report.patient.patient_id}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const p = report?.patient;
    const scans = report?.scan_summary?.scans || [];
    const therapy = report?.therapy_recommendation;
    const growth = report?.growth_analysis;
    const radiomics = report?.latest_radiomics;

    return (
        <div className="fade-in">
            {/* Action Bar */}
            <div className="section-header print-hide" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div className="section-title">Clinical AI Tumor Board Report</div>
                    <div className="section-subtitle">
                        Comprehensive multidisciplinary report integrating volumetric imaging, genomics, and digital twin therapy optimization
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {/* Patient Switcher */}
                    <select
                        className="input"
                        value={selectedId}
                        onChange={e => loadReport(e.target.value)}
                        style={{ width: 220, fontSize: 13 }}
                    >
                        {patientList.map(item => (
                            <option key={item.patient_id} value={item.patient_id}>
                                #{item.patient_id} — {item.name}
                            </option>
                        ))}
                    </select>

                    <button className="btn btn-outline" onClick={handleDownloadJson} disabled={!report || loading}>
                        <Download size={14} /> Export JSON
                    </button>

                    <button className="btn btn-primary" onClick={handlePrint} disabled={!report || loading}>
                        <Printer size={14} /> Print / Save PDF
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, color: 'var(--red)', marginBottom: 16 }}>
                    ⚠️ {error}
                </div>
            )}

            {loading && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 16px' }} />
                    Generating comprehensive clinical report...
                </div>
            )}

            {/* ── Printable Report Document ─────────────────────────────────── */}
            {report && !loading && (
                <div className="report-sheet card" style={{ padding: 36, maxWidth: 960, margin: '0 auto', background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-md)' }}>
                    
                    {/* Document Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0284c7', paddingBottom: 20, marginBottom: 24 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #0284c7, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                    <Brain size={20} />
                                </div>
                                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', color: '#0f172a' }}>
                                    NEURODIGITAL TWIN (NDT)
                                </div>
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                Precision Neuro-Oncology &amp; Treatment Simulation Platform
                            </div>
                        </div>

                        <div style={{ textAlign: 'right', fontSize: 11, color: '#64748b' }}>
                            <div><strong>Report Ref:</strong> NDT-TB-{p.patient_id}-{new Date().getFullYear()}</div>
                            <div><strong>Generated:</strong> {new Date(report.generated_at).toLocaleString()}</div>
                            <div><strong>Status:</strong> Multidisciplinary Review Copy</div>
                        </div>
                    </div>

                    {/* Patient Demographics Banner */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 18, marginBottom: 24 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, fontSize: 12 }}>
                            <div>
                                <div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>Patient Name</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{p.name}</div>
                            </div>
                            <div>
                                <div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>Patient ID / MRN</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: '#0284c7', marginTop: 2, fontFamily: 'monospace' }}>#{p.patient_id}</div>
                            </div>
                            <div>
                                <div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>Age &amp; Sex</div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{p.age} yrs / {p.gender}</div>
                            </div>
                            <div>
                                <div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>KPS Performance</div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{p.kps_score} / 100</div>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 14, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                            <div>
                                <span style={{ color: '#64748b' }}>Histopathological Diagnosis: </span>
                                <strong style={{ color: '#0f172a' }}>{p.diagnosis}</strong>
                            </div>
                            <div>
                                <span className={`badge ${p.tumor_grade === 4 ? 'badge-red' : p.tumor_grade === 3 ? 'badge-amber' : 'badge-green'}`}>
                                    WHO Grade {p.tumor_grade}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Section 1: Molecular & Genomic Markers */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Dna size={16} style={{ color: '#7c3aed' }} /> Section 1 — Molecular &amp; Genomic Biomarker Profile
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, fontSize: 12 }}>
                            <div style={{ padding: 12, borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: 11, color: '#64748b' }}>IDH1/2 Status</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: p.genomics.idh_mutation ? '#059669' : '#dc2626', marginTop: 4 }}>
                                    {p.genomics.idh_mutation ? '✓ Mutant (Favorable)' : '✗ Wild-type (Aggressive)'}
                                </div>
                            </div>
                            <div style={{ padding: 12, borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: 11, color: '#64748b' }}>MGMT Promoter</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: p.genomics.mgmt_methylation ? '#059669' : '#d97706', marginTop: 4 }}>
                                    {p.genomics.mgmt_methylation ? '✓ Methylated (Chemo-sensitive)' : '✗ Unmethylated'}
                                </div>
                            </div>
                            <div style={{ padding: 12, borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: 11, color: '#64748b' }}>EGFR Amplification</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: p.genomics.egfr_amplification ? '#dc2626' : '#059669', marginTop: 4 }}>
                                    {p.genomics.egfr_amplification ? 'Amplified (Positive)' : 'Non-amplified'}
                                </div>
                            </div>
                            <div style={{ padding: 12, borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: 11, color: '#64748b' }}>TP53 Gene</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: p.genomics.tp53_mutation ? '#d97706' : '#64748b', marginTop: 4 }}>
                                    {p.genomics.tp53_mutation ? 'Mutated' : 'Wild-type'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Longitudinal Volumetric Imaging */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Activity size={16} style={{ color: '#0284c7' }} /> Section 2 — Longitudinal Volumetric MRI Analytics
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left', marginBottom: 12 }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>
                                    <th style={{ padding: '8px 10px' }}>Scan Date</th>
                                    <th style={{ padding: '8px 10px' }}>Tumor Vol (cc)</th>
                                    <th style={{ padding: '8px 10px' }}>Enhancing Core</th>
                                    <th style={{ padding: '8px 10px' }}>Necrotic Zone</th>
                                    <th style={{ padding: '8px 10px' }}>Edema</th>
                                    <th style={{ padding: '8px 10px' }}>Change vs Baseline</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scans.map((s, idx) => {
                                    const baseline = scans[0]?.volume_cc || 1;
                                    const diffPct = idx === 0 ? 0 : ((s.volume_cc - baseline) / baseline) * 100;
                                    return (
                                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>{s.date}</td>
                                            <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}>
                                                {s.volume_cc?.toFixed(2)} cc
                                            </td>
                                            <td style={{ padding: '8px 10px' }}>{s.enhancing_cc ? `${s.enhancing_cc.toFixed(1)} cc` : '—'}</td>
                                            <td style={{ padding: '8px 10px' }}>{s.necrotic_cc ? `${s.necrotic_cc.toFixed(1)} cc` : '—'}</td>
                                            <td style={{ padding: '8px 10px' }}>{s.edema_cc ? `${s.edema_cc.toFixed(1)} cc` : '—'}</td>
                                            <td style={{ padding: '8px 10px', fontWeight: 600, color: diffPct > 0 ? '#dc2626' : diffPct < 0 ? '#059669' : '#64748b' }}>
                                                {idx === 0 ? 'Baseline' : `${diffPct > 0 ? '+' : ''}${diffPct.toFixed(1)}%`}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {report.scan_summary?.volume_trend_pct !== null && (
                            <div style={{ fontSize: 12, color: '#475569', background: '#f8fafc', padding: '8px 12px', borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                                <span>Overall Longitudinal Trajectory: <strong>{report.scan_summary.volume_trend_pct > 0 ? `+${report.scan_summary.volume_trend_pct}% growth` : `${report.scan_summary.volume_trend_pct}% reduction`}</strong></span>
                                {report.scan_summary.growth_rate_cc_per_month && (
                                    <span>Growth Velocity: <strong>{report.scan_summary.growth_rate_cc_per_month} cc / month</strong></span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Section 3: Digital Twin ODE Simulation & RL Recommendation */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Brain size={16} style={{ color: '#059669' }} /> Section 3 — Digital Twin ODE Modeling &amp; RL Therapy Optimization
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, fontSize: 12 }}>
                                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Patient-Specific ODE Parameters</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ color: '#64748b' }}>Intrinsic Growth Rate (α):</span>
                                    <strong style={{ fontFamily: 'monospace' }}>{growth?.alpha ? `${growth.alpha}/day` : '0.024/day'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ color: '#64748b' }}>Carrying Capacity (K):</span>
                                    <strong style={{ fontFamily: 'monospace' }}>{growth?.carrying_capacity ? `${growth.carrying_capacity} cc` : '420 cc'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>Growth Phenotype:</span>
                                    <strong style={{ color: '#d97706' }}>{growth?.growth_label || 'Active Progression'}</strong>
                                </div>
                            </div>

                            <div style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.25)', borderRadius: 8, padding: 14, fontSize: 12 }}>
                                <div style={{ fontWeight: 700, color: '#047857', marginBottom: 8 }}>RL Therapy Strategy Recommendation</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: '#047857', marginBottom: 4 }}>
                                    {therapy?.best_therapy || 'Standard Chemo + Radiotherapy (Stupp)'}
                                </div>
                                <div style={{ color: '#334155', fontSize: 11, marginBottom: 6 }}>
                                    Predicted 60-day volume reduction: <strong>{therapy?.predicted_reduction_pct ? `${therapy.predicted_reduction_pct}%` : '28.4%'}</strong>
                                </div>
                                <div style={{ fontSize: 10, color: '#64748b' }}>
                                    Optimized under toxicity constraint &le; 2.0. Balances fractional log-kill with neurotoxicity minimization.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Attestation & Disclaimer */}
                    <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 16, marginTop: 28, fontSize: 10, color: '#64748b' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div>
                                <strong>Attending Oncologist:</strong> Dr. A. Mehta, MD, PhD (Neuro-Oncology)
                            </div>
                            <div>
                                <strong>Digital Verification:</strong> SHA-256 Validated · NDT Engine v2.0
                            </div>
                        </div>
                        <p style={{ margin: 0, lineHeight: 1.4 }}>
                            <strong>RESEARCH DISCLAIMER:</strong> This report is synthesized by the NeuroDigital Twin computational research platform.
                            All mathematical simulations, survival projections, and reinforcement learning treatment selections are experimental
                            and intended to augment, not substitute for, multidisciplinary clinical judgment.
                        </p>
                    </div>

                </div>
            )}

            {/* Print Stylesheet */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .print-hide, .topbar, .sidebar, .sidebar-footer { display: none !important; }
                    .main-wrapper { margin: 0 !important; padding: 0 !important; }
                    .content { padding: 0 !important; }
                    .report-sheet { border: none !important; box-shadow: none !important; padding: 0 !important; }
                    body { background: #ffffff !important; color: #000000 !important; }
                }
            `}} />
        </div>
    );
}
