-- Sommige roeitrainers rapporteren de stroke rate dubbel (bovenop de FTMS
-- 0.5-resolutie die de app al toepast). Per-profiel toggle om de SPM te halveren;
-- default false zodat correcte trainers ongewijzigd blijven.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spm_halved boolean NOT NULL DEFAULT false;
