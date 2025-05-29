import { verifyKey } from 'discord-interactions';

// Configuration constants
const CONFIG = {
  COLORS: {
    GREEN: 0x00ff00,
    RED: 0xff0000,
    ORANGE: 0xffa500,
    BLUE: 0x0000ff,
    DEEP_SKY_BLUE: 0x00BFFF,
    DISCORD_BLUE: 0x3498db
  },
  LIMITS: {
    AUTOCOMPLETE_RESULTS: 25,
    POPULAR_POKEMON: ["pikachu", "charizard", "mewtwo", "rayquaza", "tyranitar"]
  },
  URLS: {
    POKEDEX: "https://pokemon-go-api.github.io/pokemon-go-api/api/pokedex.json",
    RAID_BOSSES: "https://pokemon-go-api.github.io/pokemon-go-api/api/raidboss.json",
    RESEARCH: "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/research.json",
    EGGS: "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/eggs.json",
    DEFAULT_IMAGE: "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm000.icon.png"
  },
  FOOTERS: {
    POKEMON_GO_API: "Data provided by Pokemon GO API (github.com/pokemon-go-api/pokemon-go-api)",
    LEEK_DUCK: "Data from Leek Duck (via ScrapedDuck)"
  },
  CACHE_TTL: 5 * 60 * 1000 // 5 minutes in milliseconds
};

// Enhanced cache management with TTL
class CacheManager {
  constructor() {
    this.cache = new Map();
  }

  set(key, value, ttl = CONFIG.CACHE_TTL) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  clear() {
    this.cache.clear();
  }
}

const cache = new CacheManager();

// Standardized API response handler
async function fetchWithValidation(url, validator = null) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (validator && !validator(data)) {
      throw new Error("Invalid data structure received");
    }
    
    return { success: true, data };
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return { success: false, error: error.message, data: null };
  }
}

// Fetch full Pokedex data
async function getPokedex() {
  const cached = cache.get('pokedex');
  if (cached) return cached;

  const result = await fetchWithValidation(
    CONFIG.URLS.POKEDEX,
    data => Array.isArray(data) && data.length > 0
  );
  
  if (result.success) {
    cache.set('pokedex', result.data);
    return result.data;
  }
  
  return null;
}

// Fetch research data
async function getResearchData() {
  const cached = cache.get('research');
  if (cached) return cached;

  const result = await fetchWithValidation(
    CONFIG.URLS.RESEARCH,
    data => Array.isArray(data)
  );
  
  if (result.success) {
    cache.set('research', result.data);
    return result.data;
  }
  
  return [];
}

// Fetch egg data
async function getEggData() {
  const cached = cache.get('eggs');
  if (cached) return cached;

  console.log("Fetching egg data from Leek Duck (via ScrapedDuck)...");
  const result = await fetchWithValidation(
    CONFIG.URLS.EGGS,
    data => Array.isArray(data) && data.length > 0
  );
  
  if (result.success) {
    console.log(`Successfully fetched egg data: ${result.data.length} entries found`);
    console.log("Sample egg data entry:", JSON.stringify(result.data[0]));
    cache.set('eggs', result.data);
    return result.data;
  }
  
  console.error("Failed to fetch valid egg data");
  return [];
}

// Fetch raid boss data
async function getRaidBosses() {
  const cached = cache.get('raidBosses');
  if (cached) return cached;

  const result = await fetchWithValidation(
    CONFIG.URLS.RAID_BOSSES,
    data => data && typeof data === 'object' && data.currentList
  );
  
  if (result.success) {
    cache.set('raidBosses', result.data);
    return result.data;
  }
  
  return null;
}

// Utility functions for embed creation
const EmbedUtils = {
  createBaseEmbed(title, color, description = null) {
    return {
      title,
      color,
      ...(description && { description }),
      fields: [],
      footer: { text: CONFIG.FOOTERS.POKEMON_GO_API }
    };
  },

  addField(embed, name, value, inline = false) {
    embed.fields.push({ name, value, inline });
    return embed;
  },

  setImage(embed, url) {
    embed.image = { url: url || CONFIG.URLS.DEFAULT_IMAGE };
    return embed;
  },

  setThumbnail(embed, url) {
    embed.thumbnail = { url: url || CONFIG.URLS.DEFAULT_IMAGE };
    return embed;
  },

  setFooter(embed, text) {
    embed.footer = { text };
    return embed;
  },

  createRaidPokemonField(pokemon) {
    const counterTypes = pokemon.counter
      ? Object.keys(pokemon.counter).sort((a, b) => pokemon.counter[b] - pokemon.counter[a])
      : [];
    
    const shinyEmoji = pokemon.shiny === true ? "✅" : "❌";
    
    let value = `🏆 Perfect IV CP: **${pokemon.cpRange[1]}**\n☀️ Perfect IV CP (Weather Boosted): **${pokemon.cpRangeBoost[1]}**`;
    
    if (counterTypes.length > 0) {
      value += `\n⚔️ Weak to: ${counterTypes.join(", ")}`;
    }
    
    value += `\n✨ Shiny? ${shinyEmoji}`;
    
    return {
      name: pokemon.names.English,
      value,
      inline: true
    };
  }
};

// Optimized Pokemon search with fuzzy matching
function findPokemon(pokedex, name) {
  if (!pokedex) return null;

  const searchName = name.toLowerCase();
  console.log(`Searching for Pokemon: ${searchName}`);

  // Exact match first
  let pokemon = pokedex.find(p => {
    const baseName = p.names.English.toLowerCase();
    const formName = p.formId ? p.formId.toLowerCase() : "";
    return baseName === searchName || formName === searchName;
  });

  // Fuzzy match if no exact match
  if (!pokemon) {
    pokemon = pokedex.find(p => {
      const baseName = p.names.English.toLowerCase();
      const formName = p.formId ? p.formId.toLowerCase() : "";
      return baseName.includes(searchName) || formName.includes(searchName);
    });
  }

  return pokemon;
}

// Optimized raid collection
function getAllRaids(raidData) {
  if (!raidData?.currentList) return [];
  
  return [
    ...(raidData.currentList.mega || []),
    ...(raidData.currentList.lvl5 || []),
    ...(raidData.currentList.lvl3 || []),
    ...(raidData.currentList.lvl1 || [])
  ];
}

// Handle Pokemon info command
async function handlePokemonCommand(options) {
  const pokemonName = options.find(opt => opt.name === "name")?.value;
  if (!pokemonName) {
    return { content: "Pokemon name is required." };
  }

  const pokedex = await getPokedex();
  const pokemon = findPokemon(pokedex, pokemonName);
  
  if (!pokemon) {
    return { content: `Sorry, I couldn't find information for ${pokemonName}.` };
  }

  // Build types array
  const types = [pokemon.primaryType.names.English];
  if (pokemon.secondaryType) {
    types.push(pokemon.secondaryType.names.English);
  }

  // Build description
  let description = `**${pokemon.names.English}**\n`;
  
  if (pokemon.formId && pokemon.formId !== pokemon.id) {
    description += `🔄 **Form**: ${pokemon.formId.replace(/_/g, " ")}\n`;
  }
  
  description += `🏷️ **Type**: ${types.join(", ")}\n`;
  description += `\n📊 **Base Stats**:\n`;
  description += `❤️ **Stamina**: ${pokemon.stats.stamina}\n`;
  description += `⚔️ **Attack**: ${pokemon.stats.attack}\n`;
  description += `🛡️ **Defense**: ${pokemon.stats.defense}\n`;

  const embed = EmbedUtils.createBaseEmbed(pokemon.names.English, CONFIG.COLORS.GREEN, description);
  EmbedUtils.setImage(embed, pokemon.assets?.image);

  return { embeds: [embed] };
}

// Handle Hundo command
async function handleHundoCommand(options) {
  const pokemonName = options.find(opt => opt.name === "pokemon")?.value?.toLowerCase();
  if (!pokemonName) {
    return { content: "Pokemon name is required." };
  }

  const raidData = await getRaidBosses();
  if (!raidData) {
    return { content: "Sorry, I couldn't fetch the raid data at the moment." };
  }

  const allRaids = getAllRaids(raidData);
  const pokemon = allRaids.find(p => p.names.English.toLowerCase() === pokemonName);

  if (!pokemon) {
    return { content: `Couldn't find ${pokemonName} in the current raid bosses.` };
  }

  const embed = EmbedUtils.createBaseEmbed(
    `🏆 Perfect IV CP for ${pokemon.names.English}`,
    CONFIG.COLORS.GREEN
  );
  
  EmbedUtils.addField(embed, "🎯 Normal CP", `**${pokemon.cpRange[1]}**`, true);
  EmbedUtils.addField(embed, "☀️ Weather Boosted CP", `**${pokemon.cpRangeBoost[1]}**`, true);
  EmbedUtils.setImage(embed, pokemon.assets?.image);

  return { embeds: [embed] };
}

// Handle Current Raids command with optimized embed creation
async function handleCurrentRaidsCommand() {
  const raidData = await getRaidBosses();
  if (!raidData) {
    return { content: "Sorry, I couldn't fetch the raid data at the moment." };
  }

  const embeds = [];
  const raidTiers = [
    { key: 'mega', title: '🔄 Mega Raids', color: CONFIG.COLORS.RED },
    { key: 'lvl5', title: '⭐⭐⭐⭐⭐ Level 5 Raids', color: CONFIG.COLORS.ORANGE },
    { key: 'lvl3', title: '⭐⭐⭐ Level 3 Raids', color: CONFIG.COLORS.BLUE },
    { key: 'lvl1', title: '⭐ Level 1 Raids', color: CONFIG.COLORS.GREEN }
  ];

  raidTiers.forEach(tier => {
    const raidList = raidData.currentList[tier.key];
    if (raidList?.length > 0) {
      const embed = EmbedUtils.createBaseEmbed(tier.title, tier.color);
      
      raidList.forEach(pokemon => {
        const field = EmbedUtils.createRaidPokemonField(pokemon);
        embed.fields.push(field);
      });
      
      EmbedUtils.setThumbnail(embed, raidList[0]?.assets?.image);
      embeds.push(embed);
    }
  });

  return { embeds };
}

// Handle Raid Boss command
async function handleRaidBossCommand(options) {
  const bossName = options.find(opt => opt.name === "name")?.value;
  if (!bossName) {
    return { content: "Boss name is required." };
  }

  const raidData = await getRaidBosses();
  if (!raidData) {
    return { content: "Sorry, I couldn't fetch the raid data at the moment." };
  }

  const allRaids = getAllRaids(raidData);
  const boss = allRaids.find(p => p.names.English.toLowerCase() === bossName.toLowerCase());

  if (!boss) {
    return { content: `Couldn't find ${bossName} in the current raid bosses.` };
  }

  // Determine raid level and color
  const raidConfig = {
    mega: { level: "Mega Raid", color: CONFIG.COLORS.RED },
    lvl5: { level: "Level 5 Raid", color: CONFIG.COLORS.ORANGE },
    lvl3: { level: "Level 3 Raid", color: CONFIG.COLORS.BLUE },
    lvl1: { level: "Level 1 Raid", color: CONFIG.COLORS.GREEN }
  };

  let config = raidConfig.lvl1; // default
  for (const [key, value] of Object.entries(raidConfig)) {
    if (raidData.currentList[key]?.includes(boss)) {
      config = value;
      break;
    }
  }

  // Build counters text
  let countersText = "";
  if (boss.counter) {
    const sortedCounters = Object.entries(boss.counter)
      .sort(([, a], [, b]) => b - a)
      .map(([type, multiplier]) => `${type} (${multiplier}x)`);
    countersText = sortedCounters.join(", ");
  }

  // Build description
  let description = `**Types**: ${boss.types.join(", ")}\n\n`;
  description += `🏆 **Perfect IV CP**: ${boss.cpRange[1]}\n`;
  description += `☀️ **Perfect IV CP (Weather Boosted)**: ${boss.cpRangeBoost[1]}\n\n`;
  
  if (countersText) {
    description += `⚔️ **Weak to**: ${countersText}\n\n`;
  }
  
  if (boss.weather) {
    description += `🌤️ **Boosted in**: ${boss.weather
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(", ")} weather\n\n`;
  }
  
  description += `✨ **Shiny Available**: ${boss.shiny ? "Yes ✅" : "No ❌"}`;

  const mainEmbed = EmbedUtils.createBaseEmbed(
    `${boss.names.English} - ${config.level}`,
    config.color,
    description
  );
  EmbedUtils.setImage(mainEmbed, boss.assets?.image);

  const embeds = [mainEmbed];

  // Add shiny embed if available
  if (boss.shiny && boss.assets?.shinyImage) {
    const shinyEmbed = EmbedUtils.createBaseEmbed(
      `${boss.names.English} - Shiny Form`,
      config.color
    );
    EmbedUtils.setImage(shinyEmbed, boss.assets.shinyImage);
    embeds.push(shinyEmbed);
  }

  return { embeds };
}

// Handle Research command
async function handleResearchCommand(options) {
  const researchTask = options.find(opt => opt.name === "task")?.value;
  if (!researchTask) {
    return { content: "Research task is required." };
  }

  const researchData = await getResearchData();
  if (!researchData || researchData.length === 0) {
    return { content: "Sorry, I couldn't fetch the research data at the moment." };
  }

  const task = researchData.find(t => t.text === researchTask);
  if (!task) {
    return { content: `Couldn't find research task: "${researchTask}"` };
  }

  const embed = EmbedUtils.createBaseEmbed("Research Task", CONFIG.COLORS.DISCORD_BLUE, task.text);
  EmbedUtils.setFooter(embed, CONFIG.FOOTERS.LEEK_DUCK);

  // Handle rewards
  if (task.rewards?.length > 0) {
    const rewardsText = task.rewards.map(reward => {
      let text = `**${reward.name}**`;
      if (reward.combatPower) {
        text += ` (CP: ${reward.combatPower.min}-${reward.combatPower.max})`;
      }
      if (reward.canBeShiny) {
        text += " ✨";
      }
      return text;
    }).join('\n');
    
    EmbedUtils.addField(embed, "Possible Rewards", rewardsText || "Unknown rewards");
    
    if (task.rewards[0]?.image) {
      EmbedUtils.setThumbnail(embed, task.rewards[0].image);
    }
  } else {
    EmbedUtils.addField(embed, "Rewards", "No reward information available");
  }

  // Add additional fields
  if (task.type) {
    EmbedUtils.addField(embed, "Type", task.type, true);
  }
  if (task.category) {
    EmbedUtils.addField(embed, "Category", task.category, true);
  }

  return { embeds: [embed] };
}

// Handle egg command
async function handleEggCommand(options) {
  const eggType = options.find(opt => opt.name === "type")?.value;
  if (!eggType) {
    return { content: "Egg type is required." };
  }

  try {
    const data = await getEggData();
    if (!data?.length) {
      return { content: "Sorry, I couldn't fetch egg data at this time." };
    }
    
    const pokemonInEgg = data.filter(p => p.eggType.toLowerCase() === eggType.toLowerCase());
    if (pokemonInEgg.length === 0) {
      return { content: `Sorry, I couldn't find information for "${eggType}" eggs.` };
    }
    
    const embed = EmbedUtils.createBaseEmbed(
      `${eggType} Eggs`,
      CONFIG.COLORS.DEEP_SKY_BLUE,
      `Here are Pokémon that can hatch from ${eggType} eggs:`
    );
    EmbedUtils.setFooter(embed, CONFIG.FOOTERS.LEEK_DUCK);
    
    // Group Pokemon efficiently
    const groups = {
      shiny: pokemonInEgg.filter(p => p.canBeShiny),
      nonShiny: pokemonInEgg.filter(p => !p.canBeShiny),
      adventureSync: pokemonInEgg.filter(p => p.isAdventureSync),
      regional: pokemonInEgg.filter(p => p.isRegional)
    };
    
    // Add fields for each group
    if (groups.shiny.length > 0) {
      EmbedUtils.addField(embed, "Can be Shiny", groups.shiny.map(p => `${p.name} ✨`).join(", "));
    }
    
    if (groups.nonShiny.length > 0) {
      EmbedUtils.addField(embed, "Cannot be Shiny", groups.nonShiny.map(p => p.name).join(", "));
    }
    
    if (groups.adventureSync.length > 0) {
      EmbedUtils.addField(embed, "Adventure Sync Exclusive", groups.adventureSync.map(p => p.name).join(", "));
    }
    
    if (groups.regional.length > 0) {
      EmbedUtils.addField(embed, "Regional Exclusive", groups.regional.map(p => p.name).join(", "));
    }
    
    if (pokemonInEgg[0]?.image) {
      EmbedUtils.setThumbnail(embed, pokemonInEgg[0].image);
    }
    
    return { embeds: [embed] };
  } catch (error) {
    console.error("Error handling egg command:", error);
    return { content: "Sorry, an error occurred while processing your request." };
  }
}

// Optimized autocomplete handlers
const AutocompleteHandlers = {
  async pokemon(focusedValue) {
    const pokedex = await getPokedex();
    if (!pokedex) return [];

    const searchValue = focusedValue.toLowerCase();
    if (!searchValue) {
      return pokedex
        .filter(p => CONFIG.LIMITS.POPULAR_POKEMON.includes(p.names.English.toLowerCase()))
        .slice(0, CONFIG.LIMITS.AUTOCOMPLETE_RESULTS)
        .map(p => ({ name: p.names.English, value: p.names.English }));
    }

    return pokedex
      .filter(p => p.names.English.toLowerCase().includes(searchValue))
      .slice(0, CONFIG.LIMITS.AUTOCOMPLETE_RESULTS)
      .map(p => ({ name: p.names.English, value: p.names.English }));
  },

  async raidboss(focusedValue) {
    const raidData = await getRaidBosses();
    if (!raidData) return [];

    const allRaids = getAllRaids(raidData);
    const searchValue = focusedValue.toLowerCase();
    
    if (!searchValue) {
      return allRaids
        .slice(0, CONFIG.LIMITS.AUTOCOMPLETE_RESULTS)
        .map(p => ({ name: p.names.English, value: p.names.English }));
    }

    return allRaids
      .filter(p => p.names.English.toLowerCase().includes(searchValue))
      .slice(0, CONFIG.LIMITS.AUTOCOMPLETE_RESULTS)
      .map(p => ({ name: p.names.English, value: p.names.English }));
  },

  async hundo(focusedValue) {
    // Hundo uses the same logic as raidboss since it's for raid bosses
    const raidData = await getRaidBosses();
    if (!raidData) return [];

    const allRaids = getAllRaids(raidData);
    const searchValue = focusedValue.toLowerCase();
    
    if (!searchValue) {
      return allRaids
        .slice(0, CONFIG.LIMITS.AUTOCOMPLETE_RESULTS)
        .map(p => ({ name: p.names.English, value: p.names.English }));
    }

    return allRaids
      .filter(p => p.names.English.toLowerCase().includes(searchValue))
      .slice(0, CONFIG.LIMITS.AUTOCOMPLETE_RESULTS)
      .map(p => ({ name: p.names.English, value: p.names.English }));
  },

  async research(focusedValue) {
    const researchData = await getResearchData();
    if (!researchData?.length) return [];
    
    const searchValue = focusedValue.toLowerCase();
    const filtered = searchValue 
      ? researchData.filter(task => task.text.toLowerCase().includes(searchValue))
      : researchData;
    
    return filtered
      .slice(0, CONFIG.LIMITS.AUTOCOMPLETE_RESULTS)
      .map(task => ({
        name: task.text.length > 100 ? task.text.substring(0, 97) + '...' : task.text,
        value: task.text
      }));
  },

  async egg(focusedValue) {
    try {
      const data = await getEggData();
      if (!data?.length) return [];

      const eggTypes = [...new Set(data.map(egg => egg.eggType))];
      const filtered = eggTypes.filter(type => 
        type.toLowerCase().includes(focusedValue.toLowerCase())
      );
      
      return filtered
        .slice(0, CONFIG.LIMITS.AUTOCOMPLETE_RESULTS)
        .map(type => ({ name: type, value: type }));
    } catch (error) {
      console.error("Error in egg autocomplete:", error);
      return [];
    }
  }
};

// Main worker handler
export default {
  async fetch(request, env, ctx) {
    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Get the request body as text
    const bodyText = await request.text();
    
    // Verify the request
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    
    // Skip verification in dev/test mode if PUBLIC_KEY is not set
    if (env.PUBLIC_KEY && signature && timestamp) {
      const isValidRequest = verifyKey(bodyText, signature, timestamp, env.PUBLIC_KEY);
      
      if (!isValidRequest) {
        console.error('Invalid request signature');
        return new Response('Bad request signature', { status: 401 });
      }
    }
    
    // Parse the request body as JSON
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (error) {
      console.error('Error parsing request body', error);
      return new Response('Invalid JSON', { status: 400 });
    }
    
    // Handle PING from Discord
    if (body.type === 1) {
      return new Response(
        JSON.stringify({ type: 1 }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Log all interaction types to debug
    console.log(`Received interaction type: ${body.type}`);
    
    // Handle autocomplete interactions
    if (body.type === 4) {
      console.log('Autocomplete interaction received:', JSON.stringify(body));
      
      try {
        let commandName = body.data?.name || body.data?.command?.name || '';
        let focusedValue = '';
        
        if (body.data?.options?.length > 0) {
          const focusedOption = body.data.options.find(opt => opt.focused);
          focusedValue = focusedOption?.value || '';
        }
        
        console.log(`Command: ${commandName}, Focused value: ${focusedValue}`);
        
        let choices = [];
        const handler = AutocompleteHandlers[commandName.toLowerCase()];
        
        if (handler) {
          choices = await handler(focusedValue);
        }
        
        return new Response(
          JSON.stringify({
            type: 8, // APPLICATION_COMMAND_AUTOCOMPLETE_RESULT
            data: { choices }
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 }
        );
      } catch (error) {
        console.error('Error handling autocomplete:', error);
        return new Response(
          JSON.stringify({ type: 8, data: { choices: [] } }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }
    
    // Handle APPLICATION_COMMAND
    if (body.type === 2) {
      const { name } = body.data;
      const options = body.data.options || [];
      
      try {
        const commandHandlers = {
          pokemon: handlePokemonCommand,
          hundo: handleHundoCommand,
          currentraids: handleCurrentRaidsCommand,
          raidboss: handleRaidBossCommand,
          research: handleResearchCommand,
          egg: handleEggCommand
        };
        
        const handler = commandHandlers[name.toLowerCase()];
        const responseData = handler 
          ? await handler(options)
          : { content: "Unknown command" };
        
        return new Response(
          JSON.stringify({
            type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
            data: responseData,
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 }
        );
      } catch (error) {
        console.error('Error handling command:', error);
        
        return new Response(
          JSON.stringify({
            type: 4,
            data: { content: "Sorry, an error occurred while processing your request." },
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }
    
    // Any other type of interaction
    return new Response(
      JSON.stringify({ error: 'Unsupported interaction type' }),
      { headers: { 'Content-Type': 'application/json' }, status: 400 }
    );
  }
};