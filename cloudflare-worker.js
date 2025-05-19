import { verifyKey } from 'discord-interactions';

// Cache for Pokedex data (only valid for function instance lifetime)
let pokedexCache = null;
let researchCache = null;  // Add cache for research data
let eggCache = null;  // Add cache for egg data

// Fetch full Pokedex data
async function getPokedex() {
  try {
    const response = await fetch(
      "https://pokemon-go-api.github.io/pokemon-go-api/api/pokedex.json"
    );
    if (!response.ok) {
      throw new Error("Failed to fetch Pokedex data");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching Pokedex:", error);
    return null;
  }
}

// Fetch research data
async function getResearchData() {
  try {
    // Return cached data if available
    if (researchCache) {
      return researchCache;
    }
    
    const response = await fetch(
      "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/research.json"
    );
    if (!response.ok) {
      throw new Error("Failed to fetch research data");
    }
    
    researchCache = await response.json();
    return researchCache;
  } catch (error) {
    console.error("Error fetching research data:", error);
    return [];
  }
}

// Fetch egg data
async function getEggData() {
  try {
    // Return cached data if available
    if (eggCache) {
      return eggCache;
    }
    
    console.log("Fetching egg Data from Leek Duck (via ScrapedDuck)...");
    const response = await fetch(
      "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/eggs.json"
    );
    
    if (!response.ok) {
      console.error(`Failed to fetch egg data: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch egg data: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Successfully fetched egg data: ${data.length} entries found`);
    
    // Validate data structure
    if (!Array.isArray(data) || data.length === 0) {
      console.error("Egg data is not in expected format (array expected)");
      return [];
    }
    
    // Sample log of the first entry to verify structure
    console.log("Sample egg data entry:", JSON.stringify(data[0]));
    
    eggCache = data;
    return eggCache;
  } catch (error) {
    console.error("Error fetching egg data:", error);
    return [];
  }
}

// Fetch raid boss data
async function getRaidBosses() {
  try {
    const response = await fetch(
      "https://pokemon-go-api.github.io/pokemon-go-api/api/raidboss.json"
    );
    return await response.json();
  } catch (error) {
    console.error("Error fetching raid bosses:", error);
    return null;
  }
}

// Find Pokemon by name (including forms)
async function findPokemon(name) {
  const pokedex = await getPokedex();
  if (!pokedex) return null;

  const searchName = name.toLowerCase();
  console.log(`Searching for Pokemon: ${searchName}`);

  // This is a simplified version; we're only doing basic search
  return pokedex.find((p) => {
    const baseName = p.names.English.toLowerCase();
    const formName = p.formId ? p.formId.toLowerCase() : "";
    return baseName === searchName || formName === searchName;
  });
}

// Handle Pokemon info command
async function handlePokemonCommand(options) {
  const pokemonName = options.find(opt => opt.name === "name").value;
  const pokemon = await findPokemon(pokemonName);
  
  if (!pokemon) {
    return {
      content: `Sorry, I couldn't find information for ${pokemonName}.`
    };
  }

  let response = `**${pokemon.names.English}**\n`;

  // Form information
  if (pokemon.formId && pokemon.formId !== pokemon.id) {
    response += `🔄 **Form**: ${pokemon.formId.replace(/_/g, " ")}\n`;
  }

  // Types
  const types = [pokemon.primaryType.names.English];
  if (pokemon.secondaryType) {
    types.push(pokemon.secondaryType.names.English);
  }
  response += `🏷️ **Type**: ${types.join(", ")}\n`;

  // Stats
  response += `\n📊 **Base Stats**:\n`;
  response += `❤️ **Stamina**: ${pokemon.stats.stamina}\n`;
  response += `⚔️ **Attack**: ${pokemon.stats.attack}\n`;
  response += `🛡️ **Defense**: ${pokemon.stats.defense}\n`;

  // Create embed with Pokemon image
  const embed = {
    title: pokemon.names.English,
    description: response,
    color: 0x00ff00, // Green color
    image: {
      url:
        pokemon.assets?.image ||
        "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm000.icon.png",
    },
    footer: {
      text: "Data provided by Pokemon GO API (github.com/pokemon-go-api/pokemon-go-api)",
    },
  };

  return {
    embeds: [embed]
  };
}

// Handle Hundo command
async function handleHundoCommand(options) {
  const pokemonName = options.find(opt => opt.name === "pokemon").value.toLowerCase();
  const raidData = await getRaidBosses();

  if (!raidData) {
    return {
      content: "Sorry, I couldn't fetch the raid data at the moment."
    };
  }

  // Search through all raid levels
  const allRaids = [
    ...(raidData.currentList.mega || []),
    ...(raidData.currentList.lvl5 || []),
    ...(raidData.currentList.lvl3 || []),
    ...(raidData.currentList.lvl1 || []),
  ];

  const pokemon = allRaids.find(
    (p) => p.names.English.toLowerCase() === pokemonName
  );

  if (!pokemon) {
    return {
      content: `Couldn't find ${pokemonName} in the current raid bosses.`
    };
  }

  const perfectCP = pokemon.cpRange[1];
  const perfectCPBoosted = pokemon.cpRangeBoost[1];

  const embed = {
    title: `🏆 Perfect IV CP for ${pokemon.names.English}`,
    color: 0x00ff00, // Green color
    fields: [
      {
        name: "🎯 Normal CP",
        value: `**${perfectCP}**`,
        inline: true,
      },
      {
        name: "☀️ Weather Boosted CP",
        value: `**${perfectCPBoosted}**`,
        inline: true,
      },
    ],
    image: {
      url:
        pokemon.assets?.image ||
        "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm000.icon.png",
    },
    footer: {
      text: "Data provided by Pokemon GO API (github.com/pokemon-go-api/pokemon-go-api)",
    },
  };

  return {
    embeds: [embed]
  };
}

// Handle Current Raids command
async function handleCurrentRaidsCommand() {
  const raidData = await getRaidBosses();

  if (!raidData) {
    return {
      content: "Sorry, I couldn't fetch the raid data at the moment."
    };
  }

  // Create embeds for each raid tier
  const embeds = [];

  // Mega Raids
  if (raidData.currentList.mega?.length > 0) {
    const megaEmbed = {
      title: "🔄 Mega Raids",
      color: 0xff0000, // Red
      fields: raidData.currentList.mega.map((pokemon) => {
        // Get counter types for this Pokemon
        const counterTypes = pokemon.counter
          ? Object.keys(pokemon.counter).sort(
              (a, b) => pokemon.counter[b] - pokemon.counter[a]
            )
          : [];

        // Shiny availability emoji
        const shinyEmoji = pokemon.shiny === true ? "✅" : "❌";

        return {
          name: pokemon.names.English,
          value: `🏆 Perfect IV CP: **${
            pokemon.cpRange[1]
          }**\n☀️ Perfect IV CP (Weather Boosted): **${
            pokemon.cpRangeBoost[1]
          }**${
            counterTypes.length > 0
              ? `\n⚔️ Weak to: ${counterTypes.join(", ")}`
              : ""
          }\n✨ Shiny? ${shinyEmoji}`,
          inline: true,
        };
      }),
      thumbnail: {
        url:
          raidData.currentList.mega[0]?.assets?.image ||
          "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm000.icon.png",
      },
      footer: {
        text: "Data provided by Pokemon GO API (github.com/pokemon-go-api/pokemon-go-api)",
      },
    };
    embeds.push(megaEmbed);
  }

  // Level 5 Raids
  if (raidData.currentList.lvl5?.length > 0) {
    const lvl5Embed = {
      title: "⭐⭐⭐⭐⭐ Level 5 Raids",
      color: 0xffa500, // Orange
      fields: raidData.currentList.lvl5.map((pokemon) => {
        const counterTypes = pokemon.counter
          ? Object.keys(pokemon.counter).sort(
              (a, b) => pokemon.counter[b] - pokemon.counter[a]
            )
          : [];
        const shinyEmoji = pokemon.shiny === true ? "✅" : "❌";
        return {
          name: pokemon.names.English,
          value: `🏆 Perfect IV CP: **${
            pokemon.cpRange[1]
          }**\n☀️ Perfect IV CP (Weather Boosted): **${
            pokemon.cpRangeBoost[1]
          }**${
            counterTypes.length > 0
              ? `\n⚔️ Weak to: ${counterTypes.join(", ")}`
              : ""
          }\n✨ Shiny? ${shinyEmoji}`,
          inline: true,
        };
      }),
      thumbnail: {
        url:
          raidData.currentList.lvl5[0]?.assets?.image ||
          "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm000.icon.png",
      },
      footer: {
        text: "Data provided by Pokemon GO API (github.com/pokemon-go-api/pokemon-go-api)",
      },
    };
    embeds.push(lvl5Embed);
  }

  // Level 3 Raids (simplified from original for brevity)
  if (raidData.currentList.lvl3?.length > 0) {
    const lvl3Embed = {
      title: "⭐⭐⭐ Level 3 Raids",
      color: 0x0000ff, // Blue
      fields: raidData.currentList.lvl3.map((pokemon) => {
        const shinyEmoji = pokemon.shiny === true ? "✅" : "❌";
        return {
          name: pokemon.names.English,
          value: `🏆 Perfect IV CP: **${pokemon.cpRange[1]}**\n☀️ Perfect IV CP (Weather Boosted): **${pokemon.cpRangeBoost[1]}**\n✨ Shiny? ${shinyEmoji}`,
          inline: true,
        };
      }),
      thumbnail: {
        url: raidData.currentList.lvl3[0]?.assets?.image || "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm000.icon.png",
      },
      footer: {
        text: "Data provided by Pokemon GO API (github.com/pokemon-go-api/pokemon-go-api)",
      },
    };
    embeds.push(lvl3Embed);
  }

  // Level 1 Raids (simplified from original for brevity)
  if (raidData.currentList.lvl1?.length > 0) {
    const lvl1Embed = {
      title: "⭐ Level 1 Raids",
      color: 0x00ff00, // Green
      fields: raidData.currentList.lvl1.map((pokemon) => {
        const shinyEmoji = pokemon.shiny === true ? "✅" : "❌";
        return {
          name: pokemon.names.English,
          value: `🏆 Perfect IV CP: **${pokemon.cpRange[1]}**\n☀️ Perfect IV CP (Weather Boosted): **${pokemon.cpRangeBoost[1]}**\n✨ Shiny? ${shinyEmoji}`,
          inline: true,
        };
      }),
      thumbnail: {
        url: raidData.currentList.lvl1[0]?.assets?.image || "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm000.icon.png",
      },
      footer: {
        text: "Data provided by Pokemon GO API (github.com/pokemon-go-api/pokemon-go-api)",
      },
    };
    embeds.push(lvl1Embed);
  }

  // Return just the embeds, which Discord will handle
  return {
    embeds: embeds
  };
}

// Handle Raid Boss command
async function handleRaidBossCommand(options) {
  const bossName = options.find(opt => opt.name === "name").value;
  const raidData = await getRaidBosses();

  if (!raidData) {
    return {
      content: "Sorry, I couldn't fetch the raid data at the moment."
    };
  }

  // Collect all raid bosses from different tiers
  const allRaids = [
    ...(raidData.currentList.mega || []),
    ...(raidData.currentList.lvl5 || []),
    ...(raidData.currentList.lvl3 || []),
    ...(raidData.currentList.lvl1 || []),
  ];

  // Find the selected raid boss
  const boss = allRaids.find(
    (p) => p.names.English.toLowerCase() === bossName.toLowerCase()
  );

  if (!boss) {
    return {
      content: `Couldn't find ${bossName} in the current raid bosses.`
    };
  }

  // Determine the raid level and color
  let raidLevel = "";
  let color = 0x00ff00; // Default green

  if (boss.level === "mega") {
    raidLevel = "Mega Raid";
    color = 0xff0000; // Red
  } else if (raidData.currentList.lvl5.includes(boss)) {
    raidLevel = "Level 5 Raid";
    color = 0xffa500; // Orange
  } else if (raidData.currentList.lvl3.includes(boss)) {
    raidLevel = "Level 3 Raid";
    color = 0x0000ff; // Blue
  } else if (raidData.currentList.lvl1.includes(boss)) {
    raidLevel = "Level 1 Raid";
    color = 0x00ff00; // Green
  }

  // Build the counters section
  let countersText = "";
  if (boss.counter) {
    // Sort counters by effectiveness
    const sortedCounters = Object.entries(boss.counter)
      .sort(([, a], [, b]) => b - a)
      .map(([type, multiplier]) => `${type} (${multiplier}x)`);

    countersText = sortedCounters.join(", ");
  }

  // Create the main embed with normal image
  const mainEmbed = {
    title: `${boss.names.English} - ${raidLevel}`,
    color: color,
    description:
      `**Types**: ${boss.types.join(", ")}\n\n` +
      `🏆 **Perfect IV CP**: ${boss.cpRange[1]}\n` +
      `☀️ **Perfect IV CP (Weather Boosted)**: ${boss.cpRangeBoost[1]}\n\n` +
      (countersText ? `⚔️ **Weak to**: ${countersText}\n\n` : "") +
      (boss.weather
        ? `🌤️ **Boosted in**: ${boss.weather
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(", ")} weather\n\n`
        : "") +
      `✨ **Shiny Available**: ${boss.shiny ? "Yes ✅" : "No ❌"}`,
    image: {
      url:
        boss.assets?.image ||
        "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm000.icon.png",
    },
    footer: {
      text: "Data provided by Pokemon GO API (github.com/pokemon-go-api/pokemon-go-api)",
    },
  };

  // Only create shiny embed if the boss can be shiny and has a shiny image
  const embeds = [mainEmbed];

  if (boss.shiny && boss.assets?.shinyImage) {
    const shinyEmbed = {
      title: `${boss.names.English} - Shiny Form`,
      color: color,
      image: {
        url: boss.assets.shinyImage,
      },
    };
    embeds.push(shinyEmbed);
  }

  return {
    embeds: embeds
  };
}

// Handle Research command
async function handleResearchCommand(options) {
  const researchTask = options.find(opt => opt.name === "task").value;
  const researchData = await getResearchData();
  
  if (!researchData || researchData.length === 0) {
    return {
      content: "Sorry, I couldn't fetch the research data at the moment."
    };
  }

  // Find the exact research task
  const task = researchData.find(t => t.text === researchTask);
  
  if (!task) {
    return {
      content: `Couldn't find research task: "${researchTask}"`
    };
  }

  // Create an embed with the research details
  const embed = {
    title: "Research Task",
    description: task.text,
    color: 0x3498db, // Blue color
    fields: [],
    footer: {
      text: "Data from Leek Duck (via ScrapedDuck)"
    }
  };

  // Handle rewards (which is an array in the API)
  if (task.rewards && Array.isArray(task.rewards) && task.rewards.length > 0) {
    // Create a rewards field that displays all possible rewards
    const rewardsText = task.rewards.map(reward => {
      let text = `**${reward.name}**`;
      
      // Add CP range if available
      if (reward.combatPower) {
        text += ` (CP: ${reward.combatPower.min}-${reward.combatPower.max})`;
      }
      
      // Add shiny info if available
      if (reward.canBeShiny) {
        text += " ✨";
      }
      
      return text;
    }).join('\n');
    
    embed.fields.push({
      name: "Possible Rewards",
      value: rewardsText || "Unknown rewards",
      inline: false
    });
    
    // If there's an image for the first reward, add it
    if (task.rewards[0]?.image) {
      embed.thumbnail = {
        url: task.rewards[0].image
      };
    }
  } else {
    embed.fields.push({
      name: "Rewards",
      value: "No reward information available",
      inline: false
    });
  }

  // Add other fields if they exist
  if (task.type) {
    embed.fields.push({
      name: "Type",
      value: task.type,
      inline: true
    });
  }

  if (task.category) {
    embed.fields.push({
      name: "Category",
      value: task.category,
      inline: true
    });
  }

  return {
    embeds: [embed]
  };
}

// Handle egg command
async function handleEggCommand(options) {
  try {
    const eggType = options.find(opt => opt.name === "type").value;
    const data = await getEggData();
    
    if (!data || !Array.isArray(data)) {
      return {
        content: "Sorry, I couldn't fetch egg data at this time."
      };
    }
    
    // Filter Pokémon that match the selected egg type
    const pokemonInEgg = data.filter(p => p.eggType.toLowerCase() === eggType.toLowerCase());
    
    if (pokemonInEgg.length === 0) {
      return {
        content: `Sorry, I couldn't find information for "${eggType}" eggs.`
      };
    }
    
    // Create an embed with egg information
    const embed = {
      title: `${eggType} Eggs`,
      color: 0x00BFFF, // DeepSkyBlue
      description: `Here are Pokémon that can hatch from ${eggType} eggs:`,
      fields: [],
      footer: {
        text: "Data from Leek Duck (via ScrapedDuck)"
      }
    };
    
    // Group Pokémon by shininess
    const shinyPokemon = pokemonInEgg.filter(p => p.canBeShiny);
    const nonShinyPokemon = pokemonInEgg.filter(p => !p.canBeShiny);
    
    // Add fields for Pokémon that can be shiny
    if (shinyPokemon.length > 0) {
      const shinyNames = shinyPokemon.map(p => `${p.name} ✨`).join(", ");
      embed.fields.push({
        name: "Can be Shiny",
        value: shinyNames,
        inline: false
      });
    }
    
    // Add fields for Pokémon that cannot be shiny
    if (nonShinyPokemon.length > 0) {
      const nonShinyNames = nonShinyPokemon.map(p => p.name).join(", ");
      embed.fields.push({
        name: "Cannot be Shiny",
        value: nonShinyNames,
        inline: false
      });
    }
    
    // Add special notes about the eggs (Adventure Sync, Regional, etc.)
    const adventureSyncPokemon = pokemonInEgg.filter(p => p.isAdventureSync);
    if (adventureSyncPokemon.length > 0) {
      embed.fields.push({
        name: "Adventure Sync Exclusive",
        value: adventureSyncPokemon.map(p => p.name).join(", "),
        inline: false
      });
    }
    
    const regionalPokemon = pokemonInEgg.filter(p => p.isRegional);
    if (regionalPokemon.length > 0) {
      embed.fields.push({
        name: "Regional Exclusive",
        value: regionalPokemon.map(p => p.name).join(", "),
        inline: false
      });
    }
    
    // Add thumbnail if we have a sample Pokémon with an image
    if (pokemonInEgg[0]?.image) {
      embed.thumbnail = {
        url: pokemonInEgg[0].image
      };
    }
    
    return {
      embeds: [embed]
    };
  } catch (error) {
    console.error("Error handling egg command:", error);
    return {
      content: "Sorry, an error occurred while processing your request."
    };
  }
}

// Handle autocomplete for Pokemon command
async function handlePokemonAutocomplete(focusedValue) {
  if (!pokedexCache) {
    pokedexCache = await getPokedex();
  }
  
  if (!pokedexCache) {
    return []; // Return empty if we couldn't get the pokedex
  }

  const searchValue = focusedValue.toLowerCase();
  if (!searchValue) {
    // Return a few popular ones if no search term
    return pokedexCache
      .filter(p => ["pikachu", "charizard", "mewtwo", "rayquaza", "tyranitar"].includes(p.names.English.toLowerCase()))
      .slice(0, 25)
      .map(p => ({
        name: p.names.English,
        value: p.names.English
      }));
  }

  // Filter Pokemon by name
  return pokedexCache
    .filter(p => p.names.English.toLowerCase().includes(searchValue))
    .slice(0, 25)
    .map(p => ({
      name: p.names.English,
      value: p.names.English
    }));
}

// Handle autocomplete for RaidBoss and Hundo commands
async function handleRaidBossAutocomplete(focusedValue) {
  // Get current raid bosses instead of using pokedex
  const raidData = await getRaidBosses();
  
  if (!raidData) {
    return []; // Return empty if we couldn't get the raid data
  }

  // Collect all current raid bosses from different tiers
  const allRaids = [
    ...(raidData.currentList.mega || []),
    ...(raidData.currentList.lvl5 || []),
    ...(raidData.currentList.lvl3 || []),
    ...(raidData.currentList.lvl1 || []),
  ];
  
  const searchValue = focusedValue.toLowerCase();
  if (!searchValue) {
    // Return all current raid bosses if no search term (up to 25)
    return allRaids.slice(0, 25).map(p => ({
      name: p.names.English,
      value: p.names.English
    }));
  }

  // Filter raid bosses by name
  return allRaids
    .filter(p => p.names.English.toLowerCase().includes(searchValue))
    .slice(0, 25)
    .map(p => ({
      name: p.names.English,
      value: p.names.English
    }));
}

// Handle research autocomplete
async function handleResearchAutocomplete(focusedValue) {
  const researchData = await getResearchData();
  
  if (!researchData || researchData.length === 0) {
    return [];
  }
  
  const searchValue = focusedValue.toLowerCase();
  if (!searchValue) {
    // Return first 25 research tasks if no search term
    return researchData.slice(0, 25).map(task => ({
      name: task.text.length > 100 ? task.text.substring(0, 97) + '...' : task.text,
      value: task.text
    }));
  }

  // Filter research tasks by text
  return researchData
    .filter(task => task.text.toLowerCase().includes(searchValue))
    .slice(0, 25)
    .map(task => ({
      name: task.text.length > 100 ? task.text.substring(0, 97) + '...' : task.text,
      value: task.text
    }));
}

// Handle autocomplete for egg command
async function handleEggAutocomplete(focusedValue) {
  try {
    const data = await getEggData();
    if (!data || !Array.isArray(data)) {
      console.error("Invalid egg data structure");
      return [];
    }

    // Create a list of unique egg types
    const eggTypes = [...new Set(data.map(egg => egg.eggType))];
    
    // Filter egg types that match user input
    const filteredTypes = eggTypes.filter(type => 
      type.toLowerCase().includes(focusedValue.toLowerCase())
    ).slice(0, 25); // Limit to 25 results (Discord limit)
    
    // Format for Discord's autocomplete
    return filteredTypes.map(type => ({
      name: type,
      value: type
    }));
  } catch (error) {
    console.error("Error in egg autocomplete:", error);
    return [];
  }
}

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
      const isValidRequest = verifyKey(
        bodyText,
        signature,
        timestamp,
        env.PUBLIC_KEY
      );
      
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
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
    
    // Log all interaction types to debug
    console.log(`Received interaction type: ${body.type}`);
    
    // Handle autocomplete interactions
    if (body.type === 4) {
      console.log('Autocomplete interaction received:', JSON.stringify(body));
      
      // Try to extract command name and focused value safely
      let commandName = '';
      let focusedValue = '';
      
      try {
        if (body.data && body.data.name) {
          commandName = body.data.name;
        } else if (body.data && body.data.command && body.data.command.name) {
          commandName = body.data.command.name;
        }
        
        if (body.data && body.data.options && Array.isArray(body.data.options)) {
          const focusedOption = body.data.options.find(opt => opt.focused);
          if (focusedOption) {
            focusedValue = focusedOption.value || '';
          }
        }
        
        console.log(`Command: ${commandName}, Focused value: ${focusedValue}`);
        
        let choices = [];
        
        switch (commandName.toLowerCase()) {
          case 'pokemon':
            choices = await handlePokemonAutocomplete(focusedValue);
            break;
          case 'hundo':
            // For 'hundo' command, we need to check for the "pokemon" parameter
            choices = await handleRaidBossAutocomplete(focusedValue);
            break;
          case 'raidboss':
            choices = await handleRaidBossAutocomplete(focusedValue);
            break;
          case 'research':
            choices = await handleResearchAutocomplete(focusedValue);
            break;
          case 'egg':
            choices = await handleEggAutocomplete(focusedValue);
            break;
          default:
            choices = [];
        }
        
        return new Response(
          JSON.stringify({
            type: 8, // APPLICATION_COMMAND_AUTOCOMPLETE_RESULT
            data: {
              choices: choices
            }
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 200
          }
        );
      } catch (error) {
        console.error('Error handling autocomplete:', error);
        console.error('Body structure:', JSON.stringify(body, null, 2));
        return new Response(
          JSON.stringify({
            type: 8,
            data: {
              choices: []
            }
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
    }
    
    // Handle APPLICATION_COMMAND
    if (body.type === 2) {
      const { name } = body.data;
      const options = body.data.options || [];
      
      let responseData;
      
      try {
        switch (name.toLowerCase()) {
          case 'pokemon':
            responseData = await handlePokemonCommand(options);
            break;
          case 'hundo':
            responseData = await handleHundoCommand(options);
            break;
          case 'currentraids':
            responseData = await handleCurrentRaidsCommand();
            break;
          case 'raidboss':
            responseData = await handleRaidBossCommand(options);
            break;
          case 'research':
            responseData = await handleResearchCommand(options);
            break;
          case 'egg':
            responseData = await handleEggCommand(options);
            break;
          default:
            responseData = { content: "Unknown command" };
        }
        
        // Return the response to Discord
        return new Response(
          JSON.stringify({
            type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
            data: responseData,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 200
          }
        );
      } catch (error) {
        console.error('Error handling command:', error);
        
        // Return an error message to Discord
        return new Response(
          JSON.stringify({
            type: 4,
            data: {
              content: "Sorry, an error occurred while processing your request.",
            },
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
    }
    
    // Any other type of interaction
    return new Response(
      JSON.stringify({ error: 'Unsupported interaction type' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
};