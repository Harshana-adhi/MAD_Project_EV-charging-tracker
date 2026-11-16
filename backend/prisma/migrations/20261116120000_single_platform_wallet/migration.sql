-- Before this change the platform wallet was "any wallet with no user". Deleting a user in the
-- database set that user's wallet to no user as well, so commission could land in the wrong wallet.

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN "is_platform" BOOLEAN NOT NULL DEFAULT false;

-- Mark the platform wallet: the no-user wallet that has received the most commission, then the oldest.
UPDATE "wallets" SET "is_platform" = true
WHERE "id" = (
  SELECT w."id"
  FROM "wallets" w
  LEFT JOIN "transactions" t ON t."wallet_id" = w."id"
  WHERE w."user_id" IS NULL
  GROUP BY w."id"
  ORDER BY COUNT(t."id") FILTER (WHERE t."type" = 'commission') DESC, MIN(t."created_at") ASC NULLS LAST, w."id"
  LIMIT 1
);

-- Other no-user wallets that only ever received commission are platform money booked to the wrong
-- wallet. Move their commission rows and balance to the platform wallet, then remove them.
-- A no-user wallet with top-ups or charges belonged to a deleted customer: it is left as it is.
UPDATE "wallets" p
SET "balance" = p."balance" + stray."total"
FROM (
  SELECT COALESCE(SUM(w."balance"), 0) AS "total"
  FROM "wallets" w
  WHERE w."user_id" IS NULL AND NOT w."is_platform" AND w."held" = 0
    AND NOT EXISTS (SELECT 1 FROM "transactions" t WHERE t."wallet_id" = w."id" AND t."type" <> 'commission')
) stray
WHERE p."is_platform";

UPDATE "transactions"
SET "wallet_id" = (SELECT "id" FROM "wallets" WHERE "is_platform")
WHERE "wallet_id" IN (
  SELECT w."id"
  FROM "wallets" w
  WHERE w."user_id" IS NULL AND NOT w."is_platform" AND w."held" = 0
    AND NOT EXISTS (SELECT 1 FROM "transactions" t WHERE t."wallet_id" = w."id" AND t."type" <> 'commission')
);

DELETE FROM "wallets" w
WHERE w."user_id" IS NULL AND NOT w."is_platform" AND w."held" = 0
  AND NOT EXISTS (SELECT 1 FROM "transactions" t WHERE t."wallet_id" = w."id");

-- Only one platform wallet can exist, and it never belongs to a user.
CREATE UNIQUE INDEX "wallets_one_platform" ON "wallets" ("is_platform") WHERE "is_platform";
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_platform_has_no_user" CHECK (NOT "is_platform" OR "user_id" IS NULL);

-- A user who still has a wallet cannot be deleted, so credits are never orphaned again.
ALTER TABLE "wallets" DROP CONSTRAINT "wallets_user_id_fkey";
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
