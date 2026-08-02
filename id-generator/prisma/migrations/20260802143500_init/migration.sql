-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DecisionSource" AS ENUM ('AUTO', 'ADMIN_REVIEW');

-- CreateEnum
CREATE TYPE "ScanResult" AS ENUM ('PASS', 'FAIL_NO_FACE', 'FAIL_OFF_CENTER', 'FAIL_LOW_LIGHT', 'FAIL_BLURRY', 'FAIL_MULTIPLE_FACES');

-- CreateTable
CREATE TABLE "freelance_id_applications" (
    "id" UUID NOT NULL,
    "legal_name" TEXT NOT NULL,
    "normalized_legal_name" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "consent_at" TIMESTAMP(3) NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "final_decision_source" "DecisionSource",
    "rejection_reason" TEXT,
    "freelance_id_code" TEXT,
    "serial_number" TEXT,
    "card_object_key" TEXT,
    "card_token_hash" TEXT,
    "card_token_expires_at" TIMESTAMP(3),
    "selfie_retention_expires_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_admin_id" UUID,
    "reapply_cooldown_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "freelance_id_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_attempts" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detection_result" "ScanResult" NOT NULL,
    "confidence_score" DOUBLE PRECISION,
    "failure_reason" TEXT,
    "thumbnail_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scan_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "id_sequences" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "id_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "totp_secret" TEXT NOT NULL,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "application_id" UUID,
    "admin_id" UUID,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_attempts" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "response_code" INTEGER,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "freelance_id_applications_freelance_id_code_key" ON "freelance_id_applications"("freelance_id_code");

-- CreateIndex
CREATE UNIQUE INDEX "freelance_id_applications_serial_number_key" ON "freelance_id_applications"("serial_number");

-- CreateIndex
CREATE INDEX "freelance_id_applications_normalized_legal_name_date_of_bir_idx" ON "freelance_id_applications"("normalized_legal_name", "date_of_birth");

-- CreateIndex
CREATE INDEX "freelance_id_applications_status_idx" ON "freelance_id_applications"("status");

-- CreateIndex
CREATE INDEX "scan_attempts_application_id_idx" ON "scan_attempts"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "scan_attempts_application_id_attempt_number_key" ON "scan_attempts"("application_id", "attempt_number");

-- CreateIndex
CREATE UNIQUE INDEX "id_sequences_name_key" ON "id_sequences"("name");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "audit_logs_application_id_idx" ON "audit_logs"("application_id");

-- CreateIndex
CREATE INDEX "audit_logs_admin_id_idx" ON "audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "sync_attempts_idempotency_key_key" ON "sync_attempts"("idempotency_key");

-- CreateIndex
CREATE INDEX "sync_attempts_application_id_idx" ON "sync_attempts"("application_id");

-- CreateIndex
CREATE INDEX "sync_attempts_status_idx" ON "sync_attempts"("status");

-- AddForeignKey
ALTER TABLE "freelance_id_applications" ADD CONSTRAINT "freelance_id_applications_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_attempts" ADD CONSTRAINT "scan_attempts_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "freelance_id_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "freelance_id_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_attempts" ADD CONSTRAINT "sync_attempts_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "freelance_id_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
