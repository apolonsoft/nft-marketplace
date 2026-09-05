INSERT INTO "WalletProfile" ("id", "address", "createdAt", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000001', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', now(), now())
ON CONFLICT ("address") DO NOTHING;
INSERT INTO "DeveloperApplication" ("id", "ownerWalletId", "name", "slug", "description", "status", "dailyQuota", "createdAt", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'Local Example', 'local-example', 'Deterministic local application', 'ACTIVE', 10000, now(), now())
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "ApplicationMember" ("id", "applicationId", "walletId", "role", "acceptedAt", "createdAt")
VALUES ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'OWNER', now(), now())
ON CONFLICT ("applicationId", "walletId") DO NOTHING;
