import { z } from 'zod';

export const detectionRuleSchema = z.object({
  name: z.string().min(3, 'Rule name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  category: z.string().min(2, 'Category must be defined'),
  mitreAttack: z.string().regex(/^T\d{4}(\.\d{3})?$/, 'Must be a valid Mitre ATT&CK ID (e.g. T1078 or T1566.002)'),
  query: z.string().min(5, 'Query logic representation is required'),
  enabled: z.boolean().default(true),
});

export type DetectionRuleInput = z.infer<typeof detectionRuleSchema>;
