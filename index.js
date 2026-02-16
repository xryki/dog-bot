require("dotenv").config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.User]
});

const prefix = process.env.PREFIX || "+";
const MAIN_OWNER = process.env.MAIN_OWNER;

// Fichiers de sauvegarde
const DATA_FILE = './bot_data.json';

// Charger les données sauvegardées
let botData = {
  owners: [],
  dogs: {},
  originalNicknames: {}
};

if (fs.existsSync(DATA_FILE)) {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    botData = JSON.parse(data);
  } catch (err) {
    console.error('Erreur chargement données:', err);
  }
}

// Initialiser avec le owner principal si pas d'owners
if (botData.owners.length === 0 && MAIN_OWNER) {
  botData.owners = [MAIN_OWNER];
}

let owners = botData.owners;
let dogs = botData.dogs;
let originalNicknames = botData.originalNicknames;

// Fonction pour tronquer un nom à 32 caractères max (limite Discord)
function truncateNickname(name) {
  if (name.length > 32) {
    return name.substring(0, 32);
  }
  return name;
}

// Fonction pour sauvegarder les données
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      owners,
      dogs,
      originalNicknames
    }, null, 2));
  } catch (err) {
    console.error('Erreur sauvegarde données:', err);
  }
}

client.on("ready", () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
  console.log(`Préfixe: ${prefix}`);
  console.log(`Owner principal: <@${MAIN_OWNER}>`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift()?.toLowerCase();
  const isOwner = owners.includes(message.author.id);

  if (command === "help") {
    if (!isOwner) return message.reply("Pas autorisé.");
    
    // Créer les boutons de navigation
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('help_owners')
          .setLabel('Owners')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('help_dogs')
          .setLabel('Chiens')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('help_invite')
          .setLabel('Invitation')
          .setStyle(ButtonStyle.Success)
      );

    // Embed principal
    const mainEmbed = new EmbedBuilder()
      .setTitle("Menu d'aide du Bot Chien")
      .setColor("#00ff00")
      .setDescription("Bienvenue dans le menu d'aide ! Choisis une catégorie ci-dessous :")
      .addFields(
        {
          name: "Owners",
          value: "Gérer les owners du bot",
          inline: true
        },
        {
          name: "Chiens", 
          value: "Commandes pour gérer les chiens",
          inline: true
        },
        {
          name: "Invitation",
          value: "Inviter le bot sur d'autres serveurs",
          inline: true
        }
      )
      .setFooter({ text: `Préfixe: ${prefix} | Cliquez sur les boutons pour voir les commandes` })
      .setTimestamp();

    const replyMessage = await message.reply({ embeds: [mainEmbed], components: [row] });

    // Créer le collector pour les boutons
    const collector = replyMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000 // 60 secondes
    });

    collector.on('collect', async (interaction) => {
      if (!owners.includes(interaction.user.id)) {
        await interaction.reply({ content: "Pas autorisé.", ephemeral: true });
        return;
      }

      let newEmbed;
      
      switch(interaction.customId) {
        case 'help_owners':
          newEmbed = new EmbedBuilder()
            .setTitle("Commandes Owners")
            .setColor("#ff9900")
            .setDescription("Commandes pour gérer les owners du bot :")
            .addFields(
              {
                name: "Ajouter un owner",
                value: `\`${prefix}owner add @user|id\`\nAjoute un nouvel owner au bot`,
                inline: false
              },
              {
                name: "Retirer un owner", 
                value: `\`${prefix}owner remove @user|id\`\nRetire un owner (sauf le principal)`,
                inline: false
              },
              {
                name: "Lister les owners",
                value: `\`${prefix}owner list\`\nAffiche tous les owners actuels`,
                inline: false
              }
            )
            .setFooter({ text: `Préfixe: ${prefix}` })
            .setTimestamp();
          break;

        case 'help_dogs':
          newEmbed = new EmbedBuilder()
            .setTitle("Commandes Chiens")
            .setColor("#0099ff")
            .setDescription("Commandes pour gérer les chiens :")
            .addFields(
              {
                name: "Ajouter un chien",
                value: `\`${prefix}dog @user\`\nTransforme un utilisateur en chien\n*Le owner principal peut dog les owners*`,
                inline: false
              },
              {
                name: "Voir ses chiens",
                value: `\`${prefix}mydogs\`\nAffiche la liste de vos chiens`,
                inline: false
              },
              {
                name: "Retirer un chien",
                value: `\`${prefix}undog @user\`\nRetire un chien spécifique\n*Le owner principal peut undog n'importe quel chien*`,
                inline: false
              },
              {
                name: "Retirer tous les chiens",
                value: `\`${prefix}undog all\`\nRetire tous vos chiens\n*Le owner principal retire tous les chiens du serveur*`,
                inline: false
              },
              {
                name: "Liste tous les chiens",
                value: `\`${prefix}dogslist\`\nAffiche tous les chiens du serveur et leurs maîtres`,
                inline: false
              }
            )
            .setFooter({ text: `Préfixe: ${prefix}` })
            .setTimestamp();
          break;

        case 'help_invite':
          newEmbed = new EmbedBuilder()
            .setTitle("Invitation")
            .setColor("#00ff00")
            .setDescription("Inviter le bot sur d'autres serveurs :")
            .addFields(
              {
                name: "Générer un lien d'invitation",
                value: `\`${prefix}invite\`\nGénère un lien d'invitation avec les permissions nécessaires`,
                inline: false
              },
              {
                name: "Permissions requises",
                value: "• Gérer les pseudos\n• Déplacer les membres\n• Envoyer des messages\n• Intégrer des liens",
                inline: false
              }
            )
            .setFooter({ text: `Préfixe: ${prefix}` })
            .setTimestamp();
          break;
      }

      await interaction.update({ embeds: [newEmbed], components: [row] });
    });

    collector.on('end', () => {
      // Désactiver les boutons après 60 secondes
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('help_owners')
            .setLabel('Owners')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('help_dogs')
            .setLabel('Chiens')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('help_invite')
            .setLabel('Invitation')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
        );
      
      replyMessage.edit({ components: [disabledRow] }).catch(() => {});
    });

    return;
  }

  if (command === "owner") {
    if (!isOwner) return message.reply("Pas autorisé.");

    const sub = (args.shift() || "").toLowerCase();

    if (sub === "add") {
      let target = message.mentions.users.first() || 
                   (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

      if (!target) return message.reply("Utilisateur invalide (mention ou ID).");
      if (owners.includes(target.id)) return message.reply("Déjà owner.");

      owners.push(target.id);
      saveData();
      return message.reply(`${target} ajouté aux owners.`);
    }

    if (sub === "remove") {
      let target = message.mentions.users.first() || 
                   (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

      if (!target) return message.reply("Utilisateur invalide.");
      if (target.id === MAIN_OWNER) return message.reply("Owner principal intouchable.");
      if (!owners.includes(target.id)) return message.reply("Pas owner.");

      owners = owners.filter(id => id !== target.id);
      saveData();
      return message.reply(`${target} retiré des owners.`);
    }

    if (sub === "list") {
      const embed = new EmbedBuilder()
        .setTitle("Liste des Owners")
        .setColor("#ff9900")
        .setDescription(`Owners actuels (${owners.length}) :`)
        .addFields({
          name: "Owners",
          value: owners.length > 0 ? owners.map(id => `<@${id}>`).join("\n") : "Aucun",
          inline: false
        })
        .setTimestamp();
      
      return message.reply({ embeds: [embed] });
    }

    return message.reply(`Utilisation : ${prefix}owner add/remove/list @user|id`);
  }

  if (command === "invite") {
    if (!isOwner) return message.reply("Pas autorisé.");

    const clientId = client.user.id;
    
    // Permissions nécessaires en utilisant les flags de Discord.js v14
    const permissions = [
      require("discord.js").PermissionFlagsBits.ManageNicknames,
      require("discord.js").PermissionFlagsBits.ChangeNickname,
      require("discord.js").PermissionFlagsBits.MoveMembers,
      require("discord.js").PermissionFlagsBits.SendMessages,
      require("discord.js").PermissionFlagsBits.EmbedLinks,
      require("discord.js").PermissionFlagsBits.ReadMessageHistory
    ];

    // Calculer la somme des permissions
    const permissionsBit = permissions.reduce((acc, perm) => acc | perm, 0n);

    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${permissionsBit}&scope=bot%20applications.commands`;

    const embed = new EmbedBuilder()
      .setTitle("Lien d'invitation du Bot")
      .setColor("#00ff00")
      .setDescription("Voici le lien pour ajouter le bot à vos serveurs :")
      .addFields({
        name: "Lien d'invitation",
        value: `[Cliquez ici pour inviter le bot](${inviteUrl})`,
        inline: false
      })
      .addFields({
        name: "Permissions requises",
        value: "• Gérer les pseudos\n• Déplacer les membres\n• Envoyer des messages\n• Intégrer des liens",
        inline: false
      })
      .setFooter({ text: "Ce lien ne fonctionne que pour les owners du bot" })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  if (command === "dog") {
    if (!isOwner) return message.reply("Pas autorisé.");

    const member = message.mentions.members.first();
    if (!member) return message.reply(`${prefix}dog @user`);

    const isMainOwner = message.author.id === MAIN_OWNER;

    // PROTECTIONS
    if (member.id === message.author.id) {
      return message.reply("Tu ne peux pas être ton propre chien !");
    }
    if (member.id === MAIN_OWNER) {
      return message.reply("Tu ne peux pas dog le propriétaire principal du bot !");
    }
    
    // Si ce n'est pas le owner principal, il ne peut pas dog les owners
    if (!isMainOwner && owners.includes(member.id)) {
      return message.reply("Tu ne peux pas dog un owner !");
    }

    const masterName = message.member.displayName;
    const oldName = member.displayName;
    const newName = `${oldName} chienne de ${masterName}`;

    try {
      await member.setNickname(truncateNickname(newName));
      // Stocke le pseudo ORIGINAL
      originalNicknames[member.id] = oldName;
    } catch (err) {
      console.error(err);
      return message.reply("Pas les perms Gérer les pseudos ou rôle trop bas.");
    }

    if (!dogs[message.author.id]) dogs[message.author.id] = [];
    if (!dogs[message.author.id].includes(member.id)) {
      dogs[message.author.id].push(member.id);
    }
    saveData();

    return message.reply(`${member} est maintenant ton chien !\nTes chiens: ${dogs[message.author.id].length}`);
  }

  if (command === "mydogs") {
    if (!isOwner) return message.reply("Pas autorisé.");

    const dogIds = dogs[message.author.id] || [];
    if (dogIds.length === 0) return message.reply("Tu n'as aucun chien !");

    const dogMembers = dogIds
      .map(id => message.guild.members.cache.get(id))
      .filter(Boolean);

    const embed = new EmbedBuilder()
      .setTitle("Tes Chiens")
      .setColor("#0099ff")
      .setDescription(`Tu as **${dogIds.length} chien(s)** :`)
      .addFields({
        name: "Liste des chiens",
        value: dogMembers.length > 0 
          ? dogMembers.map(m => `• ${m.toString()}`).join("\n")
          : "Aucun chien trouvé sur le serveur",
        inline: false
      })
      .setFooter({ text: `Total: ${dogIds.length} chiens enregistrés` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  if (command === "dogslist") {
    if (!isOwner) return message.reply("Pas autorisé.");

    let allDogs = [];
    let totalDogs = 0;

    for (const [masterId, dogIds] of Object.entries(dogs)) {
      if (dogIds.length === 0) continue;
      
      const master = message.guild.members.cache.get(masterId);
      if (!master) continue;

      const dogMembers = dogIds
        .map(id => message.guild.members.cache.get(id))
        .filter(Boolean);

      if (dogMembers.length > 0) {
        allDogs.push({
          master: master,
          dogs: dogMembers
        });
        totalDogs += dogMembers.length;
      }
    }

    if (allDogs.length === 0) {
      return message.reply("Aucun chien sur le serveur !");
    }

    const embed = new EmbedBuilder()
      .setTitle("Tous les Chiens du Serveur")
      .setColor("#ff6b6b")
      .setDescription(`Total : **${totalDogs} chien(s)** appartenant à **${allDogs.length} maître(s)**`)
      .setTimestamp();

    for (const { master, dogs } of allDogs) {
      embed.addFields({
        name: `${master.displayName}`,
        value: dogs.map(d => `• ${d.toString()}`).join("\n"),
        inline: false
      });
    }

    return message.reply({ embeds: [embed] });
  }

  if (command === "undog") {
    if (!isOwner) return message.reply("Pas autorisé.");

    // Si c'est le owner principal, il peut undog n'importe quel chien
    const isMainOwner = message.author.id === MAIN_OWNER;

    if (args[0] === "all") {
      let dogsToRemove = [];
      
      if (isMainOwner) {
        // Owner principal : retire TOUS les chiens du serveur
        for (const [masterId, dogIds] of Object.entries(dogs)) {
          dogsToRemove.push(...dogIds.map(dogId => ({ masterId, dogId })));
        }
      } else {
        // Owner normal : retire seulement ses chiens
        const dogIds = dogs[message.author.id] || [];
        dogsToRemove = dogIds.map(dogId => ({ masterId: message.author.id, dogId }));
      }

      // Remet le pseudo original à tous les chiens
      for (const { dogId } of dogsToRemove) {
        const dogMember = message.guild.members.cache.get(dogId);
        if (dogMember && originalNicknames[dogId]) {
          try {
            await dogMember.setNickname(originalNicknames[dogId]);
          } catch (err) {
            console.error(`Erreur reset pseudo ${dogId}:`, err);
          }
          delete originalNicknames[dogId];
        }
      }

      // Supprime les chiens des listes
      if (isMainOwner) {
        dogs = {};
      } else {
        delete dogs[message.author.id];
      }
      
      saveData();
      
      if (isMainOwner) {
        return message.reply("TOUS les chiens du serveur retirés et pseudos remis à l'original !");
      } else {
        return message.reply("Tous tes chiens retirés et pseudos remis à l'original !");
      }
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply(`${prefix}undog @user ou ${prefix}undog all`);

    let targetMasterId = null;
    let targetDogIds = [];

    // Chercher le maître du chien ciblé
    for (const [masterId, dogIds] of Object.entries(dogs)) {
      if (dogIds.includes(target.id)) {
        targetMasterId = masterId;
        targetDogIds = dogIds;
        break;
      }
    }

    if (!targetMasterId) {
      return message.reply(`${target} n'est pas un chien.`);
    }

    // Vérifier si l'utilisateur a le droit d'undog ce chien
    if (!isMainOwner && targetMasterId !== message.author.id) {
      return message.reply(`${target} n'est pas ton chien.`);
    }

    const index = targetDogIds.indexOf(target.id);
    if (index === -1) return message.reply(`${target} n'est pas un chien.`);

    // Remet le pseudo original du chien ciblé
    if (originalNicknames[target.id]) {
      try {
        await target.setNickname(originalNicknames[target.id]);
      } catch (err) {
        console.error(`Erreur reset pseudo ${target.id}:`, err);
      }
      delete originalNicknames[target.id];
    }

    targetDogIds.splice(index, 1);
    if (targetDogIds.length === 0) delete dogs[targetMasterId];
    saveData();

    if (isMainOwner && targetMasterId !== message.author.id) {
      const master = message.guild.members.cache.get(targetMasterId);
      return message.reply(`${target} n'est plus le chien de ${master ? master.displayName : 'son maître'} (pseudo remis à l'original).`);
    } else {
      return message.reply(`${target} n'est plus ton chien (pseudo remis à l'original).`);
    }
  }
});

// Événement pour empêcher les changements de pseudo
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  // Si le pseudo a changé
  if (oldMember.displayName !== newMember.displayName) {
    const userId = newMember.id;
    
    // Vérifier si c'est un chien
    let isDog = false;
    let masterId = null;
    
    for (const [master, dogList] of Object.entries(dogs)) {
      if (dogList.includes(userId)) {
        isDog = true;
        masterId = master;
        break;
      }
    }
    
    // Si c'est un chien, remettre le pseudo correct
    if (isDog && masterId) {
      try {
        const master = await newMember.guild.members.fetch(masterId).catch(() => null);
        if (master) {
          const masterName = master.displayName;
          const originalName = originalNicknames[userId] || newMember.user.username;
          const correctName = `${originalName} chien de ${masterName}`;
          
          // Attendre un peu pour éviter les conflits
          setTimeout(async () => {
            try {
              // Revérifier si c'est toujours un chien avant de changer le pseudo
              let stillDog = false;
              for (const [master, dogList] of Object.entries(dogs)) {
                if (dogList.includes(userId)) {
                  stillDog = true;
                  break;
                }
              }
              
              if (stillDog) {
                await newMember.setNickname(truncateNickname(correctName));
                console.log(`Pseudo de ${newMember.user.tag} remis à: ${correctName}`);
              }
            } catch (err) {
              console.error(`Impossible de remettre le pseudo de ${newMember.user.tag}:`, err);
            }
          }, 1000);
        }
      } catch (err) {
        console.error('Erreur lors de la correction du pseudo:', err);
      }
    }
  }
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  const userId = newState.id;
  const dogIds = dogs[userId] || [];
  if (dogIds.length === 0) return;

  const guild = newState.guild;
  const masterChannel = newState.channel;
  if (!masterChannel) return;

  for (const dogId of dogIds) {
    const dogMember = guild.members.cache.get(dogId);
    if (!dogMember) continue;

    const dogChannel = dogMember.voice.channel;
    if (!dogChannel || dogChannel.id === masterChannel.id) continue;

    try {
      await dogMember.voice.setChannel(masterChannel);
    } catch (err) {
      console.error("Move chien échoué:", err.message);
    }
  }
});

client.login(process.env.TOKEN);
