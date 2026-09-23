import { z } from "zod";

export const claimAssetParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type ClaimAssetParams = z.infer<typeof claimAssetParamsSchema>;