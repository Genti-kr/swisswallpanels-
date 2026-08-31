import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function generateSecret(): string {
  return crypto.randomBytes(48).toString('base64url');
}

function upsertEnvFile(filePath: string, updates: Record<string, string>, write: boolean) {
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';

  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}="${value}"`;
    const pattern = new RegExp(`^${key}=.*$`, 'm');

    if (pattern.test(content)) {
      content = content.replace(pattern, line);
    } else {
      content = content.endsWith('\n') || content.length === 0 ? `${content}${line}\n` : `${content}\n${line}\n`;
    }
  }

  if (write) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }

  return updates;
}

const root = path.resolve(__dirname, '..');
const jwtSecret = generateSecret();
const jwtRefreshSecret = generateSecret();
const authSecret = generateSecret();
const consentSalt = generateSecret();

const apiUpdates = {
  JWT_SECRET: jwtSecret,
  JWT_REFRESH_SECRET: jwtRefreshSecret,
  AUTH_SECRET: authSecret,
  CONSENT_LOG_SALT: consentSalt,
};

const webUpdates = {
  AUTH_SECRET: authSecret,
  JWT_SECRET: jwtSecret,
};

const write = process.argv.includes('--write');

console.log('=== Generated secrets (48 bytes, base64url) ===\n');
console.log('# API (apps/api/.env)');
for (const [k, v] of Object.entries(apiUpdates)) {
  console.log(`${k}="${v}"`);
}
console.log('\n# Web (apps/web/.env.local) — must match AUTH_SECRET + JWT_SECRET');
for (const [k, v] of Object.entries(webUpdates)) {
  console.log(`${k}="${v}"`);
}

if (write) {
  upsertEnvFile(path.join(root, 'apps/api/.env'), apiUpdates, true);
  upsertEnvFile(path.join(root, 'apps/web/.env.local'), webUpdates, true);
  console.log('\n✓ Secrets written. Restart pnpm dev. Users must log in again.');
} else {
  console.log('\nDry run only. Apply with: pnpm generate:secrets -- --write');
}
