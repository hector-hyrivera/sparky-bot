// This file serves as the project entry point
// It re-exports the Cloudflare Worker for easier imports

import worker from './cloudflare-worker.js';

export default worker;

// Export registration function for programmatic access
export { registerCommands } from './scripts/register-commands.js';

// Include information about the project
export const info = {
  name: 'sparky-bot',
  description: 'A serverless Pokemon GO Discord bot using Cloudflare Workers',
  version: '1.0.0',
  author: 'Hector Rivera'
}; 