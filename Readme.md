# Luarc Asset Management API

Backend API for managing assets, user authentication, and asset claiming.

The project is built with Fastify, TypeScript, Prisma, and PostgreSQL, with a focus on authentication, relational data integrity, concurrent claims, and optimistic locking.

## Tech Stack

- Node.js
- TypeScript
- Fastify
- PostgreSQL
- Prisma ORM
- JWT authentication
- bcryptjs for password hashing
- Zod for request validation
- Vitest for testing
- PM2 for production process management
- Swagger / OpenAPI for API documentation

## Architecture

The application follows an MVC-style structure with a service layer:

```text
HTTP Request
    ↓
Route
    ↓
Middleware
    ↓
Controller
    ↓
Service
    ↓
Prisma
    ↓
PostgreSQL
```

### Project structure

```text
src/
├── config/
│   ├── env.ts
│   └── swagger.ts
├── controllers/
├── errors/
│   └── app-error.ts
├── lib/
│   └── prisma.ts
├── middleware/
├── routes/
├── schemas/
├── services/
├── app.ts
└── server.ts

prisma/
├── migrations/
├── schema.prisma
└── prisma7.config.ts

tests/
├── asset.test.ts
├── claims.test.ts
├── claim.concurrency.test.ts
└── auth.test.ts
```

## Prerequisites

Make sure the following are installed:

- Node.js
- npm
- PostgreSQL

Docker can also be used to run PostgreSQL locally.

## Database

The application expects PostgreSQL.

Example Docker setup:

```bash
docker run --name luarc-postgres \
  -e POSTGRES_USER=luarc \
  -e POSTGRES_PASSWORD=luarc_password \
  -e POSTGRES_DB=luarc_assets_mvc \
  -p 5432:5432 \
  -d postgres
```

Verify that the container is running:

```bash
docker ps
```

## Installation

Clone the repository and install dependencies:

```bash
npm install
```

Create the environment file:

```bash
cp .env.example .env
```

Configure `.env`:

```env
PORT=3000
JWT_SECRET=replace-with-a-secret-that-is-at-least-32-characters-long
NODE_ENV=development
DATABASE_URL=postgresql://luarc:luarc_password@localhost:5432/luarc_assets_mvc
```

Run the Prisma migrations:

```bash
npx prisma migrate dev
```

Generate the Prisma client when required:

```bash
npx prisma generate
```

## Running the application

Development mode:

```bash
npm run dev
```

The API will be available at:

```text
http://localhost:3000
```

Health check:

```text
GET /health
```

Database health check:

```text
GET /health/db
```

## API Documentation

Swagger UI is available at:

```text
http://localhost:3000/docs
```

The Swagger documentation can be used to inspect the available endpoints and authenticated requests.

## Authentication

### Register

```http
POST /auth/register
```

Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Login

```http
POST /auth/login
```

Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

The response contains a JWT:

```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

Use the token for protected endpoints:

```http
Authorization: Bearer <jwt>
```

### Current user

```http
GET /auth/me
```

Requires authentication.

## Asset API

### List assets

```http
GET /assets
```

Supports pagination:

```text
GET /assets?page=1&limit=20
```

Optional status filter:

```text
GET /assets?status=AVAILABLE
```

Supported statuses:

```text
AVAILABLE
CLAIMED
EXPIRED
```

### Get global asset pool

```http
GET /assets/pool
```

Returns aggregate counts for the asset pool.

### Create an asset

```http
POST /assets
```

Requires authentication.

Request:

```json
{
  "code": "WELCOME-100",
  "title": "Welcome Voucher",
  "valueInCents": 10000
}
```

Asset codes are unique.

### Update an asset

```http
PATCH /assets/:id
```

Requires authentication.

Updates use optimistic locking.

Example:

```json
{
  "title": "Updated Voucher",
  "valueInCents": 15000,
  "version": 0
}
```

The version must match the current database version.

When an update succeeds, the version is incremented.

A stale version returns:

```text
409 Conflict
```

with:

```json
{
  "error": "VERSION_CONFLICT",
  "message": "The asset was modified by another request."
}
```

## Claiming Assets

### Claim an asset

```http
POST /assets/:id/claim
```

Requires authentication.

Only assets with status `AVAILABLE` can be claimed.

A successful claim:

1. Changes the asset status to `CLAIMED`
2. Stores the claiming user
3. Stores the claim timestamp
4. Increments the asset version
5. Creates a corresponding `Claim` record

### Claim history

```http
GET /me/claims
```

Returns the claims belonging to the authenticated user.

## Concurrency and Data Integrity

The claim operation is designed to prevent two users from successfully claiming the same asset at the same time.

The critical database update is performed using the asset ID and `AVAILABLE` status:

```text
UPDATE asset
WHERE id = ?
AND status = AVAILABLE
```

Only one concurrent request can change the asset from `AVAILABLE` to `CLAIMED`.

The successful request then creates the claim record inside the same database transaction.

The `Claim` table also has a unique constraint on `assetId`, which provides an additional database-level guarantee that an asset cannot have multiple claims.

Conceptually:

```text
Request A ─┐
Request B ─┼──> Atomic state transition
Request C ─┘

              AVAILABLE
                  │
                  ▼
               CLAIMED
```

Expected result for 100 concurrent requests against the same asset:

```text
1 successful claim
99 conflict responses
```

This behavior is covered by the concurrency test.

## Optimistic Locking

Assets contain a `version` field.

An update only succeeds when the client supplies the current version:

```text
id = 10
version = 3
```

After a successful update:

```text
version = 4
```

If another request has already changed the asset, an update using version `3` will fail with a `409 Conflict`.

This prevents silent overwrites when multiple clients modify the same record.

## Database Model

The core relationships are:

```text
User
 │
 ├── Claim
 │     │
 │     └── Asset
 │
 └── claimedAssets
```

Main entities:

### User

- `id`
- `email`
- `passwordHash`
- `createdAt`
- `updatedAt`

### Asset

- `id`
- `code`
- `title`
- `valueInCents`
- `status`
- `claimedById`
- `claimedAt`
- `version`
- `createdAt`
- `updatedAt`

### Claim

- `id`
- `assetId`
- `userId`
- `claimedAt`

`Claim.assetId` is unique to enforce one claim per asset.

## Validation

Request input is validated before reaching the service layer.

Examples include:

- Valid email format
- Minimum password length
- Positive asset IDs
- Non-negative asset values
- Pagination limits
- Valid asset status values
- Required version for asset updates

Invalid requests return `400 Bad Request`.

## Error Handling

Application errors use structured error codes and HTTP status codes.

Examples:

```text
400 VALIDATION_ERROR
401 UNAUTHORIZED
401 INVALID_CREDENTIALS
404 ASSET_NOT_FOUND
409 ASSET_CODE_ALREADY_EXISTS
409 ASSET_NOT_AVAILABLE
409 VERSION_CONFLICT
```

Expected application conflicts are logged at warning level, while unexpected errors are logged as errors.

## Testing

Run the complete test suite:

```bash
npm test
```

The test suite covers:

- User registration
- Invalid registration data
- Duplicate users
- Login
- Invalid credentials
- Authentication protection
- Current-user endpoint
- Asset creation
- Asset validation
- Duplicate asset codes
- Asset updates
- Optimistic locking
- Missing assets
- Asset pool
- Successful claims
- Duplicate claims
- Claim history
- Authentication requirements
- Concurrent claims

## Build

Create a production build:

```bash
npm run build
```

Start the compiled application:

```bash
npm start
```

## PM2

The application can be run with PM2 in cluster mode.

Start:

```bash
npm run start:pm2
```

The PM2 configuration uses:

```text
instances: "max"
exec_mode: "cluster"
```

This allows PM2 to start multiple application workers and distribute incoming requests between them.

Useful commands:

```bash
npx pm2 status
npx pm2 logs luarc-asset-management
npx pm2 restart luarc-asset-management
npx pm2 stop luarc-asset-management
```

The application also handles `SIGINT` and `SIGTERM` for graceful shutdown by closing the Fastify application and disconnecting Prisma from the database.

## Useful Commands

Development:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Test:

```bash
npm test
```

Production:

```bash
npm start
```

PM2:

```bash
npm run start:pm2
```

Prisma migrations:

```bash
npx prisma migrate dev
```

Prisma client generation:

```bash
npx prisma generate
```

## Design Decisions

### Why PostgreSQL?

The application relies on relational constraints, transactions, unique constraints, and consistent state transitions. PostgreSQL provides these database-level guarantees.

### Why Prisma?

Prisma provides a typed database client and makes the relational model explicit in the application.

### Why JWT?

JWT provides stateless authentication for the API. The authenticated user's ID is included in the token and made available to protected routes through Fastify JWT.

### Why transactions for claiming?

Claiming changes multiple pieces of related state:

```text
Asset → CLAIMED
Claim → created
```

These operations should succeed or fail together, so they are performed within a database transaction.

### Why optimistic locking?

The `version` field prevents one client from overwriting another client's changes based on an outdated representation of the asset.

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | API port |
| `JWT_SECRET` | Secret used to sign JWTs |
| `NODE_ENV` | Application environment |

Never commit the real `.env` file or production secrets to source control.
