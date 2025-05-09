FROM node:20-slim

# Define build arguments
ARG DISCORD_TOKEN
ARG CLIENT_ID
ARG GUILD_ID

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser

WORKDIR /app

# Create .env file from build arguments
RUN echo "DISCORD_TOKEN=${DISCORD_TOKEN}" > .env && \
    echo "CLIENT_ID=${CLIENT_ID}" >> .env && \
    echo "GUILD_ID=${GUILD_ID}" >> .env

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Set ownership to non-root user
RUN chown -R nodeuser:nodejs /app

# Switch to non-root user
USER nodeuser

# Start the bot
CMD ["node", "src/index.js"] 