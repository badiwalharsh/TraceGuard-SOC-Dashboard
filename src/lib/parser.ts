import Papa from 'papaparse';
import { importAlertSchema, ImportAlertInput } from '../schemas/import';

interface ParseResult {
  alerts: ImportAlertInput[];
  errors: string[];
}

const MAX_ALERT_ROWS = 100; // Limit rows to prevent performance exhaustion

/**
 * Safely parses string content as CSV or JSON and validates it against the Zod schema.
 */
export function parseAlerts(content: string, type: 'csv' | 'json'): ParseResult {
  const alerts: ImportAlertInput[] = [];
  const errors: string[] = [];

  if (!content || content.trim().length === 0) {
    return { alerts, errors: ['File content is empty.'] };
  }

  // Capping length of input string to prevent DOS
  if (content.length > 5 * 1024 * 1024) {
    return { alerts, errors: ['File size exceeds the 5MB safety limit.'] };
  }

  if (type === 'json') {
    try {
      const parsed = JSON.parse(content);
      const dataArray = Array.isArray(parsed) ? parsed : [parsed];

      if (dataArray.length > MAX_ALERT_ROWS) {
        errors.push(`Row limit exceeded. A maximum of ${MAX_ALERT_ROWS} alerts can be uploaded at once.`);
        return { alerts, errors };
      }

      for (let i = 0; i < dataArray.length; i++) {
        const item = dataArray[i];
        const validation = importAlertSchema.safeParse(item);
        if (validation.success) {
          alerts.push(validation.data);
        } else {
          const rowError = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
          errors.push(`Row ${i + 1}: ${rowError}`);
        }
      }
    } catch {
      errors.push('Invalid JSON syntax.');
    }
  } else {
    // Parse as CSV
    try {
      const parsedCSV = Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsedCSV.errors && parsedCSV.errors.length > 0) {
        parsedCSV.errors.forEach(e => {
          errors.push(`CSV parsing error on row ${e.row ?? 'unknown'}: ${e.message}`);
        });
      }

      const rows = parsedCSV.data as Record<string, string>[];

      if (rows.length > MAX_ALERT_ROWS) {
        errors.push(`Row limit exceeded. A maximum of ${MAX_ALERT_ROWS} alerts can be uploaded at once.`);
        return { alerts, errors };
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Clean fields that might be null or undefined
        const cleanRow: Record<string, string | null> = {};
        for (const [key, val] of Object.entries(row)) {
          cleanRow[key.trim()] = val ? val.trim() : null;
        }

        const validation = importAlertSchema.safeParse(cleanRow);
        if (validation.success) {
          alerts.push(validation.data);
        } else {
          const rowError = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
          errors.push(`Row ${i + 1} (${row.ruleName || 'Unnamed rule'}): ${rowError}`);
        }
      }
    } catch (e: unknown) {
      errors.push(`Failed to parse CSV: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  return { alerts, errors };
}
