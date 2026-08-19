-- CreateTable
CREATE TABLE "health_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "driverCode" TEXT,
    CONSTRAINT "health_scores_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "health_scores_businessId_computedAt_idx" ON "health_scores"("businessId", "computedAt");
