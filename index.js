const Discord = require('discord.js');
const axios = require('axios');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const client = new Discord.Client();
const PREFIX = '!';

client.once('ready', () => {
    console.log('Bot is online!');
});

client.on('message', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const [command, ...args] = message.content.slice(PREFIX.length).split(' ');

    if (command === 'register') {
        await registerUser(message);
    } else if (command === 'servercreate') {
        await createServer(message, args);
    } else if (command === 'nodes') {
        await displayNodes(message);
    }
});

async function registerUser(message) {
    try {
        const authorName = message.author.username;
        
        // Ask for email
        const emailPrompt = await message.author.send('Please enter your email:');
        const emailResponse = await emailPrompt.channel.awaitMessages(m => m.author.id === message.author.id, { max: 1, time: 60000, errors: ['time'] });
        const email = emailResponse.first().content.trim();

        // Ask for name
        const namePrompt = await message.author.send('Please enter your name:');
        const nameResponse = await namePrompt.channel.awaitMessages(m => m.author.id === message.author.id, { max: 1, time: 60000, errors: ['time'] });
        const name = nameResponse.first().content.trim();

        // Generate a random password for Pterodactyl
        const panelPassword = generateRandomPassword();

        // Send panel password to user via DM
        await message.author.send(`Your Pterodactyl panel password: ${panelPassword}`);

        // Create a channel with the user's name
        const guild = message.guild;
        const channel = await guild.channels.create(`${authorName}-${name}`, {
            type: 'text',
            parent: process.env.CATEGORY_ID, // Replace with your category ID
            permissionOverwrites: [
                {
                    id: message.author.id,
                    allow: ['VIEW_CHANNEL']
                },
                {
                    id: client.user.id,
                    allow: ['VIEW_CHANNEL']
                }
            ]
        });

        await channel.send(`Welcome ${authorName}!`);
        await channel.send(`Email: ${email}\nName: ${name}`);

        // Add user to the channel
        await channel.updateOverwrite(message.author, {
            VIEW_CHANNEL: true
        });

        await message.reply(`Registration successful! Check your DMs for further instructions.`);
    } catch (err) {
        console.error('Error during registration:', err);
        message.reply('Registration failed. Please try again later.');
    }
}

async function createServer(message, args) {
    try {
        const [serverName, node] = args;
        
        // Make sure the user is registered (you can implement this check if needed)

        // Generate a random password for the server
        const serverPassword = generateRandomPassword();

        // Example Pterodactyl API request to create a server
        const response = await axios.post(`${process.env.PTERO_API_URL}/servers`, {
            name: serverName,
            node: node,
            // Add more parameters as per your API's requirements
        }, {
            headers: {
                Authorization: `Bearer ${process.env.PTERO_API_TOKEN}`,
                'Content-Type': 'application/json',
            }
        });

        // Handle response and notify the user accordingly
        await message.reply(`Server created successfully with name ${serverName} on node ${node}.`);
    } catch (err) {
        console.error('Error creating server:', err);
        message.reply('Failed to create server. Please try again later.');
    }
}

async function displayNodes(message) {
    try {
        // Fetch and display available nodes from Pterodactyl panel
        const response = await axios.get(`${process.env.PTERO_API_URL}/nodes`, {
            headers: {
                Authorization: `Bearer ${process.env.PTERO_API_TOKEN}`
            }
        });

        const nodes = response.data.nodes.map(node => node.name).join(', ');
        await message.channel.send(`Available nodes: ${nodes}`);
    } catch (err) {
        console.error('Error fetching nodes:', err);
        message.reply('Failed to fetch nodes. Please try again later.');
    }
}

function generateRandomPassword() {
    // Generate a random alphanumeric password
    return uuidv4().replace(/-/g, '').slice(0, 12);
}

client.login(process.env.DISCORD_BOT_TOKEN);
