-- AlterTable
ALTER TABLE "Plan" ADD COLUMN "stripeProductId" TEXT,
                   ADD COLUMN "stripePriceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Plan_stripeProductId_key" ON "Plan"("stripeProductId");
CREATE UNIQUE INDEX "Plan_stripePriceId_key" ON "Plan"("stripePriceId");
