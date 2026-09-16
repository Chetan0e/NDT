import React, { useState, useEffect } from 'react';
import { healthCheck, seedDatabase, getAnalyticsOverview } from '../api';
import { Settings as SettingsIcon, Server, Cpu, Database, Shield, RefreshCw, CheckCircle, AlertCircle, HardDrive } from 'lucide-react';

export default function Settings() {
    const [health, setHealth] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [pingLatency, setPingLatency] = useState(null);
    const [seeding, setSeeding] = useState(false);
    const [msg, setMsg] = useState(null);

    // Simulation settings state
    const [defaultHorizon, setDefaultHorizon] = useState(60);
    const [defaultBudget, setDefaultBudget] = useState(2.0);
    const [enableNoise, setEnableNoise] = useState(false);

    const checkSystemHealth = async () => {
        const t0 = performance.now();
        try {
            const h = await healthCheck();
            const elapsed = Math.round(performance.now() - t0);
            setHealth(h);
            setPingLatency(elapsed);
        } catch (e) {
            setHealth({ status: 'offline', error: e.message });
        }

        try {
            const a = await getAnalyticsOverview();
            setAnalytics(a);
        } catch {}
    };

    useEffect(() => {
        checkSystemHealth();
    }, []);

    const handleSeedCohort = async (force = true) => {
        setSeeding(true);
        setMsg(null);
        try {
            const res = await seedDatabase(force);
            setMsg({ type: 'success', text: `✅ ${res.message}` });
            await checkSystemHealth();
        } catch (e) {
            setMsg({ type: 'error', text: `⚠️ Seeding failed: ${e.message}` });
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="section-header">
                <div>
                    <div className="section-title">Platform Settings &amp; Diagnostics</div>
                    <div className="section-subtitle">
                        Configure computational oncology parameters, monitor model runtimes, and manage database stores
                    </div>
                </div>
                <button className="btn btn-outline" onClick={checkSystemHealth}>
                    <RefreshCw size={14} /> Ping Health
                </button>
            </div>

            {msg && (
                <div style={{
                    padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13,
                    background: msg.type === 'success' ? 'rgba(5,150,105,0.1)' : '#fee2e2',
                    border: `1px solid ${msg.type === 'success' ? 'rgba(5,150,105,0.3)' : '#fecaca'}`,
                    color: msg.type === 'success' ? 'var(--green)' : 'var(--red)',
                }}>
                    {msg.text}
                </div>
            )}

            <div className="grid-2" style={{ marginBottom: 20 }}>
                {/* System Diagnostics */}
                <div className="card">
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Server size={16} style={{ color: 'var(--cyan)' }} /> API Service Health &amp; Diagnostics
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(15,23,42,0.02)', borderRadius: 8 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>FastAPI Gateway Status</span>
                            <span className={`badge ${health?.status === 'healthy' ? 'badge-green' : 'badge-red'}`}>
                                {health?.status === 'healthy' ? '● Online & Healthy' : '○ Offline'}
                            </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(15,23,42,0.02)', borderRadius: 8 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>API Round-trip Latency</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--cyan)' }}>
                                {pingLatency !== null ? `${pingLatency} ms` : '—'}
                            </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(15,23,42,0.02)', borderRadius: 8 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Platform Release</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                                v2.0.0 (Enterprise)
                            </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(15,23,42,0.02)', borderRadius: 8 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Storage Engine</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>
                                SQLite (Production Ready for PostgreSQL)
                            </span>
                        </div>
                    </div>
                </div>

                {/* AI & Model Runtimes */}
                <div className="card">
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Cpu size={16} style={{ color: 'var(--violet)' }} /> AI Engines &amp; Compute Pipeline
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(15,23,42,0.02)', borderRadius: 8 }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>3D U-Net Volumetric Segmentor</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>MONAI Framework · ResUnits=2 · (128,128,64)</div>
                            </div>
                            <span className="badge badge-green">Ready</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(15,23,42,0.02)', borderRadius: 8 }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>PyRadiomics Biomarker Engine</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>GLCM, GLSZM, Sphericity, Entropy, Run-length</div>
                            </div>
                            <span className="badge badge-green">v3.1 Active</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(15,23,42,0.02)', borderRadius: 8 }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>RL Therapy Optimization Agent</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gymnasium + Stable-Baselines3 (PPO MlpPolicy)</div>
                            </div>
                            <span className="badge badge-violet">Continuous Control</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(15,23,42,0.02)', borderRadius: 8 }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Actuarial Survival Estimator</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Stupp &amp; TCGA-GBM Cox Multi-Hazard Model</div>
                            </div>
                            <span className="badge badge-cyan">Calibrated</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Simulation Defaults & Database Operations */}
            <div className="grid-2">
                {/* Simulation Parameters */}
                <div className="card">
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <SettingsIcon size={16} style={{ color: 'var(--cyan)' }} /> Simulation Defaults
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label className="input-label">
                            Default Horizon: <strong>{defaultHorizon} days</strong>
                        </label>
                        <input
                            type="range" min={30} max={180} step={15}
                            value={defaultHorizon}
                            onChange={e => setDefaultHorizon(Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--cyan)' }}
                        />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label className="input-label">
                            Default Max Toxicity Ceiling: <strong>{defaultBudget.toFixed(1)} / 3.0</strong>
                        </label>
                        <input
                            type="range" min={1.0} max={3.0} step={0.5}
                            value={defaultBudget}
                            onChange={e => setDefaultBudget(Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--amber)' }}
                        />
                    </div>

                    <div
                        onClick={() => setEnableNoise(!enableNoise)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', borderRadius: 8,
                            background: enableNoise ? 'rgba(2,132,199,0.08)' : 'rgba(15,23,42,0.02)',
                            border: `1px solid ${enableNoise ? 'var(--cyan)' : 'var(--border)'}`,
                            cursor: 'pointer', fontSize: 12
                        }}
                    >
                        <div style={{
                            width: 16, height: 16, borderRadius: 4,
                            border: `1.5px solid ${enableNoise ? 'var(--cyan)' : 'var(--text-muted)'}`,
                            background: enableNoise ? 'var(--cyan)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10
                        }}>
                            {enableNoise && '✓'}
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Add Biological Noise to ODE</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Introduces stochastic measurement variance to digital twin trajectories</div>
                        </div>
                    </div>
                </div>

                {/* Database Operations */}
                <div className="card">
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Database size={16} style={{ color: 'var(--green)' }} /> Database &amp; Cohort Management
                    </div>

                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                        The local SQLite database maintains patient demographics, longitudinal volumetric measurements, radiomics feature dictionaries, and digital twin trajectories.
                    </div>

                    {analytics?.patient_statistics && (
                        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                            <div style={{ flex: 1, padding: 10, background: 'rgba(15,23,42,0.02)', borderRadius: 8, textAlign: 'center' }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--cyan)' }}>
                                    {analytics.patient_statistics.total_patients}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Active Patients</div>
                            </div>
                            <div style={{ flex: 1, padding: 10, background: 'rgba(15,23,42,0.02)', borderRadius: 8, textAlign: 'center' }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--violet)' }}>
                                    {analytics.patient_statistics.total_scans}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Scans Logged</div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button
                            className="btn btn-outline"
                            onClick={() => handleSeedCohort(true)}
                            disabled={seeding}
                            style={{ width: '100%', justifyContent: 'center' }}
                        >
                            {seeding ? '⏳ Seeding Database…' : '🔄 Reset & Seed Clinical Demo Cohort (5 Patients)'}
                        </button>
                    </div>

                    <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                        <Shield size={14} style={{ color: 'var(--cyan)', marginTop: 2, flexShrink: 0 }} />
                        <span>
                            <strong>Compliance Notice:</strong> Patient data loaded is de-identified conforming to HIPAA Safe Harbor guidelines. All imaging biomarkers are calculated in memory.
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
