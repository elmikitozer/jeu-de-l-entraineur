-- Session 05 — ajout colonnes de suivi de sync sur la table matches

ALTER TABLE matches ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS sync_attempts INTEGER DEFAULT 0;

-- Contrainte unique sur points_log pour permettre un upsert sûr (onConflict).
-- PostgreSQL ne supporte PAS `ADD CONSTRAINT IF NOT EXISTS` → on encadre dans un
-- bloc DO conditionnel pour rester idempotent et rejouable sans erreur.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'points_log_unique_per_match'
  ) THEN
    ALTER TABLE points_log
      ADD CONSTRAINT points_log_unique_per_match
      UNIQUE (participant_id, player_id, match_id);
  END IF;
END $$;
