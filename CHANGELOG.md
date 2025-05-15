# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0]

### Added
- Major refactor for serverless.

## [1.2.0]

### Added
- New `/raidboss` command that shows detailed information about a specific raid boss
- Added detailed difficulty descriptions to show friend level and Pokémon level requirements
- Added emoji icons throughout the bot's responses for better visual clarity
- Added shiny images to the `/raidboss` command when available

### Enhanced
- Improved visual presentation with bold text for CP values
- Added color-coded difficulty indicators (🟢, 🟡, 🔴) for raid difficulty levels
- Code formatting improvements for better readability and maintenance

## [1.1.0]

### Added
- Type weaknesses (counter types) to all raid bosses in the `/currentraids` command
- Shiny availability indicators (✅/❌) for Pokemon in both `/currentraids` and `/pokemon` commands

### Enhanced
- Sorted type weaknesses by effectiveness for better raid counter selection
- Improved readability with emoji indicators for shiny availability

## [1.0.1]

### Added
- Autocomplete functionality for the `/pokemon` command
- Support for variants (regional forms, mega evolutions, primal forms) in autocomplete

### Enhanced 
- Added deferred replies to prevent timeout errors on long API calls
- Significantly improved search functionality for special forms like Primal and Mega evolutions
- Better handling of complex Pokemon form names in search results
- Default popular Pokemon suggestions when no search term is entered

### Fixed
- Resolved "Unknown interaction" errors by implementing deferred replies
- Fixed issue with special forms not returning correct stats and images
- Improved matching logic for variants to ensure proper data retrieval
- Fixed Primal Kyogre and other primal forms showing base form stats instead of primal stats
- Added additional robust matching for special forms with enhanced debugging
- Fixed incorrect image URLs for Primal forms by using the correct form-specific images from assetForms data

## [1.0.0]

### Refactored
- Enhanced Pokemon search functionality for complex forms and mega evolutions
- Improved Pokemon search logic for regional forms and mega evolutions

## [0.9.0]

### Added
- Support for images for all raid bosses
- Detailed embed for perfect IV CP responses with normal and weather boosted values

### Fixed
- Updated regex for regional forms in Pokemon search to include 'alola' for accurate matching
- Updated regex for mega form prefix in Pokemon search for accurate matching
- Separated regional form and mega evolution search logic

### Refactored
- Streamlined raid embed creation by removing redundant image embeds and adding thumbnails
- Standardized formatting and enhanced logging messages

### Documentation
- Revised README.md to update bot features, installation instructions, and command usage

## [0.8.0]

### Enhanced
- Improved embed responses in interaction replies by adding footer text for data source
- Removed ephemeral flag for better visibility of responses

## [0.7.0]

### Added
- Regional form support for Pokemon
- Docker Compose configuration

### Enhanced
- Refactored raid boss responses to use embeds for better formatting
- Added Pokemon images to responses
- Updated Docker configuration to use 'main' image tag and add non-root user
- Enhanced Docker Compose with network and restart policies

### DevOps
- Updated Docker build workflow to include environment variable setup
- Added step to create .env file in Docker build workflow
- Removed .env from git tracking and updated .gitignore 

## [0.1.0]

### Added
- Initial bot implementation with `/pokemon`, `/hundo`, and `/currentraids` commands
- Pokemon search functionality with support for forms, regional variants, and mega evolutions
- Raid boss information display with perfect IV CP values
- Current raid bosses listing by tier
- Autocomplete functionality for the `hundo` command