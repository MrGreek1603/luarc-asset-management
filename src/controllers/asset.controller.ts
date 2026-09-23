import type {
  FastifyReply,
  FastifyRequest,
} from "fastify";

import {
  assetIdParamSchema,
  createAssetSchema,
  getAssetsQuerySchema,
  updateAssetSchema,
} from "../schemas/asset.schema.js";

import {
  createAsset,
  getAssetPool,
  getAssets,
  updateAsset,
} from "../services/asset.service.js";

export const getAssetsController = async (
  request: FastifyRequest,
  _reply: FastifyReply,
) => {
  const result = getAssetsQuerySchema.safeParse(
    request.query,
  );

  if (!result.success) {
    return _reply.status(400).send({
      error: "VALIDATION_ERROR",
      message: "Invalid query parameters.",
      details: result.error.flatten(),
    });
  }

  return getAssets(result.data);
};

export const getAssetPoolController = async (
  _request: FastifyRequest,
  _reply: FastifyReply,
) => {
  return getAssetPool();
};

export const createAssetController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const result = createAssetSchema.safeParse(
    request.body,
  );

  if (!result.success) {
    return reply.status(400).send({
      error: "VALIDATION_ERROR",
      message: "Invalid request body.",
      details: result.error.flatten(),
    });
  }

  const asset = await createAsset(result.data);

  return reply.status(201).send({
    asset,
  });
};

export const updateAssetController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const params = assetIdParamSchema.safeParse(
    request.params,
  );

  if (!params.success) {
    return reply.status(400).send({
      error: "VALIDATION_ERROR",
      message: "Invalid asset ID.",
      details: params.error.flatten(),
    });
  }

  const body = updateAssetSchema.safeParse(
    request.body,
  );

  if (!body.success) {
    return reply.status(400).send({
      error: "VALIDATION_ERROR",
      message: "Invalid request body.",
      details: body.error.flatten(),
    });
  }

  const asset = await updateAsset(
    params.data.id,
    body.data,
  );

  return reply.status(200).send({
    asset,
  });
};