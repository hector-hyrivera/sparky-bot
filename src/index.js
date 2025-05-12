require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");
const fetch = require("node-fetch");

// Debug logging
console.log("Environment variables:");
console.log("CLIENT_ID:", process.env.CLIENT_ID);
console.log(
  "DISCORD_TOKEN:",
  process.env.DISCORD_TOKEN ? "Token exists" : "Token missing"
);

// Create a new client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// Cache for Pokedex data
let pokedexCache = null;

// Fetch full Pokedex data
async function getPokedex() {
  if (pokedexCache) return pokedexCache;

  try {
    const response = await fetch(
      "https://pokemon-go-api.github.io/pokemon-go-api/api/pokedex.json"
    );
    if (!response.ok) {
      throw new Error("Failed to fetch Pokedex data");
    }
    pokedexCache = await response.json();
    return pokedexCache;
  } catch (error) {
    console.error("Error fetching Pokedex:", error);
    return null;
  }
}

// Find Pokemon by name (including forms)
async function findPokemon(name) {
  const pokedex = await getPokedex();
  if (!pokedex) return null;

  const searchName = name.toLowerCase();
  console.log(`Searching for Pokemon: ${searchName}`);

  let pokemon = null;
  let basePokemon = null;
  let formType = null;

  // First try exact match
  pokemon = pokedex.find((p) => {
    const baseName = p.names.English.toLowerCase();
    const formName = p.formId ? p.formId.toLowerCase() : "";
    return baseName === searchName || formName === searchName;
  });

  // If no exact match, try partial match
  if (!pokemon) {
    pokemon = pokedex.find((p) => {
      const baseName = p.names.English.toLowerCase();
      const formName = p.formId ? p.formId.toLowerCase() : "";
      return baseName.includes(searchName) || formName.includes(searchName);
    });
  }

  // Check if this is a form search (like "primal" or "mega")
  if (searchName.includes("primal")) {
    formType = "PRIMAL";
  } else if (searchName.includes("mega")) {
    formType = "MEGA";
  }

  // Direct search for mega/primal forms
  if (!pokemon && (searchName.includes("mega") || searchName.includes("primal"))) {
    console.log("Searching for Mega or Primal form directly...");
    
    // Get base name of the Pokémon
    const parts = searchName.split(" ");
    let basePokemonName = "";
    
    if (searchName.includes("mega")) {
      // Handle "Mega X Y" pattern
      if (parts.length > 2 && (parts[2] === "x" || parts[2] === "y")) {
        basePokemonName = parts[1];
      } else {
        // Standard "Mega Pokémon" pattern
        basePokemonName = parts.slice(1).join(" ");
      }
    } else if (searchName.includes("primal")) {
      // Handle "Primal Pokémon" pattern
      basePokemonName = parts.slice(1).join(" ");
    }
    
    console.log(`Extracted base name: ${basePokemonName}`);
    
    if (basePokemonName) {
      // Find the base Pokémon
      basePokemon = pokedex.find(p => 
        p.names.English.toLowerCase() === basePokemonName
      );
      
      if (basePokemon && basePokemon.megaEvolutions) {
        console.log(`Found base Pokémon: ${basePokemon.names.English}`);
        console.log("Available mega/primal forms:", Object.keys(basePokemon.megaEvolutions));
        
        // For debugging, log all form IDs
        Object.keys(basePokemon.megaEvolutions).forEach(id => {
          console.log(`Form ID: ${id}, Form name: ${basePokemon.megaEvolutions[id].names?.English || "Unknown"}`);
        });
        
        // First, try an exact match by name
        let foundForm = null;
        for (const formId of Object.keys(basePokemon.megaEvolutions)) {
          const form = basePokemon.megaEvolutions[formId];
          if (form && form.names && form.names.English) {
            if (form.names.English.toLowerCase() === searchName) {
              console.log(`Found exact name match: ${form.names.English}`);
              foundForm = form;
              break;
            }
          }
        }
        
        // If we found an exact match, use it
        if (foundForm) {
          pokemon = foundForm;
          formType = searchName.includes("primal") ? "PRIMAL" : "MEGA";
        }
        
        // If we're looking for Primal form
        else if (searchName.includes("primal")) {
          const primalForm = Object.keys(basePokemon.megaEvolutions).find(id => {
            // Try different ways the primal form might be referenced
            const idLower = id.toLowerCase();
            const hasKeyword = idLower.includes("primal");
            const formNameMatch = basePokemon.megaEvolutions[id].names?.English?.toLowerCase().includes("primal");
            
            console.log(`Checking ID: ${id}, HasKeyword: ${hasKeyword}, FormNameMatch: ${formNameMatch}`);
            
            return hasKeyword || formNameMatch;
          });
          
          if (primalForm) {
            console.log(`Found primal form ID: ${primalForm}`);
            pokemon = basePokemon.megaEvolutions[primalForm];
            formType = "PRIMAL";
          }
        }
        
        // Find the specific form that matches our search
        else {
          const megaId = Object.keys(basePokemon.megaEvolutions).find(id => {
            const idLower = id.toLowerCase().replace(/_/g, " ");
            return idLower.includes(searchName);
          });
          
          if (megaId) {
            console.log(`Found matching form ID: ${megaId}`);
            pokemon = basePokemon.megaEvolutions[megaId];
            formType = searchName.includes("primal") ? "PRIMAL" : "MEGA";
          }
          
          // If we can't find an exact match, try to match just by form type
          else if (searchName.includes("mega")) {
            // For mega evolution, if it has "X" or "Y" in the search
            const formSuffix = parts.length > 2 ? parts[2].toUpperCase() : "";
            
            const megaFormId = Object.keys(basePokemon.megaEvolutions).find(id => {
              if (formSuffix && (formSuffix === "X" || formSuffix === "Y")) {
                return id.includes(formSuffix);
              } else {
                // Just find any mega form if no specific form requested
                return id.toLowerCase().includes("mega");
              }
            });
            
            if (megaFormId) {
              console.log(`Found best matching form ID: ${megaFormId}`);
              pokemon = basePokemon.megaEvolutions[megaFormId];
              formType = "MEGA";
            }
          } else if (searchName.includes("primal")) {
            // Fall back to just returning the first mega evolution if it's the only one
            if (Object.keys(basePokemon.megaEvolutions).length === 1) {
              const onlyFormId = Object.keys(basePokemon.megaEvolutions)[0];
              console.log(`Found only available form ID: ${onlyFormId}`);
              pokemon = basePokemon.megaEvolutions[onlyFormId];
              formType = "PRIMAL";
            }
          }
        }
      }
    }
  }

  // If still no match, try searching in regional forms
  if (!pokemon) {
    console.log("Searching for regional forms or special forms...");

    // Handle special mega forms like "Mega Charizard Y"
    const megaSpecialFormMatch = searchName.match(/^mega\s+(\w+)\s+([xy])$/i);
    if (megaSpecialFormMatch) {
      const basePokemonName = megaSpecialFormMatch[1].toLowerCase();
      const megaForm = megaSpecialFormMatch[2].toUpperCase(); // X or Y

      console.log(`Looking for Mega ${basePokemonName} ${megaForm}`);

      // Find the base Pokemon
      const basePokemon = pokedex.find(
        (p) => p.names.English.toLowerCase() === basePokemonName
      );

      if (basePokemon && basePokemon.megaEvolutions) {
        console.log(
          `Found base Pokemon: ${basePokemon.names.English}, checking mega forms`
        );

        // Look for the specific mega form (X or Y)
        const megaEvolutionId = Object.keys(basePokemon.megaEvolutions).find(
          (id) => id.toLowerCase().includes("mega") && id.includes(megaForm)
        );

        if (megaEvolutionId) {
          const megaEvolution = basePokemon.megaEvolutions[megaEvolutionId];
          if (megaEvolution) {
            console.log(`Found mega form: ${megaEvolution.names.English}`);
            pokemon = megaEvolution;
            formType = "MEGA";
          }
        }
      }
    }

    // Check for forms where form name comes first: "<form> <pokemon>"
    // Examples: "Black Kyurem", "Alolan Muk", "Mega Rayquaza", "Dawn Wings Necrozma"
    const formFirstMatch = searchName.match(/^([\w\s]+)\s+(\w+)$/i);

    if (formFirstMatch) {
      const possibleFormPrefix = formFirstMatch[1].toLowerCase();
      const possibleBaseName = formFirstMatch[2].toLowerCase();
      console.log(
        `Potential form pattern detected: "${possibleFormPrefix} ${possibleBaseName}"`
      );

      // Find potential base Pokemon
      const basePokemon = pokedex.find(
        (p) => p.names.English.toLowerCase() === possibleBaseName
      );

      if (basePokemon) {
        console.log(`Found base Pokemon: ${basePokemon.names.English}`);

        // Check for regional forms
        if (basePokemon.regionForms) {
          console.log(
            `Checking regionForms for anything matching "${possibleFormPrefix}"`
          );

          // Look through all regionForms for a match with our form prefix
          const formId = Object.keys(basePokemon.regionForms).find((id) =>
            id.toLowerCase().includes(possibleFormPrefix.replace(/\s+/g, "_"))
          );

          if (formId) {
            console.log(`Found matching form ID: ${formId}`);
            const form = basePokemon.regionForms[formId];
            if (form) {
              console.log(`Found form: ${form.names.English}`);
              pokemon = form;
              formType = "MEGA";
            }
          }
        }

        // Check for mega evolutions or primal forms
        if ((possibleFormPrefix.includes("mega") || possibleFormPrefix.includes("primal")) && 
            basePokemon.megaEvolutions) {
          console.log(`Checking megaEvolutions for "${possibleFormPrefix}"`);

          // Look through all megaEvolutions for a match
          const specialFormId = Object.keys(basePokemon.megaEvolutions).find((id) => {
            const idLower = id.toLowerCase();
            return idLower.includes(possibleFormPrefix.replace(/\s+/g, "_"));
          });

          if (specialFormId) {
            console.log(`Found matching special form ID: ${specialFormId}`);
            const specialForm = basePokemon.megaEvolutions[specialFormId];
            if (specialForm) {
              console.log(`Found special form: ${specialForm.names.English}`);
              pokemon = specialForm;
              formType = "MEGA";
            }
          }
        }
      }
    }

    // For standard pattern searches that didn't match the above
    // Try to extract form and base name from patterns like "alolan muk" or "mega rayquaza"
    const formPrefixMatch = searchName.match(/^(\w+)\s+(.+)/i);
    if (formPrefixMatch) {
      const formPrefix = formPrefixMatch[1].toLowerCase();
      const basePokemonName = formPrefixMatch[2].toLowerCase();

      console.log(`Looking for ${formPrefix} form of ${basePokemonName}`);

      // Find the base Pokemon
      const basePokemon = pokedex.find(
        (p) => p.names.English.toLowerCase() === basePokemonName
      );

      if (basePokemon) {
        // Check if this is a regional form
        if (
          formPrefix.match(/^(alolan|alola|galarian|hisuian|paldean)$/i) &&
          basePokemon.regionForms
        ) {
          console.log(`Checking for regional form: ${formPrefix}`);
          // Find the regional form
          const regionalFormId = Object.keys(basePokemon.regionForms).find(
            (id) => id.toLowerCase().includes(formPrefix)
          );

          if (regionalFormId) {
            const regionalForm = basePokemon.regionForms[regionalFormId];
            if (regionalForm) {
              console.log(`Found regional form: ${regionalForm.names.English}`);
              pokemon = regionalForm;
              formType = "MEGA";
            }
          }
        }

        // Check if this is a mega evolution or primal form
        if ((formPrefix === "mega" || formPrefix === "primal") && basePokemon.megaEvolutions) {
          console.log(`Checking for ${formPrefix} evolution`);

          // Check if there's only one form
          if (Object.keys(basePokemon.megaEvolutions).length === 1) {
            const formId = Object.keys(basePokemon.megaEvolutions)[0];
            const specialForm = basePokemon.megaEvolutions[formId];
            if (specialForm) {
              console.log(
                `Found ${formPrefix} evolution: ${specialForm.names.English}`
              );
              pokemon = specialForm;
              formType = "MEGA";
            }
          } else {
            // If there are multiple forms, look for the matching one
            const formId = Object.keys(basePokemon.megaEvolutions).find(id => {
              const idLower = id.toLowerCase();
              return idLower.includes(formPrefix);
            });

            if (formId) {
              const specialForm = basePokemon.megaEvolutions[formId];
              if (specialForm) {
                console.log(`Found ${formPrefix} form: ${specialForm.names.English}`);
                pokemon = specialForm;
                formType = "MEGA";
              }
            } else {
              // Just return the first one if we can't find a specific form
              const firstFormId = Object.keys(basePokemon.megaEvolutions)[0];
              const firstForm = basePokemon.megaEvolutions[firstFormId];
              if (firstForm) {
                console.log(
                  `Found first special form: ${firstForm.names.English}`
                );
                pokemon = firstForm;
                formType = "MEGA";
              }
            }
          }
        }
      }
    }

    // Special handling for complex form names like "Dawn Wings Necrozma"
    // Try searching for the last word as the base Pokemon
    const complexFormMatch = searchName.match(/^(.*)\s+(\w+)$/i);
    if (complexFormMatch) {
      const fullFormName = searchName; // Keep the full search term for matching
      const possibleBaseName = complexFormMatch[2].toLowerCase();

      console.log(`Trying complex form search with base: ${possibleBaseName}`);

      // Find the base Pokemon
      const basePokemon = pokedex.find(
        (p) => p.names.English.toLowerCase() === possibleBaseName
      );

      if (basePokemon) {
        // Check regional forms
        if (basePokemon.regionForms) {
          console.log(
            `Found base Pokemon: ${basePokemon.names.English}, checking forms`
          );

          // Check each form to see if its name matches our search
          for (const formId of Object.keys(basePokemon.regionForms)) {
            const form = basePokemon.regionForms[formId];
            if (form && form.names && form.names.English) {
              const formName = form.names.English.toLowerCase();
              console.log(
                `Checking form: ${formName} against search: ${fullFormName}`
              );

              // Check if the form name matches our search term
              if (
                formName === fullFormName.toLowerCase() ||
                formId
                  .toLowerCase()
                  .replace(/_/g, " ")
                  .includes(fullFormName.toLowerCase())
              ) {
                console.log(`Found matching form: ${form.names.English}`);
                pokemon = form;
                formType = "MEGA";
              }
            }
          }
        }

        // Check mega evolutions and primal forms
        if (basePokemon.megaEvolutions) {
          console.log(
            `Checking special forms for ${basePokemon.names.English}`
          );

          // Check each special form
          for (const formId of Object.keys(basePokemon.megaEvolutions)) {
            const specialForm = basePokemon.megaEvolutions[formId];
            if (specialForm && specialForm.names && specialForm.names.English) {
              const formName = specialForm.names.English.toLowerCase();
              console.log(
                `Checking special form: ${formName} against search: ${fullFormName}`
              );

              // Check if the form name matches our search term
              if (
                formName === fullFormName.toLowerCase() ||
                formId
                  .toLowerCase()
                  .replace(/_/g, " ")
                  .includes(fullFormName.toLowerCase())
              ) {
                console.log(
                  `Found matching special form: ${specialForm.names.English}`
                );
                pokemon = specialForm;
                formType = "MEGA";
              }
            }
          }
        }
      }
    }
  }

  // Fix the image URL for special forms if needed
  if (pokemon && formType && basePokemon && basePokemon.assetForms) {
    console.log(`Found form type: ${formType}, checking for better image`);
    
    // Look for a matching form in the assetForms array
    const matchingAssetForm = basePokemon.assetForms.find(asset => 
      asset.form === formType
    );
    
    if (matchingAssetForm) {
      console.log(`Found matching asset form with form=${formType}`);
      
      // Update the image URL to use the specific form image
      if (matchingAssetForm.image) {
        console.log(`Updating image URL from ${pokemon.assets?.image} to ${matchingAssetForm.image}`);
        if (!pokemon.assets) {
          pokemon.assets = {};
        }
        pokemon.assets.image = matchingAssetForm.image;
      }
      
      // Also update shiny image if available
      if (matchingAssetForm.shinyImage) {
        console.log(`Updating shiny image URL to ${matchingAssetForm.shinyImage}`);
        pokemon.assets.shinyImage = matchingAssetForm.shinyImage;
      }
    }
  }

  return pokemon;
}

// Command definitions
const commands = [
  new SlashCommandBuilder()
    .setName("hundo")
    .setDescription("Get the perfect IV CP for a raid boss")
    .addStringOption((option) =>
      option
        .setName("pokemon")
        .setDescription("The name of the Pokemon")
        .setRequired(true)
        .setAutocomplete(true)
    ),
  new SlashCommandBuilder()
    .setName("currentraids")
    .setDescription("List all current raid bosses"),
  new SlashCommandBuilder()
    .setName("pokemon")
    .setDescription("Get information about a Pokemon")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("The name of the Pokemon")
        .setRequired(true)
        .setAutocomplete(true)
    ),
].map((command) => command.toJSON());

// Register commands
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();

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

// Handle commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand() && !interaction.isAutocomplete()) return;

  const { commandName } = interaction;

  // Handle autocomplete for hundo command
  if (interaction.isAutocomplete() && commandName === "hundo") {
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
      ...(raidData.currentList.lvl1 || []),
    ];

    const filtered = allRaids
      .filter((pokemon) =>
        pokemon.names.English.toLowerCase().includes(focusedValue)
      )
      .slice(0, 25)
      .map((pokemon) => ({
        name: pokemon.names.English,
        value: pokemon.names.English,
      }));

    await interaction.respond(filtered);
    return;
  }

  // Handle autocomplete for pokemon command
  if (interaction.isAutocomplete() && commandName === "pokemon") {
    const pokedex = await getPokedex();
    if (!pokedex) {
      await interaction.respond([]);
      return;
    }

    const focusedValue = interaction.options.getFocused().toLowerCase();
    
    // Don't filter if the user hasn't typed anything yet
    if (!focusedValue) {
      // Just return some popular Pokemon as defaults
      const popularPokemon = [
        "Pikachu", "Charizard", "Mewtwo", "Eevee", "Dragonite", 
        "Tyranitar", "Rayquaza", "Garchomp", "Lucario", "Greninja"
      ].map(name => ({ name, value: name }));
      
      await interaction.respond(popularPokemon);
      return;
    }
    
    // Create a list to hold all variants
    const allVariants = [];
    
    // Process all Pokemon and their variants
    pokedex.forEach(pokemon => {
      // Add base Pokemon
      if (pokemon.names.English.toLowerCase().includes(focusedValue)) {
        allVariants.push({
          name: pokemon.names.English,
          value: pokemon.names.English
        });
      }
      
      // Add mega evolutions if they exist
      if (pokemon.megaEvolutions) {
        Object.values(pokemon.megaEvolutions).forEach(mega => {
          if (mega.names.English.toLowerCase().includes(focusedValue)) {
            allVariants.push({
              name: mega.names.English,
              value: mega.names.English
            });
          }
        });
      }
      
      // Add regional forms if they exist
      if (pokemon.regionForms) {
        Object.entries(pokemon.regionForms).forEach(([formId, form]) => {
          // Some implementations may have regionForms as an array, check that form has names
          if (form && form.names && form.names.English) {
            if (form.names.English.toLowerCase().includes(focusedValue)) {
              allVariants.push({
                name: form.names.English,
                value: form.names.English
              });
            }
          } else {
            // Handle case where form ID is used instead of full name
            const formName = formId.replace(/_/g, " ");
            if (formName.toLowerCase().includes(focusedValue)) {
              allVariants.push({
                name: formName,
                value: formName
              });
            }
          }
        });
      }
    });
    
    // Slice to first 25 results and respond
    await interaction.respond(allVariants.slice(0, 25));
    return;
  }

  if (commandName === "pokemon") {
    // Defer the reply immediately
    await interaction.deferReply();
    
    const pokemonName = interaction.options.getString("name").toLowerCase();
    const pokemon = await findPokemon(pokemonName);

    if (!pokemon) {
      await interaction.editReply(
        `Sorry, I couldn't find information for ${pokemonName}.`
      );
      return;
    }

    let response = `**${pokemon.names.English}**\n`;

    // Form information
    if (pokemon.formId && pokemon.formId !== pokemon.id) {
      response += `Form: ${pokemon.formId.replace(/_/g, " ")}\n`;
    }

    // Types
    const types = [pokemon.primaryType.names.English];
    if (pokemon.secondaryType) {
      types.push(pokemon.secondaryType.names.English);
    }
    response += `Type: ${types.join(", ")}\n`;

    // Stats
    response += `Stamina: ${pokemon.stats.stamina}\n`;
    response += `Attack: ${pokemon.stats.attack}\n`;
    response += `Defense: ${pokemon.stats.defense}\n`;

    // Quick Moves
    if (pokemon.quickMoves) {
      response += "\n**Fast Attacks:**\n";
      Object.values(pokemon.quickMoves).forEach((move) => {
        response += `• ${move.names.English} (${move.type.names.English}) - ${move.power} power\n`;
      });
    }

    // Cinematic Moves
    if (pokemon.cinematicMoves) {
      response += "\n**Special Attacks:**\n";
      Object.values(pokemon.cinematicMoves).forEach((move) => {
        response += `• ${move.names.English} (${move.type.names.English}) - ${move.power} power\n`;
      });
    }

    // Elite Moves
    if (
      pokemon.eliteCinematicMoves &&
      Object.keys(pokemon.eliteCinematicMoves).length > 0
    ) {
      response += "\n**Elite Special Attacks:**\n";
      Object.values(pokemon.eliteCinematicMoves).forEach((move) => {
        response += `• ${move.names.English} (${move.type.names.English}) - ${move.power} power\n`;
      });
    }

    // Regional Forms
    if (pokemon.regionForms && pokemon.regionForms.length > 0) {
      response += "\n**Regional Forms:**\n";
      pokemon.regionForms.forEach((form) => {
        response += `• ${form.names.English}`;
        if (form.primaryType) {
          const formTypes = [form.primaryType.names.English];
          if (form.secondaryType) {
            formTypes.push(form.secondaryType.names.English);
          }
          response += ` (${formTypes.join(", ")})`;
        }
        response += "\n";
      });
    }

    // Evolution
    if (pokemon.evolutions && pokemon.evolutions.length > 0) {
      response += "\n**Evolves To:**\n";
      pokemon.evolutions.forEach((evo) => {
        response += `• ${evo.id.replace(/_/g, " ")}`;
        if (evo.candies) {
          response += ` (${evo.candies} candies)`;
        }
        response += "\n";
      });
    }

    // Mega Evolution
    if (pokemon.hasMegaEvolution) {
      response += "\n**Mega Evolution Available**\n";
      if (pokemon.megaEvolutions) {
        Object.values(pokemon.megaEvolutions).forEach((mega) => {
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
        url:
          pokemon.assets?.image ||
          "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm000.icon.png",
      },
      footer: {
        text: "Data provided by Pokemon GO API (github.com/pokemon-go-api/pokemon-go-api)",
      },
    };

    await interaction.editReply({
      embeds: [embed],
    });
  }

  if (commandName === "hundo") {
    const pokemonName = interaction.options.getString("pokemon").toLowerCase();
    const raidData = await getRaidBosses();

    if (!raidData) {
      await interaction.reply(
        "Sorry, I couldn't fetch the raid data at the moment."
      );
      return;
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
      await interaction.reply(
        `Couldn't find ${pokemonName} in the current raid bosses.`
      );
      return;
    }

    const perfectCP = pokemon.cpRange[1];
    const perfectCPBoosted = pokemon.cpRangeBoost[1];

    const embed = {
      title: `Perfect IV CP for ${pokemon.names.English}`,
      color: 0x00ff00, // Green color
      fields: [
        {
          name: "Normal CP",
          value: perfectCP.toString(),
          inline: true,
        },
        {
          name: "Weather Boosted CP",
          value: perfectCPBoosted.toString(),
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

    await interaction.reply({
      embeds: [embed],
    });
  }

  if (commandName === "currentraids") {
    const raidData = await getRaidBosses();

    if (!raidData) {
      await interaction.reply(
        "Sorry, I couldn't fetch the raid data at the moment."
      );
      return;
    }

    // Create embeds for each raid tier
    const embeds = [];

    // Mega Raids
    if (raidData.currentList.mega?.length > 0) {
      const megaEmbed = {
        title: "Mega Raids",
        color: 0xff0000, // Red
        fields: raidData.currentList.mega.map((pokemon) => ({
          name: pokemon.names.English,
          value: `Perfect IV CP: ${pokemon.cpRange[1]}\nPerfect IV CP (Weather Boosted): ${pokemon.cpRangeBoost[1]}`,
          inline: true,
        })),
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
        title: "Level 5 Raids",
        color: 0xffa500, // Orange
        fields: raidData.currentList.lvl5.map((pokemon) => ({
          name: pokemon.names.English,
          value: `Perfect IV CP: ${pokemon.cpRange[1]}\nPerfect IV CP (Weather Boosted): ${pokemon.cpRangeBoost[1]}`,
          inline: true,
        })),
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

    // Level 3 Raids
    if (raidData.currentList.lvl3?.length > 0) {
      const lvl3Embed = {
        title: "Level 3 Raids",
        color: 0x0000ff, // Blue
        fields: raidData.currentList.lvl3.map((pokemon) => ({
          name: pokemon.names.English,
          value: `Perfect IV CP: ${pokemon.cpRange[1]}\nPerfect IV CP (Weather Boosted): ${pokemon.cpRangeBoost[1]}`,
          inline: true,
        })),
        thumbnail: {
          url:
            raidData.currentList.lvl3[0]?.assets?.image ||
            "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm000.icon.png",
        },
        footer: {
          text: "Data provided by Pokemon GO API (github.com/pokemon-go-api/pokemon-go-api)",
        },
      };
      embeds.push(lvl3Embed);
    }

    // Level 1 Raids
    if (raidData.currentList.lvl1?.length > 0) {
      const lvl1Embed = {
        title: "Level 1 Raids",
        color: 0x00ff00, // Green
        fields: raidData.currentList.lvl1.map((pokemon) => ({
          name: pokemon.names.English,
          value: `Perfect IV CP: ${pokemon.cpRange[1]}\nPerfect IV CP (Weather Boosted): ${pokemon.cpRangeBoost[1]}`,
          inline: true,
        })),
        thumbnail: {
          url:
            raidData.currentList.lvl1[0]?.assets?.image ||
            "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm000.icon.png",
        },
        footer: {
          text: "Data provided by Pokemon GO API (github.com/pokemon-go-api/pokemon-go-api)",
        },
      };
      embeds.push(lvl1Embed);
    }

    // Send all embeds
    await interaction.reply({
      embeds: embeds,
    });
  }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
