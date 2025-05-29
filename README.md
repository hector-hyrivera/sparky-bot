# Sparky Bot

A Discord bot that provides Pokemon GO related information and utilities, implemented as a serverless application using Cloudflare Workers.

## Features

- `/pokemon` - Get detailed information about any Pokemon
- `/hundo` - Get perfect IV CP values for current raid bosses
- `/currentraids` - List all current raid bosses and their perfect IV CP values
- `/raidboss` - Get detailed information about a specific raid boss with images
- `/research` - Get information about research tasks and their rewards
- `/egg` - Get information about what Pokemon can hatch from different egg types

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

```bash
pnpm install
```

## Deploying to Cloudflare Workers

1. **Login to Cloudflare**:

   ```bash
   pnpm exec wrangler login
   ```

2. **Set up secrets in Cloudflare Workers**:

   ```bash
   pnpm exec wrangler secret put CLIENT_ID
   pnpm exec wrangler secret put DISCORD_TOKEN
   pnpm exec wrangler secret put PUBLIC_KEY
   ```

   You'll be prompted to enter each value.

3. **Run the bot locally for testing**:

   ```bash
   pnpm run dev
   ```

4. **Deploy to Cloudflare Workers**:

   ```bash
   pnpm run deploy
   ```

   The deploy command will output your Worker's URL. Set this as your Discord Interactions Endpoint URL.

5. **Register commands**:

   ```bash
   pnpm run register
   ```

By default, this will register commands for the guild specified in your .env file.
To register commands globally (may take up to an hour to propagate):

1. Remove GUILD_ID from your .env file
2. Run `pnpm run register`

## Technical Details

### Architecture

- **Cloudflare Worker**: Handles Discord Interactions via HTTP requests using a serverless model
- **Discord Interactions API**: Processes slash commands and autocompletions
- **Fresh Data**: Data is fetched in real-time from the Pokémon GO API and other sources
- **Caching**: Implements smart caching for Pokedex, research tasks, and egg data

### Advantages of Cloudflare Workers

1. **Global Edge Network**: Low latency worldwide with automatic region routing
2. **Free Tier**: Generous free tier (100,000 requests per day)
3. **No Cold Starts**: Unlike AWS Lambda or other serverless platforms
4. **Simple Deployment**: Easy deployment with Wrangler CLI
5. **Built-in Caching**: Efficient data delivery with Cloudflare's edge network

## Data Sources

The bot aggregates data from multiple reliable sources:

- [Pokemon GO API](https://github.com/pokemon-go-api/pokemon-go-api) for:
  - Pokemon base data and stats
  - Current raid bosses
  - Perfect IV CP calculations
- [ScrapedDuck](https://github.com/bigfoott/ScrapedDuck) for:
  - Research task data
  - Egg hatch information
- Discord API for bot functionality and interactions

## Legal Documents

- [Terms of Service](TERMS.md)
- [Privacy Policy](PRIVACY.md)
- [MIT License](LICENSE)

## Support

For support, please:

- Email us at <developer@hyrivera.com>
- Open an issue on GitHub

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

We are grateful to the following projects and services:

- [Pokemon GO API](https://github.com/pokemon-go-api/pokemon-go-api) for providing comprehensive Pokemon data
- [ScrapedDuck](https://github.com/bigfoott/ScrapedDuck) for research and egg data
- Discord for their excellent developer platform and APIs
- Cloudflare for their powerful Workers platform
