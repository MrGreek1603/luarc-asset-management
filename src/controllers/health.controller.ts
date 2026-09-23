import type { FastifyReply, FastifyRequest } from "fastify";

import {
  checkDatabaseHealth,
  getHealth,
} from "../services/health.service.js";

export const healthController = async (
  _request: FastifyRequest,
  _reply: FastifyReply,
) => {
  return getHealth();
};

export const databaseHealthController = async (
  _request: FastifyRequest,
  _reply: FastifyReply,
) => {
  return checkDatabaseHealth();
};