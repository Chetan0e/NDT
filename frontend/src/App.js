import React, { useState } from 'react';
import Upload from './components/Upload';
import Viewer3D from './components/Viewer3D';
import Graph from './components/Graph';
import Radiomics from './components/Radiomics';
import TwinSimulator from './components/TwinSimulator';
import RLOptimizer from './components/RLOptimizer';
import Survival from './components/Survival';
import PatientPanel from './components/PatientPanel';

// ─────────────────────────────────── Demo seed data ─────────────────────────
const DEMO_PATIENT = {
    patient_id: 'NDT-DEMO-001',
    name: 'Demo Patient',
    age: 58,
    gender: 'Male',
    diagnosis: 'Glioblastoma Multiforme (IDH wild-type, MGMT methylated)',
    kps_score: 80,
    tumor_grade: 4,
    idh_mutation: false,
    mgmt_methylation: true,
    egfr_amplification: true,
    tp53_mutation: false,
};

const DEMO_SCANS = [
    { date: '2024-08-01', volume_cc: 18.2 },
    { date: '2024-09-15', volume_cc: 21.7 },
    { date: '2024-11-01', volume_cc: 26.3 },
    { date: '2025-01-10', volume_cc: 31.8 },
    { date: '2025-03-05', volume_cc: 38.1 },
];

// Days since first scan
const DEMO_TIMES = DEMO_SCANS.map((_, i) => [0, 45, 91, 161, 216][i]);
const DEMO_VOLUMES = DEMO_SCANS.map(s => s.volume_cc);

// ─────────────────────────────────── Nav config ──────────────────────────────
const NAV_ITEMS = [
    { id: 'patient', icon: '👤', label: 'Patient', badge: null },
    { id: 'upload', icon: '📤', label: 'MRI Upload', badge: null },
    { id: 'viewer', icon: '🧠', label: '3D Viewer', badge: 'GPU' },
    { id: 'graph', icon: '📈', label: 'Growth Analysis', badge: null },
    { id: 'radiomics', icon: '🔬', label: 'Radiomics', badge: null },
    { id: 'twin', icon: '⚛️', label: 'Digital Twin', badge: 'ODE' },
    { id: 'rl', icon: '🤖', label: 'RL Optimizer', badge: 'PPO' },
    { id: 'survival', icon: '📊', label: 'Survival', badge: 'AI' },
];

export default function App() {
    const [activeTab, setActiveTab] = useState('patient');
    const [uploadResult, setUploadResult] = useState(null);
    const [patient, setPatient] = useState(DEMO_PATIENT);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const handleUploadResult = (res) => {
        setUploadResult(res);
        setActiveTab('viewer');
    };

    return (
        <div className="app-layout">
            {/* ── Top Bar ─────────────────────────────────────────────────── */}
            <header className="topbar">
                <div className="topbar-left">
                    <button
                        className="sidebar-toggle"
                        onClick={() => setSidebarOpen(v => !v)}
                        title="Toggle sidebar"
                    >
                        ☰
                    </button>
                    <div className="brand">
                        <span className="brand-icon">🧠</span>
                        <div>
                            <div className="brand-name">NeuroDigital Twin</div>
                            <div className="brand-sub">Neuro-Oncology AI Platform · v2.0</div>
                        </div>
                    </div>
                </div>

                <div className="topbar-center">
                    <div className="pipeline-steps">
                        {['Upload', 'Segment', 'Radiomics', 'Fusion', 'Twin', 'RL', 'Survival'].map((step, i) => (
                            <React.Fragment key={step}>
                                <span className="pipeline-step">{step}</span>
                                {i < 6 && <span className="pipeline-arrow">→</span>}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <div className="topbar-right">
                    <div className="patient-chip">
                        <div className="patient-avatar">{patient.name?.charAt(0) || 'D'}</div>
                        <div className="patient-info">
                            <div className="patient-name">{patient.name || 'No patient loaded'}</div>
                            <div className="patient-meta">
                                {patient.patient_id} · Grade {patient.tumor_grade}
                                {patient.idh_mutation && ' · IDH+'}
                                {patient.mgmt_methylation && ' · MGMT+'}
                            </div>
                        </div>
                    </div>
                    <span className="badge badge-green" style={{ fontSize: 10 }}>● ONLINE</span>
                </div>
            </header>

            <div className="main-wrapper">
                {/* ── Sidebar ─────────────────────────────────────────────── */}
                <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
                    {sidebarOpen && (
                        <>
                            {/* Patient Quick Info */}
                            <div className="sidebar-patient-card">
                                <div className="sidebar-patient-avatar">
                                    {patient.name?.charAt(0) || '?'}
                                </div>
                                <div className="sidebar-patient-details">
                                    <div className="sidebar-patient-name">{patient.name}</div>
                                    <div className="sidebar-patient-id">{patient.patient_id}</div>
                                    <div className="sidebar-patient-dx">{patient.diagnosis?.split(' ')[0]}, Grade {patient.tumor_grade}</div>
                                </div>
                            </div>

                            {/* Genomic badges */}
                            <div style={{ padding: '0 12px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {patient.idh_mutation && <span className="badge badge-green" style={{ fontSize: 10 }}>IDH+</span>}
                                {patient.mgmt_methylation && <span className="badge badge-cyan" style={{ fontSize: 10 }}>MGMT+</span>}
                                {patient.egfr_amplification && <span className="badge badge-red" style={{ fontSize: 10 }}>EGFR↑</span>}
                                <span className="badge badge-amber" style={{ fontSize: 10 }}>KPS {patient.kps_score}</span>
                            </div>

                            {/* Quick scan summary */}
                            {uploadResult ? (
                                <div className="sidebar-scan-card">
                                    <div className="sidebar-scan-label">Latest Scan</div>
                                    <div className="sidebar-scan-value">{uploadResult.volume_cc?.toFixed(1)} cc</div>
                                    <div className="sidebar-scan-sub">Confidence: {uploadResult.segmentation?.confidence ? `${(uploadResult.segmentation.confidence * 100).toFixed(0)}%` : 'Demo'}</div>
                                </div>
                            ) : (
                                <div className="sidebar-scan-card">
                                    <div className="sidebar-scan-label">Demo Mode</div>
                                    <div className="sidebar-scan-value">{DEMO_VOLUMES[DEMO_VOLUMES.length - 1]} cc</div>
                                    <div className="sidebar-scan-sub">{DEMO_SCANS.length} scans recorded</div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Navigation */}
                    <nav className="nav">
                        {NAV_ITEMS.map(item => (
                            <button
                                key={item.id}
                                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(item.id)}
                                title={!sidebarOpen ? item.label : undefined}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                {sidebarOpen && (
                                    <>
                                        <span className="nav-label">{item.label}</span>
                                        {item.badge && <span className="nav-badge">{item.badge}</span>}
                                    </>
                                )}
                            </button>
                        ))}
                    </nav>

                    {sidebarOpen && (
                        <div className="sidebar-footer">
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
                                ⚠️ Research use only<br />Not clinically validated
                            </div>
                        </div>
                    )}
                </aside>

                {/* ── Main Content ─────────────────────────────────────────── */}
                <main className="content">
                    {/* Tab content */}
                    {activeTab === 'patient' && (
                        <PatientPanel patient={patient} />
                    )}

                    {activeTab === 'upload' && (
                        <Upload
                            patient={patient}
                            onResult={handleUploadResult}
                        />
                    )}

                    {activeTab === 'viewer' && (
                        <Viewer3D volumeData={uploadResult} />
                    )}

                    {activeTab === 'graph' && (
                        <Graph
                            times={DEMO_TIMES}
                            volumes={DEMO_VOLUMES}
                            scanHistory={DEMO_SCANS}
                        />
                    )}

                    {activeTab === 'radiomics' && (
                        <Radiomics data={uploadResult?.radiomics} />
                    )}

                    {activeTab === 'twin' && (
                        <TwinSimulator
                            times={DEMO_TIMES}
                            volumes={DEMO_VOLUMES}
                        />
                    )}

                    {activeTab === 'rl' && (
                        <RLOptimizer
                            times={DEMO_TIMES}
                            volumes={DEMO_VOLUMES}
                        />
                    )}

                    {activeTab === 'survival' && (
                        <Survival patient={patient} />
                    )}
                </main>
            </div>
        </div>
    );
}
