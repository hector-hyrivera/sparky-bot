require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

// Debug logging
console.log('Environment variables:');
console.log('CLIENT_ID:', process.env.CLIENT_ID);
console.log('DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? 'Token exists' : 'Token missing');

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Command definitions
const commands = [
    new SlashCommandBuilder()
        .setName('hundo')
        .setDescription('Get the perfect IV CP for a raid boss')
        .addStringOption(option =>
            option.setName('pokemon')
                .setDescription('The name of the Pokemon')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('currentraids')
        .setDescription('List all current raid bosses')
].map(command => command.toJSON());

// Register commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

// Fetch raid boss data
async function getRaidBosses() {
    try {
        const response = await fetch('https://pokemon-go-api.github.io/pokemon-go-api/api/raidboss.json');
        return await response.json();
    } catch (error) {
        console.error('Error fetching raid bosses:', error);
        return null;
    }
}

// Handle commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'hundo') {
        const pokemonName = interaction.options.getString('pokemon').toLowerCase();
        const raidData = await getRaidBosses();
        
        if (!raidData) {
            await interaction.reply('Sorry, I couldn\'t fetch the raid data at the moment.');
            return;
        }

        // Search through all raid levels
        const allRaids = [
            ...(raidData.currentList.mega || []),
            ...(raidData.currentList.lvl5 || []),
            ...(raidData.currentList.lvl3 || []),
            ...(raidData.currentList.lvl1 || [])
        ];

        const pokemon = allRaids.find(p => 
            p.names.English.toLowerCase() === pokemonName
        );

        if (!pokemon) {
            await interaction.reply(`Couldn't find ${pokemonName} in the current raid bosses.`);
            return;
        }

        const perfectCP = pokemon.cpRange[1];
        const perfectCPBoosted = pokemon.cpRangeBoost[1];

        await interaction.reply({
            content: `**${pokemon.names.English}**\nPerfect IV CP: ${perfectCP}\nPerfect IV CP (Weather Boosted): ${perfectCPBoosted}`,
            ephemeral: true
        });
    }

    if (commandName === 'currentraids') {
        const raidData = await getRaidBosses();
        
        if (!raidData) {
            await interaction.reply('Sorry, I couldn\'t fetch the raid data at the moment.');
            return;
        }

        let response = '**Current Raid Bosses:**\n\n';

        // Mega Raids
        if (raidData.currentList.mega?.length > 0) {
            response += '**Mega Raids:**\n';
            raidData.currentList.mega.forEach(pokemon => {
                response += `• ${pokemon.names.English}\n`;
            });
            response += '\n';
        }

        // Level 5 Raids
        if (raidData.currentList.lvl5?.length > 0) {
            response += '**Level 5 Raids:**\n';
            raidData.currentList.lvl5.forEach(pokemon => {
                response += `• ${pokemon.names.English}\n`;
            });
            response += '\n';
        }

        // Level 3 Raids
        if (raidData.currentList.lvl3?.length > 0) {
            response += '**Level 3 Raids:**\n';
            raidData.currentList.lvl3.forEach(pokemon => {
                response += `• ${pokemon.names.English}\n`;
            });
            response += '\n';
        }

        // Level 1 Raids
        if (raidData.currentList.lvl1?.length > 0) {
            response += '**Level 1 Raids:**\n';
            raidData.currentList.lvl1.forEach(pokemon => {
                response += `• ${pokemon.names.English}\n`;
            });
            response += '\n';
        }

        await interaction.reply(response);
    }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN); 