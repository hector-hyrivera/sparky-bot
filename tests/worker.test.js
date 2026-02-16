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
    expect(workerContent).toContain('function findPokemon(');
    expect(workerContent).toContain('async function getRocketLineups()');
    expect(workerContent).toContain('async function getPromoCodes()');
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
    expect(workerContent).toContain('pokemon: handlePokemonCommand');
    expect(workerContent).toContain('hundo: handleHundoCommand');
    expect(workerContent).toContain('currentraids: handleCurrentRaidsCommand');
    expect(workerContent).toContain('raidboss: handleRaidBossCommand');
    expect(workerContent).toContain('rocket: handleRocketCommand');
    expect(workerContent).toContain('promocodes: handlePromoCodesCommand');
  });

  test('Worker contains new command handler functions', () => {
    const workerContent = fs.readFileSync(workerPath, 'utf8');
    expect(workerContent).toContain('async function handleRocketCommand(');
    expect(workerContent).toContain('async function handlePromoCodesCommand(');
  });

  test('Worker contains optimized features', () => {
    const workerContent = fs.readFileSync(workerPath, 'utf8');
    expect(workerContent).toContain('const CONFIG = {');
    expect(workerContent).toContain('class CacheManager');
    expect(workerContent).toContain('const EmbedUtils = {');
    expect(workerContent).toContain('const AutocompleteHandlers = {');
    expect(workerContent).toContain('fetchWithValidation');
  });

  test('Worker has proper error handling', () => {
    const workerContent = fs.readFileSync(workerPath, 'utf8');
    expect(workerContent).toContain('try {');
    expect(workerContent).toContain('catch (error)');
    expect(workerContent).toContain('console.error');
  });

  test('Worker uses new ScrapedDuck fork for all endpoints', () => {
    const workerContent = fs.readFileSync(workerPath, 'utf8');
    // No remaining references to bigfoott/ScrapedDuck
    expect(workerContent).not.toContain('bigfoott/ScrapedDuck');
    // All ScrapedDuck URLs point to the new fork
    expect(workerContent).toContain('hector-hyrivera/ScrapedDuck/data/raids.json');
    expect(workerContent).toContain('hector-hyrivera/ScrapedDuck/data/research.json');
    expect(workerContent).toContain('hector-hyrivera/ScrapedDuck/data/eggs.json');
    expect(workerContent).toContain('hector-hyrivera/ScrapedDuck/data/events.json');
    expect(workerContent).toContain('hector-hyrivera/ScrapedDuck/data/rocketLineups.json');
    expect(workerContent).toContain('hector-hyrivera/ScrapedDuck/data/promoCodes.json');
  });

  test('Worker uses new research data schema with tasks property', () => {
    const workerContent = fs.readFileSync(workerPath, 'utf8');
    // Research fetcher validates new object schema
    expect(workerContent).toContain('data && Array.isArray(data.tasks)');
    // Research handler accesses tasks from data object
    expect(workerContent).toContain('researchData?.tasks');
  });
});
