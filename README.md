# Sparky Bot - Pokemon GO Raid Assistant

A Discord bot that provides information about current Pokemon GO raid bosses and their perfect IV CP values.

## Features

- `/hundo <pokemon>` - Get the perfect IV CP for a specific raid boss
- `/currentraids` - List all current raid bosses by tier

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following content:
   ```
   DISCORD_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_application_client_id_here
   ```
4. Start the bot:
   ```bash
   npm start
   ```

## Getting Your Discord Bot Token

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section and create a bot
4. Copy the bot token and add it to your `.env` file
5. Go to the "OAuth2" section and copy your application's Client ID
6. Add the Client ID to your `.env` file

## Inviting the Bot to Your Server

1. Go to the OAuth2 section in the Discord Developer Portal
2. Under "Scopes", select "bot" and "applications.commands"
3. Under "Bot Permissions", select:
   - Send Messages
   - Use Slash Commands
4. Copy the generated URL and open it in your browser to invite the bot to your server

## Usage

- Use `/hundo <pokemon>` to get the perfect IV CP for a specific raid boss
  Example: `/hundo Tapu Fini`
  
- Use `/currentraids` to see a list of all current raid bosses organized by tier 