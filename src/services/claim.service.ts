import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";

export const claimAsset = async (input: {
  assetId: number;
  userId: number;
}) => {
  return prisma.$transaction(async (tx) => {
    const result = await tx.asset.updateMany({
      where: {
        id: input.assetId,
        status: "AVAILABLE",
      },
      data: {
        status: "CLAIMED",
        claimedById: input.userId,
        claimedAt: new Date(),
        version: {
          increment: 1,
        },
      },
    });

    if (result.count === 0) {
      const assetExists = await tx.asset.findUnique({
        where: {
          id: input.assetId,
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
        "ASSET_NOT_AVAILABLE",
        "This asset is no longer available.",
      );
    }

    const claim = await tx.claim.create({
      data: {
        assetId: input.assetId,
        userId: input.userId,
      },
    });

    const asset = await tx.asset.findUnique({
      where: {
        id: input.assetId,
      },
    });

    return {
      asset,
      claim,
    };
  });
};