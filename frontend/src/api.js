import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000,
});

// ── Enhanced Error Handling ───────────────────────────────────────────────────────

class APIError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

api.interceptors.response.use(
    (res) => res,
    (err) => {
        const msg =
            err.response?.data?.detail ||
            err.response?.data?.error ||
            err.message ||
            'Unknown error';
        
        console.error('[NDT API Error]', {
            message: msg,
            status: err.response?.status,
            url: err.config?.url,
            method: err.config?.method
        });
        
        return Promise.reject(new APIError(msg, err.response?.status, err.response?.data));
    }
);

// ── Enhanced API helpers with validation ───────────────────────────────────────

export const uploadMRI = async (files, patientId, scanDate, extractRadiomics = false) => {
    if (!files || files.length === 0) {
        throw new APIError('No files provided for upload', 400);
    }
    
    const form = new FormData();
    for (const f of files) {
        if (!f.name.match(/\.(nii|nii\.gz|dcm|dicom)$/i)) {
            throw new APIError(`Invalid file format: ${f.name}. Only NIfTI and DICOM files are supported.`, 400);
        }
        form.append('files', f);
    }
    
    if (patientId) form.append('patient_id', patientId);
    if (scanDate) form.append('scan_date', scanDate);
    form.append('extract_radiomics', extractRadiomics);

    const res = await api.post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 minutes for large files
    });
    
    return {
        success: true,
        data: res.data,
        message: `Successfully uploaded ${files.length} file(s)`
    };
};

export const predictGrowth = async (times, volumes, futureDays = [30, 60, 90]) => {
    if (!times || !volumes || times.length !== volumes.length || times.length < 2) {
        throw new APIError('Invalid time-volume data. At least 2 data points required.', 400);
    }
    
    const res = await api.post('/predict', { 
        times: times.map(Number), 
        volumes: volumes.map(Number), 
        future_days: futureDays.map(Number) 
    });
    return res.data;
};

export const simulateTwin = async (times, volumes, days = 60, therapy = 0) => {
    if (!times || !volumes || times.length !== volumes.length) {
        throw new APIError('Invalid time-volume data for simulation.', 400);
    }
    
    const res = await api.post('/simulate', { 
        times: times.map(Number), 
        volumes: volumes.map(Number), 
        days: Number(days), 
        therapy: Number(therapy) 
    });
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
    if (!data.patient_id) {
        throw new APIError('Patient ID is required', 400);
    }
    if (!data.name) {
        throw new APIError('Patient name is required', 400);
    }
    
    const res = await api.post('/patient/create', data);
    return {
        success: true,
        patient: res.data,
        message: `Patient ${data.patient_id} saved successfully`
    };
};

export const getPatient = async (id) => {
    if (!id) {
        throw new APIError('Patient ID is required', 400);
    }
    
    const res = await api.get(`/patient/${encodeURIComponent(id)}`);
    return res.data;
};

export const saveScan = async (data) => {
    if (!data.patient_id || !data.scan_date) {
        throw new APIError('Patient ID and scan date are required', 400);
    }
    
    const res = await api.post('/scan/save', data);
    return {
        success: true,
        scan: res.data,
        message: 'Scan data saved successfully'
    };
};

// Health check utility
export const healthCheck = async () => {
    try {
        const res = await api.get('/health');
        return { status: 'healthy', data: res.data };
    } catch (error) {
        return { status: 'unhealthy', error: error.message };
    }
};

export default api;
