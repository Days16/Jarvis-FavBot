-- ============================================================
--  Jarvis-FavBot — Schema de Supabase
--  Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- ── Tabla: guilds ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guilds (
  guild_id        TEXT PRIMARY KEY,
  prefix          TEXT        NOT NULL DEFAULT '!',
  language        TEXT        NOT NULL DEFAULT 'es',
  timezone        TEXT        NOT NULL DEFAULT 'Europe/Madrid',
  mod_roles       TEXT[]      NOT NULL DEFAULT '{}',
  admin_roles     TEXT[]      NOT NULL DEFAULT '{}',
  channels        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  modules         JSONB       NOT NULL DEFAULT '{"moderation":true}'::jsonb,
  automod         JSONB       NOT NULL DEFAULT '{
    "enabled": false,
    "antiflood":  { "enabled": false, "messages": 5, "seconds": 3, "timeoutMinutes": 5 },
    "antiCaps":   { "enabled": false, "percentage": 70, "minLength": 10 },
    "antiInvite": { "enabled": false, "whitelist": [] },
    "antiSpam":   { "enabled": false, "repeatCount": 3 },
    "antiRaid":   { "enabled": false, "joinCount": 10, "joinSeconds": 60 },
    "antiDehoist": false,
    "whitelist":  { "roles": [], "channels": [] }
  }'::jsonb,
  warn_thresholds JSONB       NOT NULL DEFAULT '{"timeout1h":3,"timeout24h":5,"ban":7}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabla: warns ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warns (
  warn_id      TEXT        PRIMARY KEY,
  user_id      TEXT        NOT NULL,
  guild_id     TEXT        NOT NULL,
  moderator_id TEXT        NOT NULL,
  reason       TEXT        NOT NULL,
  active       BOOLEAN     NOT NULL DEFAULT true,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warns_user_guild   ON warns(user_id, guild_id);
CREATE INDEX IF NOT EXISTS idx_warns_guild_active ON warns(guild_id, active);

-- ── Tabla: guild_logs ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS guild_logs (
  guild_id   TEXT        PRIMARY KEY,
  channels   JSONB       NOT NULL DEFAULT '{}'::jsonb,
  enabled    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabla: bot_config ──────────────────────────────────────
-- Credenciales globales del bot, gestionadas desde el dashboard.
-- El bot lee de aquí en runtime; no hay que tocar el .env para añadir integraciones.
CREATE TABLE IF NOT EXISTS bot_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO bot_config (key, value, description) VALUES
  ('twitch_client_id',     '', 'Twitch App — Client ID'),
  ('twitch_client_secret', '', 'Twitch App — Client Secret'),
  ('youtube_api_key',      '', 'YouTube Data API v3 — Key'),
  ('kick_client_id',       '', 'Kick — Client ID (API pública en desarrollo)'),
  ('tiktok_client_key',    '', 'TikTok for Developers — Client Key'),
  ('reddit_client_id',     '', 'Reddit App — Client ID'),
  ('reddit_client_secret', '', 'Reddit App — Client Secret'),
  ('github_token',         '', 'GitHub — Personal Access Token'),
  ('steam_api_key',        '', 'Steam — Web API Key'),
  ('openweather_api_key',  '', 'OpenWeatherMap — API Key'),
  ('tenor_api_key',        '', 'Tenor GIF — API Key')
ON CONFLICT (key) DO NOTHING;

-- ── Tabla: guild_integrations ──────────────────────────────
-- Una fila por integración activa en un servidor.
-- Gestionada desde el dashboard por los admins del servidor.
CREATE TABLE IF NOT EXISTS guild_integrations (
  id               BIGSERIAL   PRIMARY KEY,
  guild_id         TEXT        NOT NULL,
  type             TEXT        NOT NULL CHECK (type IN (
                     'twitch','youtube','kick','tiktok',
                     'github','rss','reddit','steam'
                   )),
  name             TEXT        NOT NULL,   -- Nombre descriptivo (ej: "Canal de xQc")
  target           TEXT        NOT NULL,   -- username, URL, "owner/repo", subreddit...
  alert_channel_id TEXT,                   -- Canal de Discord donde avisar
  ping_role_id     TEXT,                   -- Rol a mencionar en la alerta
  custom_message   TEXT,                   -- Mensaje personalizado (soporta variables)
  enabled          BOOLEAN     NOT NULL DEFAULT true,
  last_checked_at  TIMESTAMPTZ,
  last_content_id  TEXT,                   -- Último ID procesado (evita duplicados)
  metadata         JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- metadata por tipo:
--   twitch/kick : { "gameFilter": "", "minViewers": 0 }
--   youtube     : { "includeShorts": false, "includeLives": true }
--   tiktok      : { "contentType": "videos" }   ("videos" | "lives")
--   github      : { "events": ["push","pr","issues","releases","stars"] }
--   rss         : { "checkIntervalMinutes": 30 }
--   reddit      : { "sort": "hot", "includeNsfw": false }
--   steam       : { "minDiscount": 50 }          (% mínimo de descuento)

CREATE INDEX IF NOT EXISTS idx_integrations_guild      ON guild_integrations(guild_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type       ON guild_integrations(type);
CREATE INDEX IF NOT EXISTS idx_integrations_guild_type ON guild_integrations(guild_id, type);

-- ── Trigger: updated_at automático ─────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_guilds_updated_at') THEN
    CREATE TRIGGER trg_guilds_updated_at
      BEFORE UPDATE ON guilds FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_guild_logs_updated_at') THEN
    CREATE TRIGGER trg_guild_logs_updated_at
      BEFORE UPDATE ON guild_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bot_config_updated_at') THEN
    CREATE TRIGGER trg_bot_config_updated_at
      BEFORE UPDATE ON bot_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_guild_integrations_updated_at') THEN
    CREATE TRIGGER trg_guild_integrations_updated_at
      BEFORE UPDATE ON guild_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ── Row Level Security (RLS) ───────────────────────────────
ALTER TABLE guilds             ENABLE ROW LEVEL SECURITY;
ALTER TABLE warns              ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_config         ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_integrations ENABLE ROW LEVEL SECURITY;
