import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} from 'discord.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embedBuilder.js';
import {
  createPrivateChannel,
  getPrivateChannelsByOwner,
  countPrivateChannelsByOwner,
  updatePrivateChannel,
  deletePrivateChannel,
} from '../../models/PrivateChannel.js';

const MAX_CHANNELS = 2;
const MAX_MEMBERS = 10;
const MAX_RENAMES_PER_DAY = 2;

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('private')
    .setDescription('Gestiona tu cuarto privado de voz')
    .addSubcommand(s => s.setName('create').setDescription('Crea tu cuarto privado de voz')
      .addStringOption(o => o.setName('nombre').setDescription('Nombre del cuarto').setRequired(false)))
    .addSubcommand(s => s.setName('invite').setDescription('Invita a alguien a tu cuarto')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario a invitar').setRequired(true)))
    .addSubcommand(s => s.setName('kick').setDescription('Expulsa a alguien de tu cuarto')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario a expulsar').setRequired(true)))
    .addSubcommand(s => s.setName('name').setDescription('Renombra tu cuarto (máx. 2 veces al día)')
      .addStringOption(o => o.setName('nombre').setDescription('Nuevo nombre').setRequired(true)))
    .addSubcommand(s => s.setName('limit').setDescription('Cambia el límite de usuarios del cuarto')
      .addIntegerOption(o => o.setName('cantidad').setDescription('0 = sin límite, máx. 99').setMinValue(0).setMaxValue(99).setRequired(true)))
    .addSubcommand(s => s.setName('close').setDescription('Elimina tu cuarto privado'))
    .addSubcommand(s => s.setName('list').setDescription('Lista tus cuartos privados')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const userId = interaction.user.id;

    // ── create ─────────────────────────────────────────────
    if (sub === 'create') {
      const count = await countPrivateChannelsByOwner(guild.id, userId);
      if (count >= MAX_CHANNELS) {
        return interaction.reply({ embeds: [errorEmbed(`Solo puedes tener ${MAX_CHANNELS} cuartos privados a la vez.`)], flags: 64 });
      }

      const rawName = interaction.options.getString('nombre') ?? `${interaction.user.username}`;
      const safeName = rawName.slice(0, 50);

      let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === '🔒 CUARTOS PRIVADOS');
      if (!category) {
        category = await guild.channels.create({ name: '🔒 CUARTOS PRIVADOS', type: ChannelType.GuildCategory });
      }

      const channel = await guild.channels.create({
        name: `🔒 ${safeName}`,
        type: ChannelType.GuildVoice,
        parent: category.id,
        userLimit: MAX_MEMBERS,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
          {
            id: userId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak,
              PermissionFlagsBits.Stream,
              PermissionFlagsBits.MoveMembers,
              PermissionFlagsBits.ManageChannels,
            ],
          },
          { id: guild.members.me, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers] },
        ],
      });

      await createPrivateChannel({ guildId: guild.id, ownerId: userId, channelId: channel.id, name: safeName });

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🔒 Cuarto privado creado')
          .setDescription(`Tu cuarto de voz **${channel}** está listo.\n\n\`/private invite @usuario\` — invitar\n\`/private kick @usuario\` — expulsar\n\`/private close\` — eliminar`)
          .setFooter({ text: `Máx. ${MAX_MEMBERS} usuarios` })],
        flags: 64,
      });
    }

    // ── invite ─────────────────────────────────────────────
    if (sub === 'invite') {
      const channels = await getPrivateChannelsByOwner(guild.id, userId);
      if (!channels.length) return interaction.reply({ embeds: [errorEmbed('No tienes cuartos privados. Usa `/private create`.')], flags: 64 });

      const pc = channels[0];
      const target = interaction.options.getMember('usuario');
      if (!target) return interaction.reply({ embeds: [errorEmbed('Usuario no encontrado.')], flags: 64 });
      if (pc.members.includes(target.id)) return interaction.reply({ embeds: [errorEmbed('Ese usuario ya está invitado.')], flags: 64 });
      if (pc.members.length >= MAX_MEMBERS) return interaction.reply({ embeds: [errorEmbed(`Máximo de ${MAX_MEMBERS} usuarios alcanzado.`)], flags: 64 });

      const ch = guild.channels.cache.get(pc.channelId);
      if (ch) {
        await ch.permissionOverwrites.create(target, {
          ViewChannel: true,
          Connect: true,
          Speak: true,
          Stream: true,
        });
      }

      await updatePrivateChannel(pc.channelId, { members: [...pc.members, target.id], lastActive: new Date().toISOString() });

      return interaction.reply({ embeds: [successEmbed('Usuario invitado', `${target} puede entrar a tu cuarto ahora.`)], flags: 64 });
    }

    // ── kick ───────────────────────────────────────────────
    if (sub === 'kick') {
      const channels = await getPrivateChannelsByOwner(guild.id, userId);
      if (!channels.length) return interaction.reply({ embeds: [errorEmbed('No tienes cuartos privados.')], flags: 64 });

      const pc = channels[0];
      const target = interaction.options.getMember('usuario');
      if (!target) return interaction.reply({ embeds: [errorEmbed('Usuario no encontrado.')], flags: 64 });
      if (target.id === userId) return interaction.reply({ embeds: [errorEmbed('No puedes expulsarte a ti mismo.')], flags: 64 });

      const ch = guild.channels.cache.get(pc.channelId);
      if (ch) {
        await ch.permissionOverwrites.delete(target).catch(() => {});
        // Si el usuario está dentro del canal de voz, moverle fuera
        if (target.voice?.channelId === pc.channelId) {
          await target.voice.disconnect().catch(() => {});
        }
      }

      await updatePrivateChannel(pc.channelId, { members: pc.members.filter(id => id !== target.id) });
      return interaction.reply({ embeds: [successEmbed('Usuario expulsado', `${target} ya no puede entrar a tu cuarto.`)], flags: 64 });
    }

    // ── name ───────────────────────────────────────────────
    if (sub === 'name') {
      const channels = await getPrivateChannelsByOwner(guild.id, userId);
      if (!channels.length) return interaction.reply({ embeds: [errorEmbed('No tienes cuartos privados.')], flags: 64 });

      const pc = channels[0];
      const today = new Date().toISOString().slice(0, 10);

      if (pc.lastRename === today && pc.renameCount >= MAX_RENAMES_PER_DAY) {
        return interaction.reply({ embeds: [errorEmbed(`Solo puedes renombrar ${MAX_RENAMES_PER_DAY} veces al día.`)], flags: 64 });
      }

      const safeName = interaction.options.getString('nombre').slice(0, 50);
      const ch = guild.channels.cache.get(pc.channelId);
      if (ch) await ch.setName(`🔒 ${safeName}`);

      const newCount = pc.lastRename === today ? pc.renameCount + 1 : 1;
      await updatePrivateChannel(pc.channelId, { name: safeName, renameCount: newCount, lastRename: today });

      return interaction.reply({ embeds: [successEmbed('Renombrado', `Cuarto renombrado a **${safeName}**. (${newCount}/${MAX_RENAMES_PER_DAY} hoy)`)], flags: 64 });
    }

    // ── limit ──────────────────────────────────────────────
    if (sub === 'limit') {
      const channels = await getPrivateChannelsByOwner(guild.id, userId);
      if (!channels.length) return interaction.reply({ embeds: [errorEmbed('No tienes cuartos privados.')], flags: 64 });

      const pc = channels[0];
      const cantidad = interaction.options.getInteger('cantidad');
      const ch = guild.channels.cache.get(pc.channelId);
      if (ch) await ch.setUserLimit(cantidad);

      return interaction.reply({ embeds: [successEmbed('Límite actualizado', cantidad === 0 ? 'Sin límite de usuarios.' : `Límite: ${cantidad} usuarios.`)], flags: 64 });
    }

    // ── close ──────────────────────────────────────────────
    if (sub === 'close') {
      const channels = await getPrivateChannelsByOwner(guild.id, userId);
      if (!channels.length) return interaction.reply({ embeds: [errorEmbed('No tienes cuartos privados.')], flags: 64 });

      const pc = channels[0];
      const ch = guild.channels.cache.get(pc.channelId);
      await deletePrivateChannel(pc.channelId);
      await interaction.reply({ embeds: [successEmbed('Cuarto eliminado', 'Tu cuarto privado ha sido eliminado.')], flags: 64 });
      if (ch) await ch.delete().catch(() => {});
      return;
    }

    // ── list ───────────────────────────────────────────────
    if (sub === 'list') {
      const channels = await getPrivateChannelsByOwner(guild.id, userId);
      if (!channels.length) return interaction.reply({ embeds: [infoEmbed('Sin cuartos', 'No tienes cuartos privados.')], flags: 64 });

      const lines = channels.map(pc => {
        const ch = guild.channels.cache.get(pc.channelId);
        return `${ch ?? `🔒 ${pc.name}`} — ${pc.members.length} invitados`;
      });

      return interaction.reply({ embeds: [infoEmbed('Tus cuartos privados', lines.join('\n'))], flags: 64 });
    }
  },
};
