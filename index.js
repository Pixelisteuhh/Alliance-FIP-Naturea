const { Client, Intents, MessageEmbed, Permissions } = require('discord.js');
const { readdirSync } = require('fs');
const db = require('quick.db');
const ms = require('ms');
const keep_alive = require('./keep_alive.js'); // Assuming you have a keep_alive.js file for keeping the bot alive.
require('dotenv').config(); // For environment variables

const client = new Client({
    fetchAllMembers: true,
    partials: ['MESSAGE', 'CHANNEL', 'REACTION', 'GUILD_PRESENCES', 'GUILD_MEMBERS', 'GUILD_MESSAGES', 'GUILD_VOICE_STATES'],
    intents: [
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
        Intents.FLAGS.DIRECT_MESSAGE_TYPING,
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_BANS,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Intents.FLAGS.GUILD_INTEGRATIONS,
        Intents.FLAGS.GUILD_INVITES,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_MESSAGE_TYPING,
        Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_WEBHOOKS,
    ]
});

const loadCommands = (dir = './commands/') => {
    readdirSync(dir).forEach(dirs => {
        const commands = readdirSync(`${dir}/${dirs}/`).filter(files => files.endsWith('.js'));
        for (const file of commands) {
            const getFileName = require(`${dir}/${dirs}/${file}`);
            client.commands.set(getFileName.name, getFileName);
            console.log(`> Commande Chargée ${getFileName.name} [${dirs}]`);
        }
    });
};

const loadEvents = (dir = './events/') => {
    readdirSync(dir).forEach(dirs => {
        const events = readdirSync(`${dir}/${dirs}/`).filter(files => files.endsWith('.js'));
        for (const event of events) {
            const evt = require(`${dir}/${dirs}/${event}`);
            const evtName = event.split('.')[0];
            client.on(evtName, evt.bind(null, client));
            console.log(`> Event Chargé ${evtName}`);
        }
    });
};

// Modmail functions

async function handleDirectMessage(message) {
    if (message.channel.type === 'DM' && !message.author.bot) {
        console.log('DM from user:', message.author.tag);
        const guild = client.guilds.cache.get('YOUR_GUILD_ID'); // Replace with your guild ID
        if (!guild) {
            console.error('Guild not found');
            return;
        }
        console.log(`Found guild: ${guild.name}`);

        let channel = guild.channels.cache.find(ch => ch.name === `modmail-${message.author.id}`);
        if (!channel) {
            console.log('Creating new modmail channel for:', message.author.tag);
            channel = await guild.channels.create(`modmail-${message.author.id}`, {
                type: 'GUILD_TEXT',
                topic: `Modmail thread with ${message.author.tag}`,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [Permissions.FLAGS.VIEW_CHANNEL],
                    },
                    {
                        id: 'MODERATOR_ROLE_ID', // Replace with your moderator role ID
                        allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.READ_MESSAGE_HISTORY],
                    }
                ],
            });
            console.log(`Created channel: ${channel.name}`);
            await channel.send(`New modmail thread created with ${message.author.tag}`);
        } else {
            console.log(`Found existing channel: ${channel.name}`);
        }
        await channel.send(`${message.author.tag}: ${message.content}`);
    }
}

async function handleModmailMessage(message) {
    if (!message.guild || !message.channel.name.startsWith('modmail-') || message.author.bot) {
        return;
    }

    console.log('Message in modmail channel:', message.channel.name);

    if (message.content === '=close') {
        const userId = message.channel.name.split('-')[1];
        const user = await client.users.fetch(userId);
        if (user) {
            await user.send('Ticket fermé, merci de rouvrir un ticket si vous avez encore besoin d’aide ✅');
        }

        await message.channel.send('Fermeture du ticket...');
        setTimeout(async () => {
            await message.channel.delete();
        }, 3000);
    } else {
        const userId = message.channel.name.split('-')[1];
        const user = await client.users.fetch(userId);
        if (user) {
            await user.send(`Mod (${message.author.tag}): ${message.content}`);
        } else {
            console.error(`Failed to fetch user with ID: ${userId}`);
        }
    }
}

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    loadEvents();
    loadCommands();
});

client.on('messageCreate', async (message) => {
    console.log('Message received:', message.content);
    await handleDirectMessage(message);
    await handleModmailMessage(message);
});

client.login(process.env.BOT_TOKEN).catch((e) => {
    if (e.toString().toLowerCase().includes('token')) {
        throw new Error('An invalid bot token was provided!');
    } else {
        throw new Error('Privileged Gateway Intents are not enabled! Please enable them on the Discord Developer Portal.');
    }
});

process.on('unhandledRejection', err => {
    if (!err.message) return;
    console.error('Uncaught Promise Error: ', err);
});

module.exports = client;
