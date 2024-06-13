const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Hardcode your credentials here
const DISCORD_TOKEN = 'your_discord_bot_token';
const PTERODACTYL_API_KEY = 'your_pterodactyl_api_key';
const PTERODACTYL_URL = 'https://your.pterodactyl.url';

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Helper function to get available nodes and allocations
async function getAvailableAllocations() {
  try {
    const nodesResponse = await axios.get(`${PTERODACTYL_URL}/api/application/nodes`, {
      headers: {
        'Authorization': `Bearer ${PTERODACTYL_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const nodes = nodesResponse.data.data;
    for (const node of nodes) {
      const allocationsResponse = await axios.get(`${PTERODACTYL_URL}/api/application/nodes/${node.attributes.id}/allocations`, {
        headers: {
          'Authorization': `Bearer ${PTERODACTYL_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const allocations = allocationsResponse.data.data;
      for (const allocation of allocations) {
        if (!allocation.attributes.assigned) {
          return allocation.attributes.id;
        }
      }
    }

    return null; // No available allocations found
  } catch (error) {
    console.error('Error fetching allocations:', error);
    return null;
  }
}

client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!nserver create')) {
    const allocationId = await getAvailableAllocations();
    if (!allocationId) {
      message.channel.send('No available allocations found.');
      return;
    }

    try {
      const response = await axios.post(`${PTERODACTYL_URL}/api/application/servers`, {
        name: "My New Server",
        user: 1, // The user ID for the server owner
        egg: 1, // The egg ID for the server
        docker_image: "quay.io/pterodactyl/core:java", // The Docker image to use
        startup: "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}",
        environment: {
          SERVER_JARFILE: "server.jar",
          SERVER_MEMORY: "512M"
        },
        limits: {
          memory: 512, // Memory limit in MB
          swap: 0, // Swap limit in MB
          disk: 1024, // Disk space limit in MB
          io: 500, // Block IO weight (10-1000)
          cpu: 100 // CPU limit in percentage
        },
        feature_limits: {
          databases: 1, // Number of databases allowed
          allocations: 1 // Number of allocations allowed
        },
        allocation: {
          default: allocationId // Use the dynamically chosen allocation ID
        }
      }, {
        headers: {
          'Authorization': `Bearer ${PTERODACTYL_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      message.channel.send(`Server created! ID: ${response.data.attributes.identifier}`);
    } catch (error) {
      console.error(error);
      message.channel.send('Failed to create server.');
    }
  }

  if (message.content.startsWith('!naccount create')) {
    const args = message.content.split(' ').slice(1);
    const [name, email, password] = args;

    try {
      const response = await axios.post(`${PTERODACTYL_URL}/api/application/users`, {
        username: name,
        email: email,
        password: password
      }, {
        headers: {
          'Authorization': `Bearer ${PTERODACTYL_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      message.channel.send(`Account created! Username: ${name}, Email: ${email}`);
    } catch (error) {
      console.error(error);
      message.channel.send('Failed to create account.');
    }
  }
});

client.login(DISCORD_TOKEN);