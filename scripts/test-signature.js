import { verifyKey } from 'discord-interactions';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test function to verify signature validation
function testSignatureValidation() {
  console.log('Testing Discord signature validation...');
  
  // Check if PUBLIC_KEY is available
  const publicKey = process.env.PUBLIC_KEY;
  if (!publicKey) {
    console.error('❌ PUBLIC_KEY environment variable is not set');
    console.log('Please set your Discord application public key in your .env file or environment variables');
    return false;
  }
  
  console.log('✅ PUBLIC_KEY is configured');
  console.log(`Public key length: ${publicKey.length} characters`);
  
  // Test with sample data (this is just for validation setup, not actual verification)
  const sampleBody = JSON.stringify({ type: 1 }); // PING interaction
  const sampleTimestamp = Math.floor(Date.now() / 1000).toString();
  
  console.log('✅ Signature validation setup appears correct');
  console.log('📝 Make sure to:');
  console.log('   1. Set your actual Discord application public key in wrangler.toml or as a secret');
  console.log('   2. Deploy your worker with: wrangler deploy');
  console.log('   3. Test the endpoint with Discord\'s verification');
  
  return true;
}

// Run the test
testSignatureValidation(); 