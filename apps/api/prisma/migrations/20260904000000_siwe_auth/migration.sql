CREATE TABLE "WalletProfile" (
    "id" UUID NOT NULL,
    "address" VARCHAR(42) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WalletProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiweNonce" (
    "id" UUID NOT NULL,
    "nonce" VARCHAR(64) NOT NULL,
    "address" VARCHAR(42) NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "chainId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SiweNonce_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SessionFamily" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SessionFamily_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "replacedByTokenId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WalletProfile_address_key" ON "WalletProfile"("address");
CREATE UNIQUE INDEX "SiweNonce_nonce_key" ON "SiweNonce"("nonce");
CREATE INDEX "SiweNonce_address_domain_chainId_expiresAt_idx" ON "SiweNonce"("address", "domain", "chainId", "expiresAt");
CREATE INDEX "SessionFamily_walletId_revokedAt_idx" ON "SessionFamily"("walletId", "revokedAt");
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_familyId_expiresAt_idx" ON "RefreshToken"("familyId", "expiresAt");
ALTER TABLE "SessionFamily" ADD CONSTRAINT "SessionFamily_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "WalletProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "SessionFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;
