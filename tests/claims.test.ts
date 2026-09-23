import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

describe("Claims API", () => {
  let userId: number;
  let token: string;
  let assetId: number;

  beforeAll(async () => {
    await app.ready();

    const user = await prisma.user.create({
      data: {
        email: `claims-${Date.now()}@test.com`,
        passwordHash: "test-password-hash",
      },
    });

    userId = user.id;

    token = await app.jwt.sign({
      userId: user.id,
      email: user.email,
    });

    const asset = await prisma.asset.create({
      data: {
        code: `CLAIM-TEST-${Date.now()}`,
        title: "Claim Test Asset",
        valueInCents: 10000,
      },
    });

    assetId = asset.id;
  });

  afterAll(async () => {
    await prisma.claim.deleteMany({
      where: {
        assetId,
      },
    });

    await prisma.asset.delete({
      where: {
        id: assetId,
      },
    });

    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    await app.close();
    await prisma.$disconnect();
  });

  it("claims an available asset", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/assets/${assetId}/claim`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(201);

    const body = response.json();

    expect(body.claim.assetId).toBe(assetId);
    expect(body.claim.userId).toBe(userId);
    expect(body.asset.status).toBe("CLAIMED");
    expect(body.asset.claimedById).toBe(userId);
  });

  it("rejects a second claim for the same asset", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/assets/${assetId}/claim`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(409);

    const body = response.json();

    expect(body.error).toBe("ASSET_NOT_AVAILABLE");
  });

  it("returns 404 when the asset does not exist", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/assets/999999999/claim",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(404);

    const body = response.json();

    expect(body.error).toBe("ASSET_NOT_FOUND");
  });

  it("requires authentication to claim an asset", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/assets/${assetId}/claim`,
    });

    expect(response.statusCode).toBe(401);

    const body = response.json();

    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns the authenticated user's claim history", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/me/claims",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();

    expect(body.claims).toHaveLength(1);
    expect(body.claims[0].userId).toBe(userId);
    expect(body.claims[0].assetId).toBe(assetId);
    expect(body.claims[0].asset.id).toBe(assetId);
    expect(body.claims[0].asset.code).toBeDefined();
    expect(body.claims[0].asset.title).toBe("Claim Test Asset");
    expect(body.claims[0].asset.valueInCents).toBe(10000);
    expect(body.claims[0].asset.status).toBe("CLAIMED");
  });

  it("requires authentication to view claim history", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/me/claims",
    });

    expect(response.statusCode).toBe(401);

    const body = response.json();

    expect(body.error).toBe("UNAUTHORIZED");
  });
});