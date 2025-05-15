import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.resolve(__dirname, '../cloudflare-worker.js');

describe('Cloudflare Worker Tests', () => {
  test('Worker file exists', () => {
    expect(fs.existsSync(workerPath)).toBe(true);
  });

  test('Worker file contains expected exports and methods', () => {
    const workerContent = fs.readFileSync(workerPath, 'utf8');
    expect(workerContent).toContain('export default');
    expect(workerContent).toContain('async fetch(');
  });

  test('Worker contains critical functions', () => {
    const workerContent = fs.readFileSync(workerPath, 'utf8');
    expect(workerContent).toContain('async function getPokedex()');
    expect(workerContent).toContain('async function getRaidBosses()');
    expect(workerContent).toContain('async function findPokemon(');
  });

  test('Worker handles required interaction types', () => {
    const workerContent = fs.readFileSync(workerPath, 'utf8');
    // Check for PING response (type 1)
    expect(workerContent).toContain('if (body.type === 1)');
    // Check for APPLICATION_COMMAND handler (type 2)
    expect(workerContent).toContain('if (body.type === 2)');
    // Check for autocomplete handler (type 4)
    expect(workerContent).toContain('if (body.type === 4)');
  });

  test('Worker implements all required commands', () => {
    const workerContent = fs.readFileSync(workerPath, 'utf8');
    expect(workerContent).toContain('case \'pokemon\'');
    expect(workerContent).toContain('case \'hundo\'');
    expect(workerContent).toContain('case \'currentraids\'');
    expect(workerContent).toContain('case \'raidboss\'');
  });
}); 