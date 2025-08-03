import { verifyKey } from "discord-interactions";

// Configuration constants
const CONFIG = {
  COLORS: {
    GREEN: 0x00ff00,
    RED: 0xff0000,
    ORANGE: 0xffa500,
    BLUE: 0x0000ff,
    DEEP_SKY_BLUE: 0x00bfff,
    DISCORD_BLUE: 0x3498db,
  },
  LIMITS: {
    AUTOCOMPLETE_RESULTS: 25,
    POPULAR_POKEMON: ["charizard", "mewtwo", "rayquaza", "tyranitar"],
  },
  URLS: {
    POKEDEX: "https://pokemon-go-api.github.io/pokemon-go-api/api/pokedex.json",
    RAID_BOSSES:
      "https://pokemon-go-api.github.io/pokemon-go-api/api/raidboss.json",
    RESEARCH:
      "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/research.json",
    EGGS: "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/eggs.json",
    EVENTS:
      "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json",
    DEFAULT_IMAGE:
      "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm000.icon.png",
  },
  FOOTERS: {
    POKEMON_GO_API:
      "Data provided by Pokemon GO API (github.com/pokemon-go-api/pokemon-go-api)",
    LEEK_DUCK: "Data from Leek Duck (via ScrapedDuck)",
  },
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes in milliseconds
};

// Fetch events data
async function getEventsData() {
  const cached = cache.get("events");
  if (cached) return cached;

  const result = await fetchWithValidation(CONFIG.URLS.EVENTS, (data) =>
    Array.isArray(data)
  );
  if (result.success) {
    cache.set("events", result.data);
    return result.data;
  }
  return [];
}

// Pleasant color palette for event types
const EVENT_TYPE_COLORS = {
  "community-day": 0x43e97b,
  research: 0x3fa7d6,
  "raid-day": 0xf7b32b,
  "go-rocket-takeover": 0x7d5fff,
  event: 0x00b894,
  "timed-research": 0x00cec9,
  "raid-battles": 0xfd79a8,
  "team-go-rocket": 0x636e72,
  "live-event": 0x6c5ce7,
  "limited-research": 0x81ecec,
  "raid-hour": 0xe17055,
  "giovanni-special-research": 0x2d3436,
  "pokemon-go-fest": 0xff7675,
  "research-breakthrough": 0x0984e3,
  "raid-weekend": 0xf1c40f,
  "global-challenge": 0x00b894,
  "special-research": 0x00bfff,
  "go-battle-league": 0x636e72,
  "safari-zone": 0x00cec9,
  "elite-raids": 0xd35400,
  "ticketed-event": 0x6ab04c,
  "location-specific": 0x4834d4,
  "bonus-hour": 0x00b894,
  "pokemon-spotlight-hour": 0xfdcb6e,
  "potential-ultra-unlock": 0x00bfff,
  update: 0x636e72,
  season: 0x00b894,
  "pokemon-go-tour": 0xe17055,
};

const now = new Date();

// --- Enhanced events command: require event selection or show summary ---
async function handleEventsCommand(options = []) {
  const events = await getEventsData();
  if (!events || events.length === 0) {
    return {
      content: "Sorry, I couldn't fetch the events data at the moment.",
    };
  }

  const now = new Date();
  const filtered = events.filter((ev) => new Date(ev.end) >= now);

  // Check if user selected an event
  const selectedEventID = options.find((opt) => opt.name === "event")?.value;
  if (!selectedEventID) {
    // Show summary list of event names and dates
    const summary = filtered
      .map(
        (ev) =>
          `• **${ev.name}**: ${new Date(
            ev.start
          ).toLocaleDateString()} - ${new Date(ev.end).toLocaleDateString()}`
      )
      .join("\n");
    return {
      content: `Current & upcoming events:\n\n${summary}\n\nSelect an event for details.`,
    };
  }

  // Find the selected event
  const ev = filtered.find((e) => e.eventID === selectedEventID);
  if (!ev) {
    return { content: "Event not found." };
  }

  // Build embed for the selected event
  let description = "";
  if (ev.heading) description += `**${ev.heading}**\n`;
  description += `🗓️ **Start:** ${new Date(ev.start).toLocaleString()}\n`;
  description += `🗓️ **End:** ${new Date(ev.end).toLocaleString()}\n`;
  if (ev.eventType)
    description += `\n**Type:** ${ev.eventType.replace(/-/g, " ")}\n`;
  if (ev.extraData?.generic) {
    const extras = [];
    if (ev.extraData.generic.hasSpawns) extras.push("Spawns");
    if (ev.extraData.generic.hasFieldResearchTasks)
      extras.push("Field Research Tasks");
    if (extras.length) description += `\nIncludes: ${extras.join(", ")}`;
  }
  if (ev.link) description += `\n[More Info](${ev.link})`;

  // Pick color based on eventType, fallback to DISCORD_BLUE
  const colorKey = (ev.eventType || "").toLowerCase();
  const color = EVENT_TYPE_COLORS[colorKey] || CONFIG.COLORS.DISCORD_BLUE;

  const embed = EmbedUtils.createBaseEmbed(ev.name, color, description);
  if (ev.image) EmbedUtils.setImage(embed, ev.image);

  // --- Special parsing for large-format event details ---
  if (ev.extraData?.communityday) {
    const cd = ev.extraData.communityday;
    // Spawns
    if (Array.isArray(cd.spawns) && cd.spawns.length > 0) {
      EmbedUtils.addField(
        embed,
        "Spawns",
        cd.spawns
          .map((s) => `${s.name}${s.image ? ` [🖼️](${s.image})` : ""}`)
          .join(", ")
      );
    }
    // Bonuses
    if (Array.isArray(cd.bonuses) && cd.bonuses.length > 0) {
      EmbedUtils.addField(
        embed,
        "Bonuses",
        cd.bonuses
          .map((b) => `${b.text}${b.image ? ` [🖼️](${b.image})` : ""}`)
          .join("\n")
      );
    }
    // Shinies
    if (Array.isArray(cd.shinies) && cd.shinies.length > 0) {
      EmbedUtils.addField(
        embed,
        "Shinies",
        cd.shinies
          .map((s) => `${s.name}${s.image ? ` [✨](${s.image})` : ""}`)
          .join(", ")
      );
    }
    // Bonus disclaimers
    if (Array.isArray(cd.bonusDisclaimers) && cd.bonusDisclaimers.length > 0) {
      EmbedUtils.addField(
        embed,
        "Bonus Disclaimers",
        cd.bonusDisclaimers.join("\n")
      );
    }
    // Special research steps
    if (Array.isArray(cd.specialresearch) && cd.specialresearch.length > 0) {
      cd.specialresearch.forEach((sr) => {
        let srText = `**${sr.name}**\n`;
        if (Array.isArray(sr.tasks)) {
          srText += sr.tasks
            .map(
              (t) =>
                `• ${t.text}${
                  t.reward
                    ? ` → ${t.reward.text}${
                        t.reward.image ? ` [🎁](${t.reward.image})` : ""
                      }`
                    : ""
                }`
            )
            .join("\n");
        }
        if (Array.isArray(sr.rewards) && sr.rewards.length > 0) {
          srText +=
            "\nRewards: " +
            sr.rewards
              .map((r) => `${r.text}${r.image ? ` [🎁](${r.image})` : ""}`)
              .join(", ");
        }
        EmbedUtils.addField(
          embed,
          `Special Research ${sr.step ? `(Step ${sr.step})` : ""}`,
          srText
        );
      });
    }
  }

  return { embeds: [embed] };
}

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
  const cached = cache.get("pokedex");
  if (cached) return cached;

  const result = await fetchWithValidation(
    CONFIG.URLS.POKEDEX,
    (data) => Array.isArray(data) && data.length > 0
  );

  if (result.success) {
    cache.set("pokedex", result.data);
    return result.data;
  }

  return null;
}

// Fetch research data
async function getResearchData() {
  const cached = cache.get("research");
  if (cached) return cached;

  const result = await fetchWithValidation(CONFIG.URLS.RESEARCH, (data) =>
    Array.isArray(data)
  );

  if (result.success) {
    cache.set("research", result.data);
    return result.data;
  }

  return [];
}

// Fetch egg data
async function getEggData() {
  const cached = cache.get("eggs");
  if (cached) return cached;

  console.log("Fetching egg data from Leek Duck (via ScrapedDuck)...");
  const result = await fetchWithValidation(
    CONFIG.URLS.EGGS,
    (data) => Array.isArray(data) && data.length > 0
  );

  if (result.success) {
    console.log(
      `Successfully fetched egg data: ${result.data.length} entries found`
    );
    console.log("Sample egg data entry:", JSON.stringify(result.data[0]));
    cache.set("eggs", result.data);
    return result.data;
  }

  console.error("Failed to fetch valid egg data");
  return [];
}

// Fetch raid boss data
async function getRaidBosses() {
  const cached = cache.get("raidBosses");
  if (cached) return cached;

  const result = await fetchWithValidation(
    CONFIG.URLS.RAID_BOSSES,
    (data) => data && typeof data === "object" && data.currentList
  );

  if (result.success) {
    cache.set("raidBosses", result.data);
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
      footer: { text: CONFIG.FOOTERS.POKEMON_GO_API },
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
      ? Object.keys(pokemon.counter).sort(
          (a, b) => pokemon.counter[b] - pokemon.counter[a]
        )
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
      inline: true,
    };
  },
};

// Utility function to get the best image for a Pokémon or form
function getBestPokemonImage(pokemon, basePokemon) {
  // Use the form's own image if available
  let imageUrl = pokemon.assets?.image;
  if (!imageUrl && basePokemon && basePokemon.assetForms && pokemon.formId) {
    // Try to match form in assetForms
    const formKey = pokemon.formId.replace(`${pokemon.id}_`, "").toUpperCase();
    const assetForm = basePokemon.assetForms.find((f) => {
      return (
        (f.form && f.form.toUpperCase() === formKey) ||
        (pokemon.names.English &&
          f.form &&
          pokemon.names.English.toLowerCase().includes(f.form.toLowerCase()))
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
  let pokemon = allPokemon.find((p) => {
    const baseName = p.names.English.toLowerCase();
    const formName =
      p.formId && p.formId !== p.id
        ? p.formId.toLowerCase().replace(/_/g, " ")
        : "";
    const fullFormName = formName ? `${baseName} ${formName}` : "";

    return (
      baseName === searchName ||
      formName === searchName ||
      fullFormName === searchName
    );
  });

  // If no exact match, try fuzzy matching
  if (!pokemon) {
    pokemon = allPokemon.find((p) => {
      const baseName = p.names.English.toLowerCase();
      const formName =
        p.formId && p.formId !== p.id
          ? p.formId.toLowerCase().replace(/_/g, " ")
          : "";
      const fullFormName = formName ? `${baseName} ${formName}` : "";

      return (
        baseName.includes(searchName) ||
        formName.includes(searchName) ||
        fullFormName.includes(searchName)
      );
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
    ...(raidData.currentList.lvl1 || []),
  ];
}

// Get all Pokemon including their forms for comprehensive search
function getAllPokemonWithForms(pokedex) {
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
  const pokemonName = options.find((opt) => opt.name === "name")?.value;
  if (!pokemonName) {
    return { content: "Pokemon name is required." };
  }

  const pokedex = await getPokedex();
  const pokemon = findPokemon(pokedex, pokemonName);

  if (!pokemon) {
    return {
      content: `Sorry, I couldn't find information for ${pokemonName}.`,
    };
  }

  // Find the base Pokemon (for assetForms lookup)
  let basePokemon = pokemon;
  if (pokemon.formId && pokedex) {
    const found = pokedex.find((p) => p.id === pokemon.id);
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
  const embed = EmbedUtils.createBaseEmbed(
    pokemon.names.English,
    CONFIG.COLORS.GREEN,
    description
  );
  EmbedUtils.setImage(embed, imageUrl);

  return { embeds: [embed] };
}

// Handle Hundo command
async function handleHundoCommand(options) {
  const pokemonName = options
    .find((opt) => opt.name === "pokemon")
    ?.value?.toLowerCase();
  if (!pokemonName) {
    return { content: "Pokemon name is required." };
  }

  const raidData = await getRaidBosses();
  if (!raidData) {
    return {
      content: "Sorry, I couldn't fetch the raid data at the moment.",
    };
  }

  const allRaids = getAllRaids(raidData);
  const pokemon = allRaids.find(
    (p) => p.names.English.toLowerCase() === pokemonName
  );

  if (!pokemon) {
    return {
      content: `Couldn't find ${pokemonName} in the current raid bosses.`,
    };
  }

  // Find the base Pokemon for asset lookup
  let basePokemon = pokemon;
  if (pokemon.formId && raidData.pokedex) {
    const found = raidData.pokedex.find((p) => p.id === pokemon.id);
    if (found) basePokemon = found;
  }

  const embed = EmbedUtils.createBaseEmbed(
    `🏆 Perfect IV CP for ${pokemon.names.English}`,
    CONFIG.COLORS.GREEN
  );

  EmbedUtils.addField(embed, "🎯 Normal CP", `**${pokemon.cpRange[1]}**`, true);
  EmbedUtils.addField(
    embed,
    "☀️ Weather Boosted CP",
    `**${pokemon.cpRangeBoost[1]}**`,
    true
  );
  EmbedUtils.setImage(embed, getBestPokemonImage(pokemon, basePokemon));

  return { embeds: [embed] };
}

// Handle Current Raids command with optimized embed creation
async function handleCurrentRaidsCommand() {
  const raidData = await getRaidBosses();
  if (!raidData) {
    return {
      content: "Sorry, I couldn't fetch the raid data at the moment.",
    };
  }

  const embeds = [];
  const raidTiers = [
    { key: "mega", title: "🔄 Mega Raids", color: CONFIG.COLORS.RED },
    {
      key: "lvl5",
      title: "⭐⭐⭐⭐⭐ Level 5 Raids",
      color: CONFIG.COLORS.ORANGE,
    },
    { key: "lvl3", title: "⭐⭐⭐ Level 3 Raids", color: CONFIG.COLORS.BLUE },
    { key: "lvl1", title: "⭐ Level 1 Raids", color: CONFIG.COLORS.GREEN },
  ];

  raidTiers.forEach((tier) => {
    const raidList = raidData.currentList[tier.key];
    if (raidList?.length > 0) {
      const embed = EmbedUtils.createBaseEmbed(tier.title, tier.color);

      raidList.forEach((pokemon) => {
        const field = EmbedUtils.createRaidPokemonField(pokemon);
        embed.fields.push(field);
      });

      // Find the base Pokemon for asset lookup
      let basePokemon = raidList[0];
      if (raidList[0]?.formId && raidData.pokedex) {
        const found = raidData.pokedex.find((p) => p.id === raidList[0].id);
        if (found) basePokemon = found;
      }
      EmbedUtils.setThumbnail(
        embed,
        getBestPokemonImage(raidList[0], basePokemon)
      );
      embeds.push(embed);
    }
  });

  return { embeds };
}

// Handle Raid Boss command
async function handleRaidBossCommand(options) {
  const bossName = options.find((opt) => opt.name === "name")?.value;
  if (!bossName) {
    return { content: "Boss name is required." };
  }

  const raidData = await getRaidBosses();
  if (!raidData) {
    return {
      content: "Sorry, I couldn't fetch the raid data at the moment.",
    };
  }

  const allRaids = getAllRaids(raidData);
  const boss = allRaids.find(
    (p) => p.names.English.toLowerCase() === bossName.toLowerCase()
  );

  if (!boss) {
    return {
      content: `Couldn't find ${bossName} in the current raid bosses.`,
    };
  }

  // Determine raid level and color
  const raidConfig = {
    mega: { level: "Mega Raid", color: CONFIG.COLORS.RED },
    lvl5: { level: "Level 5 Raid", color: CONFIG.COLORS.ORANGE },
    lvl3: { level: "Level 3 Raid", color: CONFIG.COLORS.BLUE },
    lvl1: { level: "Level 1 Raid", color: CONFIG.COLORS.GREEN },
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
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(", ")} weather\n\n`;
  }

  description += `✨ **Shiny Available**: ${boss.shiny ? "Yes ✅" : "No ❌"}`;

  // Find the base Pokemon for asset lookup
  let basePokemon = boss;
  if (boss.formId && raidData.pokedex) {
    const found = raidData.pokedex.find((p) => p.id === boss.id);
    if (found) basePokemon = found;
  }

  const mainEmbed = EmbedUtils.createBaseEmbed(
    `${boss.names.English} - ${config.level}`,
    config.color,
    description
  );
  EmbedUtils.setImage(mainEmbed, getBestPokemonImage(boss, basePokemon));

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
  const researchTask = options.find((opt) => opt.name === "task")?.value;
  if (!researchTask) {
    return { content: "Research task is required." };
  }

  const researchData = await getResearchData();
  if (!researchData || researchData.length === 0) {
    return {
      content: "Sorry, I couldn't fetch the research data at the moment.",
    };
  }

  const task = researchData.find((t) => t.text === researchTask);
  if (!task) {
    return { content: `Couldn't find research task: "${researchTask}"` };
  }

  const embed = EmbedUtils.createBaseEmbed(
    "Research Task",
    CONFIG.COLORS.DISCORD_BLUE,
    task.text
  );
  EmbedUtils.setFooter(embed, CONFIG.FOOTERS.LEEK_DUCK);

  // Handle rewards
  if (task.rewards?.length > 0) {
    const rewardsText = task.rewards
      .map((reward) => {
        let text = `**${reward.name}**`;
        if (reward.combatPower) {
          text += ` (CP: ${reward.combatPower.min}-${reward.combatPower.max})`;
        }
        if (reward.canBeShiny) {
          text += " ✨";
        }
        return text;
      })
      .join("\n");

    EmbedUtils.addField(
      embed,
      "Possible Rewards",
      rewardsText || "Unknown rewards"
    );

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
  const eggType = options.find((opt) => opt.name === "type")?.value;
  if (!eggType) {
    return { content: "Egg type is required." };
  }

  try {
    const data = await getEggData();
    if (!data?.length) {
      return { content: "Sorry, I couldn't fetch egg data at this time." };
    }

    const pokemonInEgg = data.filter(
      (p) => p.eggType.toLowerCase() === eggType.toLowerCase()
    );
    if (pokemonInEgg.length === 0) {
      return {
        content: `Sorry, I couldn't find information for "${eggType}" eggs.`,
      };
    }

    const embed = EmbedUtils.createBaseEmbed(
      `${eggType} Eggs`,
      CONFIG.COLORS.DEEP_SKY_BLUE,
      `Here are Pokémon that can hatch from ${eggType} eggs:`
    );
    EmbedUtils.setFooter(embed, CONFIG.FOOTERS.LEEK_DUCK);

    // Group Pokemon efficiently
    const groups = {
      shiny: pokemonInEgg.filter((p) => p.canBeShiny),
      nonShiny: pokemonInEgg.filter((p) => !p.canBeShiny),
      adventureSync: pokemonInEgg.filter((p) => p.isAdventureSync),
      regional: pokemonInEgg.filter((p) => p.isRegional),
    };

    // Add fields for each group
    if (groups.shiny.length > 0) {
      EmbedUtils.addField(
        embed,
        "Can be Shiny",
        groups.shiny.map((p) => `${p.name} ✨`).join(", ")
      );
    }

    if (groups.nonShiny.length > 0) {
      EmbedUtils.addField(
        embed,
        "Cannot be Shiny",
        groups.nonShiny.map((p) => p.name).join(", ")
      );
    }

    if (groups.adventureSync.length > 0) {
      EmbedUtils.addField(
        embed,
        "Adventure Sync Exclusive",
        groups.adventureSync.map((p) => p.name).join(", ")
      );
    }

    if (groups.regional.length > 0) {
      EmbedUtils.addField(
        embed,
        "Regional Exclusive",
        groups.regional.map((p) => p.name).join(", ")
      );
    }

    if (pokemonInEgg[0]?.image) {
      EmbedUtils.setThumbnail(embed, pokemonInEgg[0].image);
    }

    return { embeds: [embed] };
  } catch (error) {
    console.error("Error handling egg command:", error);
    return {
      content: "Sorry, an error occurred while processing your request.",
    };
  }
}

// --- Discord Interaction Handler ---
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  let body;
  try {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const rawBody = await request.text();
    body = JSON.parse(rawBody);
    // Verify Discord signature
    const isValid = verifyKey(rawBody, signature, timestamp, DISCORD_PUBLIC_KEY);
    if (!isValid) {
      return new Response('Bad request signature.', { status: 401 });
    }
    // Discord interaction type handling
    if (body.type === 1) {
      // PING
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (body.type === 2) {
      // APPLICATION_COMMAND
      const commandHandlers = {
        pokemon: handlePokemonCommand,
        hundo: handleHundoCommand,
        currentraids: handleCurrentRaidsCommand,
        raidboss: handleRaidBossCommand,
        events: handleEventsCommand,
        research: handleResearchCommand,
        egg: handleEggCommand,
      };
      const handler = commandHandlers[body.data.name];
      if (handler) {
        const result = await handler(body.data.options || []);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(JSON.stringify({ content: 'Unknown command.' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    if (body.type === 4) {
      // APPLICATION_COMMAND_AUTOCOMPLETE
      const autocompleteHandlers = {
        events: AutocompleteHandlers.events,
        pokemon: AutocompleteHandlers.pokemon,
        research: AutocompleteHandlers.research,
        egg: AutocompleteHandlers.egg,
      };
      const handler = autocompleteHandlers[body.data.name];
      if (handler) {
        const choices = await handler(body.data.options[0]?.value || '');
        return new Response(
          JSON.stringify({ type: 4, data: { choices } }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ type: 4, data: { choices: [] } }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    // Unknown interaction type
    return new Response(JSON.stringify({ content: 'Unknown interaction type.' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error handling request:', error);
    return new Response(JSON.stringify({ content: 'Internal error.' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}

// Optimized autocomplete handlers
const AutocompleteHandlers = {
  async events(focusedValue) {
    const events = await getEventsData();
    if (!events?.length) return [];
    const now = new Date();
    // Only show current/future events
    const filtered = events.filter((ev) => new Date(ev.end) >= now);
    const searchValue = focusedValue.toLowerCase();
    let choices = filtered.map((ev) => ({
      name: ev.name,
      value: ev.eventID,
    }));
    if (searchValue) {
      choices = choices.filter((c) =>
        c.name.toLowerCase().includes(searchValue)
      );
    }
    return choices.slice(0, CONFIG.LIMITS.AUTOCOMPLETE_RESULTS);
  },

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
      const formName =
        p.formId && p.formId !== p.id ? p.formId.replace(/_/g, " ") : "";
      const fullFormName = formName ? `${baseName} ${formName}` : baseName;

      // Avoid duplicates
      if (seen.has(fullFormName.toLowerCase())) continue;
      seen.add(fullFormName.toLowerCase());

      if (
        baseName.toLowerCase().includes(searchValue) ||
        formName.toLowerCase().includes(searchValue) ||
        fullFormName.toLowerCase().includes(searchValue)
      ) {
        choices.push({
          name: fullFormName,
          value: fullFormName,
        });
      }
    }

    return choices.slice(0, CONFIG.LIMITS.AUTOCOMPLETE_RESULTS);
  },

  async research(focusedValue) {
    const researchData = await getResearchData();
    if (!researchData?.length) return [];
    const filtered = researchData.filter((task) =>
      task.text.toLowerCase().includes(focusedValue.toLowerCase())
    );
    return filtered
      .slice(0, CONFIG.LIMITS.AUTOCOMPLETE_RESULTS)
      .map((task) => ({
        name:
          task.text.length > 100
            ? task.text.substring(0, 97) + "..."
            : task.text,
        value: task.text,
      }));
  },

  async egg(focusedValue) {
    try {
      const data = await getEggData();
      if (!data?.length) return [];

      const eggTypes = [...new Set(data.map((egg) => egg.eggType))];
      const filtered = eggTypes.filter((type) =>
        type.toLowerCase().includes(focusedValue.toLowerCase())
      );

      return filtered
        .slice(0, CONFIG.LIMITS.AUTOCOMPLETE_RESULTS)
        .map((type) => ({ name: type, value: type }));
    } catch (error) {
      console.error("Error in egg autocomplete:", error);
      return [];
    }
  },
};
