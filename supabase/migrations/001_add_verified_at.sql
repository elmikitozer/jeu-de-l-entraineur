-- Session 05 — ajout colonnes de suivi de sync sur la table matches

ALTER TABLE matches ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS sync_attempts INTEGER DEFAULT 0;

-- Contrainte unique sur points_log pour permettre un upsert sûr (supprime les doublons si existants)
ALTER TABLE points_log
  ADD CONSTRAINT IF NOT EXISTS points_log_unique_per_match
  UNIQUE (participant_id, player_id, match_id);
