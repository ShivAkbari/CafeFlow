import fs from 'fs';
import path from 'path';

// 1. Ensure .env.production.local and .env.local are synchronized with .env.production
const prodEnvPath = path.join(process.cwd(), '.env.production');
const prodEnvLocalPath = path.join(process.cwd(), '.env.production.local');
const envLocalPath = path.join(process.cwd(), '.env.local');

if (fs.existsSync(prodEnvPath)) {
  fs.copyFileSync(prodEnvPath, prodEnvLocalPath);
  fs.copyFileSync(prodEnvPath, envLocalPath);
  console.log('Synchronized .env.production -> .env.production.local & .env.local');
}
