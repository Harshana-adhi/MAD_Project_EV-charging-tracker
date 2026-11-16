-- The rate a session is billed at, fixed when it starts.
ALTER TABLE "sessions" ADD COLUMN "rate_per_kwh" DECIMAL(10,2);

-- Older sessions take their charger's current rate, so their receipts stop changing from now on.
UPDATE "sessions" s SET "rate_per_kwh" = c."rate_per_kwh" FROM "chargers" c WHERE c."id" = s."charger_id";
