import React, { useState } from 'react';
import { interpretFeatures } from '../api';


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

    const features = custom || data;
    const hasData = features && Object.keys(features).length > 0;

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
                    <button className="btn btn-outline" onClick={fetchInterpretation} disabled={loading || !hasData}>
                        {loading ? '⏳' : '🔍 Interpret'}
                    </button>
                </div>
            </div>

            {!hasData && (
                <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                    <div className="card-title" style={{ marginBottom: 8 }}>No Radiomics Data</div>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                        Upload an MRI scan to extract and view radiomics features.
                    </div>
                </div>
            )}

            {error && (
                <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid rgba(255,82,82,0.3)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Top summary badges */}
            {hasData && (
                <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-title">Feature Summary</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {[
                        { label: 'Heterogeneity', val: features['firstorder_Entropy']?.toFixed(2), numVal: features['firstorder_Entropy'], key: 'firstorder_Entropy' },
                        { label: 'Sphericity', val: features['shape_Sphericity']?.toFixed(2), numVal: features['shape_Sphericity'], key: 'shape_Sphericity' },
                        { label: 'Texture Contrast', val: features['glcm_Contrast']?.toFixed(1), numVal: features['glcm_Contrast'], key: 'glcm_Contrast' },
                        { label: 'Uniformity', val: features['glcm_Homogeneity']?.toFixed(3), numVal: features['glcm_Homogeneity'], key: 'glcm_Homogeneity' },
                    ].map(item => (
                        <div key={item.label} style={{
                            background: 'rgba(255,255,255,0.85)',
                            border: `1px solid ${getBarColor(item.key, item.numVal)}44`,
                            borderRadius: 10, padding: '12px 16px', minWidth: 120,
                        }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: getBarColor(item.key, item.numVal), fontFamily: 'var(--font-mono)' }}>
                                {item.val || '—'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            )}

            {/* Filter */}
            {hasData && (
                <div style={{ marginBottom: 16 }}>
                    <input
                        className="input"
                        placeholder="🔍 Filter features…"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        style={{ maxWidth: 300 }}
                    />
                </div>
            )}

            {/* Feature groups */}
            {hasData && Object.entries(groups).map(([groupName, items]) => {
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
