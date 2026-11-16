-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('booked', 'cancelled', 'expired', 'used');

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "charger_id" TEXT NOT NULL,
    "station_id" TEXT NOT NULL,
    "start_at" TIMESTAMPTZ(3) NOT NULL,
    "end_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'booked',
    "session_id" TEXT,
    "reminder_sent_at" TIMESTAMP(3),
    "warning_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookings_charger_id_start_at_idx" ON "bookings"("charger_id", "start_at");

-- CreateIndex
CREATE INDEX "bookings_customer_id_status_idx" ON "bookings"("customer_id", "status");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_charger_id_fkey" FOREIGN KEY ("charger_id") REFERENCES "chargers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Needed for the exclusion constraint below (range overlap check backed by a GiST index).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Two "booked" bookings on the same charger can never have overlapping time ranges.
-- This is the real guarantee against double-booking a charger; the service-level lock
-- and check are a fast-path that gives a friendlier error before hitting this.
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (
    "charger_id" WITH =,
    tstzrange("start_at", "end_at") WITH &&
  )
  WHERE (status = 'booked');
