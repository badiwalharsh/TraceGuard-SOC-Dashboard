import { z } from 'zod';

export const createAssetSchema = z.object({
  hostname: z.string().min(2, 'Hostname must be at least 2 characters').max(50, 'Hostname cannot exceed 50 characters'),
  ipAddress: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 'Invalid IPv4 address format'),
  assetType: z.enum(['WORKSTATION', 'SERVER', 'DATABASE', 'CLOUD_VM', 'NET_DEVICE']),
  owner: z.string().min(2, 'Owner must be at least 2 characters').max(100, 'Owner cannot exceed 100 characters'),
  criticality: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  os: z.string().min(2, 'OS description is required'),
  location: z.string().min(2, 'Location description is required'),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
