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

  test('Worker file contains expected methods and features', () => {
    const workerContent = fs.readFileSync(workerPath, 'utf8');
    // Should contain handleEventsCommand and getEventsData
    expect(workerContent).toMatch(/async\s+function\s+handleEventsCommand/);
    expect(workerContent).toMatch(/async\s+function\s+getEventsData/);
    // Should contain main request handler (look for verifyKey and Discord interaction handling)
    expect(workerContent).toContain('verifyKey');
    expect(workerContent).toMatch(/body\.type\s*===\s*1/);
    expect(workerContent).toMatch(/body\.type\s*===\s*2/);
    expect(workerContent).toMatch(/body\.type\s*===\s*4/);
  });

  test('Worker contains critical functions', () => {
    const workerContent = fs.readFileSync(workerPath, 'utf8');
    expect(workerContent).toMatch(/async\s+function\s+getPokedex/);
    expect(workerContent).toMatch(/async\s+function\s+getRaidBosses/);
    expect(workerContent).toMatch(/function\s+findPokemon\s*\(/);
    // Should contain event color palette and embed utils
    expect(workerContent).toMatch(/const\s+EVENT_TYPE_COLORS/);
    expect(workerContent).toMatch(/const\s+EmbedUtils\s*=\s*\{/);
  });

  test('Worker handles required interaction types', () => {
    const workerContent = fs.readFileSync(workerPath, 'utf8');
    // Check for PING response (type 1)
    expect(workerContent).toMatch(/body\.type\s*===\s*1/);
    // Check for APPLICATION_COMMAND handler (type 2)
    expect(workerContent).toMatch(/body\.type\s*===\s*2/);
    // Check for autocomplete handler (type 4)
    expect(workerContent).toMatch(/body\.type\s*===\s*4/);
    // Should handle event selection and summary logic
    expect(workerContent).toMatch(/Select an event for details/);
  });

  test('Worker implements all required commands', () => {
    const workerContent = fs.readFileSync(workerPath, 'utf8');
    // Check for command handlers in the new structure
    expect(workerContent).toMatch(/pokemon:\s*handlePokemonCommand/);
    expect(workerContent).toMatch(/hundo:\s*handleHundoCommand/);
    expect(workerContent).toMatch(/currentraids:\s*handleCurrentRaidsCommand/);
    expect(workerContent).toMatch(/raidboss:\s*handleRaidBossCommand/);
    // Should contain events command
    expect(workerContent).toMatch(/events:\s*handleEventsCommand/);
  });

  test('Worker contains optimized features', () => {
    const workerContent = fs.readFileSync(workerPath, 'utf8');
    // Check for new optimized features
    expect(workerContent).toMatch(/const\s+CONFIG\s*=\s*\{/);
    expect(workerContent).toMatch(/class\s+CacheManager/);
    expect(workerContent).toMatch(/const\s+EmbedUtils\s*=\s*\{/);
    expect(workerContent).toMatch(/const\s+AutocompleteHandlers\s*=\s*\{/);
    expect(workerContent).toMatch(/fetchWithValidation/);
    // Should contain autocomplete for events
    expect(workerContent).toMatch(/async\s+events\s*\(/);
    // Should contain summary/details logic for events
    expect(workerContent).toMatch(/Current & upcoming events:/);
  });

  test('Worker has proper error handling', () => {
    const workerContent = fs.readFileSync(workerPath, 'utf8');
    expect(workerContent).toContain('try {');
    expect(workerContent).toContain('catch (error)');
    expect(workerContent).toContain('console.error');
  });
}); 