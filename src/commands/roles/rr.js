import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embedBuilder.js';
import {
  getRolePanelsByGuild,
  getRolePanelById,
  createRolePanel,
  updateRolePanel,
  deleteRolePanel,
} from '../../models/RolePanel.js';

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('rr')
    .setDescription('Gestiona los paneles de reaction roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)

    .addSubcommand(s => s.setName('create').setDescription('Crea un nuevo panel de roles')
      .addChannelOption(o => o.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption(o => o.setName('titulo').setDescription('Título del panel').setRequired(false))
      .addStringOption(o => o.setName('descripcion').setDescription('Descripción del panel').setRequired(false))
      .addStringOption(o => o.setName('tipo').setDescription('buttons (por defecto) / select').addChoices(
        { name: 'Botones', value: 'buttons' },
        { name: 'Menú desplegable', value: 'select' },
      )))

    .addSubcommand(s => s.setName('add').setDescription('Añade un rol al panel')
      .addIntegerOption(o => o.setName('panel').setDescription('ID del panel').setRequired(true))
      .addRoleOption(o => o.setName('rol').setDescription('Rol a añadir').setRequired(true))
      .addStringOption(o => o.setName('label').setDescription('Etiqueta del botón').setRequired(false))
      .addStringOption(o => o.setName('emoji').setDescription('Emoji').setRequired(false))
      .addStringOption(o => o.setName('descripcion').setDescription('Descripción (solo select menu)').setRequired(false)))

    .addSubcommand(s => s.setName('remove').setDescription('Elimina un rol del panel')
      .addIntegerOption(o => o.setName('panel').setDescription('ID del panel').setRequired(true))
      .addRoleOption(o => o.setName('rol').setDescription('Rol a eliminar').setRequired(true)))

    .addSubcommand(s => s.setName('mode').setDescription('Cambia el modo del panel')
      .addIntegerOption(o => o.setName('panel').setDescription('ID del panel').setRequired(true))
      .addStringOption(o => o.setName('modo').setDescription('Modo').setRequired(true).addChoices(
        { name: 'Normal (múltiples roles)', value: 'normal' },
        { name: 'Exclusivo (solo 1 rol)', value: 'exclusive' },
        { name: 'Toggle (añadir y quitar)', value: 'toggle' },
        { name: 'Solo añadir', value: 'add_only' },
        { name: 'Solo quitar', value: 'remove_only' },
      )))

    .addSubcommand(s => s.setName('require').setDescription('Requiere un rol para usar el panel')
      .addIntegerOption(o => o.setName('panel').setDescription('ID del panel').setRequired(true))
      .addRoleOption(o => o.setName('rol').setDescription('Rol requerido (vacío para quitar)').setRequired(false)))

    .addSubcommand(s => s.setName('publish').setDescription('Publica/actualiza el panel en el canal')
      .addIntegerOption(o => o.setName('panel').setDescription('ID del panel').setRequired(true)))

    .addSubcommand(s => s.setName('delete').setDescription('Elimina el panel')
      .addIntegerOption(o => o.setName('panel').setDescription('ID del panel').setRequired(true)))

    .addSubcommand(s => s.setName('list').setDescription('Lista todos los paneles del servidor')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    // ── create ─────────────────────────────────────────────
    if (sub === 'create') {
      const channel = interaction.options.getChannel('canal');
      const title = interaction.options.getString('titulo') ?? '🎭 Elige tu rol';
      const description = interaction.options.getString('descripcion') ?? 'Pulsa un botón para obtener o quitar un rol.';
      const tipo = interaction.options.getString('tipo') ?? 'buttons';

      const panel = await createRolePanel({ guildId: guild.id, channelId: channel.id, title, description });
      await updateRolePanel(panel.id, { panelType: tipo });

      return interaction.reply({ embeds: [successEmbed('Panel creado', `Panel **#${panel.id}** en ${channel}.\nUsa \`/rr add ${panel.id} @rol\` para añadir roles y \`/rr publish ${panel.id}\` para publicarlo.`)] });
    }

    // ── add ────────────────────────────────────────────────
    if (sub === 'add') {
      const panelId = interaction.options.getInteger('panel');
      const role = interaction.options.getRole('rol');
      const label = interaction.options.getString('label') ?? role.name;
      const emoji = interaction.options.getString('emoji');
      const desc = interaction.options.getString('descripcion');

      const panel = await getRolePanelById(panelId);
      if (!panel || panel.guildId !== guild.id) return interaction.reply({ embeds: [errorEmbed('Panel no encontrado.')], flags: 64 });
      if (panel.entries.length >= 25) return interaction.reply({ embeds: [errorEmbed('Máximo 25 roles por panel.')], flags: 64 });
      if (panel.entries.find(e => e.role_id === role.id)) return interaction.reply({ embeds: [errorEmbed('Ese rol ya está en el panel.')], flags: 64 });

      const entry = { role_id: role.id, label, ...(emoji ? { emoji } : {}), ...(desc ? { description: desc } : {}), style: 2 };
      await updateRolePanel(panelId, { entries: [...panel.entries, entry] });

      return interaction.reply({ embeds: [successEmbed('Rol añadido', `${role} añadido al panel. Usa \`/rr publish ${panelId}\` para actualizar.`)] });
    }

    // ── remove ─────────────────────────────────────────────
    if (sub === 'remove') {
      const panelId = interaction.options.getInteger('panel');
      const role = interaction.options.getRole('rol');

      const panel = await getRolePanelById(panelId);
      if (!panel || panel.guildId !== guild.id) return interaction.reply({ embeds: [errorEmbed('Panel no encontrado.')], flags: 64 });

      const newEntries = panel.entries.filter(e => e.role_id !== role.id);
      if (newEntries.length === panel.entries.length) return interaction.reply({ embeds: [errorEmbed('Ese rol no está en el panel.')], flags: 64 });

      await updateRolePanel(panelId, { entries: newEntries });
      return interaction.reply({ embeds: [successEmbed('Rol eliminado', `${role} eliminado del panel.`)] });
    }

    // ── mode ───────────────────────────────────────────────
    if (sub === 'mode') {
      const panelId = interaction.options.getInteger('panel');
      const modo = interaction.options.getString('modo');

      const panel = await getRolePanelById(panelId);
      if (!panel || panel.guildId !== guild.id) return interaction.reply({ embeds: [errorEmbed('Panel no encontrado.')], flags: 64 });

      await updateRolePanel(panelId, { mode: modo });
      return interaction.reply({ embeds: [successEmbed('Modo actualizado', `Panel **#${panelId}** ahora en modo **${modo}**.`)] });
    }

    // ── require ────────────────────────────────────────────
    if (sub === 'require') {
      const panelId = interaction.options.getInteger('panel');
      const role = interaction.options.getRole('rol');

      const panel = await getRolePanelById(panelId);
      if (!panel || panel.guildId !== guild.id) return interaction.reply({ embeds: [errorEmbed('Panel no encontrado.')], flags: 64 });

      await updateRolePanel(panelId, { requireRole: role?.id ?? null });
      return interaction.reply({ embeds: [successEmbed('Requisito actualizado', role ? `Se requiere ${role} para usar el panel.` : 'Sin requisito de rol.')] });
    }

    // ── publish ────────────────────────────────────────────
    if (sub === 'publish') {
      const panelId = interaction.options.getInteger('panel');
      const panel = await getRolePanelById(panelId);
      if (!panel || panel.guildId !== guild.id) return interaction.reply({ embeds: [errorEmbed('Panel no encontrado.')], flags: 64 });
      if (!panel.entries.length) return interaction.reply({ embeds: [errorEmbed('El panel no tiene roles. Usa `/rr add`.')], flags: 64 });

      const channel = guild.channels.cache.get(panel.channelId);
      if (!channel) return interaction.reply({ embeds: [errorEmbed('El canal del panel no existe.')], flags: 64 });

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(panel.title)
        .setDescription(panel.description);

      const components = buildPanelComponents(panel);
      let msg;

      if (panel.messageId) {
        try {
          const existing = await channel.messages.fetch(panel.messageId);
          await existing.edit({ embeds: [embed], components });
          msg = existing;
        } catch {
          msg = await channel.send({ embeds: [embed], components });
        }
      } else {
        msg = await channel.send({ embeds: [embed], components });
      }

      await updateRolePanel(panelId, { messageId: msg.id });
      return interaction.reply({ embeds: [successEmbed('Panel publicado', `Panel actualizado en ${channel}.`)], flags: 64 });
    }

    // ── delete ─────────────────────────────────────────────
    if (sub === 'delete') {
      const panelId = interaction.options.getInteger('panel');
      const panel = await getRolePanelById(panelId);
      if (!panel || panel.guildId !== guild.id) return interaction.reply({ embeds: [errorEmbed('Panel no encontrado.')], flags: 64 });

      if (panel.messageId && panel.channelId) {
        const ch = guild.channels.cache.get(panel.channelId);
        if (ch) await ch.messages.delete(panel.messageId).catch(() => {});
      }

      await deleteRolePanel(panelId);
      return interaction.reply({ embeds: [successEmbed('Panel eliminado', `Panel **#${panelId}** eliminado.`)] });
    }

    // ── list ───────────────────────────────────────────────
    if (sub === 'list') {
      const panels = await getRolePanelsByGuild(guild.id);
      if (!panels.length) return interaction.reply({ embeds: [infoEmbed('Sin paneles', 'No hay paneles de roles. Usa `/rr create`.')], flags: 64 });

      const lines = panels.map(p => {
        const ch = guild.channels.cache.get(p.channelId);
        return `**#${p.id}** — ${ch ?? `<#${p.channelId}>`} — ${p.entries.length} roles — modo: ${p.mode}`;
      });

      return interaction.reply({ embeds: [infoEmbed(`Paneles de roles (${panels.length})`, lines.join('\n'))], flags: 64 });
    }
  },
};

function buildPanelComponents(panel) {
  const { entries, panelType, id: panelId, mode } = panel;

  if (panelType === 'select') {
    const options = entries.map(e =>
      new StringSelectMenuOptionBuilder()
        .setValue(e.role_id)
        .setLabel(e.label.slice(0, 100))
        .setDescription(e.description?.slice(0, 100) ?? '')
        .setEmoji(e.emoji ?? undefined)
    );

    const select = new StringSelectMenuBuilder()
      .setCustomId(`rps:${panelId}`)
      .setPlaceholder('Selecciona tu rol…')
      .setMinValues(0)
      .setMaxValues(mode === 'exclusive' ? 1 : Math.min(entries.length, 25))
      .addOptions(options);

    return [new ActionRowBuilder().addComponents(select)];
  }

  // buttons: máximo 5 por fila, máximo 5 filas
  const rows = [];
  for (let i = 0; i < Math.min(entries.length, 25); i += 5) {
    const chunk = entries.slice(i, i + 5);
    const row = new ActionRowBuilder().addComponents(
      chunk.map(e => {
        const btn = new ButtonBuilder()
          .setCustomId(`rp:${panelId}:${e.role_id}`)
          .setLabel(e.label.slice(0, 80))
          .setStyle(e.style ?? ButtonStyle.Secondary);
        if (e.emoji) btn.setEmoji(e.emoji);
        return btn;
      })
    );
    rows.push(row);
  }
  return rows;
}
