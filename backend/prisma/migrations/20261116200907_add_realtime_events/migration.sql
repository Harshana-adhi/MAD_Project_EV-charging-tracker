-- CreateTable
CREATE TABLE "realtime_events" (
    "id" SERIAL NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "user_id" TEXT,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "realtime_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "realtime_events_created_at_idx" ON "realtime_events"("created_at");
