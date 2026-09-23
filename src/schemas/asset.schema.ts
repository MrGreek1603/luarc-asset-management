import { z } from "zod";

export const createAssetSchema = z.object({
  code: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(255),
  valueInCents: z.number().int().nonnegative(),
});

export const updateAssetSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    valueInCents: z.number().int().nonnegative().optional(),
    version: z.number().int().nonnegative(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.valueInCents !== undefined,
    {
      message: "At least one field must be provided for update.",
    },
  );

export const assetIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const getAssetsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z
    .enum(["AVAILABLE", "CLAIMED", "EXPIRED"])
    .optional(),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type GetAssetsQuery = z.infer<typeof getAssetsQuerySchema>;