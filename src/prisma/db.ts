import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

const connectionString = process.env['DATABASE_URL'] || 'postgresql://traceguard_admin:traceguard_secure_pass_2026@localhost:5432/traceguard_db?schema=public';

export const db = postgres<Contract>({
  contractJson,
  url: connectionString,
});
