import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

describe("Assets API", () => {
  let userId: number;
  let token: string;

  let createdAssetId: number;
  let duplicateAssetId: number;
  let updateAssetId: number;

  beforeAll(async () => {
    await app.ready();

    const user = await prisma.user.create({
      data: {
        email: `assets-${Date.now()}@test.com`,
        passwordHash: "test-password-hash",
      },
    });

    userId = user.id;

    token = await app.jwt.sign({
      userId: user.id,
      email: user.email,
    });
  });

  afterAll(async () => {
    if (createdAssetId) {
      await prisma.asset.delete({
        where: {
          id: createdAssetId,
        },
      });
    }

    if (duplicateAssetId) {
      await prisma.asset.delete({
        where: {
          id: duplicateAssetId,
        },
      });
    }

    if (updateAssetId) {
      await prisma.asset.delete({
        where: {
          id: updateAssetId,
        },
      });
    }

    if (userId) {
      await prisma.user.delete({
        where: {
          id: userId,
        },
      });
    }

    await app.close();
    await prisma.$disconnect();
  });

  it("creates an asset", async () => {
    const code = `ASSET-TEST-${Date.now()}`;

    const response = await app.inject({
      method: "POST",
      url: "/assets",
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        code,
        title: "Test Asset",
        valueInCents: 2500,
      },
    });

    expect(response.statusCode).toBe(201);

    const body = response.json();

    expect(body.asset).toBeDefined();
    expect(body.asset.code).toBe(code);
    expect(body.asset.title).toBe("Test Asset");
    expect(body.asset.valueInCents).toBe(2500);
    expect(body.asset.status).toBe("AVAILABLE");

    createdAssetId = body.asset.id;
  });

  it("rejects a duplicate asset code", async () => {
    const code = `DUPLICATE-${Date.now()}`;

    const firstResponse = await app.inject({
      method: "POST",
      url: "/assets",
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        code,
        title: "First Asset",
        valueInCents: 1000,
      },
    });

    expect(firstResponse.statusCode).toBe(201);

    const firstBody = firstResponse.json();
    duplicateAssetId = firstBody.asset.id;

    const secondResponse = await app.inject({
      method: "POST",
      url: "/assets",
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        code,
        title: "Second Asset",
        valueInCents: 2000,
      },
    });

    expect(secondResponse.statusCode).toBe(409);

    const body = secondResponse.json();

    expect(body.error).toBe("ASSET_CODE_ALREADY_EXISTS");
  });

  it("rejects an invalid asset payload", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/assets",
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        code: "",
        title: "",
        valueInCents: -100,
      },
    });

    expect(response.statusCode).toBe(400);

    const body = response.json();

    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("updates an asset when the version is correct", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/assets",
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        code: `UPDATE-${Date.now()}`,
        title: "Original Title",
        valueInCents: 5000,
      },
    });

    expect(createResponse.statusCode).toBe(201);

    const created = createResponse.json();

    updateAssetId = created.asset.id;

    const response = await app.inject({
      method: "PATCH",
      url: `/assets/${updateAssetId}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        title: "Updated Title",
        version: created.asset.version,
      },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();

    expect(body.asset.title).toBe("Updated Title");
    expect(body.asset.version).toBe(created.asset.version + 1);
  });

  it("rejects an update with a stale version", async () => {
    const asset = await prisma.asset.create({
      data: {
        code: `STALE-${Date.now()}`,
        title: "Stale Version Asset",
        valueInCents: 3000,
      },
    });

    const firstUpdate = await app.inject({
      method: "PATCH",
      url: `/assets/${asset.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        title: "First Update",
        version: asset.version,
      },
    });

    expect(firstUpdate.statusCode).toBe(200);

    const secondUpdate = await app.inject({
      method: "PATCH",
      url: `/assets/${asset.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        title: "Stale Update",
        version: asset.version,
      },
    });

    expect(secondUpdate.statusCode).toBe(409);

    const body = secondUpdate.json();

    expect(body.error).toBe("VERSION_CONFLICT");

    await prisma.asset.delete({
      where: {
        id: asset.id,
      },
    });
  });

  it("returns 404 when updating a missing asset", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/assets/999999999",
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        title: "Missing Asset",
        version: 0,
      },
    });

    expect(response.statusCode).toBe(404);

    const body = response.json();

    expect(body.error).toBe("ASSET_NOT_FOUND");
  });

  it("rejects an invalid update payload", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/assets/${updateAssetId}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        version: 1,
      },
    });

    expect(response.statusCode).toBe(400);

    const body = response.json();

    expect(body.error).toBe("VALIDATION_ERROR");
  });
});