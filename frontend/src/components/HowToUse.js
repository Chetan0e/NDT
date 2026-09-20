import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    LayoutDashboard, Users, UploadCloud, BoxSelect,
    Microscope, Network, Cpu, LineChart, Activity,
    FileText, Settings, ChevronRight, ChevronDown,
    Play, CheckCircle, Zap, Brain, ShieldCheck,
    ArrowRight, Sparkles, Layers, GitBranch, Target,
    BarChart3, Dna, FlaskConical, BookOpen, Keyboard,
    MousePointer, Monitor, Terminal, Star, Clock,
    TrendingUp, AlertTriangle, Info, ChevronLeft
} from 'lucide-react';

/* ─── Utility: Intersection Observer hook ─── */
function useInView(threshold = 0.15) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
        }, { threshold });
        obs.observe(el);
        return () => obs.disconnect();
    }, [threshold]);
    return [ref, inView];
}

/* ─── Animated Counter ─── */
function AnimCounter({ target, suffix = '', prefix = '', duration = 1800 }) {
    const [val, setVal] = useState(0);
    const [ref, inView] = useInView(0.3);
    useEffect(() => {
        if (!inView) return;
        let start = null;
        const step = (ts) => {
            if (!start) start = ts;
            const prog = Math.min((ts - start) / duration, 1);
            const eased = 1 - Math.pow(1 - prog, 3);
            setVal(Math.round(eased * target));
            if (prog < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [inView, target, duration]);
    return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

/* ─── Pill badge ─── */
function Pill({ color = 'cyan', children }) {
    const colors = {
        cyan: { bg: 'rgba(2,132,199,0.10)', border: 'rgba(2,132,199,0.30)', text: '#0284c7' },
        violet: { bg: 'rgba(124,58,237,0.10)', border: 'rgba(124,58,237,0.30)', text: '#7c3aed' },
        green: { bg: 'rgba(5,150,105,0.10)', border: 'rgba(5,150,105,0.30)', text: '#059669' },
        amber: { bg: 'rgba(217,119,6,0.10)', border: 'rgba(217,119,6,0.30)', text: '#d97706' },
        red: { bg: 'rgba(220,38,38,0.10)', border: 'rgba(220,38,38,0.30)', text: '#dc2626' },
        pink: { bg: 'rgba(219,39,119,0.10)', border: 'rgba(219,39,119,0.30)', text: '#db2777' },
    };
    const c = colors[color] || colors.cyan;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 20,
            background: c.bg, border: `1px solid ${c.border}`,
            color: c.text, fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
            whiteSpace: 'nowrap',
        }}>
            {children}
        </span>
    );
}

/* ─── Section Reveal wrapper ─── */
function Reveal({ children, delay = 0, direction = 'up' }) {
    const [ref, inView] = useInView(0.1);
    const transforms = { up: 'translateY(32px)', down: 'translateY(-32px)', left: 'translateX(-32px)', right: 'translateX(32px)' };
    return (
        <div ref={ref} style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'none' : (transforms[direction] || 'translateY(32px)'),
            transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
        }}>
            {children}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════════════════════════ */

const PIPELINE_STEPS = [
    {
        num: '01', icon: <Users size={22} />, color: '#0284c7',
        gradient: 'linear-gradient(135deg,#0284c7,#2563eb)',
        label: 'Select Patient',
        nav: 'Clinical → Patients',
        desc: 'Browse the clinical cohort, select a patient to activate their full profile, molecular markers, and longitudinal scan history across the platform.',
        tips: ['Search by name or ID', 'Filter by WHO Grade', 'Click any row to activate'],
        badge: 'START HERE', badgeColor: 'cyan',
    },
    {
        num: '02', icon: <UploadCloud size={22} />, color: '#7c3aed',
        gradient: 'linear-gradient(135deg,#6d28d9,#8b5cf6)',
        label: 'Upload MRI or Load Sample',
        nav: 'Clinical → MRI Upload',
        desc: 'Drag-and-drop a DICOM or NIfTI MRI file, or click "Load Sample MRI" for instant synthetic data. The 3D U-Net segmentation pipeline runs automatically.',
        tips: ['Supports .dcm, .nii, .nii.gz, .mha', 'Toggle radiomics extraction', 'Sample MRI works without any files'],
        badge: 'AI ENGINE', badgeColor: 'violet',
    },
    {
        num: '03', icon: <BoxSelect size={22} />, color: '#059669',
        gradient: 'linear-gradient(135deg,#059669,#10b981)',
        label: 'Inspect 3D Anatomy',
        nav: 'Clinical → Segmentation',
        desc: 'Rotate, zoom, and slice the patient\'s brain in real-time WebGL. Observe subregion color coding: enhancing core (red), necrosis (yellow), edema (blue).',
        tips: ['Left-drag to rotate', 'Scroll to zoom', 'Use slicing planes for cross-sections'],
        badge: 'WebGL 3D', badgeColor: 'green',
    },
    {
        num: '04', icon: <Microscope size={22} />, color: '#d97706',
        gradient: 'linear-gradient(135deg,#d97706,#f59e0b)',
        label: 'Explore Radiomics',
        nav: 'AI Analysis → Radiomics',
        desc: 'Examine 100+ quantitative imaging biomarkers across shape, intensity, texture (GLCM), and higher-order matrix features with color-coded clinical interpretation.',
        tips: ['Red = abnormal range', 'Filter by feature group', 'Hover features for clinical meaning'],
        badge: '100+ FEATURES', badgeColor: 'amber',
    },
    {
        num: '05', icon: <Network size={22} />, color: '#0d9488',
        gradient: 'linear-gradient(135deg,#0d9488,#14b8a6)',
        label: 'Run Digital Twin ODE',
        nav: 'AI Analysis → Digital Twin',
        desc: 'Simulate tumor volume trajectories under all 4 therapy regimens simultaneously. The ODE parameters (α, K) are auto-calibrated to the patient\'s scan history.',
        tips: ['Adjust simulation horizon (30–365 days)', 'Compare all regimens in parallel', 'Observe untreated vs treated divergence'],
        badge: 'ODE SIM', badgeColor: 'green',
    },
    {
        num: '06', icon: <Cpu size={22} />, color: '#8b5cf6',
        gradient: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
        label: 'Optimize Therapy with RL',
        nav: 'AI Analysis → Therapy Optimizer',
        desc: 'The PPO Reinforcement Learning agent computes the optimal day-by-day therapy intensity schedule — balancing tumor regression against neurotoxicity constraints.',
        tips: ['Adjust toxicity budget (λ)', 'Compare PPO vs Heuristic baseline', 'Review the AI reasoning summary'],
        badge: 'PPO AI', badgeColor: 'violet',
    },
    {
        num: '07', icon: <LineChart size={22} />, color: '#dc2626',
        gradient: 'linear-gradient(135deg,#dc2626,#ef4444)',
        label: 'Analyze Growth Trends',
        nav: 'AI Analysis → Growth Analysis',
        desc: 'Track longitudinal volume progression, auto-fit linear or exponential regression models, and generate +30 / +60 / +90 day volume forecasts with confidence bounds.',
        tips: ['R² shows model fit quality', 'Exponential = fast-growing tumor', 'Forecasts update with new scans'],
        badge: 'FORECASTING', badgeColor: 'red',
    },
    {
        num: '08', icon: <Activity size={22} />, color: '#db2777',
        gradient: 'linear-gradient(135deg,#be185d,#ec4899)',
        label: 'Predict Survival',
        nav: 'AI Analysis → Survival Analysis',
        desc: 'Actuarial Kaplan-Meier curves, Cox PH hazard breakdown by molecular marker, and benchmark comparison against 4 published clinical trial cohorts.',
        tips: ['Lower HR = better prognosis', 'Shaded area = 95% confidence band', 'Compare against Stupp 2005 reference'],
        badge: 'ACTUARIAL', badgeColor: 'pink',
    },
    {
        num: '09', icon: <FileText size={22} />, color: '#0284c7',
        gradient: 'linear-gradient(135deg,#0284c7,#38bdf8)',
        label: 'Generate Tumor Board Report',
        nav: 'Reporting → Reports',
        desc: 'Export a print-ready multidisciplinary Clinical AI Tumor Board Summary with molecular profile, volumetric tables, RL schedule, survival stats, and JSON export.',
        tips: ['Use Chrome → Print → Save as PDF', 'Enable "Background graphics" for full styling', 'JSON export for data pipeline integration'],
        badge: 'EXPORT READY', badgeColor: 'cyan',
    },
];

const FEATURE_CARDS = [
    { icon: <Brain size={28} />, color: '#0284c7', grad: 'linear-gradient(135deg,#0284c7,#2563eb)', title: '3D U-Net Segmentation', sub: 'MONAI · PyTorch', desc: 'Voxel-accurate tumor boundary detection with sub-region classification in a 128×128×64 volumetric field.', stat: '97.2%', statLabel: 'Dice Score (BraTS)' },
    { icon: <FlaskConical size={28} />, color: '#d97706', grad: 'linear-gradient(135deg,#d97706,#f59e0b)', title: 'Quantitative Radiomics', sub: 'PyRadiomics Engine', desc: 'Over 100 mathematical imaging biomarkers: shape morphology, first-order intensity, GLCM, GLRLM, GLSZM texture matrices.', stat: '100+', statLabel: 'Biomarkers Extracted' },
    { icon: <Layers size={28} />, color: '#7c3aed', grad: 'linear-gradient(135deg,#6d28d9,#8b5cf6)', title: 'Multi-Modal Fusion PSV', sub: '3-Branch Deep MLP', desc: 'Unifies imaging, genomic, and clinical modalities into a 64-dimensional Patient State Vector for downstream AI tasks.', stat: '64-dim', statLabel: 'State Vector' },
    { icon: <GitBranch size={28} />, color: '#059669', grad: 'linear-gradient(135deg,#059669,#10b981)', title: 'Digital Twin ODE', sub: 'Biophysical Simulation', desc: 'Calibrated non-linear logistic ODE with fractional therapy kill, simulating 4 regimens across any horizon.', stat: '4', statLabel: 'Therapy Regimens' },
    { icon: <Target size={28} />, color: '#8b5cf6', grad: 'linear-gradient(135deg,#7c3aed,#a78bfa)', title: 'PPO RL Optimizer', sub: 'Proximal Policy Opt.', desc: 'Continuous-action Markov Decision Process solved with PPO — maximizing tumor regression while penalizing cumulative toxicity.', stat: 'PPO', statLabel: 'RL Algorithm' },
    { icon: <BarChart3 size={28} />, color: '#db2777', grad: 'linear-gradient(135deg,#be185d,#ec4899)', title: 'Actuarial Survival', sub: 'Cox PH · Weibull', desc: 'Multi-hazard Cox proportional hazard model with Weibull parametric survival curves benchmarked against TCGA-GBM and Stupp 2005 cohorts.', stat: '6', statLabel: 'Hazard Factors' },
];

const SHORTCUTS = [
    { keys: ['Ctrl', 'Click nav item'], action: 'Navigate to any module instantly' },
    { keys: ['Scroll'], action: 'Zoom in/out in 3D WebGL viewer' },
    { keys: ['Left-drag'], action: 'Rotate brain model in 3D viewer' },
    { keys: ['Right-drag'], action: 'Pan brain model in 3D viewer' },
    { keys: ['F5'], action: 'Refresh data from backend' },
    { keys: ['Ctrl', 'P'], action: 'Open print dialog for tumor board report' },
];

const PATIENTS = [
    { id: 'NDT-001', name: 'Marcus Vance', grade: 4, mol: 'IDHwt / MGMT−', status: 'Rapid', statusColor: '#dc2626' },
    { id: 'NDT-002', name: 'Elena Rostova', grade: 2, mol: 'IDHmut / MGMT+', status: 'Indolent', statusColor: '#059669' },
    { id: 'NDT-003', name: 'David Chen', grade: 3, mol: 'IDHmut / MGMT−', status: 'Moderate', statusColor: '#d97706' },
    { id: 'NDT-004', name: 'Sarah Jenkins', grade: 4, mol: 'IDHwt / MGMT+', status: 'Responding', statusColor: '#0284c7' },
    { id: 'NDT-005', name: 'Arthur Pendelton', grade: 4, mol: 'EGFR+ / Recurrent', status: 'Relapse', statusColor: '#8b5cf6' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function HowToUse() {
    const [activeStep, setActiveStep] = useState(0);
    const [autoPlay, setAutoPlay] = useState(true);
    const [openFaq, setOpenFaq] = useState(null);
    const scrollRef = useRef(null);

    /* Auto-advance pipeline steps */
    useEffect(() => {
        if (!autoPlay) return;
        const t = setInterval(() => {
            setActiveStep(s => (s + 1) % PIPELINE_STEPS.length);
        }, 3500);
        return () => clearInterval(t);
    }, [autoPlay]);

    const goStep = useCallback((i) => {
        setAutoPlay(false);
        setActiveStep(i);
    }, []);

    const step = PIPELINE_STEPS[activeStep];

    const faqs = [
        { q: 'Do I need real MRI data to use the platform?', a: 'No. Every module has a "Load Sample MRI" or demo mode that generates synthetic volumetric data using the same full AI pipeline. You can explore the entire platform without a single real scan file.' },
        { q: 'Why does segmentation take 30–60 seconds the first time?', a: 'The 3D U-Net runs on CPU by default and must process a 128×128×64 volumetric tensor. The model weights are also loaded on first request. Set DEVICE=cuda in your .env file if you have an NVIDIA GPU for 10–15× speedup.' },
        { q: 'Can I add my own patients?', a: 'Yes. Go to Clinical → Patients → "+ New Patient". Fill in demographics, molecular markers, KPS score, and extent of resection. You can then upload real or synthetic MRI scans and run the full pipeline on your custom patient.' },
        { q: 'What is the RL Toxicity Budget slider?', a: 'It controls the λ penalty coefficient in the PPO reward function: R = −ΔV − λ·action. Lower λ = the agent tolerates higher therapy intensity. Higher λ = the agent favors gentler schedules to protect the patient from side effects.' },
        { q: 'Are the survival predictions clinically valid?', a: 'The hazard ratios are calibrated to published literature (Stupp 2005, TCGA-GBM, EORTC 26981). However, this platform is research-only and not FDA-cleared for clinical decision-making. All outputs are illustrative.' },
        { q: 'How do I export a tumor board report to PDF?', a: 'Navigate to Reporting → Reports, generate the report for the active patient, then click "Print Report". In Chrome: File → Print → Save as PDF → Enable "Background graphics" → Set margins to "Minimum". The layout is print-optimized.' },
    ];

    return (
        <div style={{
            height: '100%', overflowY: 'auto', overflowX: 'hidden',
            background: 'var(--bg-base)', fontFamily: 'var(--font-ui)',
            scrollBehavior: 'smooth',
        }} ref={scrollRef}>

            {/* ══ HERO ══════════════════════════════════════════════════════ */}
            <div style={{
                position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 40%, #1e1b4b 70%, #0f172a 100%)',
                padding: '72px 48px 80px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                {/* Animated background orbs */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                    {[
                        { w: 600, h: 600, t: -200, l: -150, color: 'rgba(2,132,199,0.07)' },
                        { w: 500, h: 500, t: -100, r: -100, color: 'rgba(124,58,237,0.06)' },
                        { w: 400, h: 400, b: -150, l: '40%', color: 'rgba(5,150,105,0.05)' },
                    ].map((o, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            width: o.w, height: o.h,
                            top: o.t, left: o.l, right: o.r, bottom: o.b,
                            borderRadius: '50%',
                            background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
                            animation: `orb-float ${6 + i * 2}s ease-in-out infinite alternate`,
                        }} />
                    ))}
                    {/* Grid pattern */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
                        backgroundSize: '48px 48px',
                    }} />
                </div>

                <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto' }}>
                    {/* Top badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, animation: 'fade-up 0.7s ease' }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '6px 16px', borderRadius: 40,
                            background: 'rgba(2,132,199,0.12)', border: '1px solid rgba(2,132,199,0.3)',
                            color: '#38bdf8', fontSize: 12, fontWeight: 700, letterSpacing: 1,
                        }}>
                            <BookOpen size={14} />
                            PLATFORM GUIDE
                        </div>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '6px 16px', borderRadius: 40,
                            background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)',
                            color: '#a78bfa', fontSize: 12, fontWeight: 700, letterSpacing: 1,
                        }}>
                            <Sparkles size={14} />
                            v2.0.0
                        </div>
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(36px,5vw,64px)', fontWeight: 900, lineHeight: 1.08,
                        color: '#f8fafc', letterSpacing: -2, marginBottom: 20,
                        animation: 'fade-up 0.7s ease 0.1s both',
                    }}>
                        How to Use{' '}
                        <span style={{
                            background: 'linear-gradient(135deg,#38bdf8,#818cf8,#a78bfa)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>
                            NeuroDigital Twin
                        </span>
                    </h1>

                    <p style={{
                        fontSize: 18, color: 'rgba(248,250,252,0.60)', lineHeight: 1.7,
                        maxWidth: 640, marginBottom: 40,
                        animation: 'fade-up 0.7s ease 0.2s both',
                    }}>
                        A complete interactive walkthrough of the AI-powered neuro-oncology platform — from patient selection through digital twin simulation, RL therapy optimization, and clinical reporting.
                    </p>

                    {/* Stat bar */}
                    <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: 24,
                        animation: 'fade-up 0.7s ease 0.3s both',
                    }}>
                        {[
                            { val: 9, suf: ' Modules', label: 'Platform modules', color: '#38bdf8' },
                            { val: 5, suf: ' Patients', label: 'Preloaded cases', color: '#a78bfa' },
                            { val: 24, suf: ' Tests', label: 'Automated tests', color: '#34d399' },
                            { val: 100, suf: '+', label: 'Radiomic features', color: '#fbbf24' },
                        ].map((s, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <div style={{ fontSize: 28, fontWeight: 900, color: s.color, letterSpacing: -1, lineHeight: 1 }}>
                                    <AnimCounter target={s.val} suffix={s.suf} duration={1400 + i * 200} />
                                </div>
                                <div style={{ fontSize: 11, color: 'rgba(248,250,252,0.45)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                                    {s.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══ QUICK-START STRIP ═════════════════════════════════════════ */}
            <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', padding: '16px 48px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <Zap size={16} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Quick Start:</span>
                    {[
                        { step: 'Run start.bat', icon: <Terminal size={12} /> },
                        { step: '→ Open localhost:3000', icon: <Monitor size={12} /> },
                        { step: '→ Select NDT-001', icon: <Users size={12} /> },
                        { step: '→ Load Sample MRI', icon: <UploadCloud size={12} /> },
                        { step: '→ Explore all modules', icon: <Play size={12} /> },
                    ].map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '4px 10px', borderRadius: 6,
                                background: 'var(--bg-card2)', border: '1px solid var(--border)',
                                color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500,
                            }}>
                                {s.icon}{s.step}
                            </div>
                        </div>
                    ))}
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        ⚡ ~30 seconds to first result
                    </span>
                </div>
            </div>

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 48px' }}>

                {/* ══ SECTION: STEP-BY-STEP PIPELINE ═════════════════════════ */}
                <Reveal>
                    <div style={{ textAlign: 'center', marginBottom: 48 }}>
                        <Pill color="cyan"><GitBranch size={11} /> 9-STEP WORKFLOW</Pill>
                        <h2 style={{ fontSize: 36, fontWeight: 900, color: 'var(--text-bright)', marginTop: 12, letterSpacing: -1 }}>
                            The Clinical Pipeline
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginTop: 8, maxWidth: 520, margin: '8px auto 0' }}>
                            Follow this end-to-end workflow for a complete digital twin analysis.
                        </p>
                    </div>
                </Reveal>

                {/* Step navigator */}
                <Reveal delay={100}>
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                        gap: 4, marginBottom: 32,
                        background: 'var(--bg-surface)', borderRadius: 16,
                        border: '1px solid var(--border)', padding: 6,
                    }}>
                        {PIPELINE_STEPS.map((s, i) => (
                            <button key={i} onClick={() => goStep(i)} style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                padding: '10px 6px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                background: activeStep === i ? s.gradient : 'transparent',
                                color: activeStep === i ? '#fff' : 'var(--text-muted)',
                                transition: 'all 0.3s ease', position: 'relative',
                                boxShadow: activeStep === i ? `0 4px 16px ${s.color}40` : 'none',
                            }}>
                                <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.8 }}>{s.num}</span>
                                <span style={{ opacity: 0.9 }}>{React.cloneElement(s.icon, { size: 14 })}</span>
                                <span style={{ fontSize: 9, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
                                    {s.label.split(' ').slice(0, 2).join(' ')}
                                </span>
                            </button>
                        ))}
                    </div>
                </Reveal>

                {/* Step detail card */}
                <Reveal delay={150}>
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
                        marginBottom: 56,
                    }}>
                        {/* Main card */}
                        <div key={activeStep} style={{
                            background: 'var(--bg-surface)', borderRadius: 20,
                            border: `1px solid ${step.color}30`,
                            padding: 32, position: 'relative', overflow: 'hidden',
                            boxShadow: `0 8px 32px ${step.color}15`,
                            animation: 'step-in 0.4s ease',
                        }}>
                            {/* Gradient corner */}
                            <div style={{
                                position: 'absolute', top: 0, right: 0,
                                width: 200, height: 200,
                                background: `radial-gradient(circle at top right, ${step.color}12 0%, transparent 70%)`,
                                pointerEvents: 'none',
                            }} />

                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
                                <div style={{
                                    width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                                    background: step.gradient,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', boxShadow: `0 6px 20px ${step.color}40`,
                                }}>
                                    {step.icon}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <span style={{
                                            fontSize: 11, fontWeight: 800, letterSpacing: 1,
                                            color: step.color, fontFamily: 'var(--font-mono)',
                                        }}>STEP {step.num}</span>
                                        <Pill color={step.badgeColor}>{step.badge}</Pill>
                                    </div>
                                    <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-bright)', letterSpacing: -0.5 }}>
                                        {step.label}
                                    </h3>
                                </div>
                            </div>

                            {/* Nav path */}
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '6px 12px', borderRadius: 8,
                                background: `${step.color}10`, border: `1px solid ${step.color}25`,
                                color: step.color, fontSize: 12, fontWeight: 600, marginBottom: 16,
                                fontFamily: 'var(--font-mono)',
                            }}>
                                <MousePointer size={12} />
                                {step.nav}
                            </div>

                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.75, marginBottom: 24 }}>
                                {step.desc}
                            </p>

                            {/* Tips */}
                            <div style={{
                                background: 'var(--bg-card2)', borderRadius: 12,
                                padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8,
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5, marginBottom: 2 }}>
                                    💡 PRO TIPS
                                </div>
                                {step.tips.map((t, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                                        <CheckCircle size={14} style={{ color: step.color, flexShrink: 0, marginTop: 1 }} />
                                        {t}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pipeline sidebar */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {PIPELINE_STEPS.map((s, i) => (
                                <button key={i} onClick={() => goStep(i)} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '12px 16px', borderRadius: 12,
                                    border: `1px solid ${activeStep === i ? s.color + '40' : 'var(--border)'}`,
                                    background: activeStep === i ? `${s.color}08` : 'var(--bg-surface)',
                                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                                    boxShadow: activeStep === i ? `0 2px 12px ${s.color}15` : 'none',
                                }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                        background: activeStep === i ? s.gradient : 'var(--bg-card2)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: activeStep === i ? '#fff' : 'var(--text-muted)',
                                        transition: 'all 0.2s',
                                    }}>
                                        {React.cloneElement(s.icon, { size: 15 })}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: 13, fontWeight: 700,
                                            color: activeStep === i ? s.color : 'var(--text-primary)',
                                            transition: 'color 0.2s',
                                        }}>{s.label}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s.nav}</div>
                                    </div>
                                    {activeStep === i && <ChevronRight size={14} style={{ color: s.color, flexShrink: 0 }} />}
                                    {i < activeStep && <CheckCircle size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />}
                                </button>
                            ))}

                            {/* Progress bar */}
                            <div style={{ marginTop: 8, padding: '0 4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Workflow progress</span>
                                    <span style={{ fontSize: 11, color: 'var(--cyan)', fontWeight: 700 }}>
                                        {Math.round(((activeStep + 1) / PIPELINE_STEPS.length) * 100)}%
                                    </span>
                                </div>
                                <div style={{ height: 5, background: 'var(--bg-card2)', borderRadius: 99, overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', borderRadius: 99,
                                        background: step.gradient,
                                        width: `${((activeStep + 1) / PIPELINE_STEPS.length) * 100}%`,
                                        transition: 'width 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                                    }} />
                                </div>
                            </div>

                            {/* Controls */}
                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                <button onClick={() => goStep((activeStep - 1 + PIPELINE_STEPS.length) % PIPELINE_STEPS.length)} style={btnStyle('ghost')}>
                                    <ChevronLeft size={14} /> Prev
                                </button>
                                <button onClick={() => setAutoPlay(v => !v)} style={btnStyle(autoPlay ? 'cyan' : 'ghost')}>
                                    {autoPlay ? <><Clock size={13} /> Auto-playing</> : <><Play size={13} /> Auto-play</>}
                                </button>
                                <button onClick={() => goStep((activeStep + 1) % PIPELINE_STEPS.length)} style={btnStyle('ghost')}>
                                    Next <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </Reveal>

                {/* ══ SECTION: DEMO PATIENTS ══════════════════════════════════ */}
                <Reveal>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <div>
                            <Pill color="violet"><Dna size={11} /> PRELOADED COHORT</Pill>
                            <h2 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-bright)', marginTop: 10, letterSpacing: -0.8 }}>
                                5 Demo Clinical Cases
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
                                Representing the full spectrum of glioma pathology — ready to explore immediately.
                            </p>
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                            background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.2)',
                            borderRadius: 12, color: '#d97706',
                        }}>
                            <AlertTriangle size={15} />
                            <span style={{ fontSize: 12, fontWeight: 600 }}>Synthetic data only</span>
                        </div>
                    </div>
                </Reveal>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 56 }}>
                    {PATIENTS.map((p, i) => (
                        <Reveal key={p.id} delay={i * 60}>
                            <div style={{
                                display: 'grid', gridTemplateColumns: '80px 1fr 180px 160px 100px',
                                alignItems: 'center', gap: 16,
                                padding: '16px 20px', background: 'var(--bg-surface)',
                                borderRadius: 14, border: '1px solid var(--border)',
                                transition: 'all 0.2s',
                            }} className="patient-row-hover">
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--cyan)' }}>
                                    {p.id}
                                </div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-bright)' }}>{p.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                                        Start with this patient for {i === 0 ? 'aggressive GBM baseline' : i === 1 ? 'favorable prognosis contrast' : i === 2 ? 'moderate progression case' : i === 3 ? 'therapy responder analysis' : 'recurrent/EGFR phenotype'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{
                                        padding: '3px 8px', borderRadius: 6,
                                        background: p.grade === 4 ? 'rgba(220,38,38,0.08)' : p.grade === 3 ? 'rgba(217,119,6,0.08)' : 'rgba(5,150,105,0.08)',
                                        border: `1px solid ${p.grade === 4 ? 'rgba(220,38,38,0.25)' : p.grade === 3 ? 'rgba(217,119,6,0.25)' : 'rgba(5,150,105,0.25)'}`,
                                        color: p.grade === 4 ? '#dc2626' : p.grade === 3 ? '#d97706' : '#059669',
                                        fontSize: 11, fontWeight: 700,
                                    }}>
                                        WHO Grade {p.grade}
                                    </span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                                    {p.mol}
                                </div>
                                <div style={{
                                    padding: '4px 10px', borderRadius: 20, textAlign: 'center',
                                    background: `${p.statusColor}12`, border: `1px solid ${p.statusColor}30`,
                                    color: p.statusColor, fontSize: 11, fontWeight: 700,
                                }}>
                                    {p.status}
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>

                {/* ══ SECTION: FEATURE CARDS ══════════════════════════════════ */}
                <Reveal>
                    <div style={{ textAlign: 'center', marginBottom: 40 }}>
                        <Pill color="green"><Star size={11} /> AI CAPABILITIES</Pill>
                        <h2 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-bright)', marginTop: 12, letterSpacing: -1 }}>
                            Core AI Modules
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 8 }}>
                            Six interconnected AI engines powering the digital twin pipeline.
                        </p>
                    </div>
                </Reveal>

                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 20, marginBottom: 64,
                }}>
                    {FEATURE_CARDS.map((c, i) => (
                        <Reveal key={i} delay={i * 70} direction={i % 2 === 0 ? 'up' : 'up'}>
                            <div style={{
                                background: 'var(--bg-surface)', borderRadius: 20,
                                border: '1px solid var(--border)',
                                padding: '24px', position: 'relative', overflow: 'hidden',
                                transition: 'all 0.3s ease', cursor: 'default',
                            }} className="feature-card-hover">
                                {/* Background accent */}
                                <div style={{
                                    position: 'absolute', top: 0, right: 0, width: 120, height: 120,
                                    background: `radial-gradient(circle, ${c.color}10, transparent 70%)`,
                                    pointerEvents: 'none',
                                }} />

                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <div style={{
                                        width: 52, height: 52, borderRadius: 14,
                                        background: c.grad, color: '#fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: `0 6px 20px ${c.color}35`,
                                    }}>
                                        {c.icon}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 22, fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.stat}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{c.statLabel}</div>
                                    </div>
                                </div>

                                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-bright)', marginBottom: 4 }}>{c.title}</div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: c.color, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.sub}</div>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{c.desc}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>

                {/* ══ SECTION: KEYBOARD SHORTCUTS ═════════════════════════════ */}
                <Reveal>
                    <div style={{
                        background: 'var(--bg-surface)', borderRadius: 20, border: '1px solid var(--border)',
                        padding: 32, marginBottom: 56,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#0f172a,#1e293b)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8',
                            }}>
                                <Keyboard size={18} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-bright)' }}>Tips & Controls</h3>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Interactions and shortcuts across the platform</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                            {SHORTCUTS.map((s, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '12px 14px', background: 'var(--bg-card2)',
                                    borderRadius: 10, border: '1px solid var(--border)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                        {s.keys.map((k, ki) => (
                                            <React.Fragment key={ki}>
                                                <kbd style={{
                                                    padding: '2px 8px', borderRadius: 5,
                                                    background: '#0f172a', color: '#e2e8f0',
                                                    fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)',
                                                    border: '1px solid #334155', boxShadow: '0 2px 0 #0f172a',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {k}
                                                </kbd>
                                                {ki < s.keys.length - 1 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+</span>}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                    <ArrowRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.action}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Reveal>

                {/* ══ SECTION: FAQ ════════════════════════════════════════════ */}
                <Reveal>
                    <div style={{ marginBottom: 56 }}>
                        <div style={{ textAlign: 'center', marginBottom: 36 }}>
                            <Pill color="amber"><Info size={11} /> COMMON QUESTIONS</Pill>
                            <h2 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-bright)', marginTop: 12, letterSpacing: -0.8 }}>
                                Frequently Asked Questions
                            </h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {faqs.map((f, i) => (
                                <div key={i} style={{
                                    background: 'var(--bg-surface)', borderRadius: 14,
                                    border: `1px solid ${openFaq === i ? 'var(--cyan)' : 'var(--border)'}`,
                                    overflow: 'hidden', transition: 'border-color 0.2s',
                                }}>
                                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
                                        textAlign: 'left',
                                    }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', paddingRight: 16 }}>{f.q}</span>
                                        <span style={{
                                            color: openFaq === i ? 'var(--cyan)' : 'var(--text-muted)',
                                            transition: 'transform 0.3s, color 0.2s',
                                            transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                                            flexShrink: 0,
                                        }}>
                                            <ChevronDown size={18} />
                                        </span>
                                    </button>
                                    <div style={{
                                        maxHeight: openFaq === i ? 200 : 0,
                                        overflow: 'hidden',
                                        transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1)',
                                    }}>
                                        <p style={{ padding: '0 20px 18px', fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                                            {f.a}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Reveal>

                {/* ══ FOOTER CTA ══════════════════════════════════════════════ */}
                <Reveal>
                    <div style={{
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
                        borderRadius: 24, padding: '48px 48px', textAlign: 'center',
                        border: '1px solid rgba(255,255,255,0.06)',
                        position: 'relative', overflow: 'hidden',
                    }}>
                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                            <div style={{
                                position: 'absolute', width: 400, height: 400,
                                top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                                background: 'radial-gradient(circle, rgba(2,132,199,0.15) 0%, transparent 70%)',
                                animation: 'pulse-slow 4s ease-in-out infinite',
                            }} />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <div style={{ fontSize: 40, marginBottom: 16 }}>🧠</div>
                            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#f8fafc', marginBottom: 12, letterSpacing: -0.8 }}>
                                Ready to Explore?
                            </h2>
                            <p style={{ color: 'rgba(248,250,252,0.6)', fontSize: 15, marginBottom: 28, maxWidth: 440, margin: '0 auto 28px' }}>
                                Start with <strong style={{ color: '#38bdf8' }}>NDT-001 (Marcus Vance)</strong> for the full clinical pipeline experience — from aggressive GBM segmentation to RL-optimized therapy scheduling.
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                    padding: '12px 24px', borderRadius: 12,
                                    background: 'linear-gradient(135deg,#0284c7,#2563eb)',
                                    color: '#fff', fontSize: 14, fontWeight: 700,
                                    boxShadow: '0 8px 28px rgba(2,132,199,0.4)',
                                }}>
                                    <LayoutDashboard size={16} /> Go to Dashboard
                                </div>
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                    padding: '12px 24px', borderRadius: 12,
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    color: 'rgba(248,250,252,0.8)', fontSize: 14, fontWeight: 600,
                                }}>
                                    <ShieldCheck size={16} /> Research use only
                                </div>
                            </div>
                        </div>
                    </div>
                </Reveal>

                <div style={{ height: 48 }} />
            </div>

            {/* ══ KEYFRAMES ══════════════════════════════════════════════════ */}
            <style>{`
                @keyframes fade-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes step-in {
                    from { opacity: 0; transform: translateX(12px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes orb-float {
                    from { transform: translateY(0px) scale(1); }
                    to   { transform: translateY(-30px) scale(1.05); }
                }
                @keyframes pulse-slow {
                    0%, 100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
                    50%       { transform: translate(-50%,-50%) scale(1.15); opacity: 0.7; }
                }
                .feature-card-hover:hover {
                    border-color: var(--border-bright) !important;
                    transform: translateY(-3px);
                    box-shadow: var(--shadow-lg) !important;
                }
                .patient-row-hover:hover {
                    border-color: var(--border-bright) !important;
                    background: var(--bg-card2) !important;
                }
            `}</style>
        </div>
    );
}

/* ─── Button helper ─── */
function btnStyle(variant) {
    if (variant === 'cyan') return {
        display: 'flex', alignItems: 'center', gap: 6, flex: 1,
        justifyContent: 'center', padding: '8px 12px', borderRadius: 8,
        background: 'linear-gradient(135deg,#0284c7,#2563eb)', border: 'none',
        color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(2,132,199,0.35)',
    };
    return {
        display: 'flex', alignItems: 'center', gap: 6, flex: 1,
        justifyContent: 'center', padding: '8px 12px', borderRadius: 8,
        background: 'var(--bg-card2)', border: '1px solid var(--border)',
        color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    };
}
