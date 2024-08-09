const Discord = require('discord.js');
const EasyJsonDB = require('easy-json-database');
const {
    MessageActionRow,
    MessageButton,
} = require('discord-buttons');

// Initialise la base de données avec le fichier JSON
const db = new EasyJsonDB('./owners.json');

module.exports = {
    name: 'owner',
    aliases: [],
    run: async (client, message, args, prefix, color) => {
        if (client.config.owner.includes(message.author.id)) {
            if (args[0] === "add") {
                let member = client.users.cache.get(message.author.id);
                if (args[1]) {
                    member = client.users.cache.get(args[1]);
                } else {
                    return message.channel.send(`Aucun membre trouvé pour \`${args[1] || " "}\``);
                }

                if (message.mentions.members.first()) {
                    member = client.users.cache.get(message.mentions.members.first().id);
                }

                if (!member) return message.channel.send(`Aucun membre trouvé pour \`${args[1] || " "}\``);
                
                if (db.get(`ownermd_${client.user.id}_${member.id}`)) {
                    return message.channel.send(`<@${member.id}> est déjà owner`);
                }

                db.set(`ownermd_${client.user.id}_${member.id}`, true);
                message.channel.send(`<@${member.id}> est maintenant owner`);

            } else if (args[0] === "clear") {
                let tt = Object.keys(db.all()).filter(key => key.startsWith(`ownermd_${client.user.id}`));
                message.channel.send(`${tt.length === 0 ? 0 : tt.length} ${tt.length > 1 ? "personnes ont été supprimées " : "personne a été supprimée"} des owners`);

                for (let i = 0; i < tt.length; i++) {
                    db.delete(tt[i]);
                }

            } else if (args[0] === "remove") {
                let member = client.users.cache.get(message.author.id);
                if (args[1]) {
                    member = client.users.cache.get(args[1]);
                } else {
                    return message.channel.send(`Aucun membre trouvé pour \`${args[1] || " "}\``);
                }

                if (message.mentions.members.first()) {
                    member = client.users.cache.get(message.mentions.members.first().id);
                }

                if (!member) return message.channel.send(`Aucun membre trouvé pour \`${args[1] || " "}\``);

                if (!db.get(`ownermd_${client.user.id}_${member.id}`)) {
                    return message.channel.send(`<@${member.id}> n'est pas owner`);
                }

                db.delete(`ownermd_${client.user.id}_${member.id}`);
                message.channel.send(`<@${member.id}> n'est plus owner`);

            } else if (args[0] === "list") {
                let money = Object.keys(db.all()).filter(key => key.startsWith(`ownermd_${client.user.id}`)).sort((a, b) => b.data - a.data);

                let p0 = 0;
                let p1 = 5;
                let page = 1;

                const embed = new Discord.MessageEmbed()
                    .setTitle('Owner')
                    .setDescription(money
                        .filter(x => client.users.cache.get(x.split('_')[2]))
                        .map((m, i) => `${i + 1}) <@${client.users.cache.get(m.split('_')[2]).id}> (${client.users.cache.get(m.split('_')[2]).id})`)
                        .slice(0, 5)
                    )
                    .setFooter(`${page}/${Math.ceil(money.length === 0 ? 1 : money.length / 5)} • ${client.config.name}`)
                    .setColor(color);

                message.channel.send(embed).then(async tdata => {
                    if (money.length > 5) {
                        const B1 = new MessageButton()
                            .setLabel("◀")
                            .setStyle("gray")
                            .setID('owner1');

                        const B2 = new MessageButton()
                            .setLabel("▶")
                            .setStyle("gray")
                            .setID('owner2');

                        const bts = new MessageActionRow()
                            .addComponent(B1)
                            .addComponent(B2);
                        tdata.edit("", {
                            embed: embed,
                            components: [bts]
                        });

                        setTimeout(() => {
                            tdata.edit("", {
                                components: [],
                                embed: new Discord.MessageEmbed()
                                    .setTitle('Owner')
                                    .setDescription(money
                                        .filter(x => client.users.cache.get(x.split('_')[2]))
                                        .map((m, i) => `${i + 1}) <@${client.users.cache.get(m.split('_')[2]).id}> (${client.users.cache.get(m.split('_')[2]).id})`)
                                        .slice(0, 5)
                                    )
                                    .setFooter(`1/${Math.ceil(money.length === 0 ? 1 : money.length / 5)} • ${client.config.name}`)
                                    .setColor(color)
                            });
                        }, 60000 * 5);

                        client.on("clickButton", (button) => {
                            if (button.clicker.user.id !== message.author.id) return;

                            if (button.id === "owner1") {
                                button.reply.defer(true);

                                p0 = p0 - 5;
                                p1 = p1 - 5;
                                page = page - 1;

                                if (p0 < 0) return;

                                embed.setDescription(money
                                        .filter(x => client.users.cache.get(x.split('_')[2]))
                                        .map((m, i) => `${i + 1}) <@${client.users.cache.get(m.split('_')[2]).id}> (${client.users.cache.get(m.split('_')[2]).id})`)
                                        .slice(p0, p1)
                                    )
                                    .setFooter(`${page}/${Math.ceil(money.length === 0 ? 1 : money.length / 5)} • ${client.config.name}`);
                                tdata.edit(embed);
                            }

                            if (button.id === "owner2") {
                                button.reply.defer(true);

                                p0 = p0 + 5;
                                p1 = p1 + 5;
                                page++;

                                if (p1 > money.length + 5) return;

                                embed.setDescription(money
                                        .filter(x => client.users.cache.get(x.split('_')[2]))
                                        .map((m, i) => `${i + 1}) <@${client.users.cache.get(m.split('_')[2]).id}> (${client.users.cache.get(m.split('_')[2]).id})`)
                                        .slice(p0, p1)
                                    )
                                    .setFooter(`${page}/${Math.ceil(money.length === 0 ? 1 : money.length / 5)} • ${client.config.name}`);
                                tdata.edit(embed);
                            }
                        });
                    }
                });
            }
        }
    }
}