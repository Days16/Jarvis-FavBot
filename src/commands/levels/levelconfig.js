import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embedBuilder.js';
import { ensureLevelConfig, getLevelConfig, updateLevelConfig } from '../../models/GuildLevelConfig.js';
import { ensureLevel, getLevel, updateLevel, resetLevel } from '../../models/GuildLevel.js';
import { getGuild } from '../../models/Guild.js';
import { calcLevel, totalXpForLevel } from '../../utils/levelManager.js';

// Quita todos los roles de recompensa cuyo nivel sea mayor al nivel actual
async function stripRewardRoles(guild, userId, currentLevel) {
  const cfg = await getLevelConfig(guild.id);
  const toRemove = (cfg?.roleRewards ?? []).filter(r => r.level > currentLevel);
  if (!toRemove.length) return;
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;
  for (const reward of toRemove) {
    if (member.roles.cache.has(reward.role_id)) {
      await member.roles.remove(reward.role_id).catch(() => {});
    }
  }
}

// Comprueba si el miembro puede gestionar el sistema de niveles:
// - Administrator / ManageGuild en Discord, O
// - Tiene alguno de los roles de mod/admin configurados en el bot
async function isLevelStaff(member, guildId) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  const guildData = await getGuild(guildId);
  if (guildData?.modRoles?.some(r => member.roles.cache.has(r))) return true;
  if (guildData?.adminRoles?.some(r => member.roles.cache.has(r))) return true;
  return false;
}

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('levelconfig')
    .setDescription('Configura el sistema de niveles (solo staff)')

    .addSubcommand(s => s.setName('toggle')
      .setDescription('Activa o desactiva el sistema de niveles'))

    .addSubcommand(s => s.setName('canal')
      .setDescription('Canal donde se anuncian los level-ups (vacío = mismo canal del mensaje)')
      .addChannelOption(o => o.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText)))

    .addSubcommand(s => s.setName('xp')
      .setDescription('Configura el XP por mensaje y el cooldown')
      .addIntegerOption(o => o.setName('min').setDescription('XP mínimo por mensaje').setMinValue(1).setMaxValue(100))
      .addIntegerOption(o => o.setName('max').setDescription('XP máximo por mensaje').setMinValue(1).setMaxValue(100))
      .addIntegerOption(o => o.setName('cooldown').setDescription('Segundos entre mensajes con XP').setMinValue(0).setMaxValue(3600)))

    .addSubcommand(s => s.setName('multiplicador')
      .setDescription('Multiplicador global de XP')
      .addNumberOption(o => o.setName('valor').setDescription('Multiplicador (0.1–10)').setMinValue(0.1).setMaxValue(10).setRequired(true)))

    .addSubcommand(s => s.setName('recompensa')
      .setDescription('Asigna un rol al llegar a cierto nivel')
      .addIntegerOption(o => o.setName('nivel').setDescription('Nivel requerido').setMinValue(1).setRequired(true))
      .addRoleOption(o => o.setName('rol').setDescription('Rol a asignar').setRequired(true)))

    .addSubcommand(s => s.setName('recompensa_quitar')
      .setDescription('Muestra un menú para eliminar una recompensa de rol configurada'))

    .addSubcommand(s => s.setName('dar_xp')
      .setDescription('Da XP a un miembro')
      .addUserOption(o => o.setName('usuario').setDescription('Miembro').setRequired(true))
      .addIntegerOption(o => o.setName('cantidad').setDescription('XP a dar').setMinValue(1).setRequired(true)))

    .addSubcommand(s => s.setName('quitar_xp')
      .setDescription('Quita XP a un miembro')
      .addUserOption(o => o.setName('usuario').setDescription('Miembro').setRequired(true))
      .addIntegerOption(o => o.setName('cantidad').setDescription('XP a quitar').setMinValue(1).setRequired(true)))

    .addSubcommand(s => s.setName('set_nivel')
      .setDescription('Establece el nivel exacto de un miembro')
      .addUserOption(o => o.setName('usuario').setDescription('Miembro').setRequired(true))
      .addIntegerOption(o => o.setName('nivel').setDescription('Nivel nuevo').setMinValue(0).setRequired(true)))

    .addSubcommand(s => s.setName('resetear')
      .setDescription('Resetea nivel y XP de un miembro a 0')
      .addUserOption(o => o.setName('usuario').setDescription('Miembro').setRequired(true)))

    .addSubcommand(s => s.setName('status')
      .setDescription('Muestra la configuración actual de niveles')),

  async execute(interaction) {
    if (!await isLevelStaff(interaction.member, interaction.guild.id)) {
      return interaction.reply({ embeds: [errorEmbed('Solo el staff puede usar este comando.')], flags: 64 });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'toggle') {
      const cfg = await ensureLevelConfig(interaction.guild.id);
      const nuevo = !cfg.enabled;
      await updateLevelConfig(interaction.guild.id, { enabled: nuevo });
      return interaction.reply({ embeds: [successEmbed(`Niveles ${nuevo ? 'activados' : 'desactivados'}`, `El sistema está ahora **${nuevo ? 'activo ✅' : 'inactivo ❌'}**.`)], flags: 64 });
    }

    if (sub === 'canal') {
      const canal = interaction.options.getChannel('canal');
      await ensureLevelConfig(interaction.guild.id);
      await updateLevelConfig(interaction.guild.id, { channelId: canal?.id ?? null });
      return interaction.reply({ embeds: [successEmbed('Canal de level-ups', canal ? `Los anuncios irán a ${canal}.` : 'Se anunciarán en el mismo canal del mensaje.')], flags: 64 });
    }

    if (sub === 'xp') {
      const min = interaction.options.getInteger('min');
      const max = interaction.options.getInteger('max');
      const cooldown = interaction.options.getInteger('cooldown');
      if (min === null && max === null && cooldown === null) {
        return interaction.reply({ embeds: [errorEmbed('Especifica al menos un parámetro.')], flags: 64 });
      }
      await ensureLevelConfig(interaction.guild.id);
      const updates = {};
      if (min !== null) updates.xpMin = min;
      if (max !== null) updates.xpMax = max;
      if (cooldown !== null) updates.xpCooldown = cooldown;
      await updateLevelConfig(interaction.guild.id, updates);
      return interaction.reply({ embeds: [successEmbed('XP configurado', `Rango: **${min ?? '—'}–${max ?? '—'}** | Cooldown: **${cooldown ?? '—'}s**`)], flags: 64 });
    }

    if (sub === 'multiplicador') {
      const valor = interaction.options.getNumber('valor');
      await ensureLevelConfig(interaction.guild.id);
      await updateLevelConfig(interaction.guild.id, { multiplier: valor });
      return interaction.reply({ embeds: [successEmbed('Multiplicador de XP', `Todo el XP se multiplica por **×${valor}**.`)], flags: 64 });
    }

    if (sub === 'recompensa') {
      const nivel = interaction.options.getInteger('nivel');
      const rol = interaction.options.getRole('rol');
      const cfg = await ensureLevelConfig(interaction.guild.id);
      const rewards = (cfg.roleRewards ?? []).filter(r => r.level !== nivel);
      rewards.push({ level: nivel, role_id: rol.id });
      rewards.sort((a, b) => a.level - b.level);
      await updateLevelConfig(interaction.guild.id, { roleRewards: rewards });
      return interaction.reply({ embeds: [successEmbed('Recompensa añadida', `Al llegar al **nivel ${nivel}** → ${rol}`)], flags: 64 });
    }

    if (sub === 'recompensa_quitar') {
      const cfg = await ensureLevelConfig(interaction.guild.id);
      const rewards = cfg.roleRewards ?? [];
      if (!rewards.length) {
        return interaction.reply({ embeds: [errorEmbed('No hay recompensas de rol configuradas.')], flags: 64 });
      }

      const select = new StringSelectMenuBuilder()
        .setCustomId('levelreward:remove')
        .setPlaceholder('Selecciona la recompensa a eliminar…')
        .addOptions(rewards.map(r => ({
          label: `Nivel ${r.level}`,
          description: `Rol: ${interaction.guild.roles.cache.get(r.role_id)?.name ?? r.role_id}`,
          value: String(r.level),
        })));

      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('Selecciona la recompensa de rol que quieres eliminar:')],
        components: [new ActionRowBuilder().addComponents(select)],
        flags: 64,
      });
    }

    // ── dar_xp ──────────────────────────────────────────────
    if (sub === 'dar_xp') {
      const target = interaction.options.getUser('usuario');
      const cantidad = interaction.options.getInteger('cantidad');

      const entry = await ensureLevel(interaction.guild.id, target.id);
      const newXp = entry.xp + cantidad;
      const { level } = calcLevel(newXp);

      await updateLevel(interaction.guild.id, target.id, { xp: newXp, level });

      const antes = calcLevel(entry.xp);
      const subiNivel = level > antes.level ? `\n🎉 ¡Subió al **nivel ${level}**!` : '';

      return interaction.reply({
        embeds: [successEmbed('XP añadido', `+**${cantidad.toLocaleString()} XP** a ${target}\nXP total: **${newXp.toLocaleString()}** | Nivel: **${level}**${subiNivel}`)],
        flags: 64,
      });
    }

    // ── quitar_xp ───────────────────────────────────────────
    if (sub === 'quitar_xp') {
      const target = interaction.options.getUser('usuario');
      const cantidad = interaction.options.getInteger('cantidad');

      const entry = await ensureLevel(interaction.guild.id, target.id);
      const nivelAntes = calcLevel(entry.xp).level;
      const newXp = Math.max(0, entry.xp - cantidad);
      const { level } = calcLevel(newXp);

      await updateLevel(interaction.guild.id, target.id, { xp: newXp, level });

      let extra = '';
      if (level < nivelAntes) {
        extra = `\n⬇️ Bajó al **nivel ${level}**.`;
        await stripRewardRoles(interaction.guild, target.id, level);
      }

      return interaction.reply({
        embeds: [successEmbed('XP quitado', `-**${cantidad.toLocaleString()} XP** a ${target}\nXP total: **${newXp.toLocaleString()}** | Nivel: **${level}**${extra}`)],
        flags: 64,
      });
    }

    // ── set_nivel ───────────────────────────────────────────
    if (sub === 'set_nivel') {
      const target = interaction.options.getUser('usuario');
      const nivelNuevo = interaction.options.getInteger('nivel');

      const entry = await ensureLevel(interaction.guild.id, target.id);
      const nivelAntes = calcLevel(entry.xp).level;
      const newXp = totalXpForLevel(nivelNuevo);
      await updateLevel(interaction.guild.id, target.id, { xp: newXp, level: nivelNuevo });

      if (nivelNuevo < nivelAntes) {
        await stripRewardRoles(interaction.guild, target.id, nivelNuevo);
      }

      return interaction.reply({
        embeds: [successEmbed('Nivel establecido', `${target} ahora está en el **nivel ${nivelNuevo}** (${newXp.toLocaleString()} XP).`)],
        flags: 64,
      });
    }

    if (sub === 'resetear') {
      const target = interaction.options.getUser('usuario');
      const entry = await ensureLevel(interaction.guild.id, target.id);
      const nivelAntes = calcLevel(entry.xp).level;
      await resetLevel(interaction.guild.id, target.id);
      if (nivelAntes > 0) await stripRewardRoles(interaction.guild, target.id, 0);
      return interaction.reply({ embeds: [successEmbed('Nivel reseteado', `${target} vuelve a nivel 0 con 0 XP y se le quitaron los roles de recompensa.`)], flags: 64 });
    }

    if (sub === 'status') {
      const cfg = await ensureLevelConfig(interaction.guild.id);
      const rewards = (cfg.roleRewards ?? [])
        .map(r => `Nivel ${r.level} → <@&${r.role_id}>`)
        .join('\n') || 'Sin recompensas configuradas';

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('⭐ Configuración de niveles')
          .addFields(
            { name: '🔄 Estado', value: cfg.enabled ? '✅ Activo' : '❌ Inactivo', inline: true },
            { name: '📢 Canal', value: cfg.channelId ? `<#${cfg.channelId}>` : 'Mismo canal', inline: true },
            { name: '✨ XP/mensaje', value: `${cfg.xpMin}–${cfg.xpMax} (cada ${cfg.xpCooldown}s)`, inline: true },
            { name: '✖️ Multiplicador', value: `×${cfg.multiplier}`, inline: true },
            { name: '🎁 Recompensas de rol', value: rewards, inline: false },
          )
          .setTimestamp()],
        flags: 64,
      });
    }
  },
};
