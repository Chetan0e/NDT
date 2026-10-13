import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import {
    Ruler, Camera, RotateCw, Maximize2, Minimize2,
    Eye, EyeOff, Layers, Scissors, Split, Sparkles,
    Check, X, RefreshCw, ZoomIn, Info, Activity,
    Sliders, Compass, Download, ShieldCheck, AlertCircle,
    ChevronDown, Move
} from 'lucide-react';

// ── Custom GLSL Anatomical Brain Shaders ─────────────────────────────────────
const BRAIN_VERTEX_SHADER = `
    #include <clipping_planes_pars_vertex>
    attribute float sulcusDepth;
    attribute float lobeType;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    varying float vSulcusDepth;
    varying float vLobeType;

    void main() {
        #include <begin_vertex>
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vSulcusDepth = sulcusDepth;
        vLobeType = lobeType;
        gl_Position = projectionMatrix * mvPosition;
        #include <project_vertex>
        #include <clipping_planes_vertex>
    }
`;

const BRAIN_FRAGMENT_SHADER = `
    #include <clipping_planes_pars_fragment>
    uniform int uMode;        // 0: Anatomical Realistic, 1: Lobes, 2: Glass Brain, 3: Radiologic
    uniform float uOpacity;
    uniform float uSplit;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    varying float vSulcusDepth;
    varying float vLobeType;

    void main() {
        #include <clipping_planes_fragment>

        vec3 N = normalize(vNormal);
        vec3 V = normalize(vViewPosition);
        float NdotV = max(dot(N, V), 0.0);
        float fresnel = pow(1.0 - NdotV, 2.5);

        // Standard diffuse lighting with soft fill
        vec3 lightDir1 = normalize(vec3(0.5, 0.8, 0.6));
        vec3 lightDir2 = normalize(vec3(-0.6, -0.4, -0.5));
        float diff1 = max(dot(N, lightDir1), 0.0);
        float diff2 = max(dot(N, lightDir2), 0.0) * 0.35;
        float diffuse = diff1 + diff2 + 0.38;

        vec3 finalColor = vec3(0.85);

        if (uMode == 0) {
            // ── Mode 0: Clinical Anatomical Realistic ─────────────────────────
            // Warm living cortical tissue on gyri crests, deep rich vascular tone in sulci
            vec3 gyriColor = vec3(0.96, 0.91, 0.86);         // Warm fleshy cortical surface
            vec3 sulciColor = vec3(0.42, 0.14, 0.17);        // Rich vascular sulcal depth
            vec3 tissueColor = mix(gyriColor, sulciColor, clamp(vSulcusDepth * 0.82, 0.0, 1.0));

            // Soft biological rim lighting
            vec3 rimColor = vec3(0.85, 0.92, 1.0) * fresnel * 0.28;
            finalColor = tissueColor * diffuse + rimColor;
            gl_FragColor = vec4(finalColor, uOpacity);

        } else if (uMode == 1) {
            // ── Mode 1: Neuro-Anatomical Lobes Segmentation ───────────────────
            // Frontal (Cyan), Parietal (Amber), Temporal (Violet), Occipital (Rose), Medial (Emerald)
            vec3 lobeCol;
            if (vLobeType < 0.5) {
                lobeCol = vec3(0.06, 0.68, 0.92); // Frontal Lobe - Cyan
            } else if (vLobeType < 1.5) {
                lobeCol = vec3(0.96, 0.64, 0.12); // Parietal Lobe - Amber
            } else if (vLobeType < 2.5) {
                lobeCol = vec3(0.58, 0.38, 0.96); // Temporal Lobe - Purple
            } else if (vLobeType < 3.5) {
                lobeCol = vec3(0.96, 0.28, 0.42); // Occipital Lobe - Rose
            } else {
                lobeCol = vec3(0.10, 0.76, 0.54); // Medial / Limbic - Emerald
            }

            // Sulcal depth shading on lobes
            vec3 shadedLobe = mix(lobeCol, lobeCol * 0.45, vSulcusDepth * 0.55);
            vec3 rim = vec3(1.0) * fresnel * 0.25;
            finalColor = shadedLobe * diffuse + rim;
            gl_FragColor = vec4(finalColor, uOpacity);

        } else if (uMode == 2) {
            // ── Mode 2: Glass Brain / Hologram (X-Ray Intraoperative Mode) ────
            // Luminous transparent shell exposing deep glioblastoma core & margins
            vec3 glassEdge = vec3(0.22, 0.78, 0.98);
            vec3 glassBody = vec3(0.08, 0.25, 0.45);
            float edgeFactor = clamp(pow(1.0 - NdotV, 2.0) * 1.8 + 0.12, 0.0, 1.0);
            finalColor = mix(glassBody, glassEdge, edgeFactor);
            float alpha = edgeFactor * uOpacity;
            gl_FragColor = vec4(finalColor, alpha);

        } else {
            // ── Mode 3: Clinical Radiologic T1/T2 MRI Grayscale ───────────────
            float gray = mix(0.92, 0.22, vSulcusDepth);
            finalColor = vec3(gray) * diffuse;
            gl_FragColor = vec4(finalColor, uOpacity);
        }
    }
`;

// Helper: Procedural high-detail cortical hemisphere geometry fallback
function generateProceduralHemisphereGeometry(isLeft = true) {
    const geo = new THREE.SphereGeometry(62, 72, 72, 0, Math.PI, 0, Math.PI);
    geo.rotateY(isLeft ? Math.PI : 0);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        // Human brain ellipsoid proportions (Length > Height > Width)
        x *= 0.72;
        y *= 0.95;
        z *= 1.25;

        // Procedural gyri and sulci multi-frequency harmonics
        const g1 = Math.sin(x * 0.18) * Math.cos(y * 0.22) * Math.sin(z * 0.20) * 4.5;
        const g2 = Math.sin(x * 0.42 + 1.2) * Math.cos(z * 0.38) * 2.2;
        const g3 = Math.cos(y * 0.55) * Math.sin(z * 0.48) * 1.5;
        const disp = g1 + g2 + g3;

        pos.setXYZ(i, x + (x > 0 ? disp : -disp) * 0.3, y + disp * 0.4, z + disp * 0.5);
    }
    geo.computeVertexNormals();
    return geo;
}

export default function Viewer3D({ volumeData, mini = false }) {
    const mountRef = useRef(null);
    const containerRef = useRef(null);
    const sceneRefs = useRef(null);

    // ── Interactive State ─────────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState('anatomical'); // 'anatomical' | 'lobes' | 'xray' | 'wireframe' | 'radiologic'
    const [hemisphere, setHemisphere] = useState('both');    // 'both' | 'left' | 'right'
    const [splitDistance, setSplitDistance] = useState(0);   // 0 to 45 mm
    const [cortexOpacity, setCortexOpacity] = useState(1.0);  // 0.1 to 1.0
    const [enableSlicing, setEnableSlicing] = useState(false);
    const [sliceAxis, setSliceAxis] = useState('axial');     // 'axial' | 'coronal' | 'sagittal'
    const [slicePos, setSlicePos] = useState(15);            // mm position along axis
    const [therapy, setTherapy] = useState(0);               // 0: Pre-tx, 1: Std Stupp, 2: Targeted, 3: Remission
    const [marginDistance, setMarginDistance] = useState(15);// 10 to 20 mm
    const [autoRotate, setAutoRotate] = useState(mini);
    const [measureActive, setMeasureActive] = useState(false);
    const [measuredDistance, setMeasuredDistance] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(15);
    const [showLayers, setShowLayers] = useState(false);
    const [visibility, setVisibility] = useState({
        cortex: true,
        tumorCore: true,
        necroticZone: true,
        infiltration: true,
        margin: true,
        slicePlane: true,
        compass: true,
    });

    // ── Clinical Tumor Volume Calculations ────────────────────────────────────
    const baseVolumeCc = typeof volumeData?.volume_cc === 'number'
        ? volumeData.volume_cc
        : (typeof volumeData?.volume?.volume_cc === 'number' ? volumeData.volume.volume_cc : 52.8);

    // Therapy regression simulation
    const therapyReductionRatio = [0.0, 0.28, 0.62, 0.88][Math.min(therapy, 3)] || 0.0;
    const currentVolumeCc = Math.max(1.2, baseVolumeCc * (1.0 - therapyReductionRatio));
    const edemaVolumeCc = (currentVolumeCc * 1.65).toFixed(1);
    const necroticRatioPct = Math.min(65, Math.round(18 + therapy * 14));

    // ── Scene Initialization (Runs ONCE) ──────────────────────────────────────
    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        const W = mount.clientWidth || (mini ? 280 : 720);
        const H = mount.clientHeight || (mini ? 220 : 580);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(mini ? '#090d14' : '#070b12');
        if (!mini) {
            scene.fog = new THREE.FogExp2('#070b12', 0.0012);
        }

        const camera = new THREE.PerspectiveCamera(40, W / H, 1.0, 1500);
        camera.position.set(mini ? 0 : 60, mini ? 15 : 45, mini ? 165 : 240);

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: true, // Required for clean snapshot downloads
        });
        renderer.setSize(W, H);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.localClippingEnabled = true;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        mount.appendChild(renderer.domElement);

        // PMREM Room Environment for subtle organic reflections
        const pmrem = new THREE.PMREMGenerator(renderer);
        const roomEnv = new RoomEnvironment();
        scene.environment = pmrem.fromScene(roomEnv).texture;
        roomEnv.dispose();
        pmrem.dispose();

        // OrbitControls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enablePan = !mini;
        controls.enableZoom = !mini;
        controls.autoRotate = mini;
        controls.autoRotateSpeed = 1.8;
        controls.target.set(0, 0, 0);

        // ── Lighting Rig ──────────────────────────────────────────────────────
        const ambLight = new THREE.AmbientLight(0xffffff, 0.75);
        scene.add(ambLight);

        const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 0.85);
        scene.add(hemiLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
        keyLight.position.set(100, 160, 120);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
        fillLight.position.set(-120, -60, -90);
        scene.add(fillLight);

        const backRimLight = new THREE.DirectionalLight(0xa78bfa, 0.55);
        backRimLight.position.set(0, -120, 140);
        scene.add(backRimLight);

        // ── Clipping Planes ───────────────────────────────────────────────────
        const clippingPlanes = {
            axial: new THREE.Plane(new THREE.Vector3(0, -1, 0), 100),    // Superior-Inferior (Y in 3D)
            coronal: new THREE.Plane(new THREE.Vector3(0, 0, -1), 100),  // Anterior-Posterior (Z in 3D)
            sagittal: new THREE.Plane(new THREE.Vector3(-1, 0, 0), 100), // Left-Right (X in 3D)
        };

        // ── Brain Shaders & Materials ─────────────────────────────────────────
        const brainUniforms = {
            uMode: { value: 0 },
            uOpacity: { value: 1.0 },
            uSplit: { value: 0.0 },
        };

        const brainMat = new THREE.ShaderMaterial({
            vertexShader: BRAIN_VERTEX_SHADER,
            fragmentShader: BRAIN_FRAGMENT_SHADER,
            uniforms: brainUniforms,
            clipping: true,
            clippingPlanes: [],
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: true,
        });

        const brainWireMat = new THREE.MeshBasicMaterial({
            color: 0x0ea5e9,
            wireframe: true,
            transparent: true,
            opacity: 0.28,
            clippingPlanes: [],
        });

        // ── Scene Groups Hierarchy ───────────────────────────────────────────
        const rootGroup = new THREE.Group();
        scene.add(rootGroup);

        const brainGroup = new THREE.Group();
        // Rotate Z-up FreeSurfer coordinate system to ThreeJS Y-up
        brainGroup.rotation.x = -Math.PI / 2;
        rootGroup.add(brainGroup);

        const lhGroup = new THREE.Group();
        const rhGroup = new THREE.Group();
        brainGroup.add(lhGroup);
        brainGroup.add(rhGroup);

        const pathologyGroup = new THREE.Group();
        brainGroup.add(pathologyGroup);

        const caliperGroup = new THREE.Group();
        scene.add(caliperGroup);

        const sliceHelperGroup = new THREE.Group();
        scene.add(sliceHelperGroup);

        // ── Slicing Plane Helper Visualizer ──────────────────────────────────
        const slicePlaneGeo = new THREE.PlaneGeometry(175, 175);
        const slicePlaneMat = new THREE.MeshBasicMaterial({
            color: 0x0284c7,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.18,
            wireframe: false,
        });
        const slicePlaneMesh = new THREE.Mesh(slicePlaneGeo, slicePlaneMat);
        const sliceGrid = new THREE.GridHelper(175, 14, 0x38bdf8, 0x1e3a5f);
        sliceGrid.rotation.x = Math.PI / 2;
        slicePlaneMesh.add(sliceGrid);
        slicePlaneMesh.visible = false;
        sliceHelperGroup.add(slicePlaneMesh);

        // ── Pathology: Multi-Compartment Glioblastoma Tumor ──────────────────
        // Locus: Right fronto-parietal subcortical region (centered coords: x=24, y=14, z=18)
        const tumorLocus = new THREE.Vector3(24, 14, 18);
        pathologyGroup.position.copy(tumorLocus);

        // 1. Enhancing Tumor Core (Active Neoplasm)
        const coreGeo = new THREE.IcosahedronGeometry(14, 4);
        // Perturb vertices with organic nodular variance
        const cPos = coreGeo.attributes.position;
        for (let i = 0; i < cPos.count; i++) {
            const vx = cPos.getX(i);
            const vy = cPos.getY(i);
            const vz = cPos.getZ(i);
            const noise = Math.sin(vx * 0.35) * Math.cos(vy * 0.35) * Math.sin(vz * 0.35) * 3.8;
            cPos.setXYZ(i, vx + noise * 0.35, vy + noise * 0.4, vz + noise * 0.35);
        }
        coreGeo.computeVertexNormals();

        const tumorUniforms = {
            uTime: { value: 0 },
            uTherapy: { value: 0 },
        };

        const tumorCoreMat = new THREE.ShaderMaterial({
            uniforms: tumorUniforms,
            vertexShader: `
                #include <clipping_planes_pars_vertex>
                varying vec3 vNormal;
                varying vec3 vPos;
                void main() {
                    #include <begin_vertex>
                    vNormal = normalMatrix * normal;
                    vPos = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    #include <project_vertex>
                    #include <clipping_planes_vertex>
                }
            `,
            fragmentShader: `
                #include <clipping_planes_pars_fragment>
                uniform float uTime;
                uniform float uTherapy;
                varying vec3 vNormal;
                varying vec3 vPos;
                void main() {
                    #include <clipping_planes_fragment>
                    vec3 N = normalize(vNormal);
                    float diff = max(dot(N, vec3(0.5, 0.8, 0.6)), 0.0) * 0.7 + 0.3;
                    // Active hypervascular tumor core with metabolic perfusion pulse
                    float pulse = sin(uTime * 2.8 + vPos.y * 0.2) * 0.08 + 0.92;
                    vec3 activeRed = vec3(0.92, 0.15, 0.18);
                    vec3 necroGray = vec3(0.18, 0.35, 0.22);
                    vec3 col = mix(activeRed, necroGray, uTherapy * 0.32);
                    gl_FragColor = vec4(col * diff * pulse, 1.0);
                }
            `,
            clipping: true,
            side: THREE.DoubleSide,
        });
        const tumorCoreMesh = new THREE.Mesh(coreGeo, tumorCoreMat);
        pathologyGroup.add(tumorCoreMesh);

        // 2. Central Hypoxic Necrotic Core
        const necroGeo = new THREE.IcosahedronGeometry(8.5, 3);
        const necroMat = new THREE.MeshStandardMaterial({
            color: 0x064e3b, // Dark necrotic green-slate
            roughness: 0.9,
            metalness: 0.1,
            clippingPlanes: [],
        });
        const necroMesh = new THREE.Mesh(necroGeo, necroMat);
        pathologyGroup.add(necroMesh);

        // 3. Peritumoral Infiltration & Edema Halo (FLAIR Hyperintensity)
        const edemaGeo = new THREE.IcosahedronGeometry(22, 3);
        const edemaMat = new THREE.MeshStandardMaterial({
            color: 0xf59e0b, // Amber gold edema
            transparent: true,
            opacity: 0.22,
            roughness: 0.8,
            metalness: 0.0,
            depthWrite: false,
            clippingPlanes: [],
        });
        const edemaMesh = new THREE.Mesh(edemaGeo, edemaMat);
        pathologyGroup.add(edemaMesh);

        // 4. Surgical Resection Margin Safety Boundary
        const marginGeo = new THREE.IcosahedronGeometry(25, 2);
        const marginMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            wireframe: true,
            transparent: true,
            opacity: 0.32,
            clippingPlanes: [],
        });
        const marginMesh = new THREE.Mesh(marginGeo, marginMat);
        pathologyGroup.add(marginMesh);

        // ── Vertex Attribute Calculation (Sulcal Depth & Anatomical Lobes) ────
        const enrichBrainGeometry = (geometry, isLeft) => {
            // Merge vertices at tight tolerance for seamless shading
            const merged = BufferGeometryUtils.mergeVertices(geometry, 0.06);
            merged.computeVertexNormals();

            const posAttr = merged.attributes.position;
            const normAttr = merged.attributes.normal;
            const count = posAttr.count;

            const sulcusArray = new Float32Array(count);
            const lobeArray = new Float32Array(count);

            for (let i = 0; i < count; i++) {
                const x = posAttr.getX(i);
                const y = posAttr.getY(i);
                const z = posAttr.getZ(i);

                const nx = normAttr.getX(i);
                const ny = normAttr.getY(i);
                const nz = normAttr.getZ(i);

                // Compute radial outward vector
                const r = Math.sqrt(x * x + y * y + z * z) || 1.0;
                const rx = x / r;
                const ry = y / r;
                const rz = z / r;

                // Dot product of normal with radial direction
                const dotRadial = nx * rx + ny * ry + nz * rz;
                // Gyri face outwards (dotRadial ~ 0.8 to 1.0), sulci plunge inwards (dotRadial <= 0.4)
                const depth = Math.max(0.0, Math.min(1.0, (0.75 - dotRadial) * 1.6 + (1.0 - r / 75.0) * 0.7));
                sulcusArray[i] = depth;

                // ── Anatomical Lobes in FreeSurfer Coordinates ─────────────────
                // y: anterior (+)/posterior (-); z: superior (+)/inferior (-); x: left (-)/right (+)
                if (y > 10.0 && z > -15.0) {
                    lobeArray[i] = 0.0; // Frontal Lobe
                } else if (y <= 10.0 && y > -55.0 && z > 15.0) {
                    lobeArray[i] = 1.0; // Parietal Lobe
                } else if (z <= 15.0 && y > -55.0 && Math.abs(x) > 20.0) {
                    lobeArray[i] = 2.0; // Temporal Lobe
                } else if (y <= -55.0) {
                    lobeArray[i] = 3.0; // Occipital Lobe
                } else {
                    lobeArray[i] = 4.0; // Medial / Insular / Deep Cortex
                }
            }

            merged.setAttribute('sulcusDepth', new THREE.BufferAttribute(sulcusArray, 1));
            merged.setAttribute('lobeType', new THREE.BufferAttribute(lobeArray, 1));
            return merged;
        };

        // ── Load Clinical OBJ Models with Procedural Fallback ──────────────────
        let lhMesh = null;
        let rhMesh = null;
        let lhWire = null;
        let rhWire = null;
        let loadFinishedCount = 0;

        const checkCenterAndReady = () => {
            loadFinishedCount++;
            setLoadingProgress(Math.min(95, loadFinishedCount * 48));

            if (loadFinishedCount >= 2) {
                // Compute collective bounding box and center brain
                const box = new THREE.Box3().setFromObject(brainGroup);
                const center = box.getCenter(new THREE.Vector3());
                // Center the group at origin
                lhGroup.position.sub(center);
                rhGroup.position.sub(center);
                pathologyGroup.position.sub(center);

                setLoading(false);
                setLoadingProgress(100);
            }
        };

        const setupHemisphereMesh = (geo, isLeft) => {
            const enriched = enrichBrainGeometry(geo, isLeft);
            const mesh = new THREE.Mesh(enriched, brainMat);
            const wire = new THREE.Mesh(enriched, brainWireMat);
            wire.visible = false;

            const targetGroup = isLeft ? lhGroup : rhGroup;
            targetGroup.add(mesh);
            targetGroup.add(wire);

            if (isLeft) {
                lhMesh = mesh;
                lhWire = wire;
            } else {
                rhMesh = mesh;
                rhWire = wire;
            }
            checkCenterAndReady();
        };

        const objLoader = new OBJLoader();

        // Load Left Hemisphere
        objLoader.load(
            '/lh_brain.obj',
            (obj) => {
                let found = false;
                obj.traverse(child => {
                    if (child.isMesh && !found) {
                        found = true;
                        setupHemisphereMesh(child.geometry, true);
                    }
                });
                if (!found) setupHemisphereMesh(generateProceduralHemisphereGeometry(true), true);
            },
            undefined,
            () => {
                // Fallback to high-detail procedural hemisphere
                setupHemisphereMesh(generateProceduralHemisphereGeometry(true), true);
            }
        );

        // Load Right Hemisphere
        objLoader.load(
            '/rh_brain.obj',
            (obj) => {
                let found = false;
                obj.traverse(child => {
                    if (child.isMesh && !found) {
                        found = true;
                        setupHemisphereMesh(child.geometry, false);
                    }
                });
                if (!found) setupHemisphereMesh(generateProceduralHemisphereGeometry(false), false);
            },
            undefined,
            () => {
                // Fallback to high-detail procedural hemisphere
                setupHemisphereMesh(generateProceduralHemisphereGeometry(false), false);
            }
        );

        // ── Caliper Measurement System ────────────────────────────────────────
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const measurePoints = [];
        let caliperLine = null;
        const caliperMarkers = [];

        const clearCaliper = () => {
            measurePoints.length = 0;
            while (caliperGroup.children.length > 0) {
                const child = caliperGroup.children[0];
                caliperGroup.remove(child);
                if (child.geometry) child.geometry.dispose();
            }
            caliperMarkers.length = 0;
            caliperLine = null;
            setMeasuredDistance(null);
        };

        const onCanvasPointerDown = (e) => {
            if (!sceneRefs.current?.measureActive) return;

            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects([rootGroup], true);

            if (intersects.length > 0) {
                const hit = intersects[0];
                measurePoints.push(hit.point.clone());

                // Create glowing point marker
                const pGeo = new THREE.SphereGeometry(2.0, 16, 16);
                const pMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
                const marker = new THREE.Mesh(pGeo, pMat);
                marker.position.copy(hit.point);
                caliperGroup.add(marker);
                caliperMarkers.push(marker);

                if (measurePoints.length === 2) {
                    const dist = measurePoints[0].distanceTo(measurePoints[1]);
                    setMeasuredDistance(dist.toFixed(1));

                    // Create laser caliper line
                    const lineGeo = new THREE.BufferGeometry().setFromPoints(measurePoints);
                    const lineMat = new THREE.LineDashedMaterial({
                        color: 0x38bdf8,
                        dashSize: 3,
                        gapSize: 1.5,
                        linewidth: 2,
                    });
                    caliperLine = new THREE.Line(lineGeo, lineMat);
                    caliperLine.computeLineDistances();
                    caliperGroup.add(caliperLine);

                    // Stop caliper mode after measuring two points
                    sceneRefs.current.measureActive = false;
                    setMeasureActive(false);
                    controls.enabled = true;
                }
            }
        };

        renderer.domElement.addEventListener('pointerdown', onCanvasPointerDown);

        // ── Animation Loop ───────────────────────────────────────────────────
        let clock = new THREE.Clock();
        let animId = null;

        const animate = () => {
            animId = requestAnimationFrame(animate);
            const delta = clock.getDelta();
            const elapsed = clock.getElapsedTime();

            controls.update();

            // Animate tumor metabolic pulse
            tumorUniforms.uTime.value = elapsed;

            renderer.render(scene, camera);
        };
        animate();

        // ── Window Resize Handler ─────────────────────────────────────────────
        const handleResize = () => {
            if (!mount) return;
            const w = mount.clientWidth;
            const h = mount.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        // Save references for dynamic state updates
        sceneRefs.current = {
            scene,
            camera,
            renderer,
            controls,
            rootGroup,
            brainGroup,
            lhGroup,
            rhGroup,
            lhMesh: () => lhMesh,
            rhMesh: () => rhMesh,
            lhWire: () => lhWire,
            rhWire: () => rhWire,
            brainMat,
            brainWireMat,
            brainUniforms,
            clippingPlanes,
            slicePlaneMesh,
            pathologyGroup,
            tumorCoreMesh,
            tumorUniforms,
            necroMesh,
            edemaMesh,
            marginMesh,
            clearCaliper,
            measureActive: false,
            animId,
            destroy: () => {
                cancelAnimationFrame(animId);
                window.removeEventListener('resize', handleResize);
                renderer.domElement.removeEventListener('pointerdown', onCanvasPointerDown);
                controls.dispose();
                renderer.dispose();
                if (mount.contains(renderer.domElement)) {
                    mount.removeChild(renderer.domElement);
                }
            }
        };

        return () => {
            sceneRefs.current?.destroy();
        };
    }, [mini]);

    // ── Dynamic Updates (Runs WITHOUT re-creating scene) ──────────────────────

    // 1. Update View Mode (Shading & Materials)
    useEffect(() => {
        if (!sceneRefs.current) return;
        const { brainUniforms, lhMesh, rhMesh, lhWire, rhWire, brainMat } = sceneRefs.current;

        const modeMap = {
            anatomical: 0,
            lobes: 1,
            xray: 2,
            radiologic: 3,
        };

        const isWire = viewMode === 'wireframe';
        const lm = lhMesh();
        const rm = rhMesh();
        const lw = lhWire();
        const rw = rhWire();

        if (lm) lm.visible = !isWire;
        if (rm) rm.visible = !isWire;
        if (lw) lw.visible = isWire;
        if (rw) rw.visible = isWire;

        if (!isWire) {
            brainUniforms.uMode.value = modeMap[viewMode] ?? 0;
            // X-Ray mode defaults to translucent cortex
            if (viewMode === 'xray') {
                brainMat.depthWrite = false;
            } else {
                brainMat.depthWrite = cortexOpacity > 0.85;
            }
        }
    }, [viewMode, cortexOpacity]);

    // 2. Update Cortex Opacity
    useEffect(() => {
        if (!sceneRefs.current) return;
        const { brainUniforms, brainMat } = sceneRefs.current;
        brainUniforms.uOpacity.value = cortexOpacity;
        brainMat.depthWrite = cortexOpacity > 0.85;
    }, [cortexOpacity]);

    // 3. Update Hemispheres & Exploded Split Distance
    useEffect(() => {
        if (!sceneRefs.current) return;
        const { lhGroup, rhGroup } = sceneRefs.current;

        // Visibility
        lhGroup.visible = (hemisphere === 'both' || hemisphere === 'left') && visibility.cortex;
        rhGroup.visible = (hemisphere === 'both' || hemisphere === 'right') && visibility.cortex;

        // Exploded interhemispheric split along X
        const splitX = hemisphere === 'both' ? splitDistance : 0;
        lhGroup.position.x = -splitX;
        rhGroup.position.x = splitX;
    }, [hemisphere, splitDistance, visibility.cortex]);

    // 4. Update Multi-Planar Slicing (MPR)
    useEffect(() => {
        if (!sceneRefs.current) return;
        const { clippingPlanes, brainMat, brainWireMat, slicePlaneMesh } = sceneRefs.current;

        if (!enableSlicing) {
            brainMat.clippingPlanes = [];
            brainWireMat.clippingPlanes = [];
            slicePlaneMesh.visible = false;
            return;
        }

        // Active plane according to selected axis
        let activePlane = null;
        if (sliceAxis === 'axial') {
            activePlane = clippingPlanes.axial;
            activePlane.normal.set(0, -1, 0); // Cuts superior to inferior
            activePlane.constant = slicePos;
            slicePlaneMesh.rotation.set(-Math.PI / 2, 0, 0);
            slicePlaneMesh.position.set(0, slicePos, 0);
        } else if (sliceAxis === 'coronal') {
            activePlane = clippingPlanes.coronal;
            activePlane.normal.set(0, 0, -1); // Cuts anterior to posterior
            activePlane.constant = slicePos;
            slicePlaneMesh.rotation.set(0, 0, 0);
            slicePlaneMesh.position.set(0, 0, slicePos);
        } else {
            activePlane = clippingPlanes.sagittal;
            activePlane.normal.set(-1, 0, 0); // Cuts left to right
            activePlane.constant = slicePos;
            slicePlaneMesh.rotation.set(0, Math.PI / 2, 0);
            slicePlaneMesh.position.set(slicePos, 0, 0);
        }

        brainMat.clippingPlanes = [activePlane];
        brainWireMat.clippingPlanes = [activePlane];
        slicePlaneMesh.visible = visibility.slicePlane;
    }, [enableSlicing, sliceAxis, slicePos, visibility.slicePlane]);

    // 5. Update Tumor Pathology & Therapy Regression Simulation
    useEffect(() => {
        if (!sceneRefs.current) return;
        const { tumorCoreMesh, necroMesh, edemaMesh, marginMesh, tumorUniforms } = sceneRefs.current;

        // Volume scale factor
        const volScale = Math.cbrt(currentVolumeCc / 52.8);

        // Core shrinks with therapy
        tumorCoreMesh.scale.setScalar(volScale);
        tumorUniforms.uTherapy.value = therapy;

        // Necrotic core collapses or cavitates
        necroMesh.scale.setScalar(volScale * (0.85 + therapy * 0.15));

        // Edema zone shrinks significantly with targeted treatment
        const edemaScale = volScale * (1.0 - therapy * 0.18);
        edemaMesh.scale.setScalar(edemaScale);

        // Surgical safety margin scale
        const marginScale = volScale * (1.0 + marginDistance / 20.0);
        marginMesh.scale.setScalar(marginScale);

        // Layer visibility
        tumorCoreMesh.visible = visibility.tumorCore;
        necroMesh.visible = visibility.necroticZone;
        edemaMesh.visible = visibility.infiltration;
        marginMesh.visible = visibility.margin;
    }, [currentVolumeCc, therapy, marginDistance, visibility]);

    // 6. Update Auto-Rotate
    useEffect(() => {
        if (!sceneRefs.current) return;
        sceneRefs.current.controls.autoRotate = autoRotate;
    }, [autoRotate]);

    // 7. Update Caliper Mode
    useEffect(() => {
        if (!sceneRefs.current) return;
        sceneRefs.current.measureActive = measureActive;
        if (measureActive) {
            sceneRefs.current.controls.enabled = false;
        } else {
            sceneRefs.current.controls.enabled = true;
        }
    }, [measureActive]);

    // ── Functional Medical Actions ────────────────────────────────────────────

    // Camera preset orientation tweening
    const setAnatomicalView = useCallback((preset) => {
        if (!sceneRefs.current) return;
        const { camera, controls } = sceneRefs.current;
        controls.reset();

        const dist = 240;
        if (preset === 'axial') {
            // Superior / Top-Down View
            camera.position.set(0, dist, 0);
            camera.up.set(0, 0, -1);
        } else if (preset === 'coronal') {
            // Anterior / Frontal View
            camera.position.set(0, 0, dist);
            camera.up.set(0, 1, 0);
        } else if (preset === 'sagittal_l') {
            // Sagittal Left View
            camera.position.set(-dist, 0, 0);
            camera.up.set(0, 1, 0);
        } else if (preset === 'sagittal_r') {
            // Sagittal Right View
            camera.position.set(dist, 0, 0);
            camera.up.set(0, 1, 0);
        } else {
            // Isometric 3D
            camera.position.set(130, 95, 170);
            camera.up.set(0, 1, 0);
        }
        controls.target.set(0, 0, 0);
        controls.update();
    }, []);

    // High-Resolution Snapshot with Clinical Report Watermark
    const handleDownloadSnapshot = useCallback(() => {
        if (!sceneRefs.current) return;
        const { renderer } = sceneRefs.current;

        const glCanvas = renderer.domElement;
        const offCanvas = document.createElement('canvas');
        offCanvas.width = glCanvas.width;
        offCanvas.height = glCanvas.height;
        const ctx = offCanvas.getContext('2d');

        // Draw WebGL scene
        ctx.drawImage(glCanvas, 0, 0);

        // Draw Clinical Watermark Banner
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        ctx.fillStyle = 'rgba(7, 11, 18, 0.88)';
        ctx.fillRect(16, 16, 440, 90);
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(16, 16, 440, 90);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 15px monospace';
        ctx.fillText('NEURODIGITAL TWIN | 3D SURGICAL RECONSTRUCTION', 32, 42);

        ctx.fillStyle = '#f8fafc';
        ctx.font = '12px monospace';
        ctx.fillText(`Patient ID: #NDT-001 | Vol: ${currentVolumeCc.toFixed(1)} cc`, 32, 64);
        ctx.fillText(`View: ${viewMode.toUpperCase()} | Time: ${now} UTC`, 32, 84);

        // Scale bar in bottom right
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(offCanvas.width - 120, offCanvas.height - 30);
        ctx.lineTo(offCanvas.width - 40, offCanvas.height - 30);
        ctx.stroke();
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px monospace';
        ctx.fillText('20 mm Scale', offCanvas.width - 110, offCanvas.height - 38);

        // Download PNG
        const link = document.createElement('a');
        link.download = `NDT_3D_Reconstruction_${Date.now()}.png`;
        link.href = offCanvas.toDataURL('image/png');
        link.click();
    }, [currentVolumeCc, viewMode]);

    // Fullscreen Viewport Toggle
    const handleToggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(() => {});
            setIsFullscreen(false);
        }
    };

    // ── Mini Mode (Dashboard Thumbnail) ───────────────────────────────────────
    if (mini) {
        return (
            <div
                ref={mountRef}
                style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    background: '#090d14',
                    borderRadius: 8,
                    overflow: 'hidden'
                }}
            >
                {loading && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#090d14',
                        color: '#38bdf8',
                        fontSize: 11,
                        fontFamily: 'monospace'
                    }}>
                        Loading 3D Twin...
                    </div>
                )}
            </div>
        );
    }

    // ── Full Clinical Workstation ─────────────────────────────────────────────
    return (
        <div className="fade-in" ref={containerRef}>
            {/* Header */}
            <div className="section-header" style={{ marginBottom: 16 }}>
                <div>
                    <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Sparkles size={22} color="var(--cyan)" />
                        Clinical High-Fidelity 3D Neuro-Reconstruction
                    </div>
                    <div className="section-subtitle" style={{ color: 'var(--text-muted)' }}>
                        Interactive multi-surface cortical segmentation, intraoperative multi-planar MPR, and glioblastoma digital twin
                    </div>
                </div>
            </div>

            {/* Main Workstation Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: 18 }}>
                
                {/* 3D Canvas Container */}
                <div
                    className="card"
                    style={{
                        padding: 0,
                        position: 'relative',
                        overflow: 'hidden',
                        background: '#070b12',
                        height: isFullscreen ? '100vh' : 630,
                        border: enableSlicing ? '2px solid #0284c7' : '1px solid #1e293b',
                        borderRadius: 14,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                        cursor: measureActive ? 'crosshair' : 'grab',
                    }}
                >
                    {/* Loading Screen */}
                    {loading && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(7, 11, 18, 0.94)',
                            zIndex: 30,
                            backdropFilter: 'blur(8px)',
                        }}>
                            <div style={{
                                width: 52,
                                height: 52,
                                border: '4px solid #1e293b',
                                borderTopColor: '#0284c7',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                marginBottom: 16
                            }} />
                            <div style={{ fontWeight: 600, fontSize: 16, color: '#f8fafc', letterSpacing: 0.5 }}>
                                Synthesizing High-Fidelity Cortical Geometry...
                            </div>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, fontFamily: 'monospace' }}>
                                Computing sulcal depth vectors & multi-compartment glioblastoma model ({loadingProgress}%)
                            </div>
                        </div>
                    )}

                    {/* Canvas Mount */}
                    <div
                        ref={mountRef}
                        style={{
                            width: '100%',
                            height: '100%',
                            opacity: loading ? 0 : 1,
                            transition: 'opacity 0.6s ease',
                        }}
                    />

                    {/* ══ Overlay 1: Top-Left Hemispheres & Exploded Split ═══════ */}
                    {!loading && (
                        <div style={{
                            position: 'absolute',
                            top: 14,
                            left: 14,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            background: 'rgba(15, 23, 42, 0.88)',
                            padding: '6px 10px',
                            borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.12)',
                            backdropFilter: 'blur(10px)',
                            zIndex: 10,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>Structure:</span>
                            <div style={{ display: 'flex', background: 'rgba(30, 41, 59, 0.8)', borderRadius: 6, padding: 2 }}>
                                {[
                                    { id: 'both', label: 'Bilateral' },
                                    { id: 'left', label: 'LH Only' },
                                    { id: 'right', label: 'RH Only' },
                                ].map(btn => (
                                    <button
                                        key={btn.id}
                                        onClick={() => setHemisphere(btn.id)}
                                        style={{
                                            border: 'none',
                                            background: hemisphere === btn.id ? '#0284c7' : 'transparent',
                                            color: hemisphere === btn.id ? '#ffffff' : '#94a3b8',
                                            padding: '4px 8px',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ══ Overlay 2: Top-Right Functional Medical Toolbar ════════ */}
                    {!loading && (
                        <div style={{
                            position: 'absolute',
                            top: 14,
                            right: 14,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            background: 'rgba(15, 23, 42, 0.88)',
                            padding: '4px 6px',
                            borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.12)',
                            backdropFilter: 'blur(10px)',
                            zIndex: 10,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        }}>
                            {/* Measure Calipers */}
                            <button
                                title={measureActive ? "Click 2 points on model to measure" : "Calipers: Measure distance (mm)"}
                                onClick={() => {
                                    if (measureActive) {
                                        sceneRefs.current?.clearCaliper();
                                    }
                                    setMeasureActive(!measureActive);
                                }}
                                style={{
                                    border: 'none',
                                    background: measureActive ? '#0284c7' : 'transparent',
                                    color: measureActive ? '#ffffff' : '#cbd5e1',
                                    padding: '6px 8px',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    fontSize: 12,
                                    fontWeight: 600,
                                }}
                            >
                                <Ruler size={15} />
                                {measureActive ? 'Measuring...' : 'Measure'}
                            </button>

                            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />

                            {/* Camera Presets Selector */}
                            <div style={{ display: 'flex', gap: 2 }}>
                                {[
                                    { id: 'axial', label: 'AX', title: 'Axial (Superior)' },
                                    { id: 'coronal', label: 'COR', title: 'Coronal (Anterior)' },
                                    { id: 'sagittal_l', label: 'SAG', title: 'Sagittal (Left)' },
                                    { id: 'iso', label: '3D', title: 'Isometric 3D' },
                                ].map(preset => (
                                    <button
                                        key={preset.id}
                                        title={preset.title}
                                        onClick={() => setAnatomicalView(preset.id)}
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            color: '#94a3b8',
                                            padding: '4px 6px',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            fontFamily: 'monospace',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.color = '#38bdf8'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>

                            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />

                            {/* Auto-Rotate */}
                            <button
                                title={autoRotate ? "Pause Turntable" : "Start Auto-Rotate Turntable"}
                                onClick={() => setAutoRotate(!autoRotate)}
                                style={{
                                    border: 'none',
                                    background: autoRotate ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                                    color: autoRotate ? '#38bdf8' : '#cbd5e1',
                                    padding: '6px 8px',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                }}
                            >
                                <RotateCw size={15} />
                            </button>

                            {/* Download Snapshot */}
                            <button
                                title="Download High-Res Clinical Snapshot (PNG)"
                                onClick={handleDownloadSnapshot}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#cbd5e1',
                                    padding: '6px 8px',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#38bdf8'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = '#cbd5e1'; }}
                            >
                                <Camera size={15} />
                            </button>

                            {/* Layers Toggle */}
                            <button
                                title="Toggle Layer Visibility"
                                onClick={() => setShowLayers(!showLayers)}
                                style={{
                                    border: 'none',
                                    background: showLayers ? '#0284c7' : 'transparent',
                                    color: showLayers ? '#ffffff' : '#cbd5e1',
                                    padding: '6px 8px',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                }}
                            >
                                <Layers size={15} />
                            </button>

                            {/* Fullscreen */}
                            <button
                                title="Toggle Fullscreen"
                                onClick={handleToggleFullscreen}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#cbd5e1',
                                    padding: '6px 8px',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                }}
                            >
                                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                            </button>
                        </div>
                    )}

                    {/* ══ Overlay 3: Layers Dropdown Popover ═════════════════════ */}
                    {showLayers && (
                        <div style={{
                            position: 'absolute',
                            top: 56,
                            right: 14,
                            width: 220,
                            background: 'rgba(15, 23, 42, 0.95)',
                            padding: 12,
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.12)',
                            backdropFilter: 'blur(12px)',
                            zIndex: 25,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
                                Anatomical Layers
                            </div>
                            {[
                                { key: 'cortex', label: 'Cerebral Cortex' },
                                { key: 'tumorCore', label: 'Active Tumor Core' },
                                { key: 'necroticZone', label: 'Hypoxic Necrosis' },
                                { key: 'infiltration', label: 'FLAIR Edema Halo' },
                                { key: 'margin', label: 'Resection Margin' },
                                { key: 'slicePlane', label: 'Cutting Plane Grid' },
                            ].map(item => (
                                <label
                                    key={item.key}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        fontSize: 12,
                                        color: '#f8fafc',
                                        marginBottom: 6,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={visibility[item.key]}
                                        onChange={(e) => setVisibility({ ...visibility, [item.key]: e.target.checked })}
                                        style={{ accentColor: '#0284c7' }}
                                    />
                                    {item.label}
                                </label>
                            ))}
                        </div>
                    )}

                    {/* ══ Overlay 4: Live Quantitative Medical Metrics ═══════════ */}
                    {!loading && (
                        <div style={{
                            position: 'absolute',
                            bottom: enableSlicing ? 80 : 16,
                            left: 14,
                            width: 260,
                            background: 'rgba(15, 23, 42, 0.88)',
                            padding: '12px 14px',
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(10px)',
                            zIndex: 10,
                            fontFamily: 'monospace',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                            transition: 'bottom 0.2s ease',
                        }}>
                            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                                Quantitative Morphometry
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                                <span style={{ color: '#cbd5e1' }}>Gross Tumor (GTV):</span>
                                <span style={{ fontWeight: 700, color: '#38bdf8' }}>{currentVolumeCc.toFixed(1)} cc</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                                <span style={{ color: '#cbd5e1' }}>Edema/FLAIR:</span>
                                <span style={{ fontWeight: 600, color: '#f59e0b' }}>{edemaVolumeCc} cc</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                                <span style={{ color: '#cbd5e1' }}>Necrotic Ratio:</span>
                                <span style={{ fontWeight: 600, color: '#10b981' }}>{necroticRatioPct}%</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: '#cbd5e1' }}>Safety Clearance:</span>
                                <span style={{ fontWeight: 600, color: '#38bdf8' }}>{marginDistance} mm (Safe)</span>
                            </div>
                        </div>
                    )}

                    {/* ══ Overlay 5: Caliper Measurement HUD Badge ═══════════════ */}
                    {measuredDistance !== null && (
                        <div style={{
                            position: 'absolute',
                            top: 64,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'rgba(2, 132, 199, 0.95)',
                            padding: '8px 16px',
                            borderRadius: 20,
                            color: '#ffffff',
                            fontSize: 13,
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            boxShadow: '0 4px 20px rgba(2, 132, 199, 0.4)',
                            zIndex: 15,
                        }}>
                            <span>📏 Distance: {measuredDistance} mm</span>
                            <button
                                onClick={() => sceneRefs.current?.clearCaliper()}
                                style={{
                                    border: 'none',
                                    background: 'rgba(255,255,255,0.25)',
                                    color: '#ffffff',
                                    borderRadius: '50%',
                                    width: 18,
                                    height: 18,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: 11,
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {/* ══ Overlay 6: Slicing Plane MPR Controls ══════════════════ */}
                    {!loading && enableSlicing && (
                        <div style={{
                            position: 'absolute',
                            bottom: 14,
                            left: 14,
                            right: 14,
                            background: 'rgba(15, 23, 42, 0.92)',
                            padding: '10px 16px',
                            borderRadius: 10,
                            border: '1px solid #0284c7',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            backdropFilter: 'blur(10px)',
                            zIndex: 15,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>
                                <Scissors size={15} />
                                Multi-Planar Slice:
                            </div>

                            {/* Slice Axis Selector */}
                            <div style={{ display: 'flex', background: 'rgba(30, 41, 59, 0.8)', borderRadius: 6, padding: 2 }}>
                                {[
                                    { id: 'axial', label: 'Axial' },
                                    { id: 'coronal', label: 'Coronal' },
                                    { id: 'sagittal', label: 'Sagittal' },
                                ].map(axis => (
                                    <button
                                        key={axis.id}
                                        onClick={() => setSliceAxis(axis.id)}
                                        style={{
                                            border: 'none',
                                            background: sliceAxis === axis.id ? '#0284c7' : 'transparent',
                                            color: sliceAxis === axis.id ? '#ffffff' : '#94a3b8',
                                            padding: '4px 10px',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {axis.label}
                                    </button>
                                ))}
                            </div>

                            {/* Position Slider */}
                            <input
                                type="range"
                                min={-65}
                                max={65}
                                step={1}
                                value={slicePos}
                                onChange={(e) => setSlicePos(parseFloat(e.target.value))}
                                style={{ flex: 1, accentColor: '#0284c7', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#f8fafc', minWidth: 60, textAlign: 'right' }}>
                                {slicePos > 0 ? `+${slicePos}` : slicePos} mm
                            </span>
                        </div>
                    )}

                    {/* Scale Reference Bar */}
                    <div style={{
                        position: 'absolute',
                        bottom: enableSlicing ? 80 : 20,
                        right: 20,
                        borderBottom: '2px solid #64748b',
                        borderLeft: '2px solid #64748b',
                        borderRight: '2px solid #64748b',
                        height: 6,
                        width: 70,
                        color: '#94a3b8',
                        fontSize: 10,
                        textAlign: 'center',
                        lineHeight: '0px',
                        fontFamily: 'monospace',
                        pointerEvents: 'none',
                    }}>
                        20 mm
                    </div>
                </div>

                {/* ══ Right Panel: Clinical Controls & Surgical Settings ════════ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    
                    {/* Card 1: Anatomical View Mode Selector */}
                    <div className="card">
                        <div className="card-title-colored" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Layers size={16} />
                            Anatomical Shading & View Modes
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 12 }}>
                            {[
                                { id: 'anatomical', label: 'Clinical Realistic', desc: 'Living cortex & sulci depth' },
                                { id: 'lobes', label: 'Cortical Lobes', desc: 'Frontal/Parietal/Temporal' },
                                { id: 'xray', label: 'Glass Brain (X-Ray)', desc: 'Transparent tumor view' },
                                { id: 'wireframe', label: 'Digital Twin Mesh', desc: 'Cyber-neuro lattice' },
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setViewMode(item.id)}
                                    style={{
                                        border: viewMode === item.id ? '1.5px solid #0284c7' : '1px solid var(--border)',
                                        background: viewMode === item.id ? 'rgba(2, 132, 199, 0.08)' : 'var(--bg-input)',
                                        borderRadius: 8,
                                        padding: '8px 10px',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    <div style={{ fontSize: 12, fontWeight: 700, color: viewMode === item.id ? '#0284c7' : 'var(--text-primary)' }}>
                                        {item.label}
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                        {item.desc}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Cortex Transparency Slider */}
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                                <span style={{ color: 'var(--text-muted)' }}>Cortex Transparency:</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{Math.round(cortexOpacity * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min={0.08}
                                max={1.0}
                                step={0.02}
                                value={cortexOpacity}
                                onChange={(e) => setCortexOpacity(parseFloat(e.target.value))}
                                style={{ width: '100%', accentColor: 'var(--cyan)', cursor: 'pointer' }}
                            />
                        </div>

                        {/* Interhemispheric Exploded Split Slider */}
                        {hemisphere === 'both' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Interhemispheric Fissure Split:</span>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>+{splitDistance} mm</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={40}
                                    step={1}
                                    value={splitDistance}
                                    onChange={(e) => setSplitDistance(parseInt(e.target.value, 10))}
                                    style={{ width: '100%', accentColor: 'var(--cyan)', cursor: 'pointer' }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Card 2: Dynamic Therapy Simulation */}
                    <div className="card">
                        <div className="card-title-colored" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Activity size={16} />
                            Digital Twin Therapy Simulator
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.4 }}>
                            Simulate longitudinal glioblastoma response to targeted oncological protocols in real-time.
                        </p>

                        <div style={{ marginBottom: 12 }}>
                            <input
                                type="range"
                                min={0}
                                max={3}
                                step={1}
                                value={therapy}
                                onChange={e => setTherapy(Number(e.target.value))}
                                style={{ width: '100%', accentColor: 'var(--cyan)', cursor: 'pointer' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                                <span>Pre-Treatment</span>
                                <span>Std Stupp</span>
                                <span>Targeted</span>
                                <span>Remission</span>
                            </div>
                        </div>

                        {/* Live Volume & Margin Badges */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, background: 'var(--bg-input)', padding: 10, borderRadius: 8 }}>
                            <div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Volume</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>
                                    {currentVolumeCc.toFixed(1)} cc
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Volume Delta</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: therapyReductionRatio > 0 ? '#10b981' : 'var(--text-primary)' }}>
                                    {therapyReductionRatio > 0 ? `-${(therapyReductionRatio * 100).toFixed(0)}%` : 'Baseline'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Multi-Planar Slicing Toggle */}
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div className="card-title-colored" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Scissors size={16} />
                                Cross-Sectional MPR Slicing
                            </div>
                            <input
                                type="checkbox"
                                checked={enableSlicing}
                                onChange={(e) => setEnableSlicing(e.target.checked)}
                                style={{ accentColor: '#0284c7', width: 16, height: 16, cursor: 'pointer' }}
                            />
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                            {enableSlicing
                                ? 'Active: Use the bottom viewport controls to adjust cutting axis (Axial, Coronal, Sagittal).'
                                : 'Toggle to slice through brain parenchyma and inspect deep glioblastoma core coordinates.'}
                        </p>
                    </div>

                    {/* Card 4: Volumetric Anatomical Legend */}
                    <div className="card">
                        <div className="card-title-colored" style={{ marginBottom: 10 }}>
                            Anatomical & Pathology Legend
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {[
                                { color: '#f5ebe0', label: 'Living Gyri (Cortical Surface)' },
                                { color: '#581c1c', label: 'Vascular Sulci (Deep Fissure Crevices)' },
                                { color: '#ef4444', label: 'Active Enhancing Tumor Core (GTV)' },
                                { color: '#064e3b', label: 'Hypoxic Necrotic Cavity' },
                                { color: '#f59e0b', label: 'Infiltration / FLAIR Edema Halo' },
                                { color: '#38bdf8', label: '15mm Surgical Resection Safety Boundary' },
                            ].map(item => (
                                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 11 }}>
                                    <div style={{
                                        width: 11,
                                        height: 11,
                                        borderRadius: '50%',
                                        background: item.color,
                                        flexShrink: 0,
                                        border: '1px solid rgba(0,0,0,0.15)'
                                    }} />
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
