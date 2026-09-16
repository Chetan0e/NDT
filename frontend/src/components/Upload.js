import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadMRI, saveScan, getSampleMRI } from '../api';

export default function Upload({ patient, scanHistory, onScanResult, onResult }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingSample, setLoadingSample] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [extractR, setExtractR] = useState(false);
    const [scanDate, setScanDate] = useState(new Date().toISOString().split('T')[0]);

    const notifyParent = onResult || onScanResult;

    const onDrop = useCallback((accepted) => {
        setFiles(accepted);
        setResult(null);
        setError(null);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/dicom': ['.dcm'],
            'application/gzip': ['.nii.gz'],
            'application/x-nifti': ['.nii'],
        },
        multiple: true,
    });

    const handleUpload = async () => {
        if (!files.length) return;
        setLoading(true);
        setError(null);

        try {
            const rawRes = await uploadMRI(
                files,
                patient?.patient_id,
                scanDate,
                extractR,
            );
            const data = rawRes.data || rawRes;
            setResult(data);
            notifyParent?.(data);

            // Auto-save to DB
            if (patient?.patient_id) {
                await saveScan({
                    patient_id: patient.patient_id,
                    scan_date: scanDate,
                    tumor_volume_mm3: data.volume_mm3 || data.volume?.volume_mm3 || 0,
                    tumor_volume_cc: data.volume_cc || data.volume?.volume_cc || 0,
                    radiomics: data.radiomics || null,
                }).catch(() => { });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadSample = async () => {
        setLoadingSample(true);
        setError(null);
        try {
            const sampleData = await getSampleMRI();
            setResult(sampleData);
            notifyParent?.(sampleData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingSample(false);
        }
    };

    const formatBytes = (n) => {
        if (n < 1024) return `${n} B`;
        if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / 1048576).toFixed(1)} MB`;
    };

    return (
        <div className="fade-in">
            <div className="section-header">
                <div>
                    <div className="section-title">MRI Upload & Segmentation</div>
                    <div className="section-subtitle">
                        Upload DICOM series or NIfTI files for AI-powered tumor segmentation
                    </div>
                </div>
                <span className="badge badge-cyan">3D U-Net</span>
            </div>

            <div className="grid-2" style={{ marginBottom: 20 }}>
                {/* Dropzone */}
                <div>
                    <div
                        {...getRootProps()}
                        className={`dropzone ${isDragActive ? 'drag-active' : ''}`}
                    >
                        <input {...getInputProps()} />
                        <div className="dropzone-icon">🧠</div>
                        <div className="dropzone-text">
                            {isDragActive ? 'Drop files here…' : 'Drag & drop MRI files'}
                        </div>
                        <div className="dropzone-hint">
                            Supports DICOM (.dcm) and NIfTI (.nii / .nii.gz)
                        </div>
                        {files.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                                <span className="badge badge-green">
                                    ✓ {files.length} file{files.length > 1 ? 's' : ''} selected
                                </span>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                    {formatBytes(files.reduce((s, f) => s + f.size, 0))} total
                                </div>
                            </div>
                        )}
                    </div>

                    {files.length > 0 && (
                        <div style={{ marginTop: 12, maxHeight: 120, overflowY: 'auto' }}>
                            {files.slice(0, 8).map((f, i) => (
                                <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '2px 0', fontFamily: 'var(--font-mono)' }}>
                                    {f.name} ({formatBytes(f.size)})
                                </div>
                            ))}
                            {files.length > 8 && (
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    …and {files.length - 8} more
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Options */}
                <div className="card">
                    <div className="card-title">Scan Options</div>

                    <div style={{ marginBottom: 16 }}>
                        <label className="input-label">Patient ID</label>
                        <input
                            className="input"
                            value={patient?.patient_id || ''}
                            readOnly
                            style={{ opacity: 0.7 }}
                        />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label className="input-label">Scan Date</label>
                        <input
                            type="date"
                            className="input"
                            value={scanDate}
                            onChange={e => setScanDate(e.target.value)}
                        />
                    </div>

                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 14px', background: 'rgba(0,0,0,0.05)',
                        borderRadius: 8, cursor: 'pointer', marginBottom: 16,
                        border: `1px solid ${extractR ? 'var(--cyan)' : 'var(--border)'}`,
                    }} onClick={() => setExtractR(v => !v)}>
                        <div style={{
                            width: 18, height: 18, borderRadius: 4,
                            background: extractR ? 'var(--cyan)' : 'transparent',
                            border: `2px solid ${extractR ? 'var(--cyan)' : 'var(--text-muted)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {extractR && <span style={{ fontSize: 10, color: '#000', fontWeight: 700 }}>✓</span>}
                        </div>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                Extract Radiomics
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                Compute tumor biomarkers (adds ~30s)
                            </div>
                        </div>
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginBottom: 10 }}
                        onClick={handleUpload}
                        disabled={loading || files.length === 0}
                    >
                        {loading ? (
                            <>
                                <div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.1)', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                Processing…
                            </>
                        ) : '🚀 Run Segmentation'}
                    </button>

                    <button
                        className="btn btn-outline"
                        style={{ width: '100%' }}
                        onClick={handleLoadSample}
                        disabled={loadingSample || loading}
                    >
                        {loadingSample ? '⏳ Loading Sample Volume…' : '🧪 Load Sample MRI (1-Click Test)'}
                    </button>

                    {error && (
                        <div style={{ marginTop: 12, padding: '10px 14px', background: '#fee2e2', border: '1px solid rgba(255,82,82,0.3)', borderRadius: 8, fontSize: 13, color: 'var(--red)' }}>
                            ⚠️ {error}
                        </div>
                    )}
                </div>
            </div>

            {/* Results */}
            {result && (
                <div className="fade-in">
                    <div className="glow-line" style={{ marginBottom: 20 }} />
                    <div className="section-title" style={{ marginBottom: 16, fontSize: 18 }}>
                        ✅ Segmentation Results
                    </div>

                    <div className="grid-4" style={{ marginBottom: 20 }}>
                        <div className="card">
                            <div className="card-title">Tumor Volume</div>
                            <div className="card-value">{result.volume_cc?.toFixed(2)}</div>
                            <div className="card-unit">cc (mL)</div>
                        </div>
                        <div className="card">
                            <div className="card-title">Volume (mm³)</div>
                            <div className="card-value" style={{ fontSize: 24 }}>
                                {result.volume_mm3?.toFixed(0)}
                            </div>
                            <div className="card-unit">mm³</div>
                        </div>
                        <div className="card">
                            <div className="card-title">Tumor Voxels</div>
                            <div className="card-value" style={{ fontSize: 24 }}>
                                {result.segmentation?.tumor_voxels?.toLocaleString() || '—'}
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-title">AI Confidence</div>
                            <div className="card-value" style={{ color: 'var(--green)' }}>
                                {result.segmentation?.confidence
                                    ? `${(result.segmentation.confidence * 100).toFixed(0)}%`
                                    : 'N/A'}
                            </div>
                        </div>
                    </div>

                    {result.radiomics && (
                        <div className="card">
                            <div className="card-title">Radiomics Features Extracted</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {Object.keys(result.radiomics).slice(0, 12).map(k => (
                                    <span key={k} className="badge badge-violet" style={{ fontSize: 10 }}>
                                        {k.replace('_', ' ')}
                                    </span>
                                ))}
                                {Object.keys(result.radiomics).length > 12 && (
                                    <span className="badge badge-violet" style={{ fontSize: 10 }}>
                                        +{Object.keys(result.radiomics).length - 12} more
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
