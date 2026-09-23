import { Prisma } from "../generated/prisma/client.js";

import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";

import type {
  CreateAssetInput,
  GetAssetsQuery,
  UpdateAssetInput,
} from "../schemas/asset.schema.js";

export const getAssets = async ({
  page,
  limit,
  status,
}: GetAssetsQuery) => {
  const skip = (page - 1) * limit;

  const where = status
    ? {
        status,
      }
    : {};

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.asset.count({
      where,
    }),
  ]);

  return {
    assets,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getAssetPool = async () => {
  const result = await prisma.asset.groupBy({
    by: ["status"],
    _count: {
      _all: true,
    },
  });

  const pool = {
    total: 0,
    available: 0,
    claimed: 0,
    expired: 0,
  };

  for (const row of result) {
    const count = row._count._all;

    pool.total += count;

    switch (row.status) {
      case "AVAILABLE":
        pool.available = count;
        break;

      case "CLAIMED":
        pool.claimed = count;
        break;

      case "EXPIRED":
        pool.expired = count;
        break;
    }
  }

  return pool;
};

export const createAsset = async (
  input: CreateAssetInput,
) => {
  try {
    return await prisma.asset.create({
      data: {
        code: input.code,
        title: input.title,
        valueInCents: input.valueInCents,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        409,
        "ASSET_CODE_ALREADY_EXISTS",
        "An asset with this code already exists.",
      );
    }

    throw error;
  }
};

export const updateAsset = async (
  assetId: number,
  input: UpdateAssetInput,
) => {
  const result = await prisma.asset.updateMany({
    where: {
      id: assetId,
      version: input.version,
    },
    data: {
      ...(input.title !== undefined && {
        title: input.title,
      }),

      ...(input.valueInCents !== undefined && {
        valueInCents: input.valueInCents,
      }),

      version: {
        increment: 1,
      },
    },
  });

  if (result.count === 0) {
    const assetExists = await prisma.asset.findUnique({
      where: {
        id: assetId,
      },
      select: {
        id: true,
      },
    });

    if (!assetExists) {
      throw new AppError(
        404,
        "ASSET_NOT_FOUND",
        "Asset was not found.",
      );
    }

    throw new AppError(
      409,
      "VERSION_CONFLICT",
      "Asset was modified by another request.",
    );
  }

  const asset = await prisma.asset.findUnique({
    where: {
      id: assetId,
    },
  });

  if (!asset) {
    throw new AppError(
      404,
      "ASSET_NOT_FOUND",
      "Asset was not found.",
    );
  }

  return asset;
};