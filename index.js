const Discord = require('discord.js');
const keep_alive = require('./keep_alive.js');
const client = new Discord.Client({
    fetchAllMembers: true,
    partials: ['MESSAGE', 'CHANNEL', 'REACTION', 'GUILD_PRESENCES', 'GUILD_MEMBERS', 'GUILD_MESSAGES', 'GUILD_VOICE_STATES'],
    intents: [
        Discord.Intents.FLAGS.DIRECT_MESSAGES,
        Discord.Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
        Discord.Intents.FLAGS.DIRECT_MESSAGE_TYPING,
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_BANS,
        Discord.Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Discord.Intents.FLAGS.GUILD_INTEGRATIONS,
        Discord.Intents.FLAGS.GUILD_INVITES,
        Discord.Intents.FLAGS.GUILD_MEMBERS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Discord.Intents.FLAGS.GUILD_MESSAGE_TYPING,
        Discord.Intents.FLAGS.GUILD_PRESENCES,
        Discord.Intents.FLAGS.GUILD_VOICE_STATES,
        Discord.Intents.FLAGS.GUILD_WEBHOOKS,
    ]
});
const { readdirSync } = require("fs");
const db = require('quick.db');
const ms = require("ms");
const { MessageEmbed } = require('discord.js');
const { login } = require("./util/login.js");

client.commands = new Discord.Collection();

process.on("unhandledRejection", err => {
    if (err.message) return;
    console.error("Uncaught Promise Error: ", err);
});

const loadCommands = (dir = "./commands/") => {
    readdirSync(dir).forEach(dirs => {
        const commands = readdirSync(`${dir}/${dirs}/`).filter(files => files.endsWith(".js"));

        for (const file of commands) {
            const getFileName = require(`${dir}/${dirs}/${file}`);
            client.commands.set(getFileName.name, getFileName);
            console.log(`> Commande Chargée ${getFileName.name} [${dirs}]`);
        }
    });
};

const loadEvents = (dir = "./events/") => {
    readdirSync(dir).forEach(dirs => {
        const events = readdirSync(`${dir}/${dirs}/`).filter(files => files.endsWith(".js"));

        for (const event of events) {
            const evt = require(`${dir}/${dirs}/${event}`);
            const evtName = event.split(".")[0];
            client.on(evtName, evt.bind(null, client));
            console.log(`> Event Chargé ${evtName}`);
        }
    });
};

loadEvents();
loadCommands();

// Modmail
client.on('messageCreate', async (message) => {
    if (message.channel.type === 'DM' && !message.author.bot) {
        console.log("DM from user:", message.author.tag);
        const guild = client.guilds.cache.get('YOUR_GUILD_ID'); // Remplacez par votre ID de serveur
        if (!guild) {
            console.error("Guild not found");
            return;
        }
        console.log(`Found guild: ${guild.name}`);

        let channel = guild.channels.cache.find(ch => ch.name === `modmail-${message.author.id}`);
        if (!channel) {
            console.log("Creating new modmail channel for:", message.author.tag);
            channel = await guild.channels.create(`modmail-${message.author.id}`, {
                type: 'GUILD_TEXT',
                topic: `Modmail thread with ${message.author.tag}`,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: ['VIEW_CHANNEL'],
                    },
                    {
                        id: 'YOUR_MODERATOR_ROLE_ID', // Remplacez par l'ID de votre rôle de modérateur
                        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
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
});

client.on('messageCreate', async (message) => {
    if (!message.guild || !message.channel.name.startsWith('modmail-') || message.author.bot) {
        return;
    }

    console.log("Message in modmail channel:", message.channel.name);

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
});

client.login(login);
