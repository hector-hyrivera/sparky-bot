import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

// Command definitions
const commands = [
  {
    name: "hundo",
    description: "Get the perfect IV CP for a raid boss",
    options: [
      {
        name: "pokemon",
        description: "The name of the Pokemon",
        type: 3, // STRING
        required: true,
        autocomplete: true
      }
    ]
  },
  {
    name: "currentraids",
    description: "List all current raid bosses"
  },
  {
    name: "pokemon",
    description: "Get information about a Pokemon",
    options: [
      {
        name: "name",
        description: "The name of the Pokemon",
        type: 3, // STRING
        required: true,
        autocomplete: true
      }
    ]
  },
  {
    name: "raidboss",
    description: "Get detailed information about a raid boss",
    options: [
      {
        name: "name",
        description: "The name of the raid boss",
        type: 3, // STRING
        required: true,
        autocomplete: true
      }
    ]
  }
];

// Environment variables
const TOKEN = process.env.DISCORD_TOKEN;
const APPLICATION_ID = process.env.CLIENT_ID;

// Check if environment variables are set
if (!TOKEN || !APPLICATION_ID) {
  console.error('Error: DISCORD_TOKEN and CLIENT_ID must be set in environment variables');
  process.exit(1);
}

// Decide if you want to register commands globally or for a specific guild
// For development, use guild commands (faster updates)
// For production, use global commands
const GUILD_ID = process.env.GUILD_ID; // Optional for testing

export async function registerCommands() {
  // URL for global commands (slower to update, but available everywhere)
  let url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;
  
  // If GUILD_ID is provided, use guild commands instead (faster updates, but only in one server)
  if (GUILD_ID) {
    url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`;
    console.log('Registering commands for guild:', GUILD_ID);
  } else {
    console.log('Registering global commands');
  }

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error response: ${response.status} ${text}`);
    }

    const data = await response.json();
    console.log('Successfully registered commands:');
    data.forEach(command => {
      console.log(`- ${command.name}`);
    });
    
    return data;
  } catch (error) {
    console.error('Error registering commands:', error);
    throw error;
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  registerCommands()
    .then(() => console.log('Command registration completed'))
    .catch(err => {
      console.error('Failed to register commands:', err);
      process.exit(1);
    });
} 