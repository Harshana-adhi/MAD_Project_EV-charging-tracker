-- AlterEnum
ALTER TYPE "ChargerStatus" ADD VALUE 'walkin';

-- AlterTable
ALTER TABLE "chargers" ADD COLUMN     "busy_until" TIMESTAMP(3);
