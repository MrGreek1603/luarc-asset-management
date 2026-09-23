import { afterAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

describe("Asset claim concurrency", () => {
  let testUserId: number;
  let testAssetId: number;

  afterAll(async () => {
    if (testAssetId) {
      await prisma.claim.deleteMany({
        where: {
          assetId: testAssetId,
        },
      });

      await prisma.asset.delete({
        where: {
          id: testAssetId,
        },
      });
    }

    if (testUserId) {
      await prisma.user.delete({
        where: {
          id: testUserId,
        },
      });
    }

    await app.close();
    await prisma.$disconnect();
  });

  it("allows only one concurrent request to claim the same asset", async () => {
    await app.ready();

    const user = await prisma.user.create({
      data: {
        email: `concurrency-${Date.now()}@test.com`,
        passwordHash: "test-password-hash",
      },
    });

    testUserId = user.id;

    const asset = await prisma.asset.create({
      data: {
        code: `CONCURRENCY-${Date.now()}`,
        title: "Concurrency Test Asset",
        valueInCents: 5000,
      },
    });

    testAssetId = asset.id;

    const token = await app.jwt.sign({
      userId: testUserId,
      email: user.email,
    });

    const requests = Array.from({ length: 100 }, () =>
      app.inject({
        method: "POST",
        url: `/assets/${testAssetId}/claim`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      }),
    );

    const responses = await Promise.all(requests);

    const statusCodes = responses.map(
      (response) => response.statusCode,
    );

    const successfulClaims = statusCodes.filter(
      (status) => status === 201,
    );

    const conflicts = statusCodes.filter(
      (status) => status === 409,
    );

    expect(successfulClaims).toHaveLength(1);
    expect(conflicts).toHaveLength(99);

    const claimedAsset = await prisma.asset.findUnique({
      where: {
        id: testAssetId,
      },
    });

    expect(claimedAsset?.status).toBe("CLAIMED");
    expect(claimedAsset?.claimedById).toBe(testUserId);

    const claims = await prisma.claim.findMany({
      where: {
        assetId: testAssetId,
      },
    });

    expect(claims).toHaveLength(1);
  });
});