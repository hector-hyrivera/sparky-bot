# Sparky Bot Serverless

This is a serverless version of Sparky Bot, a Discord bot for Pokémon GO raid information. This implementation uses Discord's Interactions API and is optimized for deployment on Cloudflare Workers.

## Setup

1. **Create a Discord application**:
   - Go to the [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to the "Bot" tab and add a bot user
   - Note your Client ID, Discord Token, and Public Key

2. **Set up environment variables**:
   - Copy `env.example` to `.env`
   - Fill in your Client ID, Discord Token, and Public Key
   - For testing, provide your Guild ID (server ID)

3. **Install dependencies**:
   ```
   npm install
   ```

## Deploying to Cloudflare Workers

1. **Login to Cloudflare**:
   ```
   npx wrangler login
   ```

2. **Set up secrets in Cloudflare Workers**:
   ```
   npx wrangler secret put CLIENT_ID
   npx wrangler secret put DISCORD_TOKEN
   npx wrangler secret put PUBLIC_KEY
   ```
   You'll be prompted to enter each value.

3. **Run the bot locally for testing**:
   ```
   npm run dev
   ```
   
   You can use a service like [ngrok](https://ngrok.com/) to create a public URL:
   ```
   ngrok http 8787
   ```
   
   Then set the Interactions Endpoint URL in your Discord application settings to:
   ```
   https://your-ngrok-url.ngrok.io
   ```

4. **Deploy to Cloudflare Workers**:
   ```
   npm run deploy
   ```
   
   The deploy command will output your Worker's URL. Set this as your Discord Interactions Endpoint URL:
   ```
   https://sparky-bot.your-username.workers.dev
   ```

5. **Register commands**:
   ```
   npm run register
   ```
   
   By default, this will register commands for the guild specified in your .env file.
   To register commands globally (may take up to an hour to propagate):
   1. Remove GUILD_ID from your .env file
   2. Run `npm run register`

## CI/CD Setup

This repository includes GitHub Actions workflow for automatic deployment:

1. **Set up GitHub Secrets**:
   - `CF_API_TOKEN`: Your Cloudflare API token with Workers access
   - `CLIENT_ID`: Your Discord application client ID
   - `DISCORD_TOKEN`: Your Discord bot token
   - `PUBLIC_KEY`: Your Discord application public key

2. **Enable GitHub Actions**:
   The workflow will automatically deploy when you push to the main branch.

3. **Test your deployment process**:
   You can run the included deployment test script locally to verify everything works:
   ```
   ./deploy-test.sh
   ```

## Troubleshooting CI/CD Issues

If you encounter issues with the CI/CD pipeline:

1. **Check Node.js version**: Make sure your local and CI environments use compatible Node.js versions.

2. **Verify wrangler configuration**: Both wrangler.toml and wrangler.jsonc are provided for maximum compatibility.

3. **Dependency issues**: If you encounter dependency problems:
   ```
   npm ci && npm run build
   ```
   
4. **Manual deployment**: If CI fails but local works, use:
   ```
   npm run deploy
   ```

## Testing

To test the bot locally without connecting to Discord:
```
npm test
```

This runs the local test script which simulates Discord interactions with your Worker.

## Commands

The bot provides the following slash commands:

- `/pokemon [name]`: Get information about a specific Pokémon
- `/hundo [pokemon]`: Get the perfect IV CP for a raid boss
- `/currentraids`: List all current raid bosses
- `/raidboss [name]`: Get detailed information about a specific raid boss

## Technical Details

### Architecture

- **Cloudflare Worker**: Handles Discord Interactions via HTTP requests
- **Discord Interactions API**: Processes slash commands
- **Fresh Data**: Data is fetched for each request from the Pokémon GO API

### Advantages of Cloudflare Workers

1. **Global Edge Network**: Low latency worldwide
2. **Free Tier**: Generous free tier (100,000 requests per day)
3. **No Cold Starts**: Unlike AWS Lambda or other serverless platforms
4. **Simple Deployment**: Easy deployment with Wrangler CLI

### Limitations

1. **CPU Time**: Limited to 50ms on the free plan (but can be upgraded)
2. **Memory**: Limited to 128MB (sufficient for this application)

## File Structure

- `cloudflare-worker.js` - Main Worker script handling Discord interactions
- `index.js` - Entry point that exports the Worker
- `register-commands.js` - Script to register slash commands with Discord
- `wrangler.toml` - Cloudflare Workers configuration
- `local-test.js` - Local testing utilities
- `deploy.sh` - Deployment helper script

## How This Differs from the Original Bot

The original bot used Discord.js and maintained a persistent WebSocket connection to Discord. This serverless version:

1. Uses Discord's Interactions API with HTTP endpoints
2. Only runs code when a command is invoked
3. Loads data fresh for each request (no persistent cache)
4. Is more cost-effective for intermittent usage
5. Runs on Cloudflare's global edge network for improved response times 