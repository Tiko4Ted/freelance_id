-- Add an explicit admin-controlled exception to the 30-day reapply cooldown.
ALTER TABLE "freelance_id_applications"
ADD COLUMN "admin_override_cooldown" BOOLEAN NOT NULL DEFAULT false;
