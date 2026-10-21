import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { fakeSystemLogService } from "../support/fakes";

// Classes default their logger to getInstance(); unit tests read the calls from this fake.
(SystemLogService as unknown as { instance: unknown }).instance =
  fakeSystemLogService().service;
