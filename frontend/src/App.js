import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Upload from './components/Upload';
import Viewer3D from './components/Viewer3D';
import Graph from './components/Graph';
import Radiomics from './components/Radiomics';
import TwinSimulator from './components/TwinSimulator';
import RLOptimizer from './components/RLOptimizer';
import Survival from './components/Survival';
import PatientPanel from './components/PatientPanel';
import Reports from './components/Reports';
import Settings from './components/Settings';
import HowToUse from './components/HowToUse';
import Logo from './components/Logo';
import { listPatients, getPatient, getAnalyticsOverview } from './api';
import {
    LayoutDashboard, Users, UploadCloud, BoxSelect,
    Microscope, Network, Cpu, LineChart, Activity,
    FileText, Settings as SettingsIcon, Bell, BookOpen
} from 'lucide-react';

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
            { id: 'settings', icon: <SettingsIcon size={16} />, label: 'Settings', badge: null, hasArrow: true },
            { id: 'howto', icon: <BookOpen size={16} />, label: 'How To Use', badge: 'NEW', hasArrow: false },
        ],
    },
];

export default function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [uploadResult, setUploadResult] = useState(null);
    const [patient, setPatient] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [notifCount] = useState(2);
    const [sidebarStats, setSidebarStats] = useState([
        { label: 'Patients', value: '5' },
        { label: 'Scans Processed', value: '13' },
        { label: 'Models Active', value: '4' },
    ]);

    // Initial load: Fetch stats and auto-select primary patient
    useEffect(() => {
        getAnalyticsOverview()
            .then(stats => {
                if (stats?.patient_statistics) {
                    setSidebarStats([
                        { label: 'Patients', value: String(stats.patient_statistics.total_patients || 5) },
                        { label: 'Scans Processed', value: String(stats.patient_statistics.total_scans || 13) },
                        { label: 'Models Active', value: '4' },
                    ]);
                }
            })
            .catch(() => {});

        listPatients()
            .then(list => {
                if (list && list.length > 0 && !patient) {
                    getPatient(list[0].patient_id).then(rec => {
                        setPatient({
                            ...rec.patient,
                            scans: rec.scans,
                            scan_count: rec.scan_count,
                            latest_scan: rec.latest_scan,
                            growth_record: rec.growth_record,
                        });
                    }).catch(() => {});
                }
            })
            .catch(() => {});
    }, []);

    const handleUploadResult = (res) => {
        setUploadResult(res);
        setActiveTab('viewer');
    };

    // Derive longitudinal scan arrays from upload or selected patient
    const activeTimes = uploadResult?.times || (
        patient?.scans && patient.scans.length >= 2
            ? patient.scans.map((s, idx) => {
                const base = new Date(patient.scans[0].scan_date).getTime();
                const cur = new Date(s.scan_date).getTime();
                return Math.round((cur - base) / (1000 * 60 * 60 * 24)) || idx * 30;
            })
            : []
    );

    const activeVolumes = uploadResult?.volumes || (
        patient?.scans && patient.scans.length >= 2
            ? patient.scans.map(s => s.tumor_volume_cc || (s.tumor_volume_mm3 ? s.tumor_volume_mm3 / 1000.0 : 0))
            : []
    );

    const activeHistory = uploadResult?.scanHistory || (
        patient?.scans?.map(s => ({
            date: s.scan_date,
            volume: s.tumor_volume_cc || (s.tumor_volume_mm3 ? s.tumor_volume_mm3 / 1000.0 : 0),
        })) || []
    );

    const activeRadiomics = uploadResult?.radiomics || (
        patient?.scans?.find(s => s.radiomics)?.radiomics || null
    );

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
                    {/* Active patient chip if selected */}
                    {patient && (
                        <div
                            onClick={() => setActiveTab('patient')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '6px 12px', background: 'rgba(2,132,199,0.08)',
                                border: '1px solid rgba(2,132,199,0.25)', borderRadius: 20,
                                cursor: 'pointer', fontSize: 12
                            }}
                            title="Click to view patient profile"
                        >
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)' }} />
                            <span style={{ color: 'var(--text-secondary)' }}>Active:</span>
                            <strong style={{ color: 'var(--cyan)' }}>#{patient.patient_id}</strong>
                            <span style={{ color: 'var(--text-muted)' }}>({patient.name})</span>
                        </div>
                    )}

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
                            <div className="doctor-role">Neuro-Oncology Lead</div>
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
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>All AI Modules Operational</div>

                            {sidebarStats.map(s => (
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
                                <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>2.0.0</span>
                            </div>
                        </div>
                    )}
                </aside>

                {/* ── Main Content ─────────────────────────────────────── */}
                <main className="content">
                    {activeTab === 'dashboard' && (
                        <Dashboard
                            patient={patient}
                            uploadResult={uploadResult}
                            setPatient={setPatient}
                            onNavigateTab={setActiveTab}
                        />
                    )}
                    {activeTab === 'patient' && (
                        <PatientPanel patient={patient} setPatient={setPatient} />
                    )}
                    {activeTab === 'upload' && (
                        <Upload
                            patient={patient}
                            scanHistory={activeHistory}
                            onResult={handleUploadResult}
                            onScanResult={handleUploadResult}
                        />
                    )}
                    {activeTab === 'viewer' && (
                        <Viewer3D
                            volumeData={
                                uploadResult || (patient?.latest_scan ? {
                                    volume_cc: patient.latest_scan.tumor_volume_cc,
                                    volume_mm3: patient.latest_scan.tumor_volume_cc * 1000,
                                    alpha: patient.growth_record?.growth_rate_alpha,
                                    risk: patient.growth_record?.growth_label,
                                } : null)
                            }
                        />
                    )}
                    {activeTab === 'graph' && (
                        <Graph
                            times={activeTimes}
                            volumes={activeVolumes}
                            scanHistory={activeHistory}
                        />
                    )}
                    {activeTab === 'radiomics' && (
                        <Radiomics data={activeRadiomics} />
                    )}
                    {activeTab === 'twin' && (
                        <TwinSimulator
                            times={activeTimes}
                            volumes={activeVolumes}
                        />
                    )}
                    {activeTab === 'rl' && (
                        <RLOptimizer
                            times={activeTimes}
                            volumes={activeVolumes}
                        />
                    )}
                    {activeTab === 'survival' && (
                        <Survival patient={patient} />
                    )}
                    {activeTab === 'reports' && (
                        <Reports patient={patient} setPatient={setPatient} />
                    )}
                    {activeTab === 'settings' && (
                        <Settings />
                    )}
                    {activeTab === 'howto' && (
                        <HowToUse />
                    )}
                </main>
            </div>
        </div>
    );
}
