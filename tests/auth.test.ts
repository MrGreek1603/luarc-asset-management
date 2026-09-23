import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

describe("Authentication API", () => {
  const createdUserIds: number[] = [];

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: {
          id: {
            in: createdUserIds,
          },
        },
      });
    }

    await app.close();
    await prisma.$disconnect();
  });

  it("registers a new user", async () => {
    const email = `register-${Date.now()}@test.com`;

    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email,
        password: "password123",
      },
    });

    expect(response.statusCode).toBe(201);

    const body = response.json();

    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(email);
    expect(body.user.id).toBeDefined();
    expect(body.user.passwordHash).toBeUndefined();

    createdUserIds.push(body.user.id);
  });

  it("rejects invalid registration data", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "not-an-email",
        password: "short",
      },
    });

    expect(response.statusCode).toBe(400);

    const body = response.json();

    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("rejects duplicate registration", async () => {
    const email = `duplicate-${Date.now()}@test.com`;

    const firstResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email,
        password: "password123",
      },
    });

    expect(firstResponse.statusCode).toBe(201);

    const firstBody = firstResponse.json();
    createdUserIds.push(firstBody.user.id);

    const secondResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email,
        password: "password123",
      },
    });

    expect(secondResponse.statusCode).toBe(409);

    const body = secondResponse.json();

    expect(body.error).toBe("USER_ALREADY_EXISTS");
  });

  it("logs in with valid credentials", async () => {
    const email = `login-${Date.now()}@test.com`;

    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email,
        password: "password123",
      },
    });

    expect(registerResponse.statusCode).toBe(201);

    const registeredUser = registerResponse.json().user;
    createdUserIds.push(registeredUser.id);

    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email,
        password: "password123",
      },
    });

    expect(loginResponse.statusCode).toBe(200);

    const body = loginResponse.json();

    expect(body.token).toBeDefined();
    expect(typeof body.token).toBe("string");

    expect(body.user.id).toBe(registeredUser.id);
    expect(body.user.email).toBe(email);
    expect(body.user.passwordHash).toBeUndefined();
  });

  it("rejects an incorrect password", async () => {
    const email = `wrong-password-${Date.now()}@test.com`;

    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email,
        password: "password123",
      },
    });

    expect(registerResponse.statusCode).toBe(201);

    const registeredUser = registerResponse.json().user;
    createdUserIds.push(registeredUser.id);

    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email,
        password: "wrong-password",
      },
    });

    expect(loginResponse.statusCode).toBe(401);

    const body = loginResponse.json();

    expect(body.error).toBe("INVALID_CREDENTIALS");
  });

  it("requires authentication for /auth/me", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/auth/me",
    });

    expect(response.statusCode).toBe(401);

    const body = response.json();

    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns the authenticated user from /auth/me", async () => {
    const email = `me-${Date.now()}@test.com`;

    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email,
        password: "password123",
      },
    });

    expect(registerResponse.statusCode).toBe(201);

    const registeredUser = registerResponse.json().user;
    createdUserIds.push(registeredUser.id);

    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email,
        password: "password123",
      },
    });

    expect(loginResponse.statusCode).toBe(200);

    const token = loginResponse.json().token;

    const meResponse = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(meResponse.statusCode).toBe(200);

    const body = meResponse.json();

    expect(body.user.id).toBe(registeredUser.id);
    expect(body.user.email).toBe(email);
  });
});
