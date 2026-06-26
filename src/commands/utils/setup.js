import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embedBuilder.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configura el bot de forma rápida')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // ── Tickets ──────────────────────────────────────────
    .addSubcommand(s => s.setName('tickets')
      .setDescription('Configura el sistema de tickets completo')
      .addChannelOption(o => o.setName('panel').setDescription('Canal donde aparece el botón de abrir ticket').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addRoleOption(o => o.setName('staff').setDescription('Rol de staff que gestiona los tickets').setRequired(true))
      .addChannelOption(o => o.setName('logs').setDescription('Canal donde se guardan las transcripciones').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addChannelOption(o => o.setName('categoria').setDescription('Categoría de Discord donde se crean los tickets').addChannelTypes(ChannelType.GuildCategory).setRequired(false))
      .addRoleOption(o => o.setName('superior').setDescription('Rol que se menciona al escalar un ticket (ej: @Admin)').setRequired(false)))

    // ── Welcome ──────────────────────────────────────────
    .addSubcommand(s => s.setName('welcome')
      .setDescription('Configura bienvenidas, despedidas y verificación de una sola vez')
      .addChannelOption(o => o.setName('bienvenida').setDescription('Canal de bienvenidas').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addChannelOption(o => o.setName('verificacion').setDescription('Canal donde se pone el panel de verificación').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addRoleOption(o => o.setName('rol_verificado').setDescription('Rol que se asigna al verificarse').setRequired(true))
      .addChannelOption(o => o.setName('despedida').setDescription('Canal de despedidas (opcional)').addChannelTypes(ChannelType.GuildText).setRequired(false)))

    // ── Mod ──────────────────────────────────────────────
    .addSubcommand(s => s.setName('mod')
      .setDescription('Configura el canal de logs de moderación y los roles de staff')
      .addChannelOption(o => o.setName('log').setDescription('Canal de logs de moderación').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addRoleOption(o => o.setName('staff').setDescription('Rol de moderadores').setRequired(true))
      .addRoleOption(o => o.setName('admin').setDescription('Rol de administradores').setRequired(false)))

    // ── Logs ──────────────────────────────────────────────
    .addSubcommand(s => s.setName('logs')
      .setDescription('Configura todos los canales de logs del servidor')
      .addChannelOption(o => o.setName('moderacion').setDescription('Logs de sanciones (ban, kick, warn...)').addChannelTypes(ChannelType.GuildText).setRequired(false))
      .addChannelOption(o => o.setName('miembros').setDescription('Logs de entradas y salidas').addChannelTypes(ChannelType.GuildText).setRequired(false))
      .addChannelOption(o => o.setName('mensajes').setDescription('Logs de mensajes editados y borrados').addChannelTypes(ChannelType.GuildText).setRequired(false))
      .addChannelOption(o => o.setName('voz').setDescription('Logs de actividad en canales de voz').addChannelTypes(ChannelType.GuildText).setRequired(false)))

    // ── Autoroles ─────────────────────────────────────────
    .addSubcommand(s => s.setName('autoroles')
      .setDescription('Configura los roles que se asignan automáticamente al entrar')
      .addRoleOption(o => o.setName('rol1').setDescription('Rol para nuevos miembros').setRequired(true))
      .addRoleOption(o => o.setName('rol2').setDescription('Segundo rol (opcional)').setRequired(false))
      .addRoleOption(o => o.setName('rol3').setDescription('Tercer rol (opcional)').setRequired(false))
      .addRoleOption(o => o.setName('rol_bots').setDescription('Rol exclusivo para bots').setRequired(false))
      .addIntegerOption(o => o.setName('delay').setDescription('Segundos antes de asignar el rol (0 = inmediato)').setMinValue(0).setMaxValue(3600).setRequired(false)))

    // ── Goodbye ───────────────────────────────────────────
    .addSubcommand(s => s.setName('goodbye')
      .setDescription('Configura el mensaje de despedida')
      .addChannelOption(o => o.setName('canal').setDescription('Canal donde se mandan las despedidas').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption(o => o.setName('mensaje').setDescription('Mensaje de despedida. Variables: {username} {server} {membercount}').setRequired(false)))

    // ── Status ────────────────────────────────────────────
    .addSubcommand(s => s.setName('status')
      .setDescription('Muestra un resumen de toda la configuración actual del bot')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    // ════════════════════════════════════════════════════
    if (sub === 'tickets') {
      await interaction.deferReply({ flags: 64 });

      const panelCh = interaction.options.getChannel('panel');
      const staffRole = interaction.options.getRole('staff');
      const logCh = interaction.options.getChannel('logs');
      const catCh = interaction.options.getChannel('categoria');
      const superiorRole = interaction.options.getRole('superior');

      const { ensureTicketConfig, updateTicketConfig, getTicketConfig } = await import('../../models/GuildTicketConfig.js');

      await ensureTicketConfig(guild.id);
      await updateTicketConfig(guild.id, {
        panelChannelId: panelCh.id,
        staffRoleId: staffRole.id,
        logChannelId: logCh.id,
        ...(catCh ? { categoryId: catCh.id } : {}),
        ...(superiorRole ? { escalationRoleId: superiorRole.id } : {}),
      });

      const cfg = await getTicketConfig(guild.id);

      // Publicar el panel
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🎫 Sistema de Soporte')
        .setDescription('Selecciona la categoría de tu problema en el menú de abajo.\nUn miembro del staff te atenderá en breve.')
        .setFooter({ text: guild.name })
        .setTimestamp();

      const cats = cfg.categories ?? [];
      const { StringSelectMenuBuilder } = await import('discord.js');
      let components = [];

      if (cats.length <= 5) {
        const row = new ActionRowBuilder().addComponents(
          cats.map(c => new ButtonBuilder()
            .setCustomId(`ticket_cat_btn:${c.id}`)
            .setLabel(c.label)
            .setEmoji(c.emoji ?? '🎫')
            .setStyle(ButtonStyle.Primary))
        );
        components = [row];
      } else {
        const select = new StringSelectMenuBuilder()
          .setCustomId('ticket_cat:open')
          .setPlaceholder('Selecciona una categoría…')
          .addOptions(cats.map(c => ({ label: c.label, value: c.id, emoji: c.emoji ?? '🎫' })));
        components = [new ActionRowBuilder().addComponents(select)];
      }

      const msg = await panelCh.send({ embeds: [embed], components }).catch(() => null);
      if (msg) await updateTicketConfig(guild.id, { panelMessageId: msg.id });

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('✅ Sistema de tickets configurado')
          .addFields(
            { name: '📋 Panel', value: `${panelCh}`, inline: true },
            { name: '👮 Staff', value: `${staffRole}`, inline: true },
            { name: '📁 Logs', value: `${logCh}`, inline: true },
            { name: '📂 Categoría Discord', value: catCh ? catCh.name : 'Sin categoría', inline: true },
            { name: '⬆️ Rol superior', value: superiorRole ? `${superiorRole}` : 'No configurado (usará staff)', inline: true },
          )
          .setFooter({ text: 'Usa /ticket category add para personalizar las categorías' })],
      });
    }

    // ════════════════════════════════════════════════════
    if (sub === 'welcome') {
      await interaction.deferReply({ flags: 64 });

      const welcomeCh = interaction.options.getChannel('bienvenida');
      const verifyCh = interaction.options.getChannel('verificacion');
      const verifyRole = interaction.options.getRole('rol_verificado');
      const goodbyeCh = interaction.options.getChannel('despedida');

      const { ensureGuildWelcome, updateGuildWelcome } = await import('../../models/GuildWelcome.js');
      await ensureGuildWelcome(guild.id);
      await updateGuildWelcome(guild.id, {
        welcomeChannelId: welcomeCh.id,
        verifyChannelId: verifyCh.id,
        verifyRoleId: verifyRole.id,
        ...(goodbyeCh ? { goodbyeChannelId: goodbyeCh.id } : {}),
      });

      // Publicar panel de verificación
      const verifyEmbed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ Verificación de miembro')
        .setDescription('Para acceder al servidor pulsa el botón de abajo.\nAl verificarte aceptas las reglas de la comunidad.')
        .setFooter({ text: guild.name });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify').setLabel('Verificarme').setStyle(ButtonStyle.Success).setEmoji('✅')
      );

      const msg = await verifyCh.send({ embeds: [verifyEmbed], components: [row] }).catch(() => null);
      if (msg) await updateGuildWelcome(guild.id, { verifyPanelMsgId: msg.id });

      // Lockdown automático: ocultar todos los canales a @everyone
      const everyone = guild.roles.everyone;
      const allChannels = guild.channels.cache.filter(c =>
        (c.isTextBased() || c.isVoiceBased() || c.type === ChannelType.GuildCategory) && c.id !== verifyCh.id
      );

      let updated = 0;
      for (const [, ch] of allChannels) {
        await ch.permissionOverwrites.edit(everyone, { ViewChannel: false }).catch(() => {});
        await ch.permissionOverwrites.edit(verifyRole, { ViewChannel: true }).catch(() => {});
        updated++;
      }

      // Canal de verificación: @everyone puede ver pero no escribir
      await verifyCh.permissionOverwrites.edit(everyone, { ViewChannel: true, SendMessages: false, ReadMessageHistory: true }).catch(() => {});
      await verifyCh.permissionOverwrites.edit(verifyRole, { ViewChannel: false }).catch(() => {});

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('✅ Sistema de bienvenidas configurado')
          .addFields(
            { name: '👋 Bienvenidas', value: `${welcomeCh}`, inline: true },
            { name: '✅ Verificación', value: `${verifyCh}`, inline: true },
            { name: '🎭 Rol verificado', value: `${verifyRole}`, inline: true },
            { name: '👋 Despedidas', value: goodbyeCh ? `${goodbyeCh}` : 'No configurado', inline: true },
            { name: '🔒 Lockdown', value: `${updated} canales configurados`, inline: true },
          )
          .setDescription('Los nuevos miembros solo verán el canal de verificación.\nAl pulsar "Verificarme" obtendrán el rol y accederán al resto.')
          .setFooter({ text: 'Usa /welcome message para personalizar el texto de bienvenida' })],
      });
    }

    // ════════════════════════════════════════════════════
    if (sub === 'mod') {
      const logCh = interaction.options.getChannel('log');
      const staffRole = interaction.options.getRole('staff');
      const adminRole = interaction.options.getRole('admin');

      const { ensureGuild, updateGuild, getGuild } = await import('../../models/Guild.js');
      await ensureGuild(guild.id);
      const guildData = await getGuild(guild.id);

      await updateGuild(guild.id, {
        channels: { ...guildData.channels, modLog: logCh.id },
        modRoles: staffRole ? [staffRole.id] : guildData.modRoles,
        adminRoles: adminRole ? [adminRole.id] : guildData.adminRoles,
      });

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('✅ Moderación configurada')
          .addFields(
            { name: '📋 Log de moderación', value: `${logCh}`, inline: true },
            { name: '👮 Staff', value: `${staffRole}`, inline: true },
            { name: '🛡️ Admin', value: adminRole ? `${adminRole}` : 'No configurado', inline: true },
          )],
        flags: 64,
      });
    }

    // ════════════════════════════════════════════════════
    if (sub === 'logs') {
      const modCh = interaction.options.getChannel('moderacion');
      const memberCh = interaction.options.getChannel('miembros');
      const msgCh = interaction.options.getChannel('mensajes');
      const voiceCh = interaction.options.getChannel('voz');

      if (!modCh && !memberCh && !msgCh && !voiceCh) {
        return interaction.reply({ embeds: [errorEmbed('Especifica al menos un canal de logs.')], flags: 64 });
      }

      const { ensureGuildLogs, getGuildLogs, updateGuildLogs } = await import('../../models/GuildLogs.js');
      await ensureGuildLogs(guild.id);
      const logsData = await getGuildLogs(guild.id);

      const channels = { ...logsData.channels };
      const enabled = { ...logsData.enabled };

      if (modCh)    { channels.modLog = modCh.id;    enabled.modLog = true; }
      if (memberCh) { channels.memberLog = memberCh.id; enabled.memberLog = true; }
      if (msgCh)    { channels.messageLog = msgCh.id; enabled.messageLog = true; }
      if (voiceCh)  { channels.voiceLog = voiceCh.id; enabled.voiceLog = true; }

      await updateGuildLogs(guild.id, { channels, enabled });

      const fields = [
        modCh    ? { name: '⚖️ Moderación', value: `${modCh}`, inline: true }    : null,
        memberCh ? { name: '👥 Miembros',   value: `${memberCh}`, inline: true } : null,
        msgCh    ? { name: '💬 Mensajes',   value: `${msgCh}`, inline: true }    : null,
        voiceCh  ? { name: '🎙️ Voz',       value: `${voiceCh}`, inline: true }   : null,
      ].filter(Boolean);

      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('✅ Logs configurados').addFields(fields)],
        flags: 64,
      });
    }

    // ════════════════════════════════════════════════════
    if (sub === 'autoroles') {
      const roles = [
        interaction.options.getRole('rol1'),
        interaction.options.getRole('rol2'),
        interaction.options.getRole('rol3'),
      ].filter(Boolean);
      const rolBot = interaction.options.getRole('rol_bots');
      const delay = interaction.options.getInteger('delay') ?? 0;

      const { addAutorole, getAutoroles } = await import('../../models/Autorole.js');

      const added = [];
      const skipped = [];

      for (const role of roles) {
        if (!role.editable) { skipped.push(`${role} (sin permisos)`); continue; }
        const result = await addAutorole(guild.id, role.id, false, delay);
        if (result) added.push(role.toString());
        else skipped.push(`${role} (ya existía)`);
      }

      if (rolBot) {
        if (rolBot.editable) {
          const result = await addAutorole(guild.id, rolBot.id, true, 0);
          if (result) added.push(`${rolBot} 🤖`);
          else skipped.push(`${rolBot} (ya existía)`);
        } else {
          skipped.push(`${rolBot} (sin permisos)`);
        }
      }

      const autoroles = await getAutoroles(guild.id);
      const allLines = autoroles.map(ar =>
        `<@&${ar.roleId}> ${ar.forBots ? '🤖 Bots' : '👤 Miembros'}${ar.delaySecs ? ` — ${ar.delaySecs}s` : ''}`
      ).join('\n') || 'Ninguno';

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('✅ Autoroles configurados')
          .addFields(
            { name: '✅ Añadidos', value: added.join('\n') || 'Ninguno', inline: true },
            { name: '⚠️ Omitidos', value: skipped.join('\n') || 'Ninguno', inline: true },
            { name: '📋 Autoroles activos', value: allLines, inline: false },
          )
          .setFooter({ text: 'Usa /autorole add para añadir más | /autorole remove para quitar' })],
        flags: 64,
      });
    }

    // ════════════════════════════════════════════════════
    if (sub === 'goodbye') {
      const canal = interaction.options.getChannel('canal');
      const mensaje = interaction.options.getString('mensaje');

      const { ensureGuildWelcome, updateGuildWelcome } = await import('../../models/GuildWelcome.js');
      await ensureGuildWelcome(guild.id);
      await updateGuildWelcome(guild.id, {
        goodbyeChannelId: canal.id,
        ...(mensaje ? { goodbyeMessage: mensaje } : {}),
      });

      const msgDefault = '👋 {username} ha abandonado el servidor. Ahora somos {membercount} miembros.';
      const preview = mensaje ?? msgDefault;

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('✅ Despedidas configuradas')
          .addFields(
            { name: '📢 Canal', value: `${canal}`, inline: true },
            { name: '💬 Mensaje', value: preview, inline: false },
          )
          .setFooter({ text: 'Variables: {username} {user} {server} {membercount} {date}' })],
        flags: 64,
      });
    }

    // ════════════════════════════════════════════════════
    if (sub === 'status') {
      await interaction.deferReply({ flags: 64 });

      const { getGuild } = await import('../../models/Guild.js');
      const { getGuildLogs } = await import('../../models/GuildLogs.js');
      const { getTicketConfig } = await import('../../models/GuildTicketConfig.js');
      const { getGuildWelcome } = await import('../../models/GuildWelcome.js');
      const { getAutoroles } = await import('../../models/Autorole.js');

      const [gData, logsData, ticketCfg, welcomeCfg, autoroles] = await Promise.all([
        getGuild(guild.id),
        getGuildLogs(guild.id),
        getTicketConfig(guild.id),
        getGuildWelcome(guild.id),
        getAutoroles(guild.id),
      ]);

      const ch = id => id ? `<#${id}>` : '❌';
      const rl = id => id ? `<@&${id}>` : '❌';
      const ok = v => v ? '✅' : '❌';

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`⚙️ Configuración de ${guild.name}`)
        .addFields(
          {
            name: '⚖️ Moderación',
            value: [
              `Log: ${ch(gData?.channels?.modLog)}`,
              `Staff: ${gData?.modRoles?.length ? gData.modRoles.map(r => `<@&${r}>`).join(', ') : '❌'}`,
            ].join('\n'),
            inline: false,
          },
          {
            name: '📋 Logs',
            value: [
              `Mod: ${ch(logsData?.channels?.modLog)}`,
              `Miembros: ${ch(logsData?.channels?.memberLog)}`,
              `Mensajes: ${ch(logsData?.channels?.messageLog)}`,
            ].join('\n'),
            inline: true,
          },
          {
            name: '🎫 Tickets',
            value: [
              `Panel: ${ch(ticketCfg?.panelChannelId)}`,
              `Staff: ${rl(ticketCfg?.staffRoleId)}`,
              `Logs: ${ch(ticketCfg?.logChannelId)}`,
              `Categorías: ${ticketCfg?.categories?.length ?? 0}`,
            ].join('\n'),
            inline: true,
          },
          {
            name: '👋 Bienvenidas',
            value: [
              `Canal: ${ch(welcomeCfg?.welcomeChannelId)}`,
              `Imagen: ${ok(welcomeCfg?.welcomeImageEnabled)}`,
              `DM: ${ok(welcomeCfg?.welcomeDm)}`,
              `Despedida: ${ch(welcomeCfg?.goodbyeChannelId)}`,
            ].join('\n'),
            inline: true,
          },
          {
            name: '✅ Verificación',
            value: [
              `Canal: ${ch(welcomeCfg?.verifyChannelId)}`,
              `Rol: ${rl(welcomeCfg?.verifyRoleId)}`,
            ].join('\n'),
            inline: true,
          },
          {
            name: '🎭 Autoroles',
            value: autoroles.length
              ? autoroles.map(ar => `<@&${ar.roleId}> ${ar.forBots ? '🤖' : '👤'}${ar.delaySecs ? ` (${ar.delaySecs}s)` : ''}`).join('\n')
              : '❌ Sin autoroles',
            inline: true,
          },
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
