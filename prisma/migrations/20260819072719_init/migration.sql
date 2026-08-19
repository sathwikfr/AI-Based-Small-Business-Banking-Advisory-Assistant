-- CreateTable
CREATE TABLE "relationship_managers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "monthlyRevenueAvg" REAL NOT NULL,
    "onboardedAt" DATETIME NOT NULL,
    "rmId" TEXT NOT NULL,
    CONSTRAINT "businesses_rmId_fkey" FOREIGN KEY ("rmId") REFERENCES "relationship_managers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "balance" REAL NOT NULL,
    "creditLimit" REAL,
    CONSTRAINT "accounts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "direction" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "counterparty" TEXT,
    CONSTRAINT "transactions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "principal" REAL NOT NULL,
    "outstanding" REAL NOT NULL,
    "maturityDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "loans_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "signals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "metricValue" REAL NOT NULL,
    "metricLabel" TEXT NOT NULL,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "signals_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "customer_summaries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "signalIds" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_summaries_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "interaction_notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "note" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    CONSTRAINT "interaction_notes_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "policy_references" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "eligibility" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "relationship_managers_email_key" ON "relationship_managers"("email");

-- CreateIndex
CREATE INDEX "businesses_rmId_idx" ON "businesses"("rmId");

-- CreateIndex
CREATE INDEX "accounts_businessId_idx" ON "accounts"("businessId");

-- CreateIndex
CREATE INDEX "transactions_businessId_date_idx" ON "transactions"("businessId", "date");

-- CreateIndex
CREATE INDEX "loans_businessId_idx" ON "loans"("businessId");

-- CreateIndex
CREATE INDEX "signals_businessId_isActive_idx" ON "signals"("businessId", "isActive");
