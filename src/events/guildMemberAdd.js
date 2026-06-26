import { EmbedBuilder, PermissionFlagsBits, AttachmentBuilder } from 'discord.js';
import { getGuild } from '../models/Guild.js';
import { getGuildWelcome } from '../models/GuildWelcome.js';
import { getAutoroles } from '../models/Autorole.js';
import { checkAntiRaid } from '../utils/automod.js';
import { sendMemberLog } from '../utils/modLogger.js';
import { applyVariables } from '../utils/welcomeVariables.js';
import { logger } from '../utils/logger.js';

export default {
  name: 'guildMemberAdd',
  async execute(member) {
    const { guild } = member;

    const [guildData, welcomeCfg, autoroles] = await Promise.all([
      getGuild(guild.id).catch(() => null),
      getGuildWelcome(guild.id).catch(() => null),
      getAutoroles(guild.id).catch(() => []),
    ]);

    // ── Anti-raid ──────────────────────────────────────────
    const isRaid = checkAntiRaid(guild, guildData);
    if (isRaid) {
      const textChannels = guild.channels.cache.filter(
        c => c.isTextBased() && c.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.SendMessages)
      );
      for (const [, ch] of textChannels) {
        await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }).catch(() => {});
      }
      const modLogId = guildData?.channels?.modLog;
      if (modLogId) {
        const logChannel = guild.channels.cache.get(modLogId);
        if (logChannel?.isTextBased()) {
          const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('🚨 POSIBLE RAID DETECTADO')
            .setDescription('Se activó el **lockdown automático**.\nUsa `/unlock` en cada canal para restaurar el acceso.')
            .addFields([
              { name: 'Último miembro', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
              { name: 'Cuenta creada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
            ])
            .setTimestamp();
          await logChannel.send({ content: '@here', embeds: [embed] }).catch(() => {});
        }
      }
      return;
    }

    // ── Mod log: entrada ───────────────────────────────────
    const modEmbed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('📥 Miembro entró')
      .setThumbnail(member.user.displayAvatarURL())
      .addFields([
        { name: 'Usuario', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
        { name: 'Cuenta creada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Miembros', value: String(guild.memberCount), inline: true },
      ])
      .setTimestamp();
    await sendMemberLog(guild, modEmbed);

    // ── Autoroles ──────────────────────────────────────────
    const isBot = member.user.bot;
    const applicable = autoroles.filter(ar => ar.forBots === isBot || (!isBot && !ar.forBots));

    for (const ar of applicable) {
      const role = guild.roles.cache.get(ar.roleId);
      if (!role?.editable) continue;

      if (ar.delaySecs > 0) {
        setTimeout(async () => {
          const freshMember = await guild.members.fetch(member.id).catch(() => null);
          if (freshMember) await freshMember.roles.add(role).catch(() => {});
        }, ar.delaySecs * 1000);
      } else {
        await member.roles.add(role).catch(() => {});
      }
    }

    // ── Bienvenida ─────────────────────────────────────────
    if (!welcomeCfg?.welcomeChannelId) return;
    const welcomeChannel = guild.channels.cache.get(welcomeCfg.welcomeChannelId);
    if (!welcomeChannel?.isTextBased()) return;

    const text = applyVariables(welcomeCfg.welcomeMessage, member);
    const files = [];

    if (welcomeCfg.welcomeImageEnabled !== false) {
      try {
        const { generateWelcomeCard } = await import('../utils/welcomeCard.js');
        const buf = await generateWelcomeCard(member, guild.memberCount, welcomeCfg.welcomeBgUrl);
        files.push(new AttachmentBuilder(buf, { name: 'welcome.png' }));
      } catch (e) {
        logger.warn('No se pudo generar la imagen de bienvenida:', e.message);
      }
    }

    await welcomeChannel.send({ content: text, files }).catch(() => {});

    // ── DM de bienvenida ───────────────────────────────────
    if (welcomeCfg.welcomeDm) {
      const dmText = applyVariables(welcomeCfg.welcomeDm, member);
      await member.send(dmText).catch(() => {});
    }
  },
};
