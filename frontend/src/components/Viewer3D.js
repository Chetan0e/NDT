import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

export default function Viewer3D({ volumeData }) {
    const mountRef = useRef(null);
    const rendererRef = useRef(null);
    const animRef = useRef(null);
    const [therapy, setTherapy] = useState(0);
    const [rotating, setRotating] = useState(true);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        // ── Scene Setup ──────────────────────────────────────────────────────
        const W = mount.clientWidth || 480;
        const H = mount.clientHeight || 480;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x060b18);

        const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
        camera.position.set(0, 0, 3.5);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(W, H);
        renderer.setPixelRatio(window.devicePixelRatio);
        mount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // ── Lighting ─────────────────────────────────────────────────────────
        scene.add(new THREE.AmbientLight(0x112244, 2));
        const point1 = new THREE.PointLight(0x00c8ff, 4, 10);
        point1.position.set(3, 3, 3);
        scene.add(point1);
        const point2 = new THREE.PointLight(0x7c4dff, 3, 10);
        point2.position.set(-3, -2, 1);
        scene.add(point2);

        // ── Brain-like blob (icosahedron + noise) ─────────────────────────────
        const brainGeo = new THREE.IcosahedronGeometry(1.0, 4);
        // Distort vertices to look organic
        const pos = brainGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
            const n = 0.15 * Math.sin(x * 5 + y * 3) * Math.cos(z * 4);
            pos.setXYZ(i, x * (1 + n), y * (1 + n * 0.7), z * (1 + n * 0.5));
        }
        brainGeo.computeVertexNormals();

        const brainMat = new THREE.MeshStandardMaterial({
            color: 0x1a3a5c,
            roughness: 0.6,
            metalness: 0.1,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide,
            wireframe: false,
        });
        const brain = new THREE.Mesh(brainGeo, brainMat);
        scene.add(brain);

        // ── Tumor core ────────────────────────────────────────────────────────
        const tumorSize = volumeData
            ? Math.cbrt(volumeData.volume_cc / 200) * 0.6
            : 0.35;

        const tumorGeo = new THREE.IcosahedronGeometry(tumorSize, 3);
        const tPos = tumorGeo.attributes.position;
        for (let i = 0; i < tPos.count; i++) {
            const x = tPos.getX(i), y = tPos.getY(i), z = tPos.getZ(i);
            const n = 0.25 * Math.random();
            tPos.setXYZ(i, x * (1 + n), y * (1 + n), z * (1 + n));
        }
        tumorGeo.computeVertexNormals();

        // Therapy affects color: 0→red, high therapy→green
        const tumorColor = therapy >= 2 ? 0x00e676 : therapy >= 1 ? 0xffab40 : 0xff5252;
        const tumorMat = new THREE.MeshStandardMaterial({
            color: tumorColor,
            roughness: 0.3,
            metalness: 0.4,
            emmissive: tumorColor,
            emissiveIntensity: 0.5,
        });

        const tumor = new THREE.Mesh(tumorGeo, tumorMat);
        tumor.position.set(0.1, 0.05, 0.1);
        scene.add(tumor);

        // Glow sphere around tumor
        const glowGeo = new THREE.SphereGeometry(tumorSize * 1.8, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
            color: tumorColor,
            transparent: true,
            opacity: 0.08,
            side: THREE.BackSide,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(tumor.position);
        scene.add(glow);

        // ── Brain wireframe overlay ───────────────────────────────────────────
        const wireMat = new THREE.MeshBasicMaterial({
            color: 0x00c8ff, wireframe: true, transparent: true, opacity: 0.08,
        });
        scene.add(new THREE.Mesh(brainGeo.clone(), wireMat));

        // ── Ring grid (scan plane indicator) ─────────────────────────────────
        const ringGeo = new THREE.RingGeometry(1.1, 1.12, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00c8ff, side: THREE.DoubleSide, transparent: true, opacity: 0.25,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -0.05;
        scene.add(ring);

        // ── Animation ─────────────────────────────────────────────────────────
        let t = 0;
        const animate = () => {
            animRef.current = requestAnimationFrame(animate);
            t += 0.01;

            if (rotating) {
                brain.rotation.y += 0.005;
                tumor.rotation.y += 0.007;
                glow.rotation.y += 0.007;
                wireMat.opacity = 0.06 + Math.sin(t) * 0.02;
            }

            // Tumor pulse
            const s = 1 + 0.04 * Math.sin(t * 2);
            tumor.scale.set(s, s, s);
            glow.scale.set(s, s, s);

            renderer.render(scene, camera);
        };
        animate();

        // ── Responsive resize ─────────────────────────────────────────────────
        const onResize = () => {
            const W2 = mount.clientWidth;
            const H2 = mount.clientHeight;
            camera.aspect = W2 / H2;
            camera.updateProjectionMatrix();
            renderer.setSize(W2, H2);
        };
        window.addEventListener('resize', onResize);

        return () => {
            cancelAnimationFrame(animRef.current);
            window.removeEventListener('resize', onResize);
            renderer.dispose();
            if (mount.contains(renderer.domElement)) {
                mount.removeChild(renderer.domElement);
            }
        };
    }, [volumeData, therapy, rotating]);

    return (
        <div className="fade-in">
            <div className="section-header">
                <div>
                    <div className="section-title">3D Brain & Tumor Viewer</div>
                    <div className="section-subtitle">
                        Interactive 3D visualization — tumor shown relative to brain volume
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        className={`btn ${rotating ? 'btn-outline' : 'btn-ghost'}`}
                        onClick={() => setRotating(v => !v)}
                    >
                        {rotating ? '⏸ Pause' : '▶️ Rotate'}
                    </button>
                </div>
            </div>

            <div className="grid-2">
                {/* 3D Viewer */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div ref={mountRef} style={{ width: '100%', height: 480, borderRadius: 16 }} />
                </div>

                {/* Controls & Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="card">
                        <div className="card-title">Visualization Info</div>
                        <div className="stat-row">
                            <span className="stat-label">View Mode</span>
                            <span className="stat-value">3D Surface</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Brain Model</span>
                            <span className="stat-value">Icosahedral Mesh</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Tumor Volume</span>
                            <span className="stat-value" style={{ color: 'var(--cyan)' }}>
                                {volumeData ? `${volumeData.volume_cc?.toFixed(1)} cc` : 'Demo mode'}
                            </span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">AI Confidence</span>
                            <span className="stat-value" style={{ color: 'var(--green)' }}>
                                {volumeData?.segmentation?.confidence
                                    ? `${(volumeData.segmentation.confidence * 100).toFixed(0)}%`
                                    : 'N/A'}
                            </span>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-title">Therapy Visualization</div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                            Adjust therapy level to see predicted tumor response color:
                            🔴 Untreated → 🟡 Mild → 🟢 Aggressive
                        </p>
                        <input
                            type="range"
                            min={0} max={3} step={0.5}
                            value={therapy}
                            onChange={e => setTherapy(Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--cyan)', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                            <span>No Tx</span>
                            <span>Mild</span>
                            <span>Standard</span>
                            <span>Aggressive</span>
                        </div>
                        <div style={{ textAlign: 'center', marginTop: 12 }}>
                            <span className="badge badge-cyan">
                                Intensity: {therapy.toFixed(1)}
                            </span>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-title">Legend</div>
                        {[
                            { color: '#1a3a5c', label: 'Brain tissue' },
                            { color: '#00c8ff', label: 'Brain surface (wireframe)' },
                            { color: '#ff5252', label: 'Tumor (untreated)' },
                            { color: '#ffab40', label: 'Tumor (mild therapy)' },
                            { color: '#00e676', label: 'Tumor (aggressive therapy)' },
                        ].map(item => (
                            <div key={item.label} className="stat-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color }} />
                                    <span className="stat-label" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
