import axios from 'axios';
import Parser from 'rss-parser';
import { EmbedBuilder } from 'discord.js';
import { getActiveIntegrationsByType, markChecked } from '../models/GuildIntegrations.js';
import { getConfig } from '../models/BotConfig.js';
import { logger } from './logger.js';

const rss = new Parser({ timeout: 10000 });
let discordClient;
let twitchToken = null;
let twitchTokenExpiry = 0;

export function initPoller(client) {
  discordClient = client;
}

async function sendAlert(intg, embed) {
  const guild   = discordClient?.guilds.cache.get(intg.guildId);
  const channel = guild?.channels.cache.get(intg.alertChannelId);
  if (!channel) return;
  const ping = intg.pingRoleId ? `<@&${intg.pingRoleId}>` : null;
  await channel.send({ content: ping ?? undefined, embeds: [embed] }).catch(() => {});
}

// ── Twitch ────────────────────────────────────────────────────────────────────

async function getTwitchToken() {
  if (twitchToken && Date.now() < twitchTokenExpiry) return twitchToken;
  const [clientId, clientSecret] = await Promise.all([
    getConfig('twitch_client_id'),
    getConfig('twitch_client_secret'),
  ]);
  if (!clientId || !clientSecret) return null;
  const { data } = await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: { client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' },
    timeout: 10000,
  });
  twitchToken = data.access_token;
  twitchTokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
  return twitchToken;
}

export async function pollTwitch() {
  const integrations = await getActiveIntegrationsByType('twitch');
  if (!integrations.length) return;

  const clientId = await getConfig('twitch_client_id').catch(() => null);
  if (!clientId) return;
  const token = await getTwitchToken().catch(() => null);
  if (!token) return;

  try {
    const params = new URLSearchParams();
    integrations.forEach(i => params.append('user_login', i.target.toLowerCase()));

    const { data } = await axios.get(`https://api.twitch.tv/helix/streams?${params}`, {
      headers: { Authorization: `Bearer ${token}`, 'Client-Id': clientId },
      timeout: 10000,
    });
    const liveMap = new Map(data.data.map(s => [s.user_login.toLowerCase(), s]));

    for (const intg of integrations) {
      const stream = liveMap.get(intg.target.toLowerCase());
      const wasLive = intg.lastContentId === 'live';

      if (stream && !wasLive) {
        const embed = new EmbedBuilder()
          .setColor(0x9146ff)
          .setTitle(`🔴 ${stream.user_name} está en directo`)
          .setURL(`https://twitch.tv/${stream.user_login}`)
          .setDescription(stream.title)
          .addFields(
            { name: '🎮 Jugando', value: stream.game_name || 'N/A', inline: true },
            { name: '👥 Viewers', value: stream.viewer_count.toLocaleString(), inline: true },
          )
          .setThumbnail(stream.thumbnail_url.replace('{width}', '320').replace('{height}', '180'))
          .setTimestamp();
        await sendAlert(intg, embed);
        await markChecked(intg.id, 'live');
      } else if (!stream && wasLive) {
        await markChecked(intg.id, null);
      }
    }
  } catch (err) {
    logger.error('[Poller/Twitch]', err.message);
  }
}

// ── YouTube RSS ───────────────────────────────────────────────────────────────

export async function pollYouTube() {
  const integrations = await getActiveIntegrationsByType('youtube');
  await Promise.allSettled(integrations.map(async intg => {
    try {
      const feed = await rss.parseURL(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${intg.target}`,
      );
      const latest = feed.items?.[0];
      if (!latest?.id || latest.id === intg.lastContentId) return;

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(latest.title ?? 'Nuevo vídeo')
        .setURL(latest.link)
        .setDescription(`📺 **${feed.title ?? intg.name}** ha publicado un nuevo vídeo.`)
        .setTimestamp(latest.pubDate ? new Date(latest.pubDate) : undefined);

      await sendAlert(intg, embed);
      await markChecked(intg.id, latest.id);
    } catch (err) {
      logger.error(`[Poller/YouTube] ${intg.target}:`, err.message);
    }
  }));
}

// ── RSS genérico ──────────────────────────────────────────────────────────────

export async function pollRSS() {
  const integrations = await getActiveIntegrationsByType('rss');
  await Promise.allSettled(integrations.map(async intg => {
    try {
      const feed   = await rss.parseURL(intg.target);
      const latest = feed.items?.[0];
      if (!latest) return;
      const id = latest.guid || latest.id || latest.link;
      if (!id || id === intg.lastContentId) return;

      const embed = new EmbedBuilder()
        .setColor(0xff6600)
        .setTitle(latest.title ?? 'Nueva entrada')
        .setURL(latest.link)
        .setDescription(
          `📰 **${feed.title ?? intg.name}**\n${latest.contentSnippet?.slice(0, 250) ?? ''}`,
        )
        .setTimestamp(latest.pubDate ? new Date(latest.pubDate) : undefined);

      await sendAlert(intg, embed);
      await markChecked(intg.id, id);
    } catch (err) {
      logger.error(`[Poller/RSS] ${intg.target}:`, err.message);
    }
  }));
}

// ── Reddit ────────────────────────────────────────────────────────────────────

export async function pollReddit() {
  const integrations = await getActiveIntegrationsByType('reddit');
  await Promise.allSettled(integrations.map(async intg => {
    try {
      const { data: { data: { children } } } = await axios.get(
        `https://www.reddit.com/r/${intg.target}/new.json?limit=1`,
        { headers: { 'User-Agent': 'JarvisFavBot/1.0' }, timeout: 10000 },
      );
      const post = children?.[0]?.data;
      if (!post || post.id === intg.lastContentId) return;

      const embed = new EmbedBuilder()
        .setColor(0xff4500)
        .setTitle(post.title.slice(0, 256))
        .setURL(`https://reddit.com${post.permalink}`)
        .setDescription(`📮 r/**${post.subreddit}** · u/${post.author}`)
        .setTimestamp(new Date(post.created_utc * 1000));

      await sendAlert(intg, embed);
      await markChecked(intg.id, post.id);
    } catch (err) {
      logger.error(`[Poller/Reddit] ${intg.target}:`, err.message);
    }
  }));
}

// ── GitHub ────────────────────────────────────────────────────────────────────

export async function pollGitHub() {
  const integrations = await getActiveIntegrationsByType('github');
  const githubToken  = await getConfig('github_token').catch(() => null);
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'JarvisFavBot/1.0',
    ...(githubToken ? { Authorization: `token ${githubToken}` } : {}),
  };

  await Promise.allSettled(integrations.map(async intg => {
    try {
      const { data: release } = await axios.get(
        `https://api.github.com/repos/${intg.target}/releases/latest`,
        { headers, timeout: 10000 },
      );
      if (!release?.id || String(release.id) === intg.lastContentId) return;

      const embed = new EmbedBuilder()
        .setColor(0x24292e)
        .setTitle(`🚀 ${intg.target} — ${release.name || release.tag_name}`)
        .setURL(release.html_url)
        .setDescription(release.body?.slice(0, 300) || 'Sin notas de la versión.')
        .addFields({ name: 'Versión', value: release.tag_name, inline: true })
        .setTimestamp(new Date(release.published_at));

      await sendAlert(intg, embed);
      await markChecked(intg.id, String(release.id));
    } catch (err) {
      if (err.response?.status !== 404) {
        logger.error(`[Poller/GitHub] ${intg.target}:`, err.message);
      }
    }
  }));
}
