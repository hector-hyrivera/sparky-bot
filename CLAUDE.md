# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Sparky Bot is a Pokemon GO Discord bot built as a Cloudflare Worker. It provides real-time raid information, Pokemon stats, research tasks, and automated event announcements. The entire application is contained in a single `cloudflare-worker.js` file (1254 lines).

## Development Commands

### Core Development
```bash
# Install dependencies
pnpm install

# Local development with hot reload
pnpm run dev

# Run tests
pnpm test

# Deploy to Cloudflare Workers
pnpm run deploy

# Register Discord slash commands
pnpm run register
```

### Testing Utilities
```bash
# Test signature verification setup
pnpm run test:signature

# Run specific test
node --experimental-vm-modules node_modules/jest/bin/jest.js tests/worker.test.js
```

### Environment Setup
1. Copy `env.example` to `.env`
2. Set required variables: `CLIENT_ID`, `DISCORD_TOKEN`, `PUBLIC_KEY`
3. For local testing, set `GUILD_ID` (commands register instantly to specific guild vs 1 hour for global)

## Architecture

### Entry Point & Request Flow
- **Main file**: `cloudflare-worker.js`
- **Export pattern**: Default export with `fetch()` and `scheduled()` methods
- **Request pipeline**: Signature verification → Timestamp validation → Interaction routing → Response generation

### Interaction Types
1. **PING (type: 1)** - Discord verification, return PONG immediately
2. **APPLICATION_COMMAND (type: 2)** - Slash command execution
3. **APPLICATION_COMMAND_AUTOCOMPLETE_REQUEST (type: 4)** - Autocomplete suggestions

### Commands Structure
All commands are defined in `scripts/register-commands.js` and handled in `cloudflare-worker.js`:

- **Command handlers** live in lines 313-634 (function names like `handlePokemonCommand`)
- **Autocomplete handlers** live in lines 636-754 (`AutocompleteHandlers` object)
- **Admin commands** (lines 980-1037): `/eventschannel`, `/raidschannel`, `/eventsrun`
- **Command routing** (lines 1196-1231): `commandHandlers` object maps command names to functions

### Data Fetching & Caching
- **CacheManager class** (lines 33-60): Simple TTL-based in-memory cache (5 min default)
- **Cache keys**: 'pokedex', 'raidBosses', 'research', 'eggs'
- **Data sources** (CONFIG object, lines 4-30):
  - Pokemon data: pokemon-go-api.github.io
  - Raids/Events: ScrapedDuck GitHub repos
- **Fetch pattern**: Check cache → If miss, fetch + validate + store → Return

### Event Announcement System
- **Location**: Lines 756-955 (`checkAndAnnounceNewEvents` function)
- **Storage**: Cloudflare KV namespace (`EVENTS_KV` binding in wrangler.toml)
- **KV keys**:
  - `events_posted_ids` - Set of announced event IDs (prevents duplicates)
  - `events_channel_id` - Configured Discord channel for announcements
  - `raids_last_posted_date` - Tracks last weekly raids post
- **Trigger**: Cron every 30 minutes (configured in wrangler.toml)
- **First run logic**: Only announces future events to prevent backfill spam

### Weekly Raids Summary
- **Location**: Lines 1039-1082 (`postWeeklyRaidsUpdate` function)
- **Trigger**: Cron every Tuesday at 5 PM UTC
- **Prevents duplicates**: Checks `raids_last_posted_date` KV key

## Code Patterns & Conventions

### Discord Signature Verification
- **Location**: Lines 1092-1141
- **Headers required**: `x-signature-ed25519`, `x-signature-timestamp`
- **Validation**: Ed25519 signature + 5-minute timestamp window (prevents replay attacks)
- Always verify signatures before processing interactions

### Embed Creation
Use `EmbedUtils` object (lines 160-212) for consistent embed formatting:
```javascript
const embed = EmbedUtils.createBaseEmbed(title, CONFIG.COLORS.GREEN, description);
EmbedUtils.addField(embed, "Field Name", "Field Value", true);
EmbedUtils.setThumbnail(embed, imageUrl);
```

### Pokemon Form Handling
- **Functions**: `findPokemon()` (lines 237-272), `getAllPokemonWithForms()` (lines 274-289)
- Supports regional forms (Alolan, Galarian) and alternate forms
- Use fuzzy matching: normalize strings, check both base name and form name
- Image resolution: Check `form.assets.image` first, fallback to `pokemon.assets.image`

### Backward Compatibility
The `getAllRaids()` function (lines 291-310) supports both:
- **New schema**: Direct array of raids
- **Old schema**: Nested object with tier properties

Always maintain this dual support when modifying raid data handling.

### Error Handling
- Wrap all external API calls with try-catch
- Use `fetchWithValidation()` helper (lines 63-81) for consistent error handling
- Return user-friendly error messages in Discord embeds
- Log detailed errors to console for debugging

### Permission Checking
Use `hasAdminPermission()` (lines 957-968) for admin-only commands:
- Checks ADMINISTRATOR (0x8) or MANAGE_GUILD (0x20) permissions
- Use bitwise AND operation on `body.member.permissions` string

## Deployment Configuration

### wrangler.toml
- **Compatibility date**: 2024-09-23
- **Node.js compatibility**: Enabled for discord-interactions library
- **KV namespace**: `EVENTS_KV` binding (ID: 98a9806b9e5848ff965d0ec6c91df7d4)
- **Cron triggers**:
  - `*/30 * * * *` - Events check every 30 minutes
  - `0 17 * * TUE` - Weekly raids post (Tuesday 5 PM UTC)

### Secrets Management
Set secrets in Cloudflare Workers (not in wrangler.toml):
```bash
pnpm exec wrangler secret put CLIENT_ID
pnpm exec wrangler secret put DISCORD_TOKEN
pnpm exec wrangler secret put PUBLIC_KEY
```

## Adding New Commands

1. **Define command schema** in `scripts/register-commands.js`:
   ```javascript
   {
     name: "newcommand",
     description: "Command description",
     options: [
       { name: "param", description: "Param desc", type: 3, required: true }
     ]
   }
   ```

2. **Create handler function** in `cloudflare-worker.js`:
   ```javascript
   async function handleNewCommand(body, cacheManager) {
     // Fetch data (check cache first)
     // Generate embed using EmbedUtils
     // Return interaction response
   }
   ```

3. **Register in commandHandlers object** (around line 1196):
   ```javascript
   const commandHandlers = {
     // ... existing commands
     newcommand: handleNewCommand
   };
   ```

4. **Add autocomplete if needed** in `AutocompleteHandlers` object (lines 636-754)

5. **Run registration**: `pnpm run register`

## Testing Considerations

- Test signature verification with `scripts/test-signature.js`
- Mock Discord interactions in tests (see `tests/worker.test.js`)
- Test cache behavior with different TTL scenarios
- Verify backward compatibility when changing data schemas
- Test permission checks for admin commands

## Data Source Dependencies

Changes to external data schemas will require code updates:
- **Pokemon GO API**: Pokedex structure (name, types, stats, assets, forms)
- **ScrapedDuck raids.json**: Raid boss structure (name, tier, cp_range, shiny_available)
- **ScrapedDuck research.json**: Research task and reward structure
- **ScrapedDuck eggs.json**: Egg type and hatch list structure
- **ScrapedDuck events.json**: Event structure (id, name, eventID, start/end dates, image)

## Important Notes

- All code is in a single file (`cloudflare-worker.js`) - no separate module structure
- The bot uses interaction responses, not traditional Discord.js message handling
- Cloudflare Workers have no cold starts but have execution time limits (50ms CPU time on free tier)
- KV operations are eventually consistent - account for this in state management
- Discord allows max 25 autocomplete choices - always slice results
- Discord embeds support max 25 fields and 10 embeds per message
