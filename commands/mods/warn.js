const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js");
const db = require("quick.db");
const random_string = require("randomstring");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    name: 'warn',
    aliases: ["sanctions"],
    run: async (client, message, args, prefix, color) => {
        let chx = db.get(`logmod_${message.guild.id}`);
        const logschannel = message.guild.channels.cache.get(chx);
        let perm = false;

        // Check roles for permissions
        message.member.roles.cache.forEach(role => {
            if (db.get(`modsp_${message.guild.id}_${role.id}`) || 
                db.get(`ownerp_${message.guild.id}_${role.id}`) || 
                db.get(`admin_${message.guild.id}_${role.id}`)) {
                perm = true;
            }
        });

        if (client.config.owner.includes(message.author.id) || 
            db.get(`ownermd_${client.user.id}_${message.author.id}`) === true || 
            perm) {

            if (args[0] === "add") {
                const use = message.mentions.users.first() || client.users.cache.get(args[1]);
                let user = client.users.cache.get(use.id);

                if (!user) return message.channel.send(`Aucun membre trouvé pour \`${args[1] || "rien"}\``);
                if (user.bot) return message.channel.send(`Vous ne pouvez pas sanctionner un bot !`);
                if (user.id === message.author.id) return message.channel.send(`Vous ne pouvez pas vous sanctionner vous-même !`);
                if (message.guild.members.cache.get(user.id).roles.highest.position >= message.member.roles.highest.position || 
                    user.id === message.guild.owner.id) return message.channel.send(`Cette personne est plus haute que vous sur le serveur, vous ne pouvez pas la sanctionner !`);

                let res = args.slice(2).join(" ");
                let warnID = random_string.generate({ charset: 'numeric', length: 8 });

                db.push(`info.${message.guild.id}.${user.id}`, {
                    moderator: message.author.tag,
                    reason: res || "Aucune raison",
                    date: Math.floor(Date.now() / 1000),
                    id: warnID
                });
                db.add(`number.${message.guild.id}.${user.id}`, 1);

                if (!res) {
                    message.channel.send(`${user} a été **warn**`);
                    user.send(`Vous avez été **warn** sur ${message.guild.name}`);
                    logschannel.send(new MessageEmbed()
                        .setColor(color)
                        .setDescription(`${message.author} a **warn** ${user}`));
                } else {
                    message.channel.send(`${user} a été **warn** pour \`${res}\``);
                    user.send(`Vous avez été **warn** sur ${message.guild.name} pour \`${res}\``);
                    logschannel.send(new MessageEmbed()
                        .setColor(color)
                        .setDescription(`${message.author} a **warn** ${user} pour \`${res}\``));
                }

                if (db.fetch(`number.${message.guild.id}.${user.id}`) >= 3) {
                    try {
                        message.channel.send(`${user} a été **kick** pour avoir dépassé(e) la limite de warn`);
                        user.send(`Vous avez été **kick** de **${message.guild.name}** pour avoir dépassé(e) la limite de warn`);
                        await user.kick();
                        logschannel.send(new MessageEmbed()
                            .setColor(color)
                            .setDescription(`${user} a été **kick** pour avoir dépassé la limite de warn`));
                    } catch (error) {
                        console.error('Failed to kick user:', error);
                    }
                }
            }

            if (args[0] === "list") {
                const use = message.mentions.users.first() || client.users.cache.get(args[1]) || message.author;
                let user = client.users.cache.get(use.id);

                if (!user) return message.channel.send(`Aucun membre trouvé pour \`${args[1]}\``);

                const number = db.fetch(`number.${message.guild.id}.${user.id}`);
                const warnInfo = db.fetch(`info.${message.guild.id}.${user.id}`);

                if (!number || !warnInfo || warnInfo.length === 0) return message.channel.send(`Aucun membre trouvé avec des sanctions pour \`${args[1] || "rien"}\``);

                let p0 = 0;
                let p1 = 5;
                let page = 1;

                const embed = new MessageEmbed()
                    .setTitle(`Liste des sanctions de ${user.tag} (**${number}**)`)
                    .setDescription(warnInfo
                        .map((m, i) => `${i + 1}・\`${m.id}\`\n**Modérateur:** \`${m.moderator}\`\n **Raison:** \`${m.reason}\`\n**Date:** <t:${m.date}>`)
                        .slice(p0, p1))
                    .setFooter(`${page}/${Math.ceil(number === 0 ? 1 : number / 15)} • ${client.config.name}`)
                    .setColor(color);

                message.channel.send(embed).then(async tdata => {
                    if (number > 15) {
                        const B1 = new MessageButton()
                            .setLabel("◀")
                            .setStyle("gray")
                            .setCustomId('warnlist1');

                        const B2 = new MessageButton()
                            .setLabel("▶")
                            .setStyle("gray")
                            .setCustomId('warnlist2');

                        const bts = new MessageActionRow()
                            .addComponents(B1)
                            .addComponents(B2);

                        tdata.edit({ embeds: [embed], components: [bts] });

                        const collector = tdata.createMessageComponentCollector({ time: 60000 * 5 });
                        collector.on('collect', button => {
                            if (button.user.id !== message.author.id) return;
                            if (button.customId === "warnlist1") {
                                p0 = Math.max(p0 - 15, 0);
                                p1 = p1 - 15;
                                page = Math.max(page - 1, 1);

                                embed.setDescription(warnInfo
                                    .map((m, i) => `${i + 1}・\`${m.id}\`\n**Modérateur:** \`${m.moderator}\`\n **Raison:** \`${m.reason}\`\n**Date:** <t:${m.date}>`)
                                    .slice(p0, p1))
                                    .setFooter(`${page}/${Math.ceil(number === 0 ? 1 : number / 15)} • ${client.config.name}`);

                                tdata.edit({ embeds: [embed] });
                            }

                            if (button.customId === "warnlist2") {
                                p0 = p0 + 15;
                                p1 = p1 + 15;
                                page++;

                                if (p1 > number) {
                                    p0 = p0 - 15;
                                    p1 = p1 - 15;
                                    page--;
                                    return;
                                }

                                embed.setDescription(warnInfo
                                    .map((m, i) => `${i + 1}・\`${m.id}\`\n**Modérateur:** \`${m.moderator}\`\n **Raison:** \`${m.reason}\`\n**Date:** <t:${m.date}>`)
                                    .slice(p0, p1))
                                    .setFooter(`${page}/${Math.ceil(number === 0 ? 1 : number / 15)} • ${client.config.name}`);

                                tdata.edit({ embeds: [embed] });
                            }
                        });
                    }
                });
            }

            if (args[0] === "remove") {
                let id = args[2];
                const use = message.mentions.users.first() || client.users.cache.get(args[1]);
                let user = client.users.cache.get(use.id);
                let database = db.fetch(`info.${message.guild.id}.${user.id}`);

                if (!user) return message.channel.send(`Aucun membre trouvé pour \`${args[1]}\``);
                if (user.bot) return message.channel.send(`Aucun membre trouvé pour \`${args[1] || "rien"}\``);
                if (user.id === message.author.id) return message.react("❌");

                if (!database || database.length === 0) return message.channel.send(`Aucun membre trouvé avec des sanctions pour \`${args[1] || "rien"}\``);

                if (!database.find(data => data.id === id)) return message.channel.send(`Aucune sanction trouvée pour \`${args[2] || "rien"}\``);

                database.splice(database.findIndex(data => data.id === id), 1);

                if (database.length > 0) {
                    db.subtract(`number.${message.guild.id}.${user.id}`, 1);
                    db.set(`info.${message.guild.id}.${user.id}`, database);
                } else {
                    db.delete(`number.${message.guild.id}.${user.id}`);
                    db.delete(`info.${message.guild.id}.${user.id}`);
                }

                message.channel.send(`La sanction **${args[2]}** a été supprimée`);
            }

            if (args[0] === "clear") {
                const use = message.mentions.users.first() || client.users.cache.get(args[1]);
                let user = client.users.cache.get(use.id);

                if (!user) return message.channel.send(`Aucun membre trouvé pour \`${args[1] || "rien"}\``);
                if (user.bot) return message.channel.send(`Aucun membre trouvé pour \`${args[1] || "rien"}\``);
                if (user.id === message.author.id) return message.react("❌");

                if (message.guild.members.cache.get(user.id).roles.highest.position >= message.member.roles.highest.position) return;
                const number = db.fetch(`number.${message.guild.id}.${user.id}`);
                if (!number) return message.channel.send(`Aucune sanction trouvée`);

                message.channel.send(`${number} ${number > 1 ? "sanctions ont été supprimées" : "sanction a été supprimée"}`);

                db.delete(`number.${message.guild.id}.${user.id}`);
                db.delete(`info.${message.guild.id}.${user.id}`);
            }
        }
    }
};
