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
    POPULAR_POKEMON: ["charizard", "mewtwo", "rayquaza", "tyranitar"]
  },
  URLS: {
    POKEDEX: "https://pokemon-go-api.github.io/pokemon-go-api/api/pokedex.json",
    RAID_BOSSES: "https://raw.githubusercontent.com/hector-hyrivera/ScrapedDuck/refs/heads/data/raids.json",
    RESEARCH: "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/research.json",
    EGGS: "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/eggs.json",
    EVENTS: "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json",
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

// Fetch raid boss data (ScrapedDuck raids.json)
async function getRaidBosses() {
  const cached = cache.get('raidBosses');
  if (cached) return cached;

  const result = await fetchWithValidation(
    CONFIG.URLS.RAID_BOSSES,
    data => Array.isArray(data) && data.length > 0
  );
  
  if (result.success) {
    cache.set('raidBosses', result.data);
    return result.data;
  }
  
  return [];
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

// Utility function to get the best image for a Pokémon or form
function getBestPokemonImage(pokemon, basePokemon) {
  // Use the form's own image if available
  let imageUrl = pokemon.assets?.image;
  if (!imageUrl && basePokemon && basePokemon.assetForms && pokemon.formId) {
    // Try to match form in assetForms
    const formKey = pokemon.formId.replace(`${pokemon.id}_`, '').toUpperCase();
    const assetForm = basePokemon.assetForms.find(f => {
      return (
        (f.form && f.form.toUpperCase() === formKey) ||
        (pokemon.names.English && f.form && pokemon.names.English.toLowerCase().includes(f.form.toLowerCase()))
      );
    });
    if (assetForm && assetForm.image) {
      imageUrl = assetForm.image;
    }
  }
  if (!imageUrl && basePokemon && basePokemon.assets?.image) {
    imageUrl = basePokemon.assets.image;
  }
  return imageUrl;
}

// Enhanced Pokemon search with comprehensive form handling
export function findPokemon(pokedex, name) {
  if (!pokedex) return null;

  const searchName = name.toLowerCase();
  console.log(`Searching for Pokemon: ${searchName}`);

  // Get all Pokemon including forms for comprehensive search
  const allPokemon = getAllPokemonWithForms(pokedex);

  // Try exact match first
  let pokemon = allPokemon.find(p => {
    const baseName = p.names.English.toLowerCase();
    const formName = p.formId && p.formId !== p.id ? p.formId.toLowerCase().replace(/_/g, ' ') : "";
    const fullFormName = formName ? `${baseName} ${formName}` : "";
    
    return baseName === searchName || 
           formName === searchName ||
           fullFormName === searchName;
  });

  // If no exact match, try fuzzy matching
  if (!pokemon) {
    pokemon = allPokemon.find(p => {
      const baseName = p.names.English.toLowerCase();
      const formName = p.formId && p.formId !== p.id ? p.formId.toLowerCase().replace(/_/g, ' ') : "";
      const fullFormName = formName ? `${baseName} ${formName}` : "";
      
      return baseName.includes(searchName) || 
             formName.includes(searchName) ||
             fullFormName.includes(searchName);
    });
  }

  return pokemon;
}

// Optimized raid collection supporting new ScrapedDuck schema
function getAllRaids(raidData) {
  // New schema: raids.json is an array of raid entries
  if (Array.isArray(raidData)) return raidData;

  // Backward-compat: older schema with currentList
  if (!raidData?.currentList) return [];
  return [
    ...(raidData.currentList.mega || []),
    ...(raidData.currentList.lvl5 || []),
    ...(raidData.currentList.lvl4 || []),
    ...(raidData.currentList.lvl3 || []),
    ...(raidData.currentList.lvl2 || []),
    ...(raidData.currentList.lvl1 || [])
  ];
}

// Get all Pokemon including their forms for comprehensive search
export function getAllPokemonWithForms(pokedex) {
  if (!pokedex) return [];
  
  const allPokemon = [];
  
  for (const pokemon of pokedex) {
    // Add the base Pokemon
    allPokemon.push(pokemon);
    
    // Add region forms if they exist
    if (pokemon.regionForms) {
      for (const [formKey, formData] of Object.entries(pokemon.regionForms)) {
        allPokemon.push(formData);
      }
    }
  }
  
  return allPokemon;
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

  // Find the base Pokemon (for assetForms lookup)
  let basePokemon = pokemon;
  if (pokemon.formId && pokedex) {
    const found = pokedex.find(p => p.id === pokemon.id);
    if (found) basePokemon = found;
  }

  // Build types array
  const types = [pokemon.primaryType.names.English];
  if (pokemon.secondaryType) {
    types.push(pokemon.secondaryType.names.English);
  }

  // Build description
  let description = `**${pokemon.names.English}**\n`;
  
  // Check if this is a region form and show form info
  if (pokemon.formId && pokemon.formId !== pokemon.id) {
    description += `🔄 **Form**: ${pokemon.formId.replace(/_/g, " ")}\n`;
  }
  
  description += `🏷️ **Type**: ${types.join(", ")}\n`;
  description += `\n📊 **Base Stats**:\n`;
  description += `❤️ **Stamina**: ${pokemon.stats.stamina}\n`;
  description += `⚔️ **Attack**: ${pokemon.stats.attack}\n`;
  description += `🛡️ **Defense**: ${pokemon.stats.defense}\n`;

  // Determine the best image for the form
  let imageUrl = getBestPokemonImage(pokemon, basePokemon);
  const embed = EmbedUtils.createBaseEmbed(pokemon.names.English, CONFIG.COLORS.GREEN, description);
  EmbedUtils.setImage(embed, imageUrl);

  return { embeds: [embed] };
}

// Handle Hundo command (ScrapedDuck raids.json)
async function handleHundoCommand(options) {
  const pokemonName = options.find(opt => opt.name === "pokemon")?.value?.toLowerCase();
  if (!pokemonName) {
    return { content: "Pokemon name is required." };
  }

  const raids = await getRaidBosses();
  if (!raids || raids.length === 0) {
    return { content: "Sorry, I couldn't fetch the raid data at the moment." };
  }

  const boss = raids.find(r => (r.name || '').toLowerCase() === pokemonName);
  if (!boss) {
    return { content: `Couldn't find ${pokemonName} in the current raid bosses.` };
  }

  const cpNormal = boss.combatPower?.normal?.max;
  const cpBoosted = boss.combatPower?.boosted?.max;

  const embed = EmbedUtils.createBaseEmbed(
    `🏆 Perfect IV CP for ${boss.name}`,
    CONFIG.COLORS.GREEN
  );
  if (cpNormal != null) EmbedUtils.addField(embed, "🎯 Normal CP", `**${cpNormal}**`, true);
  if (cpBoosted != null) EmbedUtils.addField(embed, "☀️ Weather Boosted CP", `**${cpBoosted}**`, true);
  if (boss.image) EmbedUtils.setImage(embed, boss.image);
  EmbedUtils.setFooter(embed, CONFIG.FOOTERS.LEEK_DUCK);

  return { embeds: [embed] };
}

// Handle Current Raids command (ScrapedDuck raids.json)
async function handleCurrentRaidsCommand() {
  const raids = await getRaidBosses();
  if (!raids || raids.length === 0) {
    return { content: "Sorry, I couldn't fetch the raid data at the moment." };
  }

  // Group by tier
  const groups = new Map();
  for (const r of raids) {
    const tier = r.tier || 'Other';
    if (!groups.has(tier)) groups.set(tier, []);
    groups.get(tier).push(r);
  }

  // Order tiers: Mega, Tier 5, Tier 4, Tier 3, Tier 2, Tier 1, Other
  const order = [
    'Mega', 'Tier 5', 'Tier 4', 'Tier 3', 'Tier 2', 'Tier 1', 'Other'
  ];
  const colorForTier = (tier) => {
    if (/mega/i.test(tier)) return CONFIG.COLORS.RED;
    if (/5/.test(tier)) return CONFIG.COLORS.ORANGE;
    if (/3/.test(tier)) return CONFIG.COLORS.BLUE;
    if (/1/.test(tier)) return CONFIG.COLORS.GREEN;
    return CONFIG.COLORS.DISCORD_BLUE;
  };
  const titleForTier = (tier) => {
    if (/mega/i.test(tier)) return '🔄 Mega Raids';
    if (/5/.test(tier)) return '⭐⭐⭐⭐⭐ Tier 5 Raids';
    if (/4/.test(tier)) return '⭐⭐⭐⭐ Tier 4 Raids';
    if (/3/.test(tier)) return '⭐⭐⭐ Tier 3 Raids';
    if (/2/.test(tier)) return '⭐⭐ Tier 2 Raids';
    if (/1/.test(tier)) return '⭐ Tier 1 Raids';
    return `${tier} Raids`;
  };

  const embeds = [];
  const sortedTiers = Array.from(groups.keys()).sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? Number.MAX_SAFE_INTEGER : ia) - (ib === -1 ? Number.MAX_SAFE_INTEGER : ib);
  });

  for (const tier of sortedTiers) {
    const list = groups.get(tier);
    if (!list || list.length === 0) continue;
    const embed = EmbedUtils.createBaseEmbed(titleForTier(tier), colorForTier(tier));

    for (const boss of list) {
      const name = boss.name || 'Unknown';
      const types = Array.isArray(boss.types)
        ? boss.types.map(t => (typeof t === 'string' ? t : t.name)).filter(Boolean)
        : [];
      const cpNormal = boss.combatPower?.normal?.max;
      const cpBoosted = boss.combatPower?.boosted?.max;
      const shinyEmoji = boss.canBeShiny ? '✅' : '❌';
      let value = '';
      if (cpNormal != null) value += `🎯 Hundo CP: **${cpNormal}**`;
      if (cpBoosted != null) value += `${value ? '\n' : ''}☀️ Boosted Hundo CP: **${cpBoosted}**`;
      if (types.length) value += `${value ? '\n' : ''}🏷️ Types: ${types.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}`;
      value += `${value ? '\n' : ''}✨ Shiny? ${shinyEmoji}`;
      embed.fields.push({ name, value, inline: true });
    }

    const thumb = list[0]?.image;
    if (thumb) EmbedUtils.setThumbnail(embed, thumb);
    EmbedUtils.setFooter(embed, CONFIG.FOOTERS.LEEK_DUCK);
    embeds.push(embed);
  }

  return { embeds };
}

// Handle Raid Boss command (ScrapedDuck raids.json)
async function handleRaidBossCommand(options) {
  const bossName = options.find(opt => opt.name === "name")?.value;
  if (!bossName) {
    return { content: "Boss name is required." };
  }

  const raids = await getRaidBosses();
  if (!raids || raids.length === 0) {
    return { content: "Sorry, I couldn't fetch the raid data at the moment." };
  }

  const boss = raids.find(r => (r.name || '').toLowerCase() === bossName.toLowerCase());
  if (!boss) {
    return { content: `Couldn't find ${bossName} in the current raid bosses.` };
  }

  // Determine color and level text from tier
  const tier = boss.tier || '';
  const color = /mega/i.test(tier) ? CONFIG.COLORS.RED
    : /5/.test(tier) ? CONFIG.COLORS.ORANGE
    : /3/.test(tier) ? CONFIG.COLORS.BLUE
    : /1/.test(tier) ? CONFIG.COLORS.GREEN
    : CONFIG.COLORS.DISCORD_BLUE;
  const levelText = tier || 'Raid';

  // Build description from new schema
  const types = Array.isArray(boss.types)
    ? boss.types.map(t => (typeof t === 'string' ? t : t.name)).filter(Boolean)
    : [];
  const cpNormal = boss.combatPower?.normal?.max;
  const cpBoosted = boss.combatPower?.boosted?.max;
  const weather = Array.isArray(boss.boostedWeather)
    ? boss.boostedWeather.map(w => (typeof w === 'string' ? w : w.name))
    : [];

  let description = '';
  if (types.length) description += `**Types**: ${types.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}\n\n`;
  if (cpNormal != null) description += `🏆 **Perfect IV CP**: ${cpNormal}\n`;
  if (cpBoosted != null) description += `☀️ **Perfect IV CP (Weather Boosted)**: ${cpBoosted}\n\n`;
  if (weather.length) description += `🌤️ **Boosted in**: ${weather.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(', ')} weather\n\n`;
  description += `✨ **Shiny Available**: ${boss.canBeShiny ? 'Yes ✅' : 'No ❌'}`;

  const mainEmbed = EmbedUtils.createBaseEmbed(
    `${boss.name} - ${levelText}`,
    color,
    description
  );
  if (boss.image) {
    EmbedUtils.setImage(mainEmbed, boss.image);
  }
  EmbedUtils.setFooter(mainEmbed, CONFIG.FOOTERS.LEEK_DUCK);

  return { embeds: [mainEmbed] };
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
    // Build choices with all Pokemon including forms
    const allPokemon = getAllPokemonWithForms(pokedex);
    const choices = [];
    const seen = new Set();
    
    for (const p of allPokemon) {
      const baseName = p.names.English;
      const formName = p.formId && p.formId !== p.id ? p.formId.replace(/_/g, ' ') : '';
      let choiceName;
      if (formName) {
        choiceName = `${baseName} ${formName}`;
      } else {
        choiceName = baseName;
      }
      // Only add if not already seen
      if (!seen.has(choiceName.toLowerCase())) {
        choices.push({ name: choiceName, value: choiceName });
        seen.add(choiceName.toLowerCase());
      }
    }

    if (!searchValue) {
      // Show popular Pokemon and their forms if no search value
      return choices
        .filter(choice => CONFIG.LIMITS.POPULAR_POKEMON.some(pop => choice.name.toLowerCase().startsWith(pop)))
        .slice(0, CONFIG.LIMITS.AUTOCOMPLETE_RESULTS);
    }

    return choices
      .filter(choice => choice.name.toLowerCase().includes(searchValue))
      .slice(0, CONFIG.LIMITS.AUTOCOMPLETE_RESULTS);
  },

  async raidboss(focusedValue) {
    const raids = await getRaidBosses();
    if (!raids || raids.length === 0) return [];

    const allRaids = getAllRaids(raids);
    const searchValue = focusedValue.toLowerCase();
    
    const toChoice = r => ({ name: r.name, value: r.name });

    if (!searchValue) {
      return allRaids
        .slice(0, CONFIG.LIMITS.AUTOCOMPLETE_RESULTS)
        .map(toChoice);
    }

    return allRaids
      .filter(r => (r.name || '').toLowerCase().includes(searchValue))
      .slice(0, CONFIG.LIMITS.AUTOCOMPLETE_RESULTS)
      .map(toChoice);
  },

  async hundo(focusedValue) {
    // Hundo uses the same logic as raidboss since it's for raid bosses
    const raids = await getRaidBosses();
    if (!raids || raids.length === 0) return [];

    const allRaids = getAllRaids(raids);
    const searchValue = focusedValue.toLowerCase();
    
    const toChoice = r => ({ name: r.name, value: r.name });

    if (!searchValue) {
      return allRaids
        .slice(0, CONFIG.LIMITS.AUTOCOMPLETE_RESULTS)
        .map(toChoice);
    }

    return allRaids
      .filter(r => (r.name || '').toLowerCase().includes(searchValue))
      .slice(0, CONFIG.LIMITS.AUTOCOMPLETE_RESULTS)
      .map(toChoice);
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

// ---- Event announcements (ScrapedDuck events watcher) ----
const EVENTS_KV_KEYS = {
  postedIds: 'events_posted_ids',
  channel: 'events_channel_id'
};

const RAIDS_KV_KEYS = {
  lastPostedKey: 'raids_last_posted_key',
  channel: 'raids_channel_id'
};

async function getEventsData() {
  const result = await fetchWithValidation(
    CONFIG.URLS.EVENTS,
    data => Array.isArray(data)
  );
  if (result.success) return result.data;
  console.error('Failed to fetch events data:', result.error);
  return [];
}

async function getStoredPostedEventIds(env) {
  if (!env.EVENTS_KV) return null; // KV not configured
  try {
    const raw = await env.EVENTS_KV.get(EVENTS_KV_KEYS.postedIds);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    console.error('Error reading posted event IDs from KV:', e);
    return new Set();
  }
}

async function setStoredPostedEventIds(env, idSet) {
  if (!env.EVENTS_KV) return; // KV not configured
  try {
    const arr = Array.from(idSet);
    await env.EVENTS_KV.put(EVENTS_KV_KEYS.postedIds, JSON.stringify(arr));
  } catch (e) {
    console.error('Error writing posted event IDs to KV:', e);
  }
}

async function getConfiguredEventsChannelId(env) {
  try {
    // Prefer KV-configured channel ID; fallback to env var
    const kvChannel = env.EVENTS_KV ? await env.EVENTS_KV.get(EVENTS_KV_KEYS.channel) : null;
    return kvChannel || env.EVENTS_CHANNEL_ID || null;
  } catch (e) {
    console.error('Error retrieving configured events channel ID:', e);
    return env.EVENTS_CHANNEL_ID || null;
  }
}

async function sendEventImageToChannel(env, channelId, eventObj) {
  const token = env.DISCORD_TOKEN;
  if (!token) throw new Error('DISCORD_TOKEN not configured');
  if (!channelId) throw new Error('Channel ID not provided');
  if (!eventObj?.image) throw new Error('Event object missing image URL');

  const embed = {
    title: eventObj.name || 'New Event',
    url: eventObj.link || undefined,
    image: { url: eventObj.image },
    footer: { text: CONFIG.FOOTERS.LEEK_DUCK }
  };

  const resp = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      embeds: [embed],
      allowed_mentions: { parse: [] }
    })
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Discord API error ${resp.status}: ${text}`);
  }
}

async function sendEmbedsToChannel(env, channelId, embeds) {
  const token = env.DISCORD_TOKEN;
  if (!token) throw new Error('DISCORD_TOKEN not configured');
  if (!channelId) throw new Error('Channel ID not provided');
  if (!Array.isArray(embeds) || embeds.length === 0) return;

  // Discord allows up to 10 embeds per message
  const chunks = [];
  for (let i = 0; i < embeds.length; i += 10) {
    chunks.push(embeds.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    const resp = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ embeds: chunk, allowed_mentions: { parse: [] } })
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Discord API error ${resp.status}: ${text}`);
    }
  }
}

async function checkAndAnnounceNewEvents(env) {
  // Ensure required config is present
  if (!env.DISCORD_TOKEN) {
    console.warn('Skipping events check: DISCORD_TOKEN not configured.');
    return;
  }

  const channelId = await getConfiguredEventsChannelId(env);
  if (!channelId) {
    console.warn('Skipping events check: events channel is not configured.');
    return;
  }

  if (!env.EVENTS_KV) {
    console.warn('Skipping events check: EVENTS_KV binding is not configured; cannot track posted events safely.');
    return;
  }

  const events = await getEventsData();
  if (!events.length) {
    console.log('No events data available from source.');
    return;
  }

  let postedSet = await getStoredPostedEventIds(env);
  const isFirstRun = (postedSet === null);
  if (!postedSet) postedSet = new Set();

  const currentIds = new Set(events.map(e => e.eventID));
  const newEvents = events.filter(e => e?.eventID && !postedSet.has(e.eventID));

  if (isFirstRun) {
    // On first run: announce only events that start in the future, then initialize state
    const nowMs = Date.now();
    const futureEvents = events.filter(e => {
      if (!e?.start) return false;
      const t = Date.parse(e.start);
      return !Number.isNaN(t) && t > nowMs;
    });

    if (futureEvents.length > 0) {
      console.log(`First run: announcing ${futureEvents.length} upcoming event(s) before initializing state...`);
      for (const ev of futureEvents) {
        try {
          if (ev.image) {
            await sendEventImageToChannel(env, channelId, ev);
          } else {
            console.warn(`Event ${ev.eventID} has no image URL; skipping.`);
          }
        } catch (error) {
          console.error('Error posting upcoming event on first run:', ev?.eventID, error);
        }
      }
    } else {
      console.log('First run: no upcoming events to announce.');
    }

    // Initialize posted set with all current events to prevent backfill spam
    await setStoredPostedEventIds(env, currentIds);
    console.log(`Initialized events KV with ${currentIds.size} event IDs.`);
    return;
  }

  if (newEvents.length === 0) {
    console.log('No new events detected.');
    return;
  }

  console.log(`Detected ${newEvents.length} new event(s). Posting to channel ${channelId}...`);

  for (const ev of newEvents) {
    try {
      if (ev.image) {
        await sendEventImageToChannel(env, channelId, ev);
        postedSet.add(ev.eventID);
      } else {
        console.warn(`Event ${ev.eventID} has no image URL; skipping.`);
      }
    } catch (error) {
      console.error('Error posting new event:', ev?.eventID, error);
    }
  }

  await setStoredPostedEventIds(env, postedSet);
}

// Permission helper
function hasAdminPermission(body) {
  try {
    const permsStr = body?.member?.permissions || '0';
    const perms = BigInt(permsStr);
    const ADMINISTRATOR = 0x8n;
    const MANAGE_GUILD = 0x20n;
    return (perms & ADMINISTRATOR) !== 0n || (perms & MANAGE_GUILD) !== 0n;
  } catch (_) {
    return false;
  }
}

async function getConfiguredRaidsChannelId(env) {
  try {
    const kvChannel = env.EVENTS_KV ? await env.EVENTS_KV.get(RAIDS_KV_KEYS.channel) : null;
    return kvChannel || env.RAIDS_CHANNEL_ID || null;
  } catch (e) {
    console.error('Error retrieving configured raids channel ID:', e);
    return env.RAIDS_CHANNEL_ID || null;
  }
}

// Slash command: /eventschannel [channel]
async function handleEventsChannelCommand(options, body, env) {
  const channelOpt = options.find(opt => opt.name === 'channel');
  if (channelOpt) {
    const channelId = String(channelOpt.value);
    if (!env.EVENTS_KV) {
      return {
        content: 'Error: EVENTS_KV is not configured in this Worker. Please configure a KV namespace binding named "EVENTS_KV" to store settings.',
        flags: 64
      };
    }
    await env.EVENTS_KV.put(EVENTS_KV_KEYS.channel, channelId);
    return { content: `Events channel set to <#${channelId}>.`, flags: 64 };
  } else {
    const current = await getConfiguredEventsChannelId(env);
    if (current) {
      return { content: `Current events channel: <#${current}>`, flags: 64 };
    }
    return { content: 'Events channel is not set. Provide a channel option or configure EVENTS_CHANNEL_ID.', flags: 64 };
  }
}

// Slash command: /raidschannel [channel]
async function handleRaidsChannelCommand(options, body, env) {
  const channelOpt = options.find(opt => opt.name === 'channel');
  if (channelOpt) {
    const channelId = String(channelOpt.value);
    if (!env.EVENTS_KV) {
      return {
        content: 'Error: EVENTS_KV is not configured. Please bind a KV namespace named "EVENTS_KV" to store settings.',
        flags: 64
      };
    }
    await env.EVENTS_KV.put(RAIDS_KV_KEYS.channel, channelId);
    return { content: `Raids channel set to <#${channelId}>.`, flags: 64 };
  } else {
    const current = await getConfiguredRaidsChannelId(env);
    if (current) {
      return { content: `Current raids channel: <#${current}>`, flags: 64 };
    }
    return { content: 'Raids channel is not set. Provide a channel option or configure RAIDS_CHANNEL_ID.', flags: 64 };
  }
}

// Slash command: /eventsrun
async function handleEventsRunCommand(options, body, env) {
  // Restrict to server admins / manage guild
  if (!hasAdminPermission(body)) {
    return { content: 'You need Administrator or Manage Server permissions to run this command.', flags: 64 };
  }
  try {
    await checkAndAnnounceNewEvents(env);
    return { content: 'Triggered events check. Check this channel for announcements and Worker logs for details.', flags: 64 };
  } catch (e) {
    console.error('Error during /eventsrun:', e);
    return { content: 'Failed to run events check. See logs for details.', flags: 64 };
  }
}

async function postWeeklyRaids(env) {
  // Ensure config
  if (!env.DISCORD_TOKEN) {
    console.warn('Skipping raids weekly post: DISCORD_TOKEN not configured.');
    return;
  }
  const channelId = await getConfiguredRaidsChannelId(env);
  if (!channelId) {
    console.warn('Skipping raids weekly post: raids channel is not configured.');
    return;
  }
  if (!env.EVENTS_KV) {
    console.warn('Skipping raids weekly post: EVENTS_KV not configured; cannot track last post.');
    return;
  }

  // Prevent duplicate postings within the same day key
  const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  try {
    const lastKey = await env.EVENTS_KV.get(RAIDS_KV_KEYS.lastPostedKey);
    if (lastKey === todayKey) {
      console.log('Raids weekly post already sent today; skipping.');
      return;
    }
  } catch (e) {
    console.error('Error reading last raids post key:', e);
  }

  // Build embeds from the same logic as /currentraids
  const result = await handleCurrentRaidsCommand();
  const embeds = result?.embeds || [];
  if (!embeds.length) {
    console.warn('No raids embeds to send.');
    return;
  }

  try {
    await sendEmbedsToChannel(env, channelId, embeds);
    await env.EVENTS_KV.put(RAIDS_KV_KEYS.lastPostedKey, todayKey);
    console.log(`Posted raids summary to channel ${channelId} with ${embeds.length} embed(s).`);
  } catch (e) {
    console.error('Error posting raids summary:', e);
  }
}

// Main worker handler
export default {
  async fetch(request, env, ctx) {
    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // --- Discord signature verification: always required ---
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const publicKey = env.PUBLIC_KEY;
    
    // Log signature verification details for debugging
    console.log('Signature verification details:', {
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
      hasPublicKey: !!publicKey,
      timestamp: timestamp,
      publicKeyLength: publicKey ? publicKey.length : 0
    });
    
    if (!publicKey || !signature || !timestamp) {
      console.error('Missing signature headers:', { publicKey: !!publicKey, signature: !!signature, timestamp: !!timestamp });
      return new Response('Missing signature headers', { status: 401 });
    }

    // Validate timestamp to prevent replay attacks (allow 5 minutes of clock skew)
    const timestampNum = parseInt(timestamp);
    const now = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(now - timestampNum);
    
    if (isNaN(timestampNum) || timeDiff > 300) { // 5 minutes = 300 seconds
      console.error('Invalid timestamp:', { timestamp, timestampNum, now, timeDiff });
      return new Response('Invalid timestamp', { status: 401 });
    }

    // Read the body as bytes ONCE
    const bodyBuffer = await request.arrayBuffer();
    const bodyUint8 = new Uint8Array(bodyBuffer);

    // Verify the request signature with better error handling
    let isValidRequest = false;
    try {
      isValidRequest = await verifyKey(bodyUint8, signature, timestamp, publicKey);
      console.log('Signature verification result:', isValidRequest);
    } catch (e) {
      console.error('Signature verification error:', e);
      isValidRequest = false;
    }
    
    if (!isValidRequest) {
      console.error('Bad request signature - verification failed');
      return new Response('Bad request signature', { status: 401 });
    }
    
    console.log('Signature verification successful');
    // --- End Discord signature verification ---

    // Parse the request body as JSON
    let body;
    try {
      const bodyText = new TextDecoder().decode(bodyUint8);
      body = JSON.parse(bodyText);
    } catch (error) {
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
          egg: handleEggCommand,
          eventschannel: handleEventsChannelCommand,
          raidschannel: handleRaidsChannelCommand,
          eventsrun: handleEventsRunCommand
        };
        const handler = commandHandlers[name.toLowerCase()];
        const responseData = handler 
          ? await handler(options, body, env)
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
  },
  async scheduled(event, env, ctx) {
    try {
      // Always run events watcher on schedule
      await checkAndAnnounceNewEvents(env);

      // If this invocation is from our weekly raids cron, post the raids summary
      if (event?.cron === '0 17 * * TUE') {
        await postWeeklyRaids(env);
      }
    } catch (e) {
      console.error('Scheduled event error:', e);
    }
  }
};
