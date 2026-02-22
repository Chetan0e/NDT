import React, { useState } from 'react';
import { savePatient, getPatient } from '../api';

export default function PatientPanel({ patient: initialPatient }) {
    const [patient, setPatient] = useState(initialPatient || {
        patient_id: '', name: '', age: '', gender: 'Male',
        diagnosis: 'Glioblastoma (Grade IV)',
        kps_score: 80, tumor_grade: 4,
        idh_mutation: false, mgmt_methylation: false,
    });
    const [loaded, setLoaded] = useState(null);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);
    const [lookupId, setLookupId] = useState('');

    const handleChange = (key, val) =>
        setPatient(p => ({ ...p, [key]: val }));

    const handleSave = async () => {
        setLoading(true);
        setMsg(null);
        try {
            await savePatient(patient);
            setMsg({ type: 'success', text: `✅ Patient ${patient.patient_id} saved.` });
        } catch (e) {
            setMsg({ type: 'error', text: `⚠️ ${e.message}` });
        } finally {
            setLoading(false);
        }
    };

    const handleLoad = async () => {
        if (!lookupId) return;
        setLoading(true);
        setMsg(null);
        try {
            const data = await getPatient(lookupId);
            setLoaded(data);
            setPatient(data.patient);
            setMsg({ type: 'success', text: `✅ Loaded ${data.patient.name || lookupId}` });
        } catch (e) {
            setMsg({ type: 'error', text: `⚠️ ${e.message}` });
        } finally {
            setLoading(false);
        }
    };

    const Field = ({ label, id, type = 'text', value, onChange, ...rest }) => (
        <div style={{ marginBottom: 14 }}>
            <label className="input-label" htmlFor={id}>{label}</label>
            <input id={id} type={type} className="input" value={value || ''} onChange={e => onChange(e.target.value)} {...rest} />
        </div>
    );

    const Toggle = ({ label, value, onChange }) => (
        <div onClick={() => onChange(!value)} style={{
            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: 10,
            border: `1px solid ${value ? 'var(--cyan)' : 'var(--border)'}`,
        }}>
            <div style={{
                width: 18, height: 18, borderRadius: 4,
                background: value ? 'var(--cyan)' : 'transparent',
                border: `2px solid ${value ? 'var(--cyan)' : 'var(--text-muted)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {value && <span style={{ fontSize: 10, color: '#000', fontWeight: 900 }}>✓</span>}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: value ? 'var(--cyan)' : 'var(--text-secondary)' }}>
                {label}
            </span>
        </div>
    );

    return (
        <div className="fade-in">
            <div className="section-header">
                <div>
                    <div className="section-title">Patient Record</div>
                    <div className="section-subtitle">Manage clinical data and patient demographics</div>
                </div>
            </div>

            {/* Load existing */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-title">Load Existing Patient</div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <input
                        className="input"
                        placeholder="Enter Patient ID…"
                        value={lookupId}
                        onChange={e => setLookupId(e.target.value)}
                    />
                    <button className="btn btn-outline" onClick={handleLoad} disabled={loading}>
                        🔍 Load
                    </button>
                </div>
            </div>

            {msg && (
                <div style={{
                    padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
                    background: msg.type === 'success' ? 'rgba(0,230,118,0.1)' : 'rgba(255,82,82,0.1)',
                    border: `1px solid ${msg.type === 'success' ? 'rgba(0,230,118,0.3)' : 'rgba(255,82,82,0.3)'}`,
                    color: msg.type === 'success' ? 'var(--green)' : 'var(--red)',
                }}>
                    {msg.text}
                </div>
            )}

            <div className="grid-2">
                {/* Demographics */}
                <div className="card">
                    <div className="card-title">Demographics</div>
                    <Field label="Patient ID" id="pid" value={patient.patient_id} onChange={v => handleChange('patient_id', v)} />
                    <Field label="Full Name" id="pname" value={patient.name} onChange={v => handleChange('name', v)} />
                    <Field label="Age" id="page" type="number" value={patient.age} onChange={v => handleChange('age', v)} />
                    <div style={{ marginBottom: 14 }}>
                        <label className="input-label">Gender</label>
                        <select
                            className="input"
                            value={patient.gender}
                            onChange={e => handleChange('gender', e.target.value)}
                        >
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                        </select>
                    </div>
                </div>

                {/* Clinical Data */}
                <div className="card">
                    <div className="card-title">Clinical Data</div>
                    <div style={{ marginBottom: 14 }}>
                        <label className="input-label">Diagnosis</label>
                        <input className="input" value={patient.diagnosis} onChange={e => handleChange('diagnosis', e.target.value)} />
                    </div>
                    <Field label="KPS Score (0–100)" id="kps" type="number" value={patient.kps_score} onChange={v => handleChange('kps_score', v)} min={0} max={100} />
                    <div style={{ marginBottom: 14 }}>
                        <label className="input-label">Tumor Grade (WHO)</label>
                        <select className="input" value={patient.tumor_grade} onChange={e => handleChange('tumor_grade', Number(e.target.value))}>
                            {[1, 2, 3, 4].map(g => <option key={g} value={g}>Grade {g}</option>)}
                        </select>
                    </div>
                    <Toggle label="IDH Mutation (favorable)" value={patient.idh_mutation} onChange={v => handleChange('idh_mutation', v)} />
                    <Toggle label="MGMT Methylation (favorable)" value={patient.mgmt_methylation} onChange={v => handleChange('mgmt_methylation', v)} />
                </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                    {loading ? '⏳ Saving…' : '💾 Save Patient'}
                </button>
                <button className="btn btn-ghost" onClick={() => setPatient({ patient_id: '', name: '', age: '' })}>
                    🗑 Clear
                </button>
            </div>

            {/* Scan History */}
            {loaded?.scans?.length > 0 && (
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-title">Scan History ({loaded.scan_count} records)</div>
                    {loaded.scans.map(s => (
                        <div className="stat-row" key={s.id}>
                            <span className="stat-label">{s.scan_date}</span>
                            <div>
                                <span className="stat-value">{s.tumor_volume_cc?.toFixed(2)} cc</span>
                                {s.has_radiomics && <span className="badge badge-violet" style={{ marginLeft: 8 }}>R</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
