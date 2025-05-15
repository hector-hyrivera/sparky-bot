# Sparky Bot

A Discord bot that provides Pokemon GO related information and utilities, implemented as a serverless application using Cloudflare Workers.

## Features

- `/pokemon` - Get detailed information about any Pokemon
- `/hundo` - Get perfect IV CP values for current raid bosses
- `/currentraids` - List all current raid bosses and their perfect IV CP values
- `/raidboss` - Get detailed information about a specific raid boss with images

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
   
   Then set the Interactions Endpoint URL in your Discord application settings.

4. **Deploy to Cloudflare Workers**:
   ```
   npm run deploy
   ```
   
   The deploy command will output your Worker's URL. Set this as your Discord Interactions Endpoint URL.

5. **Register commands**:
   ```
   npm run register
   ```
   
   By default, this will register commands for the guild specified in your .env file.
   To register commands globally (may take up to an hour to propagate):
   1. Remove GUILD_ID from your .env file
   2. Run `npm run register`

## Technical Details

### Architecture

- **Cloudflare Worker**: Handles Discord Interactions via HTTP requests
- **Discord Interactions API**: Processes slash commands
- **Fresh Data**: Data is fetched from the Pokémon GO API

### Advantages of Cloudflare Workers

1. **Global Edge Network**: Low latency worldwide
2. **Free Tier**: Generous free tier (100,000 requests per day)
3. **No Cold Starts**: Unlike AWS Lambda or other serverless platforms
4. **Simple Deployment**: Easy deployment with Wrangler CLI

## Data Sources

This bot uses the following APIs:
- [Pokemon GO API](https://github.com/pokemon-go-api/pokemon-go-api) for Pokemon and raid data
- Discord API for bot functionality

## Legal Documents

- [Terms of Service](TERMS.md)
- [Privacy Policy](PRIVACY.md)
- [MIT License](LICENSE)

## Support

For support, please:
- Email us at developer@hyrivera.com
- Open an issue on GitHub

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Pokemon GO API](https://github.com/pokemon-go-api/pokemon-go-api) for providing the Pokemon data
- Discord Interactions API
- Cloudflare Workers platform 