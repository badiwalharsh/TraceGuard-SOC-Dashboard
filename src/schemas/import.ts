import { z } from 'zod';

// CSV Injection / Formula injection prevention: strips or escapes cells beginning with formulas
export function sanitizeCSVValue(value: string): string {
  const formulaChars = ['=', '+', '-', '@', '\t', '\r'];
  if (value && formulaChars.some(char => value.startsWith(char))) {
    // Prefix with a single quote to prevent execution in spreadsheet software, or strip it
    return `'${value.replace(/['"=+\-@]/g, '')}`;
  }
  return value;
}

export const importAlertSchema = z.object({
  timestamp: z.string().transform(val => {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }).default(() => new Date().toISOString()),
  ruleName: z.string().min(2, 'Rule name is required').transform(sanitizeCSVValue),
  category: z.string().min(2, 'Category is required').transform(sanitizeCSVValue),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  sourceIp: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 'Invalid IPv4 address').nullable().or(z.literal('')).transform(val => val || null).optional(),
  destIp: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 'Invalid IPv4 address').nullable().or(z.literal('')).transform(val => val || null).optional(),
  targetHost: z.string().transform(sanitizeCSVValue).optional(),
  details: z.string().min(5, 'Details are required').transform(sanitizeCSVValue),
  mitreAttack: z.string().regex(/^T\d{4}(\.\d{3})?$/, 'Invalid Mitre ATT&CK ID').optional(),
});

export type ImportAlertInput = z.infer<typeof importAlertSchema>;

export const importPayloadSchema = z.object({
  content: z.string().min(1, 'File content is empty'),
  format: z.enum(['csv', 'json']),
  preview: z.boolean().default(false),
  duplicateHandling: z.enum(['SKIP', 'OVERWRITE', 'DUPLICATE']).default('SKIP'),
});

export type ImportPayloadInput = z.infer<typeof importPayloadSchema>;
