import { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embedBuilder.js';
import { askAI, clearHistory } from '../../utils/aiManager.js';
import { getGuild, ensureGuild, updateGuild } from '../../models/Guild.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('ia')
    .setDescription('Interacción con la IA integrada (OpenRouter)')

    .addSubcommand(s => s
      .setName('pregunta')
      .setDescription('Hace una pregunta one-shot a la IA')
      .addStringOption(o => o
        .setName('texto')
        .setDescription('Tu pregunta o solicitud')
        .setRequired(true)
        .setMaxLength(1000)))

    .addSubcommand(s => s
      .setName('canal')
      .setDescription('Activa el chat de IA en un canal (el bot responde a todos los mensajes)')
      .addChannelOption(o => o
        .setName('canal')
        .setDescription('Canal de chat con IA — omite para desactivar')
        .addChannelTypes(ChannelType.GuildText)))

    .addSubcommand(s => s
      .setName('reset')
      .setDescription('Limpia el historial de conversación del canal actual'))

    .addSubcommand(s => s
      .setName('estado')
      .setDescription('Muestra la configuración de IA del servidor')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ── pregunta ──────────────────────────────────────────────────
    if (sub === 'pregunta') {
      const texto = interaction.options.getString('texto');
      await interaction.deferReply();
      try {
        const respuesta = await askAI(texto);
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .addFields(
            { name: '❓ Pregunta', value: texto },
            { name: '🤖 Respuesta', value: respuesta.slice(0, 1024) },
          )
          .setFooter({ text: `Modelo: ${process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini'}` });
        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        return interaction.editReply({ embeds: [errorEmbed(`Error de IA: ${err.message}`)] });
      }
    }

    // ── canal ─────────────────────────────────────────────────────
    if (sub === 'canal') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ embeds: [errorEmbed('Necesitas el permiso **Gestionar Servidor**.')], flags: 64 });
      }
      const canal = interaction.options.getChannel('canal');
      const guildData = await ensureGuild(interaction.guild.id);
      await updateGuild(interaction.guild.id, {
        channels: { ...(guildData.channels ?? {}), ai: canal?.id ?? null },
      });
      return interaction.reply({
        embeds: [successEmbed(
          '🤖 Canal de IA',
          canal
            ? `El bot responderá con IA a todos los mensajes en ${canal}.\nUsa \`/ia reset\` para limpiar el historial cuando quieras.`
            : 'El canal de IA ha sido desactivado.',
        )],
        flags: 64,
      });
    }

    // ── reset ─────────────────────────────────────────────────────
    if (sub === 'reset') {
      clearHistory(interaction.channel.id);
      return interaction.reply({
        embeds: [successEmbed('🔄 Historial limpiado', 'La conversación de este canal ha sido reiniciada desde cero.')],
        flags: 64,
      });
    }

    // ── estado ────────────────────────────────────────────────────
    if (sub === 'estado') {
      const guildData = await getGuild(interaction.guild.id);
      const aiChannelId = guildData?.channels?.ai;
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🤖 Estado de la IA')
        .addFields(
          { name: 'Canal de chat', value: aiChannelId ? `<#${aiChannelId}>` : 'No configurado', inline: true },
          { name: 'Modelo', value: process.env.OPENROUTER_MODEL ?? '*(sin configurar)*', inline: true },
          { name: 'API Key', value: process.env.OPENROUTER_API_KEY ? '✅ Configurada' : '❌ No configurada', inline: true },
        );
      return interaction.reply({ embeds: [embed], flags: 64 });
    }
  },
};
