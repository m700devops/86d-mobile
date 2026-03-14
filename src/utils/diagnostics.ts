import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@86d_scan_logs';
const MAX_ENTRIES = 100;

export interface ScanLogEntry {
  timestamp: string;
  success: boolean;
  errorType: 'network' | 'timeout' | 'api_error' | 'parse_error' | 'auth_error' | 'unknown' | null;
  errorMessage: string | null;
  httpStatus: number | null;
  responseTimeMs: number;
  imageSizeKb: number;
}

class ScanDiagnostics {
  async logScan(entry: ScanLogEntry): Promise<void> {
    try {
      const logs = await this.getLogs();
      logs.push(entry);

      // Keep only last MAX_ENTRIES
      const trimmed = logs.slice(-MAX_ENTRIES);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Failed to log scan:', e);
    }
  }

  async getLogs(): Promise<ScanLogEntry[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async clearLogs(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  async exportLogs(): Promise<string> {
    const logs = await this.getLogs();
    return JSON.stringify(logs, null, 2);
  }

  async getLastErrors(count: number = 10): Promise<ScanLogEntry[]> {
    const logs = await this.getLogs();
    return logs.filter(l => !l.success).slice(-count);
  }

  async getStats(): Promise<{
    total: number;
    successful: number;
    failed: number;
    avgResponseMs: number;
    errorBreakdown: Record<string, number>;
  }> {
    const logs = await this.getLogs();
    const successful = logs.filter(l => l.success).length;
    const failed = logs.length - successful;
    const avgResponseMs = logs.length > 0
      ? logs.reduce((sum, l) => sum + l.responseTimeMs, 0) / logs.length
      : 0;

    const errorBreakdown: Record<string, number> = {};
    logs.filter(l => !l.success && l.errorType).forEach(l => {
      errorBreakdown[l.errorType!] = (errorBreakdown[l.errorType!] || 0) + 1;
    });

    return { total: logs.length, successful, failed, avgResponseMs: Math.round(avgResponseMs), errorBreakdown };
  }
}

export const scanDiagnostics = new ScanDiagnostics();
