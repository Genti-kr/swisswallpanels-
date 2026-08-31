import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

dotenv.config({ path: path.join(root, 'apps/web/.env.local') });
dotenv.config({ path: path.join(root, '.env') });

const REQUIRED = [
  'COMPANY_LEGAL_NAME',
  'COMPANY_LEGAL_FORM',
  'COMPANY_STREET',
  'COMPANY_POST_CODE',
  'COMPANY_CITY',
  'COMPANY_PHONE',
  'COMPANY_CONTACT_EMAIL',
  'COMPANY_DIRECTOR_NAME',
  'COMPANY_UID',
  'COMPANY_TRADE_REGISTER',
] as const;

const missing = REQUIRED.filter((key) => !process.env[key]?.trim());

if (missing.length > 0) {
  console.error('Missing required COMPANY_* variables:\n');
  for (const key of missing) {
    console.error(`  - ${key}`);
  }
  console.error('\nCopy company.env.example → apps/web/.env.local and fill in real Swiss company data.');
  process.exit(1);
}

console.log('✓ All required COMPANY_* variables are set.');
console.log(`  Legal name: ${process.env.COMPANY_LEGAL_NAME}`);
console.log(`  UID: ${process.env.COMPANY_UID}`);
