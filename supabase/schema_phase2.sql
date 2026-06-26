-- ============================================================
--  Jarvis-FavBot — Phase 2 Schema
--  Ejecutar en: Supabase Dashboard > SQL Editor
--  DESPUÉS de schema.sql
-- ============================================================

-- ── Tabla: guild_ticket_config ─────────────────────────────
CREATE TABLE IF NOT EXISTS guild_ticket_config (
  guild_id           TEXT        PRIMARY KEY,
  panel_channel_id   TEXT,
  panel_message_id   TEXT,
  log_channel_id     TEXT,
  staff_role_id      TEXT,
  escalation_role_id TEXT,
  category_id        TEXT,
  autoclose_hours    INT         NOT NULL DEFAULT 48,
  categories         JSONB       NOT NULL DEFAULT '[
    {"id":"soporte","label":"Soporte","emoji":"🔵","description":"Ayuda general"},
    {"id":"reporte","label":"Reporte","emoji":"🔴","description":"Reportar a un usuario"},
    {"id":"otro","label":"Otro","emoji":"⚪","description":"Cualquier otra consulta"}
  ]'::jsonb,
  ticket_count       INT         NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabla: tickets ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id           BIGSERIAL   PRIMARY KEY,
  ticket_num   INT         NOT NULL,
  guild_id     TEXT        NOT NULL,
  channel_id   TEXT        NOT NULL,
  creator_id   TEXT        NOT NULL,
  claimed_by   TEXT,
  category     TEXT        NOT NULL DEFAULT 'otro',
  reason       TEXT,
  status       TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  rating       INT         CHECK (rating BETWEEN 1 AND 5),
  opened_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_guild        ON tickets(guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_guild_status ON tickets(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_channel      ON tickets(channel_id);

-- ── Tabla: guild_welcome ───────────────────────────────────
CREATE TABLE IF NOT EXISTS guild_welcome (
  guild_id              TEXT        PRIMARY KEY,
  welcome_channel_id    TEXT,
  welcome_message       TEXT        NOT NULL DEFAULT '¡Bienvenido/a {user}! 🎉 Eres el miembro **{membercount}** de {server}.',
  welcome_image_enabled BOOLEAN     NOT NULL DEFAULT true,
  welcome_bg_url        TEXT,
  welcome_dm            TEXT,
  goodbye_channel_id    TEXT,
  goodbye_message       TEXT        NOT NULL DEFAULT '👋 {username} ha abandonado el servidor. Ahora somos {membercount} miembros.',
  verify_channel_id     TEXT,
  verify_role_id        TEXT,
  verify_message        TEXT        NOT NULL DEFAULT 'Para acceder al servidor pulsa el botón de abajo. Al verificarte aceptas las reglas de la comunidad.',
  verify_panel_msg_id   TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabla: guild_autoroles ─────────────────────────────────
CREATE TABLE IF NOT EXISTS guild_autoroles (
  id         BIGSERIAL   PRIMARY KEY,
  guild_id   TEXT        NOT NULL,
  role_id    TEXT        NOT NULL,
  for_bots   BOOLEAN     NOT NULL DEFAULT false,
  delay_secs INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(guild_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_autoroles_guild ON guild_autoroles(guild_id);

-- ── Tabla: private_channels ────────────────────────────────
CREATE TABLE IF NOT EXISTS private_channels (
  id           BIGSERIAL   PRIMARY KEY,
  guild_id     TEXT        NOT NULL,
  owner_id     TEXT        NOT NULL,
  channel_id   TEXT        NOT NULL UNIQUE,
  name         TEXT        NOT NULL,
  members      TEXT[]      NOT NULL DEFAULT '{}',
  rename_count INT         NOT NULL DEFAULT 0,
  last_rename  DATE,
  last_active  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_private_channels_guild       ON private_channels(guild_id);
CREATE INDEX IF NOT EXISTS idx_private_channels_owner_guild ON private_channels(owner_id, guild_id);

-- ── Tabla: groups ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS groups (
  id          BIGSERIAL   PRIMARY KEY,
  guild_id    TEXT        NOT NULL,
  owner_id    TEXT        NOT NULL,
  channel_id  TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  admins      TEXT[]      NOT NULL DEFAULT '{}',
  members     TEXT[]      NOT NULL DEFAULT '{}',
  pending     TEXT[]      NOT NULL DEFAULT '{}',
  visibility  TEXT        NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public','request')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_guild ON groups(guild_id);

-- ── Tabla: role_panels ─────────────────────────────────────
-- entries JSONB: [{role_id, label, emoji, description, style}]
-- style: PRIMARY=1, SECONDARY=2, SUCCESS=3, DANGER=4
CREATE TABLE IF NOT EXISTS role_panels (
  id           BIGSERIAL   PRIMARY KEY,
  guild_id     TEXT        NOT NULL,
  channel_id   TEXT        NOT NULL,
  message_id   TEXT,
  title        TEXT        NOT NULL DEFAULT '🎭 Elige tu rol',
  description  TEXT        NOT NULL DEFAULT 'Pulsa un botón para obtener o quitar un rol.',
  mode         TEXT        NOT NULL DEFAULT 'toggle' CHECK (mode IN ('normal','exclusive','toggle','add_only','remove_only')),
  panel_type   TEXT        NOT NULL DEFAULT 'buttons' CHECK (panel_type IN ('buttons','select')),
  require_role TEXT,
  entries      JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_role_panels_guild ON role_panels(guild_id);

-- ── Triggers updated_at ────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_guild_ticket_config_updated_at') THEN
    CREATE TRIGGER trg_guild_ticket_config_updated_at
      BEFORE UPDATE ON guild_ticket_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tickets_updated_at') THEN
    CREATE TRIGGER trg_tickets_updated_at
      BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_guild_welcome_updated_at') THEN
    CREATE TRIGGER trg_guild_welcome_updated_at
      BEFORE UPDATE ON guild_welcome FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_role_panels_updated_at') THEN
    CREATE TRIGGER trg_role_panels_updated_at
      BEFORE UPDATE ON role_panels FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ── Row Level Security ─────────────────────────────────────
ALTER TABLE guild_ticket_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_welcome       ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_autoroles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_channels    ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups              ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_panels         ENABLE ROW LEVEL SECURITY;
