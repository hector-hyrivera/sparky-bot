# Sparky Bot

A Discord bot that provides Pokemon GO related information and utilities.

## Features

- `/pokemon` - Get detailed information about any Pokemon
- `/hundo` - Get perfect IV CP values for current raid bosses
- `/currentraids` - List all current raid bosses and their perfect IV CP values
- `/raidboss` - Get detailed information about a specific raid boss with images

## Installation

1. Invite the bot to your server using custom link. (Limited Users)
2. Ensure the bot has the necessary permissions
3. Start using the commands!

## Commands

### `/pokemon [name]`
Get detailed information about a Pokemon, including:
- Base stats
- Types
- Moves
- Evolution information
- Regional forms
- Mega evolution details

### `/hundo [pokemon]`
Get the perfect IV CP values for a raid boss:
- Normal CP
- Weather boosted CP

### `/currentraids`
View all current raid bosses:
- Mega raids
- Level 5 raids
- Level 3 raids
- Level 1 raids

### `/raidboss [name]`
Get detailed information about a specific raid boss:
- Perfect IV CP values (normal and weather boosted)
- Type information and weaknesses
- Weather boost information
- Difficulty rating with number of raiders needed
- Images of normal and shiny forms (if available)

## Data Sources

This bot uses the following APIs:
- [Pokemon GO API](https://github.com/pokemon-go-api/pokemon-go-api) for Pokemon and raid data
- Discord API for bot functionality

## Legal Documents

- [Terms of Service](TERMS.md)
- [Privacy Policy](PRIVACY.md)
- [MIT License](LICENSE)

## Support

For support, please:
- Email us at developer@hyrivera.com
- Open an issue on GitHub

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Pokemon GO API](https://github.com/pokemon-go-api/pokemon-go-api) for providing the Pokemon data
- Discord.js team for the amazing Discord API wrapper
- All contributors and users of the bot 