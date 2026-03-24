/**
 * Utility functions for data processing and validation
 */

// ── Data Validation ─────────────────────────────────────────────────────

export const validatePatientData = (patient) => {
    const errors = [];
    
    if (!patient.patient_id?.trim()) {
        errors.push('Patient ID is required');
    }
    
    if (!patient.name?.trim()) {
        errors.push('Patient name is required');
    }
    
    if (!patient.age || patient.age < 0 || patient.age > 150) {
        errors.push('Valid age is required (0-150)');
    }
    
    if (!['Male', 'Female', 'Other'].includes(patient.gender)) {
        errors.push('Gender must be Male, Female, or Other');
    }
    
    if (!patient.diagnosis?.trim()) {
        errors.push('Diagnosis is required');
    }
    
    if (patient.kps_score && (patient.kps_score < 0 || patient.kps_score > 100)) {
        errors.push('KPS score must be between 0 and 100');
    }
    
    if (patient.tumor_grade && ![1, 2, 3, 4].includes(patient.tumor_grade)) {
        errors.push('Tumor grade must be 1, 2, 3, or 4');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

export const validateVolumeData = (times, volumes) => {
    const errors = [];
    
    if (!Array.isArray(times) || !Array.isArray(volumes)) {
        errors.push('Times and volumes must be arrays');
        return { isValid: false, errors };
    }
    
    if (times.length !== volumes.length) {
        errors.push('Times and volumes arrays must have the same length');
    }
    
    if (times.length < 2) {
        errors.push('At least 2 time points are required for analysis');
    }
    
    // Check for valid numeric values
    for (let i = 0; i < times.length; i++) {
        if (isNaN(times[i]) || isNaN(volumes[i])) {
            errors.push(`Invalid numeric value at index ${i}`);
        }
        if (volumes[i] <= 0) {
            errors.push(`Volume must be positive at index ${i}`);
        }
        if (i > 0 && times[i] <= times[i - 1]) {
            errors.push(`Times must be in increasing order at index ${i}`);
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// ── Data Processing ───────────────────────────────────────────────────

export const calculateGrowthRate = (times, volumes) => {
    if (!validateVolumeData(times, volumes).isValid) {
        return null;
    }
    
    // Simple linear regression for growth rate
    const n = times.length;
    const sumX = times.reduce((a, b) => a + b, 0);
    const sumY = volumes.reduce((a, b) => a + b, 0);
    const sumXY = times.reduce((sum, x, i) => sum + x * volumes[i], 0);
    const sumXX = times.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R²
    const meanY = sumY / n;
    const ssTotal = volumes.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
    const ssResidual = volumes.reduce((sum, y, i) => {
        const predicted = slope * times[i] + intercept;
        return sum + Math.pow(y - predicted, 2);
    }, 0);
    const rSquared = 1 - (ssResidual / ssTotal);
    
    return {
        slope,
        intercept,
        rSquared,
        growthRate: slope / meanY, // Normalized growth rate
        confidence: rSquared > 0.7 ? 'High' : rSquared > 0.4 ? 'Medium' : 'Low'
    };
};

export const formatVolume = (volumeCC, precision = 2) => {
    if (isNaN(volumeCC) || volumeCC === null) {
        return 'N/A';
    }
    return `${volumeCC.toFixed(precision)} cc`;
};

export const formatGrowthRate = (rate, precision = 4) => {
    if (isNaN(rate) || rate === null) {
        return 'N/A';
    }
    return `${rate.toFixed(precision)} /day`;
};

// ── Clinical Calculations ───────────────────────────────────────────────

export const calculateRiskScore = (radiomics, clinical) => {
    let riskScore = 0;
    let factors = [];
    
    // Radiomics factors
    if (radiomics) {
        if (radiomics.entropy > 5) {
            riskScore += 2;
            factors.push('High entropy');
        }
        if (radiomics.contrast > 0.7) {
            riskScore += 1;
            factors.push('Elevated contrast');
        }
        if (radiomics.necrosis > 30) {
            riskScore += 2;
            factors.push('High necrosis');
        }
    }
    
    // Clinical factors
    if (clinical) {
        if (clinical.tumor_grade >= 4) {
            riskScore += 3;
            factors.push('High grade tumor');
        }
        if (clinical.age > 65) {
            riskScore += 1;
            factors.push('Advanced age');
        }
        if (!clinical.idh_mutation) {
            riskScore += 2;
            factors.push('IDH wildtype');
        }
        if (!clinical.mgmt_methylation) {
            riskScore += 1;
            factors.push('MGMT unmethylated');
        }
    }
    
    const maxScore = 12;
    const normalizedScore = Math.min(riskScore, maxScore);
    
    return {
        score: normalizedScore,
        maxScore,
        riskLevel: normalizedScore >= 8 ? 'High' : normalizedScore >= 5 ? 'Medium' : 'Low',
        factors
    };
};

// ── Data Transformation ─────────────────────────────────────────────────

export const transformUploadResult = (backendData) => {
    if (!backendData) return null;
    
    return {
        volume_cc: backendData.volume_cc || 0,
        times: backendData.times || [],
        volumes: backendData.volumes || [],
        scanHistory: backendData.scan_history || [],
        radiomics: backendData.radiomics || {},
        segmentation: backendData.segmentation || {},
        alpha: backendData.growth_rate || 0,
        risk: calculateRiskScore(backendData.radiomics, backendData.clinical)?.riskLevel || 'Unknown',
        psv_dimension: backendData.psv_dimension || 64,
        margin_cm: backendData.margin_cm || 1.5,
        uploadDate: new Date().toISOString(),
        processingTime: backendData.processing_time || 0
    };
};

export const createPatientSummary = (patient, latestScan) => {
    if (!patient) return null;
    
    return {
        patientId: patient.patient_id,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        diagnosis: patient.diagnosis,
        diagnosisDate: patient.diagnosis_date,
        lastScanDate: latestScan?.scan_date || null,
        currentVolume: latestScan?.tumor_volume_cc || null,
        trend: latestScan?.volume_trend || 'Stable',
        riskLevel: latestScan?.risk || 'Unknown',
        kpsScore: patient.kps_score,
        tumorGrade: patient.tumor_grade,
        idhMutation: patient.idh_mutation,
        mgmtMethylation: patient.mgmt_methylation
    };
};

// ── Utility Functions ───────────────────────────────────────────────────

export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const generatePatientId = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `NDTP-${timestamp}-${random}`;
};

export const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};
