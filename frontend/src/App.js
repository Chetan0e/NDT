import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Upload from './components/Upload';
import Viewer3D from './components/Viewer3D';
import Graph from './components/Graph';
import Radiomics from './components/Radiomics';
import TwinSimulator from './components/TwinSimulator';
import RLOptimizer from './components/RLOptimizer';
import Survival from './components/Survival';
import PatientPanel from './components/PatientPanel';
import Logo from './components/Logo';
import {
    LayoutDashboard, Users, UploadCloud, BoxSelect,
    Microscope, Network, Cpu, LineChart, Activity,
    FileText, Settings, Bell
} from 'lucide-react';

// ── Demo seed data ────────────────────────────────────────────────────────
const DEMO_PATIENT = {
    patient_id: 'NDTP-0457',
    name: 'Patient #NDTP-0457',
    age: 52,
    gender: 'Male',
    diagnosis: 'Glioblastoma (GBM)',
    diagnosis_date: '2024-03-14',
    kps_score: 80,
    tumor_grade: 4,
    idh_mutation: false,
    mgmt_methylation: true,
    egfr_amplification: true,
    tp53_mutation: false,
};

const DEMO_SCANS = [
    { date: '2024-03-14', volume_cc: 18.2 },
    { date: '2024-04-13', volume_cc: 19.8 },
    { date: '2024-05-13', volume_cc: 21.4 },
    { date: '2024-06-12', volume_cc: 22.7 },
    { date: '2024-07-12', volume_cc: 23.0 },
    { date: '2024-08-11', volume_cc: 23.4 },
];
const DEMO_TIMES = DEMO_SCANS.map((_, i) => [0, 30, 60, 90, 120, 150][i]);
const DEMO_VOLUMES = DEMO_SCANS.map(s => s.volume_cc);

const NAV_SECTIONS = [
    {
        label: 'Overview',
        items: [
            { id: 'dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard', badge: null },
        ],
    },
    {
        label: 'Clinical',
        items: [
            { id: 'patient', icon: <Users size={16} />, label: 'Patients', badge: null, hasArrow: true },
            { id: 'upload', icon: <UploadCloud size={16} />, label: 'MRI Upload', badge: null, hasArrow: true },
            { id: 'viewer', icon: <BoxSelect size={16} />, label: 'Segmentation', badge: null, hasArrow: true },
        ],
    },
    {
        label: 'AI Analysis',
        items: [
            { id: 'radiomics', icon: <Microscope size={16} />, label: 'Radiomics', badge: null },
            { id: 'twin', icon: <Network size={16} />, label: 'Digital Twin', badge: null, hasArrow: true },
            { id: 'rl', icon: <Cpu size={16} />, label: 'Therapy Optimizer', badge: null },
            { id: 'graph', icon: <LineChart size={16} />, label: 'Growth Analysis', badge: null },
            { id: 'survival', icon: <Activity size={16} />, label: 'Survival Analysis', badge: null },
        ],
    },
    {
        label: 'Reporting',
        items: [
            { id: 'reports', icon: <FileText size={16} />, label: 'Reports', badge: null },
            { id: 'settings', icon: <Settings size={16} />, label: 'Settings', badge: null, hasArrow: true },
        ],
    },
];

// Sidebar stats
const SIDEBAR_STATS = [
    { label: 'Patients', value: '1,247' },
    { label: 'Scans Processed', value: '8,932' },
    { label: 'Models Trained', value: '26' },
];

export default function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [uploadResult, setUploadResult] = useState(null);
    const [patient] = useState(DEMO_PATIENT);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [notifCount] = useState(2);

    const handleUploadResult = (res) => {
        setUploadResult(res);
        setActiveTab('viewer');
    };

    const tabLabel = NAV_SECTIONS.flatMap(s => s.items).find(i => i.id === activeTab)?.label || '';

    return (
        <div className="app-layout">
            {/* ══ Top Bar ══════════════════════════════════════════════════ */}
            <header className="topbar">
                {/* Left */}
                <div className="topbar-left">
                    <button
                        id="sidebar-toggle-btn"
                        className="sidebar-toggle"
                        onClick={() => setSidebarOpen(v => !v)}
                        title="Toggle sidebar"
                        aria-label="Toggle sidebar"
                    >
                        ☰
                    </button>
                    <div className="brand">
                        <div className="brand-logo-container" style={{ display: 'flex', alignItems: 'center' }}>
                            <Logo size={42} />
                        </div>
                        <div style={{ marginLeft: 2 }}>
                            <div className="brand-name">NeuroDigital Twin</div>
                            <div className="brand-sub">Advanced AI-Driven Oncology Optimization</div>
                        </div>
                    </div>
                </div>

                {/* Right */}
                <div className="topbar-right">
                    {/* Notification bell */}
                    <button id="notif-btn" className="notif-btn" title="Notifications" aria-label="Notifications">
                        <Bell size={18} />
                        {notifCount > 0 && <div className="notif-badge" />}
                    </button>

                    {/* Doctor chip */}
                    <div className="doctor-chip">
                        <div className="doctor-avatar">A</div>
                        <div>
                            <div className="doctor-name">Dr. A. Mehta</div>
                            <div className="doctor-role">Neuro Oncologist</div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ══ Body ══════════════════════════════════════════════════════ */}
            <div className="main-wrapper">
                {/* ── Sidebar ──────────────────────────────────────────── */}
                <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
                    <nav className="nav">
                        {sidebarOpen
                            ? NAV_SECTIONS.map(section => (
                                <React.Fragment key={section.label}>
                                    <div className="sidebar-section-label">{section.label}</div>
                                    {section.items.map(item => (
                                        <button
                                            key={item.id}
                                            id={`nav-${item.id}`}
                                            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                                            onClick={() => setActiveTab(item.id)}
                                            title={item.label}
                                        >
                                            <span className="nav-icon">{item.icon}</span>
                                            <span className="nav-label">{item.label}</span>
                                            {item.badge && <span className="nav-badge">{item.badge}</span>}
                                            {item.hasArrow && (
                                                <span className="nav-arrow">›</span>
                                            )}
                                        </button>
                                    ))}
                                </React.Fragment>
                            ))
                            : NAV_SECTIONS.flatMap(s => s.items).map(item => (
                                <button
                                    key={item.id}
                                    id={`nav-col-${item.id}`}
                                    className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(item.id)}
                                    title={item.label}
                                    style={{ justifyContent: 'center', padding: '10px' }}
                                >
                                    <span className="nav-icon">{item.icon}</span>
                                </button>
                            ))
                        }
                    </nav>

                    {/* Footer with system status */}
                    {sidebarOpen && (
                        <div className="sidebar-footer">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                <span className="status-dot" />
                                <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>System Status</span>
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>All Systems Operational</div>

                            {SIDEBAR_STATS.map(s => (
                                <div key={s.label} className="sidebar-stat-row">
                                    <span className="sidebar-stat-label">
                                        {s.label === 'Patients' ? '👤 ' : s.label === 'Scans Processed' ? '🖥 ' : '🤖 '}
                                        {s.label}
                                    </span>
                                    <span className="sidebar-stat-value">{s.value}</span>
                                </div>
                            ))}

                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>⚙ Version</span>
                                <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>2.3.1</span>
                            </div>
                        </div>
                    )}
                </aside>

                {/* ── Main Content ─────────────────────────────────────── */}
                <main className="content">
                    {activeTab === 'dashboard' && (
                        <Dashboard patient={patient} uploadResult={uploadResult} />
                    )}
                    {activeTab === 'patient' && (
                        <PatientPanel patient={patient} />
                    )}
                    {activeTab === 'upload' && (
                        <Upload patient={patient} onResult={handleUploadResult} />
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
                        <TwinSimulator times={DEMO_TIMES} volumes={DEMO_VOLUMES} />
                    )}
                    {activeTab === 'rl' && (
                        <RLOptimizer times={DEMO_TIMES} volumes={DEMO_VOLUMES} />
                    )}
                    {activeTab === 'survival' && (
                        <Survival patient={patient} />
                    )}
                    {(activeTab === 'reports' || activeTab === 'settings') && (
                        <div className="fade-in">
                            <div className="section-header">
                                <div>
                                    <div className="section-title">{tabLabel}</div>
                                    <div className="section-subtitle">
                                        {activeTab === 'reports'
                                            ? 'Generate and export clinical AI reports'
                                            : 'Configure platform preferences'}
                                    </div>
                                </div>
                            </div>
                            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                                <div style={{ fontSize: 40, marginBottom: 16 }}>
                                    {activeTab === 'reports' ? '📄' : '⚙️'}
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                                    {tabLabel} Module
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                    Coming soon — use the Dashboard for full analysis capabilities.
                                </div>
                                <button
                                    className="btn btn-primary"
                                    style={{ marginTop: 20 }}
                                    onClick={() => setActiveTab('dashboard')}
                                >
                                    ← Back to Dashboard
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
