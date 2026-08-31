import { z } from 'zod';

export const updateIncidentSchema = z.object({
  status: z.enum(['NEW', 'OPEN', 'INVESTIGATING', 'CONTAINED', 'RESOLVED', 'CLOSED']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assignedToId: z.string().nullable().optional(),
});

export const addNoteSchema = z.object({
  content: z.string().min(1, 'Note content cannot be empty').max(2000, 'Note content cannot exceed 2000 characters'),
});

export const createIncidentSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  category: z.string().min(2, 'Category must be defined'),
  sourceIp: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 'Invalid IPv4 address').nullable().optional(),
  destIp: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 'Invalid IPv4 address').nullable().optional(),
  ruleId: z.string().nullable().optional(),
  assetId: z.string().nullable().optional(), // optionally associate with an asset immediately
});

export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;
export type AddNoteInput = z.infer<typeof addNoteSchema>;
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
