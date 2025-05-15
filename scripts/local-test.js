import { unstable_dev } from 'wrangler';
import dotenv from 'dotenv';

dotenv.config();

// Create a mock interaction event
const mockInteraction = (type, commandName = null, options = []) => {
  const payload = {
    type: type, // 1 = PING, 2 = APPLICATION_COMMAND
    id: 'mock-id',
    application_id: process.env.CLIENT_ID,
  };
  
  // Add command data for APPLICATION_COMMAND type
  if (type === 2 && commandName) {
    payload.data = {
      name: commandName,
      options: options
    };
    payload.member = {
      user: {
        id: 'mock-user-id',
        username: 'mock-user',
        discriminator: '1234'
      }
    };
    payload.guild_id = 'mock-guild-id';
    payload.channel_id = 'mock-channel-id';
  }
  
  return payload;
};

async function runTests() {
  // Start the worker
  const worker = await unstable_dev('../cloudflare-worker.js', {
    env: {
      PUBLIC_KEY: process.env.PUBLIC_KEY || 'mock-key'
    }
  });

  try {
    console.log('\n🧪 Testing PING event...');
    const pingResp = await worker.fetch('/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockInteraction(1))
    });
    const pingJson = await pingResp.json();
    console.log('Response:', pingJson);
    
    console.log('\n🧪 Testing /currentraids command...');
    const raidsResp = await worker.fetch('/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockInteraction(2, 'currentraids'))
    });
    const raidsStatus = raidsResp.status;
    console.log('Status:', raidsStatus);
    
    console.log('\n🧪 Testing /pokemon command with "pikachu"...');
    const pokemonResp = await worker.fetch('/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockInteraction(2, 'pokemon', [
        { name: 'name', value: 'pikachu' }
      ]))
    });
    const pokemonStatus = pokemonResp.status;
    console.log('Status:', pokemonStatus);
    
    console.log('\n⚠️ Note: These tests skip signature verification.');
    console.log('For full testing, use wrangler dev with Discord\'s Interactions Endpoint URL.');
  } catch (error) {
    console.error('Error during tests:', error);
  } finally {
    await worker.stop();
  }
}

runTests(); 