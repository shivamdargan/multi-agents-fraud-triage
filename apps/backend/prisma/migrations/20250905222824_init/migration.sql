-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('ACTIVE', 'FROZEN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "ChargebackStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('FRAUD', 'VELOCITY', 'DEVICE_CHANGE', 'UNUSUAL_LOCATION', 'HIGH_RISK_MERCHANT');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'RESOLVED', 'FALSE_POSITIVE', 'ESCALATED');

-- CreateEnum
CREATE TYPE "EvalStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email_masked" TEXT NOT NULL,
    "risk_flags" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "last_4" TEXT NOT NULL,
    "status" "CardStatus" NOT NULL DEFAULT 'ACTIVE',
    "network" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "mcc" TEXT NOT NULL,
    "merchant" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timestamp" TIMESTAMP(3) NOT NULL,
    "device_id" TEXT,
    "geo" JSONB,
    "risk_score" DOUBLE PRECISION,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "fingerprint" TEXT,
    "last_seen" TIMESTAMP(3) NOT NULL,
    "trusted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chargebacks" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "transaction_id" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ChargebackStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "chargebacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "risk_score" DOUBLE PRECISION NOT NULL,
    "reasons" JSONB NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "triage_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "anchor" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunks" JSONB NOT NULL,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_runs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "EvalStatus" NOT NULL DEFAULT 'RUNNING',
    "results" JSONB NOT NULL,
    "metrics" JSONB NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "eval_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_traces" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "duration" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_traces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_email_masked_idx" ON "customers"("email_masked");

-- CreateIndex
CREATE INDEX "cards_customer_id_idx" ON "cards"("customer_id");

-- CreateIndex
CREATE INDEX "cards_status_idx" ON "cards"("status");

-- CreateIndex
CREATE INDEX "transactions_customer_id_timestamp_idx" ON "transactions"("customer_id", "timestamp");

-- CreateIndex
CREATE INDEX "transactions_card_id_idx" ON "transactions"("card_id");

-- CreateIndex
CREATE INDEX "transactions_mcc_idx" ON "transactions"("mcc");

-- CreateIndex
CREATE INDEX "transactions_merchant_idx" ON "transactions"("merchant");

-- CreateIndex
CREATE INDEX "transactions_timestamp_idx" ON "transactions"("timestamp");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "devices_device_id_key" ON "devices"("device_id");

-- CreateIndex
CREATE INDEX "devices_customer_id_idx" ON "devices"("customer_id");

-- CreateIndex
CREATE INDEX "chargebacks_customer_id_idx" ON "chargebacks"("customer_id");

-- CreateIndex
CREATE INDEX "chargebacks_status_idx" ON "chargebacks"("status");

-- CreateIndex
CREATE INDEX "alerts_customer_id_idx" ON "alerts"("customer_id");

-- CreateIndex
CREATE INDEX "alerts_type_idx" ON "alerts"("type");

-- CreateIndex
CREATE INDEX "alerts_status_idx" ON "alerts"("status");

-- CreateIndex
CREATE INDEX "alerts_created_at_idx" ON "alerts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_base_anchor_key" ON "knowledge_base"("anchor");

-- CreateIndex
CREATE INDEX "knowledge_base_anchor_idx" ON "knowledge_base"("anchor");

-- CreateIndex
CREATE INDEX "knowledge_base_tags_idx" ON "knowledge_base"("tags");

-- CreateIndex
CREATE INDEX "eval_runs_status_idx" ON "eval_runs"("status");

-- CreateIndex
CREATE INDEX "eval_runs_started_at_idx" ON "eval_runs"("started_at");

-- CreateIndex
CREATE INDEX "agent_traces_session_id_idx" ON "agent_traces"("session_id");

-- CreateIndex
CREATE INDEX "agent_traces_agent_name_idx" ON "agent_traces"("agent_name");

-- CreateIndex
CREATE INDEX "agent_traces_timestamp_idx" ON "agent_traces"("timestamp");

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chargebacks" ADD CONSTRAINT "chargebacks_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
