import * as XLSX from 'xlsx';
import { logger } from './logger';

export interface ExportOptions {
  filename?: string;
  format?: 'xlsx' | 'csv' | 'json';
  includeHeaders?: boolean;
  dateFormat?: 'iso' | 'local' | 'timestamp';
}

export interface ExportColumn {
  key: string;
  label: string;
  formatter?: (value: any) => string;
}

export class DataExporter {
  static formatDate(date: string | Date, format: 'iso' | 'local' | 'timestamp' = 'local'): string {
    const d = new Date(date);
    
    switch (format) {
      case 'iso':
        return d.toISOString();
      case 'timestamp':
        return d.getTime().toString();
      case 'local':
      default:
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
    }
  }

  static formatValue(value: any, formatter?: (value: any) => string): string {
    if (formatter) {
      return formatter(value);
    }
    
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  }

  static prepareData<T extends Record<string, any>>(
    data: T[],
    columns: ExportColumn[],
    options: ExportOptions = {}
  ): any[][] {
    const { includeHeaders = true, dateFormat = 'local' } = options;
    
    const rows: any[][] = [];
    
    // Add headers if requested
    if (includeHeaders) {
      rows.push(columns.map(col => col.label));
    }
    
    // Add data rows
    data.forEach(item => {
      const row = columns.map(col => {
        let value = item[col.key];
        
        // Special handling for dates
        if (value && (col.key.includes('Date') || col.key.includes('At'))) {
          value = this.formatDate(value, dateFormat);
        }
        
        return this.formatValue(value, col.formatter);
      });
      
      rows.push(row);
    });
    
    return rows;
  }

  static exportToXLSX<T extends Record<string, any>>(
    data: T[],
    columns: ExportColumn[],
    options: ExportOptions = {}
  ): void {
    try {
      logger.info('Starting XLSX export', { 
        recordCount: data.length, 
        columnCount: columns.length,
        filename: options.filename,
      });

      const { filename = 'export.xlsx' } = options;
      const rows = this.prepareData(data, columns, options);
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      
      // Auto-size columns
      const colWidths = columns.map((col, index) => {
        const maxLength = Math.max(
          col.label.length,
          ...rows.slice(1).map(row => String(row[index] || '').length)
        );
        return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
      });
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      
      // Save file
      XLSX.writeFile(wb, filename);
      
      logger.info('XLSX export completed successfully', { 
        filename,
        recordCount: data.length,
      });
    } catch (error) {
      logger.error('XLSX export failed', error as Error, {
        recordCount: data.length,
        filename: options.filename,
      });
      throw error;
    }
  }

  static exportToCSV<T extends Record<string, any>>(
    data: T[],
    columns: ExportColumn[],
    options: ExportOptions = {}
  ): void {
    try {
      logger.info('Starting CSV export', { 
        recordCount: data.length, 
        columnCount: columns.length,
        filename: options.filename,
      });

      const { filename = 'export.csv' } = options;
      const rows = this.prepareData(data, columns, options);
      
      // Convert to CSV format
      const csvContent = rows
        .map(row => 
          row.map(cell => {
            const cellStr = String(cell || '');
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          }).join(',')
        )
        .join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      logger.info('CSV export completed successfully', { 
        filename,
        recordCount: data.length,
      });
    } catch (error) {
      logger.error('CSV export failed', error as Error, {
        recordCount: data.length,
        filename: options.filename,
      });
      throw error;
    }
  }

  static exportToJSON<T extends Record<string, any>>(
    data: T[],
    options: ExportOptions = {}
  ): void {
    try {
      logger.info('Starting JSON export', { 
        recordCount: data.length,
        filename: options.filename,
      });

      const { filename = 'export.json' } = options;
      
      // Create export object with metadata
      const exportData = {
        exportedAt: new Date().toISOString(),
        recordCount: data.length,
        data: data,
      };
      
      const jsonContent = JSON.stringify(exportData, null, 2);
      
      // Create and download file
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      logger.info('JSON export completed successfully', { 
        filename,
        recordCount: data.length,
      });
    } catch (error) {
      logger.error('JSON export failed', error as Error, {
        recordCount: data.length,
        filename: options.filename,
      });
      throw error;
    }
  }

  static export<T extends Record<string, any>>(
    data: T[],
    columns: ExportColumn[],
    options: ExportOptions = {}
  ): void {
    const { format = 'xlsx' } = options;
    
    switch (format) {
      case 'xlsx':
        this.exportToXLSX(data, columns, options);
        break;
      case 'csv':
        this.exportToCSV(data, columns, options);
        break;
      case 'json':
        this.exportToJSON(data, options);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
}

// Predefined column configurations for common data types
export const commonColumns = {
  tasks: [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Title' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'assignedTo', label: 'Assigned To' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'createdAt', label: 'Created At' },
    { key: 'updatedAt', label: 'Updated At' },
  ] as ExportColumn[],

  campaigns: [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Campaign Name' },
    { key: 'client', label: 'Client' },
    { key: 'status', label: 'Status' },
    { key: 'phase', label: 'Phase' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'budget', label: 'Budget', formatter: (value) => value ? `$${value.toLocaleString()}` : '' },
    { key: 'createdAt', label: 'Created At' },
  ] as ExportColumn[],

  users: [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'features', label: 'Features', formatter: (value) => Array.isArray(value) ? value.join(', ') : '' },
    { key: 'demoCompleted', label: 'Demo Completed', formatter: (value) => value ? 'Yes' : 'No' },
    { key: 'createdAt', label: 'Created At' },
  ] as ExportColumn[],

  successLogs: [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Title' },
    { key: 'detail', label: 'Detail' },
    { key: 'campaign', label: 'Campaign' },
    { key: 'agent', label: 'Agent' },
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Time' },
  ] as ExportColumn[],

  mistakes: [
    { key: 'id', label: 'ID' },
    { key: 'taskDescription', label: 'Task' },
    { key: 'campaign', label: 'Campaign' },
    { key: 'team', label: 'Team' },
    { key: 'mistakeDescription', label: 'Mistake Description' },
    { key: 'reportedBy', label: 'Reported By' },
    { key: 'reportedAt', label: 'Reported At' },
    { key: 'resolved', label: 'Resolved', formatter: (value) => value ? 'Yes' : 'No' },
    { key: 'resolvedBy', label: 'Resolved By' },
    { key: 'resolvedAt', label: 'Resolved At' },
  ] as ExportColumn[],
};