# Changelog

All notable changes to this project will be documented in this file.

## [2025-05-12]

### Refactored
- Enhanced Pokemon search functionality for complex forms and mega evolutions
- Improved Pokemon search logic for regional forms and mega evolutions

## [2025-05-11]

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

## [2025-05-10]

### Enhanced
- Improved embed responses in interaction replies by adding footer text for data source
- Removed ephemeral flag for better visibility of responses

## [2025-05-08]

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

## [Unreleased]

### Added
- Initial bot implementation with `/pokemon`, `/hundo`, and `/currentraids` commands
- Pokemon search functionality with support for forms, regional variants, and mega evolutions
- Raid boss information display with perfect IV CP values
- Current raid bosses listing by tier
- Autocomplete functionality for the `hundo` command