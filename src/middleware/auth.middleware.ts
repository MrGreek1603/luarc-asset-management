import type { FastifyReply, FastifyRequest } from "fastify";

export const authenticate = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({
      error: "UNAUTHORIZED",
      message: "Authentication required.",
    });
  }
};