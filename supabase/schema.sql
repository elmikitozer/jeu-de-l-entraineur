-- =============================================================================
-- schema.sql — Schéma complet de la base de données "Jeu de l'Entraîneur"
--
-- Ordre d'exécution dans Supabase SQL Editor :
--   1. Coller tout ce fichier et exécuter en une seule fois (Run).
--   2. Les tables sont créées dans le bon ordre pour respecter les FK.
--   3. Row Level Security est désactivé : le site est public en lecture seule,
--      l'écriture se fait uniquement via les Route Handlers avec le service role.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- pour gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Table : participants
-- Joueurs du jeu fantasy (saisis par l'admin)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS participants (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  avatar_url  TEXT,
  total_points INTEGER    NOT NULL DEFAULT 0,
  created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

ALTER TABLE participants DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_participants_total_points
  ON participants (total_points DESC);

-- ---------------------------------------------------------------------------
-- Table : players
-- Joueurs de la Coupe du Monde 2026
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS players (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT    NOT NULL,
  nationality      TEXT    NOT NULL,
  nationality_code TEXT    NOT NULL, -- ISO 3166-1 alpha-2, ex: "FR", "BR"
  position         TEXT    NOT NULL CHECK (position IN ('GK', 'DEF', 'MID', 'FWD')),
  photo_url        TEXT,
  api_football_id  INTEGER UNIQUE     -- ID dans l'API-Football (peut être NULL avant sync)
);

ALTER TABLE players DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_players_nationality_code
  ON players (nationality_code);

CREATE INDEX IF NOT EXISTS idx_players_position
  ON players (position);

CREATE INDEX IF NOT EXISTS idx_players_api_football_id
  ON players (api_football_id);

-- ---------------------------------------------------------------------------
-- Table : teams
-- Équipes composées (1 ligne par joueur par participant)
-- Formation imposée 4-3-3 : slot 1=GK, 2-5=DEF, 6-8=MID, 9-11=FWD
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS teams (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID    NOT NULL REFERENCES participants (id) ON DELETE CASCADE,
  player_id      UUID    NOT NULL REFERENCES players (id) ON DELETE RESTRICT,
  slot           INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 11),
  UNIQUE (participant_id, player_id),
  UNIQUE (participant_id, slot)
);

ALTER TABLE teams DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_teams_participant_id
  ON teams (participant_id);

CREATE INDEX IF NOT EXISTS idx_teams_player_id
  ON teams (player_id);

-- ---------------------------------------------------------------------------
-- Table : matches
-- Calendrier CdM 2026 (pré-importé via seed-matches.ts) + résultats live
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS matches (
  id           UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  api_match_id INTEGER   UNIQUE,        -- ID dans l'API-Football
  home_team    TEXT      NOT NULL,
  away_team    TEXT      NOT NULL,
  home_score   INTEGER,                 -- NULL avant le coup de sifflet
  away_score   INTEGER,
  date         TIMESTAMP NOT NULL,
  venue        TEXT,                    -- stade + ville hôte
  stage        TEXT,                    -- ex: "Groupe A", "Quarts de finale"
  status       TEXT      NOT NULL DEFAULT 'scheduled'
                          CHECK (status IN ('scheduled', 'live', 'finished'))
);

ALTER TABLE matches DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_matches_status
  ON matches (status);

CREATE INDEX IF NOT EXISTS idx_matches_date
  ON matches (date);

CREATE INDEX IF NOT EXISTS idx_matches_api_match_id
  ON matches (api_match_id);

-- ---------------------------------------------------------------------------
-- Table : player_stats
-- Stats individuelles par joueur par match (calculées à partir de l'API)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS player_stats (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       UUID    NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  match_id        UUID    NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
  played          BOOLEAN NOT NULL DEFAULT FALSE,
  result          TEXT    CHECK (result IN ('win', 'draw', 'loss')),
  goals           INTEGER NOT NULL DEFAULT 0,
  assists         INTEGER NOT NULL DEFAULT 0,
  motm            BOOLEAN NOT NULL DEFAULT FALSE,
  yellow_cards    INTEGER NOT NULL DEFAULT 0,
  red_cards       INTEGER NOT NULL DEFAULT 0,
  penalty_saved   INTEGER NOT NULL DEFAULT 0,
  penalty_scored  INTEGER NOT NULL DEFAULT 0, -- penalties marqués hors TAB
  freekick_goal   INTEGER NOT NULL DEFAULT 0,
  cleansheet      BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (player_id, match_id)
);

ALTER TABLE player_stats DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_player_stats_player_id
  ON player_stats (player_id);

CREATE INDEX IF NOT EXISTS idx_player_stats_match_id
  ON player_stats (match_id);

-- ---------------------------------------------------------------------------
-- Table : points_log
-- Log détaillé des points par participant par match
-- points_breakdown contient le détail de chaque bonus (voir PointsBreakdown dans types.ts)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS points_log (
  id               UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id   UUID      NOT NULL REFERENCES participants (id) ON DELETE CASCADE,
  player_id        UUID      NOT NULL REFERENCES players (id) ON DELETE RESTRICT,
  match_id         UUID      NOT NULL REFERENCES matches (id) ON DELETE RESTRICT,
  points_breakdown JSONB     NOT NULL,
  total_points     INTEGER   NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE points_log DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_points_log_participant_id
  ON points_log (participant_id);

CREATE INDEX IF NOT EXISTS idx_points_log_player_id
  ON points_log (player_id);

CREATE INDEX IF NOT EXISTS idx_points_log_match_id
  ON points_log (match_id);

-- Index GIN pour les requêtes sur le JSONB breakdown
CREATE INDEX IF NOT EXISTS idx_points_log_breakdown_gin
  ON points_log USING gin (points_breakdown);
