import type { FastifyReply, FastifyRequest } from "fastify";

import {
  loginSchema,
  registerSchema,
} from "../schemas/auth.schema.js";

import {
  authenticateUser,
  registerUser,
} from "../services/auth.service.js";

export const registerController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const result = registerSchema.safeParse(request.body);

  if (!result.success) {
    return reply.status(400).send({
      error: "VALIDATION_ERROR",
      message: "Invalid request body.",
      details: result.error.flatten(),
    });
  }

  const user = await registerUser(result.data);

  return reply.status(201).send({
    user,
  });
};

export const loginController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const result = loginSchema.safeParse(request.body);

  if (!result.success) {
    return reply.status(400).send({
      error: "VALIDATION_ERROR",
      message: "Invalid request body.",
      details: result.error.flatten(),
    });
  }

  const user = await authenticateUser(result.data);

  const token = await request.server.jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    {
      expiresIn: "1h",
    },
  );

  return reply.status(200).send({
    token,
    user: {
      id: user.id,
      email: user.email,
    },
  });
};