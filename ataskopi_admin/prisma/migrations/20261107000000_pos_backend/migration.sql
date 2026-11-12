-- AlterTable
ALTER TABLE "outlets" ADD COLUMN     "online_orders_paused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pos_auto_pause_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pos_last_seen_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cashier_id" TEXT,
ADD COLUMN     "channel" TEXT NOT NULL DEFAULT 'app',
ADD COLUMN     "client_order_id" TEXT,
ADD COLUMN     "pos_revision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "queue_number" TEXT,
ADD COLUMN     "shift_id" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'customer_app',
ADD COLUMN     "void_reason" TEXT,
ADD COLUMN     "voided_at" TIMESTAMP(3),
ADD COLUMN     "voided_by" TEXT;

-- CreateTable
CREATE TABLE "order_payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "client_payment_id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "tendered_amount" DECIMAL(12,2),
    "cashier_id" TEXT NOT NULL,
    "shift_id" TEXT,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_refunds" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "client_refund_id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "cashier_id" TEXT NOT NULL,
    "shift_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "client_shift_id" TEXT NOT NULL,
    "cashier_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "opening_cash" DECIMAL(12,2) NOT NULL,
    "expected_cash" DECIMAL(12,2),
    "actual_cash" DECIMAL(12,2),
    "cash_difference" DECIMAL(12,2),
    "notes" TEXT,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_cash_movements" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "client_movement_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "cashier_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_channel_prices" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "product_channel_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_counters" (
    "id" TEXT NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "last_sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_payments_client_payment_id_key" ON "order_payments"("client_payment_id");

-- CreateIndex
CREATE INDEX "order_payments_order_id_idx" ON "order_payments"("order_id");

-- CreateIndex
CREATE INDEX "order_payments_shift_id_idx" ON "order_payments"("shift_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_refunds_client_refund_id_key" ON "order_refunds"("client_refund_id");

-- CreateIndex
CREATE INDEX "order_refunds_order_id_idx" ON "order_refunds"("order_id");

-- CreateIndex
CREATE INDEX "order_refunds_shift_id_idx" ON "order_refunds"("shift_id");

-- CreateIndex
CREATE UNIQUE INDEX "shifts_client_shift_id_key" ON "shifts"("client_shift_id");

-- CreateIndex
CREATE INDEX "shifts_outlet_id_status_idx" ON "shifts"("outlet_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "shift_cash_movements_client_movement_id_key" ON "shift_cash_movements"("client_movement_id");

-- CreateIndex
CREATE INDEX "shift_cash_movements_shift_id_idx" ON "shift_cash_movements"("shift_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_channel_prices_product_id_channel_key" ON "product_channel_prices"("product_id", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "order_counters_outlet_id_date_scope_key" ON "order_counters"("outlet_id", "date", "scope");

-- CreateIndex
CREATE INDEX "audit_logs_outlet_id_created_at_idx" ON "audit_logs"("outlet_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_client_order_id_key" ON "orders"("client_order_id");

-- CreateIndex
CREATE INDEX "orders_outlet_id_updated_at_idx" ON "orders"("outlet_id", "updated_at");

-- CreateIndex
CREATE INDEX "orders_outlet_id_order_status_idx" ON "orders"("outlet_id", "order_status");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_cash_movements" ADD CONSTRAINT "shift_cash_movements_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_channel_prices" ADD CONSTRAINT "product_channel_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

