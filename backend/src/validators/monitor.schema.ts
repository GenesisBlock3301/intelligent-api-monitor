import { z } from "zod";

export const apiHealthEventSchema = z.object({
  api_name: z.string().trim().min(1),
  response_time_ms: z.number().finite().nonnegative(),
  status_code: z.number().int().min(100).max(599),
  records_returned: z.number().int().nonnegative(),
}).strict();

export const monitorPayloadSchema = z
  .union([apiHealthEventSchema, z.array(apiHealthEventSchema).min(1)])
  .transform((payload) => (Array.isArray(payload) ? payload : [payload]));

export type MonitorPayload = z.infer<typeof monitorPayloadSchema>;
