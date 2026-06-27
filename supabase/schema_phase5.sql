-- ════════════════════════════════════════════════════════
-- Fase 5: Integraciones (Twitch, YouTube, RSS, Reddit, GitHub, etc.)
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.guild_integrations (
  id               BIGSERIAL PRIMARY KEY,
  guild_id         TEXT        NOT NULL,
  type             TEXT        NOT NULL,  -- twitch, youtube, rss, reddit, github, kick, tiktok, steam
  name             TEXT        NOT NULL,
  target           TEXT        NOT NULL,  -- username, channel_id, url, subreddit, owner/repo
  alert_channel_id TEXT,
  ping_role_id     TEXT,
  custom_message   TEXT,
  enabled          BOOLEAN     NOT NULL DEFAULT TRUE,
  last_checked_at  TIMESTAMPTZ,
  last_content_id  TEXT,
  metadata         JSONB       NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS guild_integrations_guild_id_idx ON public.guild_integrations (guild_id);
CREATE INDEX IF NOT EXISTS guild_integrations_type_enabled_idx ON public.guild_integrations (type, enabled);
