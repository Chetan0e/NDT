import React, { useState, useEffect } from 'react';
import { listPatients, getPatient, savePatient, updatePatient, deletePatient, seedDatabase } from '../api';
import { Users, Search, Plus, Trash2, CheckCircle2, RefreshCw, Calendar, Activity, Dna, FileText } from 'lucide-react';

export default function PatientPanel({ patient: activePatient, setPatient }) {
    const [patientList, setPatientList] = useState([]);
    const [selectedPatientId, setSelectedPatientId] = useState(activePatient?.patient_id || '');
    const [formData, setFormData] = useState({
        patient_id: '',
        name: '',
        age: 55,
        gender: 'Male',
        diagnosis: 'Glioblastoma Multiforme (WHO Grade IV)',
        kps_score: 80,
        tumor_grade: 4,
        idh_mutation: false,
        mgmt_methylation: false,
        egfr_amplification: false,
        tp53_mutation: false,
        prior_treatments: 0,
    });
    const [fullRecord, setFullRecord] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [gradeFilter, setGradeFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);

    // Fetch patient directory
    const fetchDirectory = async (selectId = null) => {
        try {
            setLoading(true);
            const list = await listPatients();
            setPatientList(list || []);
            
            const targetId = selectId || activePatient?.patient_id || (list && list.length > 0 ? list[0].patient_id : null);
            if (targetId) {
                await loadPatientDetails(targetId);
            }
        } catch (e) {
            setMsg({ type: 'error', text: `Failed to load patients: ${e.message}` });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDirectory();
    }, []);

    // Sync active patient changes from parent
    useEffect(() => {
        if (activePatient?.patient_id && activePatient.patient_id !== selectedPatientId) {
            setSelectedPatientId(activePatient.patient_id);
            loadPatientDetails(activePatient.patient_id);
        }
    }, [activePatient?.patient_id]);

    const loadPatientDetails = async (pid) => {
        if (!pid) return;
        setLoading(true);
        setMsg(null);
        try {
            const data = await getPatient(pid);
            setFullRecord(data);
            setSelectedPatientId(pid);
            setFormData(data.patient);
            setIsEditing(false);
            setIsCreating(false);
            if (setPatient) {
                setPatient({
                    ...data.patient,
                    scans: data.scans,
                    scan_count: data.scan_count,
                    latest_scan: data.latest_scan,
                    growth_record: data.growth_record,
                });
            }
        } catch (e) {
            setMsg({ type: 'error', text: `Failed to load record: ${e.message}` });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setMsg(null);
        try {
            if (isCreating) {
                await savePatient(formData);
                setMsg({ type: 'success', text: `✅ Patient ${formData.patient_id} created successfully.` });
                setIsCreating(false);
                await fetchDirectory(formData.patient_id);
            } else {
                await updatePatient(formData.patient_id, formData);
                setMsg({ type: 'success', text: `✅ Patient ${formData.patient_id} updated successfully.` });
                setIsEditing(false);
                await fetchDirectory(formData.patient_id);
            }
        } catch (e) {
            setMsg({ type: 'error', text: `⚠️ ${e.message}` });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (pid) => {
        if (!window.confirm(`Are you sure you want to delete patient record ${pid}?`)) return;
        setLoading(true);
        try {
            await deletePatient(pid);
            setMsg({ type: 'success', text: `Deleted patient ${pid}.` });
            await fetchDirectory();
        } catch (e) {
            setMsg({ type: 'error', text: `Failed to delete: ${e.message}` });
        } finally {
            setLoading(false);
        }
    };

    const handleSeedCohort = async () => {
        setLoading(true);
        try {
            const res = await seedDatabase(true);
            setMsg({ type: 'success', text: `✅ ${res.message}` });
            await fetchDirectory();
        } catch (e) {
            setMsg({ type: 'error', text: `Seed failed: ${e.message}` });
        } finally {
            setLoading(false);
        }
    };

    const startCreate = () => {
        const newId = `NDT-${String(patientList.length + 1).padStart(3, '0')}`;
        setFormData({
            patient_id: newId,
            name: '',
            age: 50,
            gender: 'Male',
            diagnosis: 'Glioblastoma (WHO Grade IV)',
            kps_score: 80,
            tumor_grade: 4,
            idh_mutation: false,
            mgmt_methylation: false,
            egfr_amplification: false,
            tp53_mutation: false,
            prior_treatments: 0,
        });
        setIsCreating(true);
        setIsEditing(true);
        setFullRecord(null);
    };

    const filteredList = patientList.filter(p => {
        const matchesSearch = !searchTerm ||
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.diagnosis && p.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesGrade = gradeFilter === 'all' || String(p.tumor_grade) === gradeFilter;
        return matchesSearch && matchesGrade;
    });

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="section-header">
                <div>
                    <div className="section-title">Clinical Patient Directory</div>
                    <div className="section-subtitle">
                        Multi-modal patient cohort management, molecular profiling, and longitudinal history
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-outline" onClick={handleSeedCohort} disabled={loading} title="Reset and populate with 5 clinical cases">
                        <RefreshCw size={14} /> Reset Demo Cohort
                    </button>
                    <button className="btn btn-primary" onClick={startCreate} disabled={loading}>
                        <Plus size={14} /> New Patient
                    </button>
                </div>
            </div>

            {msg && (
                <div style={{
                    padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13,
                    background: msg.type === 'success' ? 'rgba(5,150,105,0.1)' : '#fee2e2',
                    border: `1px solid ${msg.type === 'success' ? 'rgba(5,150,105,0.3)' : '#fecaca'}`,
                    color: msg.type === 'success' ? 'var(--green)' : 'var(--red)',
                    display: 'flex', alignItems: 'center', gap: 8
                }}>
                    <span>{msg.text}</span>
                </div>
            )}

            {/* ── Patient Directory Table ────────────────────────────────────── */}
            <div className="card" style={{ marginBottom: 24, overflowX: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="card-title" style={{ margin: 0 }}>
                            Cohort Patients ({filteredList.length})
                        </div>
                        {loading && <span className="spinner" style={{ width: 14, height: 14 }} />}
                    </div>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {/* Search */}
                        <div style={{ position: 'relative', minWidth: 200 }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                className="input"
                                placeholder="Search by name, ID, diagnosis..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: 30, fontSize: 12, height: 34 }}
                            />
                        </div>

                        {/* WHO Grade Filter */}
                        <select
                            className="input"
                            value={gradeFilter}
                            onChange={e => setGradeFilter(e.target.value)}
                            style={{ width: 140, fontSize: 12, height: 34 }}
                        >
                            <option value="all">All WHO Grades</option>
                            <option value="2">WHO Grade II</option>
                            <option value="3">WHO Grade III</option>
                            <option value="4">WHO Grade IV</option>
                        </select>
                    </div>
                </div>

                {filteredList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                        No patients match the search criteria. Click <strong>"Reset Demo Cohort"</strong> or <strong>"New Patient"</strong> to begin.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                <th style={{ padding: '10px 12px' }}>Patient ID</th>
                                <th style={{ padding: '10px 12px' }}>Name &amp; Age</th>
                                <th style={{ padding: '10px 12px' }}>Diagnosis</th>
                                <th style={{ padding: '10px 12px' }}>Grade</th>
                                <th style={{ padding: '10px 12px' }}>Molecular Markers</th>
                                <th style={{ padding: '10px 12px' }}>Scans</th>
                                <th style={{ padding: '10px 12px' }}>Latest Vol</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredList.map(p => {
                                const isActive = p.patient_id === selectedPatientId;
                                return (
                                    <tr
                                        key={p.patient_id}
                                        style={{
                                            borderBottom: '1px solid var(--border)',
                                            background: isActive ? 'rgba(2,132,199,0.06)' : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'background 0.15s'
                                        }}
                                        onClick={() => loadPatientDetails(p.patient_id)}
                                    >
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--cyan)' }}>
                                                    #{p.patient_id}
                                                </span>
                                                {isActive && (
                                                    <span className="badge badge-cyan" style={{ fontSize: 10, padding: '1px 5px' }}>Active</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.age} yrs, {p.gender}</div>
                                        </td>
                                        <td style={{ padding: '12px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {p.diagnosis}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span className={`badge ${p.tumor_grade === 4 ? 'badge-red' : p.tumor_grade === 3 ? 'badge-amber' : 'badge-green'}`} style={{ fontSize: 11 }}>
                                                Grade {p.tumor_grade}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                <span className={`badge ${p.idh_mutation ? 'badge-green' : 'badge-neutral'}`} style={{ fontSize: 10 }}>
                                                    IDH {p.idh_mutation ? 'Mut' : 'wt'}
                                                </span>
                                                <span className={`badge ${p.mgmt_methylation ? 'badge-green' : 'badge-neutral'}`} style={{ fontSize: 10 }}>
                                                    MGMT {p.mgmt_methylation ? 'Meth' : 'Unmeth'}
                                                </span>
                                                {p.egfr_amplification && (
                                                    <span className="badge badge-violet" style={{ fontSize: 10 }}>EGFR+</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px', fontFamily: 'var(--font-mono)' }}>
                                            {p.scan_count || 0} scan{p.scan_count !== 1 ? 's' : ''}
                                        </td>
                                        <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                            {p.latest_volume_cc ? `${p.latest_volume_cc.toFixed(1)} cc` : '—'}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                <button
                                                    className={`btn ${isActive ? 'btn-primary' : 'btn-outline'}`}
                                                    style={{ padding: '4px 10px', fontSize: 11 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        loadPatientDetails(p.patient_id);
                                                    }}
                                                >
                                                    {isActive ? 'Active' : 'Select'}
                                                </button>
                                                <button
                                                    className="btn-ghost"
                                                    style={{ padding: '4px 8px', color: 'var(--red)', background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(p.patient_id);
                                                    }}
                                                    title="Delete record"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Patient Details & Longitudinal Scans ───────────────────────── */}
            <div className="grid-2">
                {/* Clinical Metadata / Form */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div className="card-title" style={{ margin: 0 }}>
                            {isCreating ? '➕ New Patient Record' : `Clinical Details: ${formData.name || formData.patient_id}`}
                        </div>
                        {!isCreating && (
                            <button
                                className="btn btn-outline"
                                style={{ fontSize: 12, padding: '4px 10px' }}
                                onClick={() => setIsEditing(!isEditing)}
                            >
                                {isEditing ? 'Cancel Edit' : '✏️ Edit Details'}
                            </button>
                        )}
                    </div>

                    <div className="grid-2" style={{ gap: 12 }}>
                        <div style={{ marginBottom: 12 }}>
                            <label className="input-label">Patient ID</label>
                            <input
                                className="input"
                                value={formData.patient_id}
                                readOnly={!isCreating}
                                onChange={e => setFormData({ ...formData, patient_id: e.target.value })}
                                style={{ fontFamily: 'var(--font-mono)', opacity: isCreating ? 1 : 0.8 }}
                            />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label className="input-label">Full Name</label>
                            <input
                                className="input"
                                value={formData.name || ''}
                                readOnly={!isEditing}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid-2" style={{ gap: 12 }}>
                        <div style={{ marginBottom: 12 }}>
                            <label className="input-label">Age</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.age || ''}
                                readOnly={!isEditing}
                                onChange={e => setFormData({ ...formData, age: Number(e.target.value) })}
                            />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label className="input-label">Gender</label>
                            <select
                                className="input"
                                value={formData.gender || 'Male'}
                                disabled={!isEditing}
                                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                            >
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                        <label className="input-label">Diagnosis</label>
                        <input
                            className="input"
                            value={formData.diagnosis || ''}
                            readOnly={!isEditing}
                            onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
                        />
                    </div>

                    <div className="grid-2" style={{ gap: 12 }}>
                        <div style={{ marginBottom: 12 }}>
                            <label className="input-label">KPS Score (0–100)</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.kps_score ?? 80}
                                readOnly={!isEditing}
                                min={0}
                                max={100}
                                onChange={e => setFormData({ ...formData, kps_score: Number(e.target.value) })}
                            />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label className="input-label">WHO Tumor Grade</label>
                            <select
                                className="input"
                                value={formData.tumor_grade || 4}
                                disabled={!isEditing}
                                onChange={e => setFormData({ ...formData, tumor_grade: Number(e.target.value) })}
                            >
                                <option value={1}>WHO Grade I</option>
                                <option value={2}>WHO Grade II</option>
                                <option value={3}>WHO Grade III</option>
                                <option value={4}>WHO Grade IV</option>
                            </select>
                        </div>
                    </div>

                    {/* Molecular Markers Toggles */}
                    <div style={{ marginTop: 8, marginBottom: 16 }}>
                        <label className="input-label" style={{ marginBottom: 8 }}>Molecular &amp; Genomic Markers</label>
                        <div className="grid-2" style={{ gap: 8 }}>
                            {[
                                { key: 'idh_mutation', label: 'IDH1/2 Mutation (Favorable)' },
                                { key: 'mgmt_methylation', label: 'MGMT Methylation (Chemo)' },
                                { key: 'egfr_amplification', label: 'EGFR Amplification' },
                                { key: 'tp53_mutation', label: 'TP53 Mutation' },
                            ].map(item => (
                                <div
                                    key={item.key}
                                    onClick={() => isEditing && setFormData({ ...formData, [item.key]: !formData[item.key] })}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '8px 12px', borderRadius: 8,
                                        background: formData[item.key] ? 'rgba(2,132,199,0.08)' : 'rgba(15,23,42,0.02)',
                                        border: `1px solid ${formData[item.key] ? 'var(--cyan)' : 'var(--border)'}`,
                                        cursor: isEditing ? 'pointer' : 'default',
                                        fontSize: 12, fontWeight: 600,
                                        color: formData[item.key] ? 'var(--cyan)' : 'var(--text-secondary)'
                                    }}
                                >
                                    <div style={{
                                        width: 14, height: 14, borderRadius: 3,
                                        border: `1.5px solid ${formData[item.key] ? 'var(--cyan)' : 'var(--text-muted)'}`,
                                        background: formData[item.key] ? 'var(--cyan)' : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {formData[item.key] && <span style={{ color: '#fff', fontSize: 9 }}>✓</span>}
                                    </div>
                                    <span>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {isEditing && (
                        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                            <button className="btn btn-primary" onClick={handleSave} disabled={loading} style={{ flex: 1 }}>
                                {loading ? 'Saving…' : '💾 Save Changes'}
                            </button>
                            <button className="btn btn-ghost" onClick={() => setIsEditing(false)} disabled={loading}>
                                Cancel
                            </button>
                        </div>
                    )}
                </div>

                {/* Longitudinal Scan Records */}
                <div className="card">
                    <div className="card-title">
                        Longitudinal MRI Scans ({fullRecord?.scans?.length || 0})
                    </div>

                    {!fullRecord?.scans || fullRecord.scans.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                            No scan records logged for this patient yet. Use the <strong>MRI Upload</strong> tab to segment and add scans.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {fullRecord.scans.map((s, idx) => (
                                <div
                                    key={s.id || idx}
                                    style={{
                                        padding: '12px 14px', borderRadius: 8,
                                        border: '1px solid var(--border)',
                                        background: 'rgba(15,23,42,0.01)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        fontSize: 12
                                    }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <Calendar size={13} style={{ color: 'var(--cyan)' }} />
                                            <strong style={{ color: 'var(--text-primary)' }}>{s.scan_date}</strong>
                                            <span className="badge badge-cyan" style={{ fontSize: 10 }}>Scan #{idx + 1}</span>
                                            {s.dice_score && (
                                                <span className="badge badge-green" style={{ fontSize: 10 }}>Dice {(s.dice_score * 100).toFixed(0)}%</span>
                                            )}
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                                            {s.notes || 'Routine surveillance scan'}
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
                                            {s.tumor_volume_cc?.toFixed(1)} cc
                                        </div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                            {s.tumor_volume_mm3?.toLocaleString()} mm³
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Growth Summary Context */}
                            {fullRecord?.growth_record && (
                                <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'rgba(2,132,199,0.05)', border: '1px solid rgba(2,132,199,0.2)' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', marginBottom: 4 }}>
                                        AI Growth Model Calibration
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
                                        <span>Calibrated α: <strong>{fullRecord.growth_record.growth_rate_alpha}</strong>/day</span>
                                        <span>Carrying Cap (K): <strong>{fullRecord.growth_record.carrying_capacity} cc</strong></span>
                                        <span>Status: <strong style={{ color: 'var(--amber)' }}>{fullRecord.growth_record.growth_label}</strong></span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
