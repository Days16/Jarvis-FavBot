-- ============================================================
--  Jarvis-FavBot — Phase 3 Schema
--  Ejecutar en: Supabase Dashboard > SQL Editor
--  DESPUÉS de schema.sql y schema_phase2.sql
-- ============================================================

-- ── Tabla: guild_levels ────────────────────────────────────
CREATE TABLE IF NOT EXISTS guild_levels (
  guild_id    TEXT        NOT NULL,
  user_id     TEXT        NOT NULL,
  xp          BIGINT      NOT NULL DEFAULT 0,
  level       INT         NOT NULL DEFAULT 0,
  last_xp_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (guild_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_guild_levels_lb ON guild_levels(guild_id, xp DESC);

-- ── Tabla: guild_level_config ──────────────────────────────
CREATE TABLE IF NOT EXISTS guild_level_config (
  guild_id        TEXT        PRIMARY KEY,
  enabled         BOOLEAN     NOT NULL DEFAULT true,
  channel_id      TEXT,
  xp_min          INT         NOT NULL DEFAULT 15,
  xp_max          INT         NOT NULL DEFAULT 25,
  xp_cooldown     INT         NOT NULL DEFAULT 60,
  multiplier      FLOAT       NOT NULL DEFAULT 1.0,
  no_xp_roles     TEXT[]      NOT NULL DEFAULT '{}',
  no_xp_channels  TEXT[]      NOT NULL DEFAULT '{}',
  role_rewards    JSONB       NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabla: guild_economy ───────────────────────────────────
CREATE TABLE IF NOT EXISTS guild_economy (
  guild_id    TEXT        NOT NULL,
  user_id     TEXT        NOT NULL,
  balance     BIGINT      NOT NULL DEFAULT 0,
  last_daily  TIMESTAMPTZ,
  last_work   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (guild_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_guild_economy_lb ON guild_economy(guild_id, balance DESC);

-- ── Tabla: guild_economy_config ────────────────────────────
CREATE TABLE IF NOT EXISTS guild_economy_config (
  guild_id       TEXT        PRIMARY KEY,
  enabled        BOOLEAN     NOT NULL DEFAULT true,
  currency_name  TEXT        NOT NULL DEFAULT 'monedas',
  currency_emoji TEXT        NOT NULL DEFAULT '🪙',
  daily_amount   INT         NOT NULL DEFAULT 200,
  work_min       INT         NOT NULL DEFAULT 50,
  work_max       INT         NOT NULL DEFAULT 200,
  work_cooldown  INT         NOT NULL DEFAULT 3600,
  shop_items     JSONB       NOT NULL DEFAULT '[]',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabla: giveaways ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS giveaways (
  id            BIGSERIAL   PRIMARY KEY,
  guild_id      TEXT        NOT NULL,
  channel_id    TEXT        NOT NULL,
  message_id    TEXT,
  host_id       TEXT        NOT NULL,
  prize         TEXT        NOT NULL,
  description   TEXT,
  winners_count INT         NOT NULL DEFAULT 1,
  participants  TEXT[]      NOT NULL DEFAULT '{}',
  winner_ids    TEXT[]      NOT NULL DEFAULT '{}',
  end_at        TIMESTAMPTZ NOT NULL,
  ended         BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_giveaways_guild  ON giveaways(guild_id);
CREATE INDEX IF NOT EXISTS idx_giveaways_active ON giveaways(ended, end_at) WHERE ended = false;

-- ── Triggers updated_at ────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_guild_levels_updated_at') THEN
    CREATE TRIGGER trg_guild_levels_updated_at
      BEFORE UPDATE ON guild_levels FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_guild_level_config_updated_at') THEN
    CREATE TRIGGER trg_guild_level_config_updated_at
      BEFORE UPDATE ON guild_level_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_guild_economy_updated_at') THEN
    CREATE TRIGGER trg_guild_economy_updated_at
      BEFORE UPDATE ON guild_economy FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_guild_economy_config_updated_at') THEN
    CREATE TRIGGER trg_guild_economy_config_updated_at
      BEFORE UPDATE ON guild_economy_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ── Row Level Security ─────────────────────────────────────
ALTER TABLE guild_levels        ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_level_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_economy       ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_economy_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE giveaways           ENABLE ROW LEVEL SECURITY;
