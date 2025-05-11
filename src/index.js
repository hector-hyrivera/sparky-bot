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

// Cache for Pokedex data
let pokedexCache = null;

// Fetch full Pokedex data
async function getPokedex() {
    if (pokedexCache) return pokedexCache;
    
    try {
        const response = await fetch('https://pokemon-go-api.github.io/pokemon-go-api/api/pokedex.json');
        if (!response.ok) {
            throw new Error('Failed to fetch Pokedex data');
        }
        pokedexCache = await response.json();
        return pokedexCache;
    } catch (error) {
        console.error('Error fetching Pokedex:', error);
        return null;
    }
}

// Find Pokemon by name (including forms)
async function findPokemon(name) {
    const pokedex = await getPokedex();
    if (!pokedex) return null;

    const searchName = name.toLowerCase();
    console.log(`Searching for Pokemon: ${searchName}`);
    
    // First try exact match
    let pokemon = pokedex.find(p => {
        const baseName = p.names.English.toLowerCase();
        const formName = p.formId ? p.formId.toLowerCase() : '';
        return baseName === searchName || formName === searchName;
    });

    // If no exact match, try partial match
    if (!pokemon) {
        pokemon = pokedex.find(p => {
            const baseName = p.names.English.toLowerCase();
            const formName = p.formId ? p.formId.toLowerCase() : '';
            return baseName.includes(searchName) || formName.includes(searchName);
        });
    }

    // If still no match, try searching in regional forms
    if (!pokemon) {
        console.log('Searching for regional forms...');
        // First, try to find the base Pokemon
        const baseName = searchName.replace(/^(alolan|galarian|hisuian|paldean)\s+/i, '');
        console.log(`Looking for base Pokemon: ${baseName}`);
        
        const basePokemon = pokedex.find(p => 
            p.names.English.toLowerCase() === baseName
        );

        if (basePokemon) {
            console.log(`Found base Pokemon: ${basePokemon.names.English}`);
            // Check if this Pokemon has the requested regional form
            const formPrefix = searchName.match(/^(alolan|galarian|hisuian|paldean)/i)?.[1].toLowerCase();
            if (formPrefix && basePokemon.regionForms) {
                console.log(`Looking for ${formPrefix} form in regionForms:`, basePokemon.regionForms);
                // Find the regional form in the base Pokemon's regionForms
                const regionalFormId = Object.keys(basePokemon.regionForms).find(id => 
                    id.toLowerCase().includes(formPrefix)
                );
                
                if (regionalFormId) {
                    console.log(`Found regional form ID: ${regionalFormId}`);
                    // Use the regional form data directly from regionForms
                    const regionalForm = basePokemon.regionForms[regionalFormId];
                    if (regionalForm) {
                        console.log(`Found regional form: ${regionalForm.names.English}`);
                        return regionalForm;
                    }
                }
                console.log(`No ${formPrefix} form found for ${basePokemon.names.English}`);
            }
        }
    }

    return pokemon;
}

// Command definitions
const commands = [
    new SlashCommandBuilder()
        .setName('hundo')
        .setDescription('Get the perfect IV CP for a raid boss')
        .addStringOption(option =>
            option.setName('pokemon')
                .setDescription('The name of the Pokemon')
                .setRequired(true)
                .setAutocomplete(true)),
    new SlashCommandBuilder()
        .setName('currentraids')
        .setDescription('List all current raid bosses'),
    new SlashCommandBuilder()
        .setName('pokemon')
        .setDescription('Get information about a Pokemon')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name of the Pokemon')
                .setRequired(true))
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
    if (!interaction.isCommand() && !interaction.isAutocomplete()) return;

    const { commandName } = interaction;

    // Handle autocomplete for hundo command
    if (interaction.isAutocomplete() && commandName === 'hundo') {
        const raidData = await getRaidBosses();
        if (!raidData) {
            await interaction.respond([]);
            return;
        }

        const focusedValue = interaction.options.getFocused().toLowerCase();
        const allRaids = [
            ...(raidData.currentList.mega || []),
            ...(raidData.currentList.lvl5 || []),
            ...(raidData.currentList.lvl3 || []),
            ...(raidData.currentList.lvl1 || [])
        ];

        const filtered = allRaids
            .filter(pokemon => pokemon.names.English.toLowerCase().includes(focusedValue))
            .slice(0, 25)
            .map(pokemon => ({
                name: pokemon.names.English,
                value: pokemon.names.English
            }));

        await interaction.respond(filtered);
        return;
    }

    if (commandName === 'pokemon') {
        const pokemonName = interaction.options.getString('name').toLowerCase();
        const pokemon = await findPokemon(pokemonName);
        
        if (!pokemon) {
            await interaction.reply(`Sorry, I couldn't find information for ${pokemonName}.`);
            return;
        }

        let response = `**${pokemon.names.English}**\n`;
        
        // Form information
        if (pokemon.formId && pokemon.formId !== pokemon.id) {
            response += `Form: ${pokemon.formId.replace(/_/g, ' ')}\n`;
        }
        
        // Types
        const types = [pokemon.primaryType.names.English];
        if (pokemon.secondaryType) {
            types.push(pokemon.secondaryType.names.English);
        }
        response += `Type: ${types.join(', ')}\n`;
        
        // Stats
        response += `Stamina: ${pokemon.stats.stamina}\n`;
        response += `Attack: ${pokemon.stats.attack}\n`;
        response += `Defense: ${pokemon.stats.defense}\n`;
        
        // Quick Moves
        if (pokemon.quickMoves) {
            response += '\n**Fast Attacks:**\n';
            Object.values(pokemon.quickMoves).forEach(move => {
                response += `• ${move.names.English} (${move.type.names.English}) - ${move.power} power\n`;
            });
        }
        
        // Cinematic Moves
        if (pokemon.cinematicMoves) {
            response += '\n**Special Attacks:**\n';
            Object.values(pokemon.cinematicMoves).forEach(move => {
                response += `• ${move.names.English} (${move.type.names.English}) - ${move.power} power\n`;
            });
        }

        // Elite Moves
        if (pokemon.eliteCinematicMoves && Object.keys(pokemon.eliteCinematicMoves).length > 0) {
            response += '\n**Elite Special Attacks:**\n';
            Object.values(pokemon.eliteCinematicMoves).forEach(move => {
                response += `• ${move.names.English} (${move.type.names.English}) - ${move.power} power\n`;
            });
        }

        // Regional Forms
        if (pokemon.regionForms && pokemon.regionForms.length > 0) {
            response += '\n**Regional Forms:**\n';
            pokemon.regionForms.forEach(form => {
                response += `• ${form.names.English}`;
                if (form.primaryType) {
                    const formTypes = [form.primaryType.names.English];
                    if (form.secondaryType) {
                        formTypes.push(form.secondaryType.names.English);
                    }
                    response += ` (${formTypes.join(', ')})`;
                }
                response += '\n';
            });
        }

        // Evolution
        if (pokemon.evolutions && pokemon.evolutions.length > 0) {
            response += '\n**Evolves To:**\n';
            pokemon.evolutions.forEach(evo => {
                response += `• ${evo.id.replace(/_/g, ' ')}`;
                if (evo.candies) {
                    response += ` (${evo.candies} candies)`;
                }
                response += '\n';
            });
        }

        // Mega Evolution
        if (pokemon.hasMegaEvolution) {
            response += '\n**Mega Evolution Available**\n';
            if (pokemon.megaEvolutions) {
                Object.values(pokemon.megaEvolutions).forEach(mega => {
                    response += `• ${mega.names.English}\n`;
                    response += `  Attack: ${mega.stats.attack}\n`;
                    response += `  Defense: ${mega.stats.defense}\n`;
                    response += `  Stamina: ${mega.stats.stamina}\n`;
                });
            }
        }

        // Create embed with Pokemon image
        const embed = {
            title: pokemon.names.English,
            description: response,
            color: 0x00ff00, // Green color
            image: {
                url: pokemon.assets?.image || 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm000.icon.png'
            },
            footer: {
                text: 'Data provided by Pokemon GO API (github.com/pokemon-go-api/pokemon-go-api)'
            }
        };

        await interaction.reply({
            embeds: [embed]
        });
    }

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

        const embed = {
            title: `Perfect IV CP for ${pokemon.names.English}`,
            color: 0x00ff00, // Green color
            fields: [
                {
                    name: 'Normal CP',
                    value: perfectCP.toString(),
                    inline: true
                },
                {
                    name: 'Weather Boosted CP',
                    value: perfectCPBoosted.toString(),
                    inline: true
                }
            ],
            image: {
                url: pokemon.assets?.image || 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm000.icon.png'
            },
            footer: {
                text: 'Data provided by Pokemon GO API (github.com/pokemon-go-api/pokemon-go-api)'
            }
        };

        await interaction.reply({
            embeds: [embed]
        });
    }

    if (commandName === 'currentraids') {
        const raidData = await getRaidBosses();
        
        if (!raidData) {
            await interaction.reply('Sorry, I couldn\'t fetch the raid data at the moment.');
            return;
        }

        // Create embeds for each raid tier
        const embeds = [];

        // Mega Raids
        if (raidData.currentList.mega?.length > 0) {
            const megaEmbed = {
                title: 'Mega Raids',
                color: 0xFF0000, // Red
                fields: raidData.currentList.mega.map(pokemon => ({
                    name: pokemon.names.English,
                    value: `Perfect IV CP: ${pokemon.cpRange[1]}\nPerfect IV CP (Weather Boosted): ${pokemon.cpRangeBoost[1]}`,
                    inline: true
                })),
                thumbnail: {
                    url: raidData.currentList.mega[0].assets?.image || 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm000.icon.png'
                },
                footer: {
                    text: 'Data provided by Pokemon GO API (github.com/pokemon-go-api/pokemon-go-api)'
                }
            };
            embeds.push(megaEmbed);
        }

        // Level 5 Raids
        if (raidData.currentList.lvl5?.length > 0) {
            const lvl5Embed = {
                title: 'Level 5 Raids',
                color: 0xFFA500, // Orange
                fields: raidData.currentList.lvl5.map(pokemon => ({
                    name: pokemon.names.English,
                    value: `Perfect IV CP: ${pokemon.cpRange[1]}\nPerfect IV CP (Weather Boosted): ${pokemon.cpRangeBoost[1]}`,
                    inline: true
                })),
                thumbnail: {
                    url: raidData.currentList.lvl5[0].assets?.image || 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm000.icon.png'
                },
                footer: {
                    text: 'Data provided by Pokemon GO API (github.com/pokemon-go-api/pokemon-go-api)'
                }
            };
            embeds.push(lvl5Embed);
        }

        // Level 3 Raids
        if (raidData.currentList.lvl3?.length > 0) {
            const lvl3Embed = {
                title: 'Level 3 Raids',
                color: 0x0000FF, // Blue
                fields: raidData.currentList.lvl3.map(pokemon => ({
                    name: pokemon.names.English,
                    value: `Perfect IV CP: ${pokemon.cpRange[1]}\nPerfect IV CP (Weather Boosted): ${pokemon.cpRangeBoost[1]}`,
                    inline: true
                })),
                thumbnail: {
                    url: raidData.currentList.lvl3[0].assets?.image || 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm000.icon.png'
                },
                footer: {
                    text: 'Data provided by Pokemon GO API (github.com/pokemon-go-api/pokemon-go-api)'
                }
            };
            embeds.push(lvl3Embed);
        }

        // Level 1 Raids
        if (raidData.currentList.lvl1?.length > 0) {
            const lvl1Embed = {
                title: 'Level 1 Raids',
                color: 0x00FF00, // Green
                fields: raidData.currentList.lvl1.map(pokemon => ({
                    name: pokemon.names.English,
                    value: `Perfect IV CP: ${pokemon.cpRange[1]}\nPerfect IV CP (Weather Boosted): ${pokemon.cpRangeBoost[1]}`,
                    inline: true
                })),
                thumbnail: {
                    url: raidData.currentList.lvl1[0].assets?.image || 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm000.icon.png'
                },
                footer: {
                    text: 'Data provided by Pokemon GO API (github.com/pokemon-go-api/pokemon-go-api)'
                }
            };
            embeds.push(lvl1Embed);
        }

        // Send all embeds
        await interaction.reply({
            embeds: embeds
        });
    }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN); 