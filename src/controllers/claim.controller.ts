import type { FastifyReply, FastifyRequest } from "fastify";
import { claimAssetParamsSchema } from "../schemas/claim.schema.js";
import { claimAsset } from "../services/claim.service.js";

export const claimAssetController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const params = claimAssetParamsSchema.safeParse(request.params);

  if (!params.success) {
    return reply.status(400).send({
      error: "VALIDATION_ERROR",
      message: "Invalid asset ID.",
      details: params.error.flatten(),
    });
  }

  const result = await claimAsset({
    assetId: params.data.id,
    userId: request.user.userId,
  });

  return reply.status(201).send(result);
};