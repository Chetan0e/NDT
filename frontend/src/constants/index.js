/**
 * Constants and configuration for the NeuroDigital Twin application
 */

// ── Medical Constants ─────────────────────────────────────────────────────

export const MEDICAL_CONSTANTS = {
    // Tumor grade classifications
    TUMOR_GRADES: {
        1: { name: 'Grade I', description: 'Low grade, slow growing', prognosis: 'Good' },
        2: { name: 'Grade II', description: 'Low grade, infiltrative', prognosis: 'Fair' },
        3: { name: 'Grade III', description: 'High grade, malignant', prognosis: 'Poor' },
        4: { name: 'Grade IV', description: 'High grade, aggressive', prognosis: 'Very Poor' }
    },
    
    // KPS (Karnofsky Performance Status) scale
    KPS_SCALE: {
        100: 'Normal, no complaints',
        90: 'Normal activity, minor signs',
        80: 'Normal activity with effort',
        70: 'Cares for self, unable to work',
        60: 'Requires occasional assistance',
        50: 'Requires considerable assistance',
        40: 'Disabled, requires special care',
        30: 'Severely disabled',
        20: 'Very sick, hospitalization necessary',
        10: 'Moribund',
        0: 'Dead'
    },
    
    // Typical tumor volumes by grade (cc)
    TYPICAL_VOLUMES: {
        1: { min: 0.1, max: 5, average: 2 },
        2: { min: 1, max: 15, average: 8 },
        3: { min: 5, max: 30, average: 18 },
        4: { min: 10, max: 100, average: 35 }
    },
    
    // Growth rates by grade (per day)
    GROWTH_RATES: {
        1: { min: 0.001, max: 0.005, average: 0.003 },
        2: { min: 0.005, max: 0.015, average: 0.010 },
        3: { min: 0.015, max: 0.030, average: 0.022 },
        4: { min: 0.025, max: 0.050, average: 0.035 }
    }
};

// ── Application Configuration ─────────────────────────────────────────────

export const APP_CONFIG = {
    // API endpoints
    API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
    API_TIMEOUT: 60000,
    UPLOAD_TIMEOUT: 300000, // 5 minutes for large files
    
    // File upload limits
    MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
    MAX_FILES_PER_UPLOAD: 10,
    SUPPORTED_FORMATS: ['.nii', '.nii.gz', '.dcm', '.dicom'],
    
    // Visualization settings
    DEFAULT_3D_CAMERA_POSITION: { x: 0, y: 0, z: 250 },
    DEFAULT_TUMOR_COLOR: 0xff4444,
    DEFAULT_BRAIN_COLOR: 0xbfc5cc,
    
    // Chart configuration
    CHART_COLORS: {
        primary: '#00b4d8',
        secondary: '#f97316',
        success: '#10b981',
        warning: '#fbbf24',
        danger: '#ef4444',
        info: '#3b82f6'
    },
    
    // Pagination and limits
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    
    // Cache settings
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    
    // Session settings
    SESSION_TIMEOUT: 30 * 60 * 1000 // 30 minutes
};

// ── Validation Rules ─────────────────────────────────────────────────────

export const VALIDATION_RULES = {
    patient: {
        patient_id: {
            required: true,
            minLength: 3,
            maxLength: 20,
            pattern: /^[A-Z0-9-]+$/
        },
        name: {
            required: true,
            minLength: 2,
            maxLength: 100
        },
        age: {
            required: true,
            min: 0,
            max: 150,
            type: 'number'
        },
        gender: {
            required: true,
            values: ['Male', 'Female', 'Other']
        },
        diagnosis: {
            required: true,
            minLength: 5,
            maxLength: 500
        },
        kps_score: {
            min: 0,
            max: 100,
            type: 'number'
        },
        tumor_grade: {
            values: [1, 2, 3, 4],
            type: 'number'
        }
    },
    
    scan: {
        scan_date: {
            required: true,
            type: 'date'
        },
        tumor_volume_cc: {
            required: true,
            min: 0.001,
            max: 1000,
            type: 'number'
        }
    }
};

// ── Error Messages ───────────────────────────────────────────────────────

export const ERROR_MESSAGES = {
    // Network errors
    NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
    TIMEOUT_ERROR: 'Request timed out. Please try again.',
    SERVER_ERROR: 'Server error occurred. Please try again later.',
    
    // Validation errors
    REQUIRED_FIELD: 'This field is required',
    INVALID_FORMAT: 'Invalid format',
    INVALID_RANGE: 'Value is out of valid range',
    
    // File upload errors
    FILE_TOO_LARGE: `File size exceeds maximum limit of ${APP_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`,
    INVALID_FILE_TYPE: `Invalid file type. Supported formats: ${APP_CONFIG.SUPPORTED_FORMATS.join(', ')}`,
    TOO_MANY_FILES: `Maximum ${APP_CONFIG.MAX_FILES_PER_UPLOAD} files allowed per upload`,
    
    // Patient errors
    PATIENT_NOT_FOUND: 'Patient not found',
    PATIENT_ALREADY_EXISTS: 'Patient with this ID already exists',
    
    // Scan errors
    SCAN_NOT_FOUND: 'Scan not found',
    INVALID_SCAN_DATA: 'Invalid scan data provided',
    
    // Analysis errors
    INSUFFICIENT_DATA: 'Insufficient data for analysis. At least 2 time points required.',
    ANALYSIS_FAILED: 'Analysis failed. Please check your data and try again.',
    
    // Generic errors
    UNKNOWN_ERROR: 'An unknown error occurred',
    UNAUTHORIZED: 'You are not authorized to perform this action'
};

// ── Success Messages ─────────────────────────────────────────────────────

export const SUCCESS_MESSAGES = {
    PATIENT_SAVED: 'Patient information saved successfully',
    PATIENT_LOADED: 'Patient information loaded successfully',
    SCAN_UPLOADED: 'MRI scans uploaded and processed successfully',
    ANALYSIS_COMPLETED: 'Analysis completed successfully',
    REPORT_GENERATED: 'Report generated successfully',
    DATA_EXPORTED: 'Data exported successfully'
};

// ── UI Constants ─────────────────────────────────────────────────────────

export const UI_CONSTANTS = {
    // Animation durations (ms)
    ANIMATION_DURATION: {
        FAST: 150,
        NORMAL: 300,
        SLOW: 500
    },
    
    // Breakpoints for responsive design
    BREAKPOINTS: {
        MOBILE: 768,
        TABLET: 1024,
        DESKTOP: 1440,
        LARGE: 1920
    },
    
    // Loading states
    LOADING_STATES: {
        IDLE: 'idle',
        LOADING: 'loading',
        SUCCESS: 'success',
        ERROR: 'error'
    },
    
    // Chart options
    CHART_OPTIONS: {
        MAINTAIN_ASPECT_RATIO: false,
        RESPONSIVE: true,
        ANIMATION_DURATION: 750,
        FONT_SIZE: 12
    }
};

// ── Clinical Templates ───────────────────────────────────────────────────

export const CLINICAL_TEMPLATES = {
    // Common diagnosis templates
    DIAGNOSES: [
        'Glioblastoma (GBM)',
        'Astrocytoma',
        'Oligodendroglioma',
        'Meningioma',
        'Metastatic tumor',
        'Lymphoma'
    ],
    
    // Therapy templates
    THERAPIES: [
        'Surgical resection',
        'Radiotherapy',
        'Temozolomide chemotherapy',
        'Targeted therapy',
        'Immunotherapy',
        'Clinical trial'
    ],
    
    // Report templates
    REPORT_SECTIONS: [
        'Patient Information',
        'Clinical Summary',
        'Imaging Findings',
        'Quantitative Analysis',
        'Treatment Recommendations',
        'Prognostic Assessment'
    ]
};

// ── Export all constants ─────────────────────────────────────────────────

export default {
    MEDICAL_CONSTANTS,
    APP_CONFIG,
    VALIDATION_RULES,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    UI_CONSTANTS,
    CLINICAL_TEMPLATES
};
