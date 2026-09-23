import { prisma } from "../lib/prisma";

export const getHealth = () => {
  return {
    status: "ok",
    service: "luarc-asset-management",
  };
};

export const checkDatabaseHealth = async () => {
  await prisma.$queryRaw`SELECT 1`;

  return {
    status: "ok",
    database: "connected",
  };
};