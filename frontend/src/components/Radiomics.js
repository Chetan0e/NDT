import React, { useState } from 'react';
import { interpretFeatures } from '../api';

// Fallback demo data for when no scan has been uploaded yet
// This allows the component to be functional even without real MRI data
const DEMO_FEATURES = {
    "shape_Elongation": 0.72,
    "shape_Sphericity": 0.54,
    "shape_SurfaceVolumeRatio": 0.31,
    "firstorder_Entropy": 5.12,
    "firstorder_Kurtosis": 2.87,
    "firstorder_Skewness": 0.42,
    "firstorder_Energy": 12043.2,
    "firstorder_Mean": 0.431,
    "firstorder_Std": 0.213,
    "glcm_Contrast": 187.4,
    "glcm_Correlation": 0.762,
    "glcm_Dissimilarity": 8.34,
    "glcm_Entropy": 5.89,
    "glcm_Homogeneity": 0.34,
};

const RANGE_MAP = {
    "shape_Sphericity": { low: 0.0, high: 1.0, warn: 0.5, danger: 0.3, reverse: true },
    "firstorder_Entropy": { low: 0.0, high: 9.0, warn: 4.0, danger: 6.0, reverse: false },
    "glcm_Contrast": { low: 0.0, high: 400, warn: 100, danger: 250, reverse: false },
    "glcm_Homogeneity": { low: 0.0, high: 1.0, warn: 0.5, danger: 0.25, reverse: true },
};

function getBarColor(key, val) {
    const r = RANGE_MAP[key];
    if (!r) return 'var(--cyan)';
    const critical = r.reverse ? val < r.danger : val > r.danger;
    const warn = r.reverse ? val < r.warn : val > r.warn;
    if (critical) return 'var(--red)';
    if (warn) return 'var(--amber)';
    return 'var(--green)';
}

function getBarWidth(key, val) {
    const r = RANGE_MAP[key];
    if (!r) return 50;
    return Math.min(100, Math.max(5, ((val - r.low) / (r.high - r.low)) * 100));
}

export default function Radiomics({ data }) {
    const [custom, setCustom] = useState(null);
    const [loading, setLoading] = useState(false);
    const [interpreted, setInterpreted] = useState(null);
    const [filter, setFilter] = useState('');
    const [error, setError] = useState(null);

    const features = custom || data || DEMO_FEATURES;
    const isDemoMode = !data && !custom;

    const fetchInterpretation = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await interpretFeatures(features);
            setInterpreted(res.interpreted_features);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const displayItems = interpreted
        ? interpreted.filter(f => !filter || f.label.toLowerCase().includes(filter.toLowerCase()))
        : Object.entries(features)
            .filter(([k]) => !filter || k.toLowerCase().includes(filter.toLowerCase()))
            .map(([key, val]) => ({ key, label: key, value: val }));

    // Group by category
    const groups = {
        Shape: displayItems.filter(f => f.key.toLowerCase().includes('shape')),
        'First Order': displayItems.filter(f => f.key.toLowerCase().includes('firstorder')),
        'Texture (GLCM)': displayItems.filter(f => f.key.toLowerCase().includes('glcm')),
        Other: displayItems.filter(f =>
            !f.key.toLowerCase().includes('shape') &&
            !f.key.toLowerCase().includes('firstorder') &&
            !f.key.toLowerCase().includes('glcm')
        ),
    };

    return (
        <div className="fade-in">
            <div className="section-header">
                <div>
                    <div className="section-title">Radiomics Feature Panel</div>
                    <div className="section-subtitle">
                        Quantitative tumor biomarkers — shape, intensity & texture
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {isDemoMode && <span className="badge badge-amber">Demo Data</span>}
                    <button className="btn btn-outline" onClick={fetchInterpretation} disabled={loading}>
                        {loading ? '⏳' : '🔍 Interpret'}
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid rgba(255,82,82,0.3)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Top summary badges */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-title">Feature Summary</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {[
                        { label: 'Heterogeneity', val: features['firstorder_Entropy']?.toFixed(2), key: 'firstorder_Entropy' },
                        { label: 'Sphericity', val: features['shape_Sphericity']?.toFixed(2), key: 'shape_Sphericity' },
                        { label: 'Texture Contrast', val: features['glcm_Contrast']?.toFixed(1), key: 'glcm_Contrast' },
                        { label: 'Uniformity', val: features['glcm_Homogeneity']?.toFixed(3), key: 'glcm_Homogeneity' },
                    ].map(item => (
                        <div key={item.label} style={{
                            background: 'rgba(255,255,255,0.85)',
                            border: `1px solid ${getBarColor(item.key, item.val)}44`,
                            borderRadius: 10, padding: '12px 16px', minWidth: 120,
                        }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: getBarColor(item.key, item.val), fontFamily: 'var(--font-mono)' }}>
                                {item.val || '—'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Filter */}
            <div style={{ marginBottom: 16 }}>
                <input
                    className="input"
                    placeholder="🔍 Filter features…"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    style={{ maxWidth: 300 }}
                />
            </div>

            {/* Feature groups */}
            {Object.entries(groups).map(([groupName, items]) => {
                if (items.length === 0) return null;
                return (
                    <div className="card" key={groupName} style={{ marginBottom: 16 }}>
                        <div className="card-title">{groupName} Features</div>
                        {items.map(item => (
                            <div key={item.key} style={{ marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <div>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {item.label !== item.key ? item.label : item.key.replace(/_/g, ' ')}
                                        </span>
                                        {item.note && (
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                {item.note}
                                            </div>
                                        )}
                                    </div>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: getBarColor(item.key, item.value) }}>
                                        {typeof item.value === 'number' ? item.value.toFixed(4) : item.value}
                                    </span>
                                </div>
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{
                                            width: `${getBarWidth(item.key, item.value)}%`,
                                            background: `linear-gradient(90deg, ${getBarColor(item.key, item.value)}99, ${getBarColor(item.key, item.value)})`,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}
