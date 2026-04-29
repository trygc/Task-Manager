export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private userId?: string;
  private sessionId: string;

  constructor(logLevel: LogLevel = LogLevel.INFO) {
    this.logLevel = logLevel;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private addLog(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      userId: this.userId,
      sessionId: this.sessionId,
    };

    this.logs.push(logEntry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      this.consoleLog(logEntry);
    }

    // Send critical errors to external service in production
    if (level === LogLevel.ERROR && process.env.NODE_ENV === 'production') {
      this.sendToExternalService(logEntry);
    }
  }

  private consoleLog(entry: LogEntry) {
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const levelColors = ['#888', '#007acc', '#ff8c00', '#ff4444'];
    
    const style = `color: ${levelColors[entry.level]}; font-weight: bold;`;
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    
    console.groupCollapsed(
      `%c[${levelNames[entry.level]}] ${timestamp} ${entry.message}`,
      style
    );
    
    if (entry.context) {
      console.log('Context:', entry.context);
    }
    
    if (entry.error) {
      console.error('Error:', entry.error);
    }
    
    if (entry.userId) {
      console.log('User ID:', entry.userId);
    }
    
    console.log('Session ID:', entry.sessionId);
    console.groupEnd();
  }

  private async sendToExternalService(entry: LogEntry) {
    try {
      // In a real application, you would send this to a service like Sentry, LogRocket, etc.
      // For now, we'll just store it locally
      const errorLogs = JSON.parse(localStorage.getItem('trygc-error-logs') || '[]');
      errorLogs.push(entry);
      
      // Keep only the last 50 error logs
      if (errorLogs.length > 50) {
        errorLogs.splice(0, errorLogs.length - 50);
      }
      
      localStorage.setItem('trygc-error-logs', JSON.stringify(errorLogs));
    } catch (error) {
      console.error('Failed to store error log:', error);
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.addLog(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.addLog(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.addLog(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.addLog(LogLevel.ERROR, message, context, error);
  }

  // Convenience methods for common scenarios
  apiError(endpoint: string, error: Error, context?: Record<string, any>) {
    this.error(`API Error: ${endpoint}`, error, {
      endpoint,
      ...context,
    });
  }

  userAction(action: string, context?: Record<string, any>) {
    this.info(`User Action: ${action}`, {
      action,
      ...context,
    });
  }

  performanceLog(operation: string, duration: number, context?: Record<string, any>) {
    this.info(`Performance: ${operation} took ${duration}ms`, {
      operation,
      duration,
      ...context,
    });
  }

  // Get logs for debugging or export
  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }

  // Export logs as JSON
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Get error logs from localStorage
  getStoredErrorLogs(): LogEntry[] {
    try {
      return JSON.parse(localStorage.getItem('trygc-error-logs') || '[]');
    } catch {
      return [];
    }
  }

  // Clear stored error logs
  clearStoredErrorLogs() {
    localStorage.removeItem('trygc-error-logs');
  }
}

// Create singleton instance
export const logger = new Logger(
  process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO
);

// Performance monitoring utilities
export class PerformanceMonitor {
  private static timers = new Map<string, number>();

  static start(label: string) {
    this.timers.set(label, performance.now());
  }

  static end(label: string, context?: Record<string, any>) {
    const startTime = this.timers.get(label);
    if (startTime === undefined) {
      logger.warn(`Performance timer '${label}' was not started`);
      return;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(label);
    
    logger.performanceLog(label, Math.round(duration), context);
    
    return duration;
  }

  static measure<T>(label: string, fn: () => T, context?: Record<string, any>): T {
    this.start(label);
    try {
      const result = fn();
      this.end(label, context);
      return result;
    } catch (error) {
      this.end(label, { ...context, error: true });
      throw error;
    }
  }

  static async measureAsync<T>(
    label: string, 
    fn: () => Promise<T>, 
    context?: Record<string, any>
  ): Promise<T> {
    this.start(label);
    try {
      const result = await fn();
      this.end(label, context);
      return result;
    } catch (error) {
      this.end(label, { ...context, error: true });
      throw error;
    }
  }
}

// Error boundary helper
export function logError(error: Error, errorInfo?: any, context?: Record<string, any>) {
  logger.error('Unhandled Error', error, {
    errorInfo,
    stack: error.stack,
    ...context,
  });
}