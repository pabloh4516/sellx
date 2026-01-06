import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Hook for exporting data to CSV and Excel formats
 */
export function useDataExport() {
  const [exporting, setExporting] = useState(false);

  /**
   * Export data to CSV format
   * @param {Array} data - Array of objects to export
   * @param {string} filename - Filename without extension
   * @param {Object} options - Export options
   * @param {Array} options.columns - Column definitions { key, label }
   */
  const exportToCSV = (data, filename, options = {}) => {
    if (!data || data.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    setExporting(true);
    try {
      const columns = options.columns || Object.keys(data[0]).map(key => ({ key, label: key }));

      // Header row
      const header = columns.map(col => `"${col.label}"`).join(';');

      // Data rows
      const rows = data.map(item => {
        return columns.map(col => {
          let value = item[col.key];

          // Format based on type
          if (value === null || value === undefined) {
            value = '';
          } else if (typeof value === 'number') {
            value = value.toString().replace('.', ',');
          } else if (typeof value === 'boolean') {
            value = value ? 'Sim' : 'Nao';
          } else if (value instanceof Date) {
            value = value.toLocaleDateString('pt-BR');
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          }

          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(';');
      });

      const csv = [header, ...rows].join('\r\n');

      // Add BOM for Excel to recognize UTF-8
      const bom = '\uFEFF';
      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });

      downloadFile(blob, `${filename}.csv`);
      toast.success(`${data.length} registros exportados com sucesso!`);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setExporting(false);
    }
  };

  /**
   * Export data to Excel format (using CSV with specific formatting)
   * For true Excel format, you would need a library like xlsx
   */
  const exportToExcel = (data, filename, options = {}) => {
    if (!data || data.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    setExporting(true);
    try {
      const columns = options.columns || Object.keys(data[0]).map(key => ({ key, label: key }));

      // Create HTML table for Excel
      let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">';
      html += '<head><meta charset="UTF-8"></head>';
      html += '<body><table border="1">';

      // Header
      html += '<tr style="background-color:#4F46E5;color:white;font-weight:bold;">';
      columns.forEach(col => {
        html += `<th>${col.label}</th>`;
      });
      html += '</tr>';

      // Data rows
      data.forEach((item, index) => {
        const bgColor = index % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
        html += `<tr style="background-color:${bgColor}">`;
        columns.forEach(col => {
          let value = item[col.key];

          if (value === null || value === undefined) {
            value = '';
          } else if (typeof value === 'number') {
            value = value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
          } else if (typeof value === 'boolean') {
            value = value ? 'Sim' : 'Nao';
          } else if (value instanceof Date) {
            value = value.toLocaleDateString('pt-BR');
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          }

          html += `<td>${value}</td>`;
        });
        html += '</tr>';
      });

      html += '</table></body></html>';

      const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
      downloadFile(blob, `${filename}.xls`);
      toast.success(`${data.length} registros exportados com sucesso!`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setExporting(false);
    }
  };

  /**
   * Export data to JSON format
   */
  const exportToJSON = (data, filename) => {
    if (!data || data.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    setExporting(true);
    try {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      downloadFile(blob, `${filename}.json`);
      toast.success(`${data.length} registros exportados com sucesso!`);
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setExporting(false);
    }
  };

  /**
   * Helper function to download a file
   */
  const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Format date for export
   */
  const formatDateForExport = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  /**
   * Format currency for export
   */
  const formatCurrencyForExport = (value) => {
    if (value === null || value === undefined) return 0;
    return Number(value).toFixed(2);
  };

  return {
    exporting,
    exportToCSV,
    exportToExcel,
    exportToJSON,
    formatDateForExport,
    formatCurrencyForExport
  };
}
