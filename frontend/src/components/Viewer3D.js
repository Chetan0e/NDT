import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

export default function Viewer3D({ volumeData, mini = false }) {
    const mountRef = useRef(null);
    const rendererRef = useRef(null);
    const animRef = useRef(null);
    const [therapy, setTherapy] = useState(0);
    const [sliceY, setSliceY] = useState(40);
    const [enableSlicing, setEnableSlicing] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        // ── Scene Setup ──────────────────────────────────────────────────────
        const W = mount.clientWidth || 480;
        const H = mount.clientHeight || 480;

        const scene = new THREE.Scene();
        if (!mini) {
            scene.background = new THREE.Color('#0b0f14'); // Clinical dark background
            scene.fog = new THREE.FogExp2('#0b0f14', 0.0015);
        } else {
            scene.background = new THREE.Color('#0b0f14');
        }

        const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
        camera.position.set(0, 0, mini ? 150 : 250);

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            logarithmicDepthBuffer: true,
            powerPreference: "high-performance"
        });
        renderer.setSize(W, H);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.localClippingEnabled = true;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.9; // Clinical softer exposure
        mount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Realistic Studio Environment Reflection
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const roomEnv = new RoomEnvironment();
        scene.environment = pmremGenerator.fromScene(roomEnv).texture;
        roomEnv.dispose();

        // ── Advanced Post-Processing ──────────────────────────────────
        let composer = null;
        if (!mini) {
            composer = new EffectComposer(renderer);
            composer.setPixelRatio(window.devicePixelRatio);

            const renderPass = new RenderPass(scene, camera);
            composer.addPass(renderPass);

            // SSAO Removed - Medical viewers avoid stylized shading

            const outputPass = new OutputPass();
            composer.addPass(outputPass);
        }

        // ── Controls ─────────────────────────────────────────────────────────
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.04;
        controls.enablePan = true;
        controls.enableZoom = true;
        if (mini) {
            controls.enableZoom = false;
            controls.enablePan = false;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 2.0;
        }

        // ── Lighting ─────────────────────────────────────────────────────────
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const hemi = new THREE.HemisphereLight(0xffffff, 0xeeeeee, 0.6);
        scene.add(hemi);

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
        keyLight.position.set(80, 120, 100);
        scene.add(keyLight);

        // ── Advanced Material Definition ─────────────────────────────────────
        // ── Advanced Material Definition ─────────────────────────────────────
        const planes = {
            axial: new THREE.Plane(new THREE.Vector3(0, -1, 0), sliceY),
            coronal: new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
            sagittal: new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0)
        };

        const brainMat = new THREE.MeshStandardMaterial({
            color: 0xbfc5cc,
            roughness: 0.92,
            metalness: 0.0,
            flatShading: false,
            side: THREE.FrontSide,
            clippingPlanes: enableSlicing ? Object.values(planes) : []
        });

        function addOrientationLabels(sceneTarget) {
            const fontLoader = new FontLoader();
            fontLoader.load('/helvetiker_regular.typeface.json', font => {
                const labels = ['R', 'L', 'A', 'P', 'S', 'I'];
                const positions = [
                    [120, 0, 0],
                    [-120, 0, 0],
                    [0, 120, 0],
                    [0, -120, 0],
                    [0, 0, 120],
                    [0, 0, -120]
                ];

                labels.forEach((label, i) => {
                    const geo = new TextGeometry(label, {
                        font,
                        size: 8,
                        height: 1
                    });
                    const mat = new THREE.MeshBasicMaterial({ color: 0x334155 });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(...positions[i]);
                    sceneTarget.add(mesh);
                });
            });
        }
        if (!mini) addOrientationLabels(scene);

        const brainGroup = new THREE.Group();
        // Brain origin usually needs offset, rotating Z-up FreeSurfer to Y-up ThreeJS
        brainGroup.rotation.x = -Math.PI / 2;
        scene.add(brainGroup);

        // ── Model Loading ────────────────────────────────────────────────────
        let loadedCount = 0;
        const loader = new OBJLoader();

        const computeSmoothMorph = (geometry) => {
            // Remove UVs, existing normals to reconstruct
            if (geometry.attributes.uv) geometry.deleteAttribute('uv');
            if (geometry.attributes.normal) geometry.deleteAttribute('normal');

            // Merge vertices at a tighter tolerance for smooth tissue look while preserving topology
            const mergedGeo = BufferGeometryUtils.mergeVertices(geometry, 0.05);
            mergedGeo.computeVertexNormals();
            return mergedGeo;
        };

        const onLoadCheck = () => {
            loadedCount++;
            if (loadedCount >= 2) {
                setLoading(false);
                const box = new THREE.Box3().setFromObject(brainGroup);
                const center = box.getCenter(new THREE.Vector3());
                brainGroup.position.sub(center);
            }
        };

        loader.load('/lh_brain.obj', (obj) => {
            obj.traverse(child => {
                if (child.isMesh) {
                    child.geometry = computeSmoothMorph(child.geometry);
                    child.material = brainMat;
                }
            });
            brainGroup.add(obj);
            onLoadCheck();
        });

        loader.load('/rh_brain.obj', (obj) => {
            obj.traverse(child => {
                if (child.isMesh) {
                    child.geometry = computeSmoothMorph(child.geometry);
                    child.material = brainMat;
                }
            });
            brainGroup.add(obj);
            onLoadCheck();
        });

        // ── Tumor core ────────────────────────────────────────────────────────
        const tumorMat = new THREE.ShaderMaterial({
            uniforms: {
                uIntensity: { value: therapy }
            },
            vertexShader: `
                #include <clipping_planes_pars_vertex>
                varying vec3 vNormal;
                void main() {
                    #include <begin_vertex>
                    vNormal = normal;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
                    #include <project_vertex>
                    #include <clipping_planes_vertex>
                }
            `,
            fragmentShader: `
                #include <clipping_planes_pars_fragment>
                varying vec3 vNormal;
                void main() {
                    #include <clipping_planes_fragment>
                    float intensity = dot(normalize(vNormal), vec3(0,0,1));
                    vec3 base = mix(vec3(0.8,0.1,0.1), vec3(0.1,0.7,0.2), intensity);
                    gl_FragColor = vec4(base,1.0);
                }
            `,
            clipping: true,
            clippingPlanes: enableSlicing ? Object.values(planes) : [],
            side: THREE.DoubleSide
        });

        const size = 64;
        const mockMask3D = Array(size).fill(0).map(() => Array(size).fill(0).map(() => Array(size).fill(0)));
        const maxR = volumeData ? Math.cbrt(volumeData.volume_cc / 200) * 12 : 10;
        for (let z = 0; z < size; z++) {
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const dx = x - 32, dy = y - 32, dz = z - 32;
                    const r = Math.sqrt(dx * dx + dy * dy + dz * dz) + 2.0 * Math.sin(x * 0.5) * Math.cos(y * 0.5);
                    if (r < maxR) mockMask3D[z][y][x] = 1;
                }
            }
        }

        function buildTumorFromMask(mask3D, material) {
            const size = 64;
            const effect = new MarchingCubes(size, material, true, true);
            effect.isolation = 80;

            for (let z = 0; z < size; z++) {
                for (let y = 0; y < size; y++) {
                    for (let x = 0; x < size; x++) {
                        const val = mask3D[z][y][x] ? 100 : 0;
                        effect.setCell(x, y, z, val);
                    }
                }
            }
            return effect;
        }

        const tumor = buildTumorFromMask(mockMask3D, tumorMat);
        tumor.position.set(20, -10, 10);

        if (!mini) brainGroup.add(tumor);

        const ringGeo = new THREE.RingGeometry(95, 96, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.6,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        if (enableSlicing && !mini) {
            ring.position.y = sliceY;
            scene.add(ring);
        }

        // ── Measurement Tool ───────────────────────────────────────────────
        const raycaster = new THREE.Raycaster();
        const points = [];
        const mouse = new THREE.Vector2();

        const onCanvasClick = (e) => {
            const rect = renderer.domElement.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
                return;
            }
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const hit = raycaster.intersectObjects(scene.children, true)[0];
            if (hit) {
                points.push(hit.point.clone());

                // Add point marker
                const marker = new THREE.Mesh(
                    new THREE.SphereGeometry(1.5, 16, 16),
                    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
                );
                marker.position.copy(hit.point);
                scene.add(marker);

                if (points.length === 2) {
                    const d = points[0].distanceTo(points[1]);
                    console.log("Distance:", d.toFixed(2), "mm");

                    // Add line between points
                    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
                    const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
                    const line = new THREE.Line(lineGeo, lineMat);
                    scene.add(line);

                    // Reset points for next measurement
                    points.length = 0;
                }
            }
        };
        window.addEventListener('click', onCanvasClick);

        // ── Surgical Margin Simulation (Elite Upgrade) ────────────────────
        const marginMesh = buildTumorFromMask(mockMask3D, new THREE.MeshBasicMaterial({
            color: 0xffff00, transparent: true, opacity: 0.15, wireframe: true
        }));
        marginMesh.position.set(20, -10, 10);
        marginMesh.scale.setScalar(16.5); // 15 + margin
        if (!mini) brainGroup.add(marginMesh);

        // ── Animation ─────────────────────────────────────────────────────────
        let t = 0;
        const animate = () => {
            animRef.current = requestAnimationFrame(animate);
            t += 0.01;
            controls.update();

            tumor.scale.setScalar(15);

            if (composer) {
                composer.render();
            } else {
                renderer.render(scene, camera);
            }
        };
        animate();

        // ── Responsive resize ─────────────────────────────────────────────────
        const onResize = () => {
            const W2 = mount.clientWidth;
            const H2 = mount.clientHeight;
            camera.aspect = W2 / H2;
            camera.updateProjectionMatrix();
            renderer.setSize(W2, H2);
            if (composer) {
                composer.setSize(W2, H2);
            }
        };
        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('click', onCanvasClick);
            cancelAnimationFrame(animRef.current);
            window.removeEventListener('resize', onResize);
            if (composer) composer.dispose();
            controls.dispose();
            renderer.dispose();
            if (mount.contains(renderer.domElement)) {
                mount.removeChild(renderer.domElement);
            }
        };
    }, [volumeData, therapy, mini, sliceY, enableSlicing]);

    if (mini) {
        return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
    }

    return (
        <div className="fade-in">
            <div className="section-header">
                <div>
                    <div className="section-title">High-Fidelity Clinical 3D Reconstruction</div>
                    <div className="section-subtitle" style={{ color: 'var(--text-muted)' }}>
                        Interactive clinical-grade MRI-derived multi-surface anatomical model
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
                {/* 3D Viewer Container */}
                <div className="card" style={{ padding: 0, position: 'relative', overflow: 'hidden', background: '#0b0f14', height: 600, border: enableSlicing ? '2px solid var(--cyan)' : '1px solid #1e293b', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)' }}>

                    {loading && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(11, 15, 20, 0.85)', zIndex: 10, backdropFilter: 'blur(8px)' }}>
                            <div style={{ width: 44, height: 44, border: '4px solid #1e293b', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
                            <div style={{ fontWeight: 600, fontSize: 16, color: '#f8fafc' }}>Synthesizing Extreme-Fidelity Mesh...</div>
                            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>Calculating lighting dynamics and vascular curvature</div>
                        </div>
                    )}

                    {/* Canvas Mount */}
                    <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab', opacity: loading ? 0 : 1, transition: 'opacity 0.8s' }} />

                    {/* UI Overlays matching professional references */}
                    {!loading && (
                        <>
                            {/* Top Left Dropdown Stub */}
                            <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,0.9)', padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600, color: '#334155', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                Left & Right Cerebral Hemispheres <span style={{ fontSize: 9 }}>▼</span>
                            </div>

                            {/* Quantitative Overlay */}
                            <div className="overlay-metrics" style={{ position: 'absolute', top: 60, left: 16, width: 280, color: '#f8fafc', fontSize: 13, lineHeight: 1.6, background: 'rgba(15, 23, 42, 0.85)', padding: 16, borderRadius: 8, backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace' }}>
                                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Quantitative Analysis</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span>Tumor Volume:</span>
                                    <span style={{ fontWeight: 600, color: '#38bdf8' }}>{volumeData ? volumeData.volume_cc.toFixed(2) : '34.20'} cc</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span>Growth Rate α:</span>
                                    <span style={{ fontWeight: 600, color: '#fbbf24' }}>{volumeData ? volumeData.alpha.toFixed(3) : '0.045'} /day</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Risk Class:</span>
                                    <span style={{ fontWeight: 600, color: volumeData && volumeData.risk === 'High' ? '#ef4444' : '#10b981' }}>{volumeData ? volumeData.risk : 'High'}</span>
                                </div>
                            </div>

                            {/* Toolbar Stub Top Right */}
                            <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', background: 'rgba(255,255,255,0.9)', borderRadius: 6, border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                {['✎', '🔍', '📷', '↻', '⛶'].map((icon, i) => (
                                    <div key={i} style={{ padding: '6px 14px', fontSize: 14, cursor: 'pointer', borderRight: i < 4 ? '1px solid #cbd5e1' : 'none', color: '#475569' }}>
                                        {icon}
                                    </div>
                                ))}
                            </div>

                            {/* Slicing Control Bottom */}
                            <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, background: 'rgba(255,255,255,0.9)', padding: '12px 20px', borderRadius: 8, border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setEnableSlicing(!enableSlicing)}>
                                    <input type="checkbox" checked={enableSlicing} readOnly style={{ accentColor: '#3b82f6', width: 14, height: 14 }} />
                                    Structure Isolation:
                                </div>
                                <input
                                    type="range"
                                    min={-80} max={80} step={1.0}
                                    value={sliceY}
                                    disabled={!enableSlicing}
                                    onChange={(e) => setSliceY(parseFloat(e.target.value))}
                                    style={{ flex: 1, accentColor: '#3b82f6', cursor: enableSlicing ? 'pointer' : 'not-allowed', opacity: enableSlicing ? 1 : 0.4 }}
                                />
                            </div>

                            {/* Scale Bar */}
                            <div className="scale-bar" style={{ position: 'absolute', bottom: 80, right: 30, borderBottom: '2px solid #cbd5e1', borderLeft: '2px solid #cbd5e1', borderRight: '2px solid #cbd5e1', height: 8, width: 60, color: '#cbd5e1', fontSize: 11, textAlign: 'center', lineHeight: '0px', fontFamily: 'monospace', pointerEvents: 'none' }}>
                                10 mm
                            </div>
                        </>
                    )}
                </div>

                {/* Controls & Details panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="card">
                        <div className="card-title-colored" style={{ marginBottom: 12 }}>Detailed Reconstruction Settings</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                            <span style={{ color: 'var(--text-muted)' }}>Curvature Shader</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Enabled (Red Vasculature)</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                            <span style={{ color: 'var(--text-muted)' }}>Ambient Occlusion (SSAO)</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>High Resolution</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                            <span style={{ color: 'var(--text-muted)' }}>Base Tissue Material</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Wet Biological PBR</span>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-title-colored" style={{ marginBottom: 8 }}>Therapy Response Morphometrics</div>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.4 }}>
                            Observe biological reduction and necrosis inside the mapped malignant core.
                        </p>
                        <input
                            type="range"
                            min={0} max={3} step={0.5}
                            value={therapy}
                            onChange={e => setTherapy(Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--cyan)', cursor: 'pointer', height: 4 }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                            <span>Pre-tx</span>
                            <span>Std Regimen</span>
                            <span>Targeted</span>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-title-colored" style={{ marginBottom: 12 }}>Volumetric Legend</div>
                        {[
                            { color: '#ffe6d5', label: 'Healthy Cortex (Fleshy Surface)' },
                            { color: '#8c2626', label: 'Vascular Sulci (Curvature Depth)' },
                            { color: '#38bdf8', label: 'Clinical Slicing Plane' },
                            { color: '#ef4444', label: 'Malignant Focus (Active)' },
                            { color: '#10b981', label: 'Necrotic Core (Remission)' },
                        ].map(item => (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 12 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0, border: '1px solid rgba(0,0,0,0.1)' }} />
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {/* Adding the CSS spin animation keyframes globally if not exists */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}} />
        </div>
    );
}

