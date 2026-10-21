import { SystemLogLevel } from "@prisma/client";

export type SystemLogContext = Record<string, unknown>;

export interface SystemLogCreateDto {
  level: SystemLogLevel;
  source: string;
  message: string;
  context?: SystemLogContext;
}
