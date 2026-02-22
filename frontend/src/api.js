import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000,
});

// ── Interceptors ─────────────────────────────────────────────────────────────

api.interceptors.response.use(
    (res) => res,
    (err) => {
        const msg =
            err.response?.data?.detail ||
            err.response?.data?.error ||
            err.message ||
            'Unknown error';
        console.error('[NDT API Error]', msg);
        return Promise.reject(new Error(msg));
    }
);

// ── API helpers ───────────────────────────────────────────────────────────────

export const uploadMRI = async (files, patientId, scanDate, extractRadiomics = false) => {
    const form = new FormData();
    for (const f of files) form.append('files', f);
    if (patientId) form.append('patient_id', patientId);
    if (scanDate) form.append('scan_date', scanDate);
    form.append('extract_radiomics', extractRadiomics);

    const res = await api.post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
};

export const predictGrowth = async (times, volumes, futureDays = [30, 60, 90]) => {
    const res = await api.post('/predict', { times, volumes, future_days: futureDays });
    return res.data;
};

export const simulateTwin = async (times, volumes, days = 60, therapy = 0) => {
    const res = await api.post('/simulate', { times, volumes, days, therapy });
    return res.data;
};

export const compareTherapies = async (times, volumes, days = 60) => {
    const res = await api.post('/compare-therapies', { times, volumes, days });
    return res.data;
};

export const optimizeTherapy = async (times, volumes, days = 60, useRl = false) => {
    const res = await api.post('/optimize', { times, volumes, days, use_rl: useRl });
    return res.data;
};

export const fusePatientVector = async (radiomics, clinical, genomic) => {
    const res = await api.post('/fusion', { radiomics, clinical, genomic });
    return res.data;
};

export const interpretFeatures = async (features) => {
    const res = await api.post('/interpret', { features });
    return res.data;
};

export const savePatient = async (data) => {
    const res = await api.post('/patient/create', data);
    return res.data;
};

export const getPatient = async (id) => {
    const res = await api.get(`/patient/${id}`);
    return res.data;
};

export const saveScan = async (data) => {
    const res = await api.post('/scan/save', data);
    return res.data;
};

export default api;
