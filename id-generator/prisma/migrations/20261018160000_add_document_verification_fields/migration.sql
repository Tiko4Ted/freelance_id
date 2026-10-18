-- Store only the metadata needed to complete the document-verification step.
-- No document number, image, or extracted document contents are persisted.
ALTER TABLE "freelance_id_applications"
ADD COLUMN "country_of_residence" TEXT,
ADD COLUMN "document_type" TEXT,
ADD COLUMN "document_issuing_country" TEXT,
ADD COLUMN "document_verified_at" TIMESTAMP(3);
