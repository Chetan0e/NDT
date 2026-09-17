import { predictGrowth, simulateTwin, getPatient, deletePatient } from './api';

describe('Frontend API Module', () => {
    test('predictGrowth validates required parameters', async () => {
        await expect(predictGrowth([], [])).rejects.toThrow('Invalid time-volume data');
        await expect(predictGrowth([0], [10])).rejects.toThrow('At least 2 data points required');
    });

    test('simulateTwin validates time-volume length match', async () => {
        await expect(simulateTwin([0, 30], [10])).rejects.toThrow('Invalid time-volume data');
    });

    test('getPatient requires patient ID', async () => {
        await expect(getPatient('')).rejects.toThrow('Patient ID is required');
    });

    test('deletePatient requires patient ID', async () => {
        await expect(deletePatient('')).rejects.toThrow('Patient ID is required');
    });
});
