import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, FileJson } from 'lucide-react';
import { useDataExport } from '@/hooks/useDataExport';

/**
 * ExportMenu component for exporting data in various formats
 * @param {Object} props
 * @param {Array} props.data - Data to export
 * @param {string} props.filename - Base filename (without extension)
 * @param {Array} props.columns - Column definitions [{ key, label }]
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {string} props.variant - Button variant
 * @param {string} props.size - Button size
 */
export function ExportMenu({
  data = [],
  filename = 'export',
  columns = [],
  disabled = false,
  variant = 'outline',
  size = 'default',
}) {
  const { exporting, exportToCSV, exportToExcel, exportToJSON } = useDataExport();

  const handleExportCSV = () => {
    exportToCSV(data, filename, { columns });
  };

  const handleExportExcel = () => {
    exportToExcel(data, filename, { columns });
  };

  const handleExportJSON = () => {
    exportToJSON(data, filename);
  };

  const isDisabled = disabled || exporting || !data || data.length === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isDisabled}>
          {exporting ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {data.length} registro(s)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileText className="w-4 h-4 mr-2 text-green-600" />
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>
          <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
          Exportar Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJSON}>
          <FileJson className="w-4 h-4 mr-2 text-orange-500" />
          Exportar JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
