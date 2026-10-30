import { vi } from "vitest";
import type { Request, Response, Router } from "express";
import type { PrismaClient } from "@prisma/client";
import type { ActivityEventService } from "@/modules/monitoring/services/ActivityEventService";
import type { ActivityCountService } from "@/modules/monitoring/services/ActivityCountService";
import type { ScraperMetricService } from "@/modules/monitoring/services/ScraperMetricService";
import type { ScraperConfigService } from "@/modules/monitoring/services/ScraperConfigService";
import type { DiscordService } from "@/shared/discord/DiscordService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import type { AmazonCountryOutlierDiscordService } from "@/modules/marketplaces/amazon/services/AmazonCountryOutlierDiscordService";
import type { AmazonPriceDropDiscordService } from "@/modules/marketplaces/amazon/services/AmazonPriceDropDiscordService";
import type { ExclusionRuleFingerprintRepository } from "@/modules/exclusion-rules/repositories/ExclusionRuleFingerprintRepository";

export function fakeActivityEventService() {
  const create = vi.fn().mockResolvedValue({ id: 1 });
  const getCount = vi.fn().mockResolvedValue(0);
  const deleteOlderThan = vi.fn().mockResolvedValue(0);
  const service = {
    creatable: { create },
    getCount,
    deleteOlderThan,
  } as unknown as ActivityEventService;
  return { service, create, getCount, deleteOlderThan };
}

export function fakeActivityCountService() {
  const increment = vi.fn();
  const flush = vi.fn().mockResolvedValue(undefined);
  const getCount = vi.fn().mockResolvedValue(0);
  const getCountWithMinPrices = vi.fn().mockResolvedValue(0);
  const service = {
    increment,
    flush,
    getCount,
    getCountWithMinPrices,
  } as unknown as ActivityCountService;
  return { service, increment, flush, getCount, getCountWithMinPrices };
}

export function fakeSystemLogService() {
  const error = vi.fn();
  const warn = vi.fn();
  const info = vi.fn();
  const deleteOlderThan = vi.fn().mockResolvedValue(0);
  const service = {
    error,
    warn,
    info,
    deleteOlderThan,
  } as unknown as SystemLogService;
  return { service, error, warn, info, deleteOlderThan };
}

// The fake that tests/unit/setup.ts installs as the SystemLogService singleton.
export function unitLogger() {
  return vi.mocked(SystemLogService.getInstance());
}

export function fakeScraperMetricService() {
  const add = vi.fn().mockResolvedValue(0);
  const deleteOlderThan = vi.fn().mockResolvedValue(0);
  const getSummaries = vi.fn().mockResolvedValue([]);
  const getSeries = vi.fn().mockResolvedValue([]);
  const service = {
    add,
    deleteOlderThan,
    getSummaries,
    getSeries,
  } as unknown as ScraperMetricService;
  return { service, add, deleteOlderThan, getSummaries, getSeries };
}

export function fakeScraperConfigService() {
  const get = vi.fn();
  const service = { get } as unknown as ScraperConfigService;
  return { service, get };
}

export function fakeAmazonCountryOutlierDiscordService() {
  const send = vi.fn().mockResolvedValue(undefined);
  const setChannel = vi.fn();
  const service = {
    send,
    setChannel,
  } as unknown as AmazonCountryOutlierDiscordService;
  return { service, send, setChannel };
}

export function fakeAmazonPriceDropDiscordService() {
  const send = vi.fn().mockResolvedValue(undefined);
  const service = { send } as unknown as AmazonPriceDropDiscordService;
  return { service, send };
}

export function fakeDiscordService() {
  const send = vi.fn();
  const clientSetter = vi.fn();
  const service = {
    send,
    set client(envVarName: string) {
      clientSetter(envVarName);
    },
  } as unknown as DiscordService;
  return { service, send, clientSetter };
}

export function fakeResponse() {
  const json = vi.fn();
  const send = vi.fn();
  const status = vi.fn();
  const response = { json, send, status } as unknown as Response;
  status.mockReturnValue(response);
  return { response, json, send, status };
}

export function fakeRequest(
  overrides: {
    params?: Record<string, string>;
    query?: Record<string, string>;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
) {
  return {
    params: {},
    query: {},
    body: undefined,
    headers: {},
    ...overrides,
  } as unknown as Request<any, any, any, any>;
}

export type RouteCall = { method: string; path?: string; handler: unknown };

export function fakeRouter() {
  const calls: RouteCall[] = [];
  // Express semantics: `use(handler)` vs `use(path, handler)` /
  // `get(path, handler)`. Decide by arity, not by the first argument's type,
  // so string tags returned by fakeSubRouter are recorded as handlers.
  const record = (method: string) =>
    vi.fn((...args: unknown[]) => {
      if (args.length >= 2 && typeof args[0] === "string") {
        calls.push({ method, path: args[0], handler: args[1] });
      } else {
        calls.push({ method, handler: args[0] });
      }
    });
  const router = {
    get: record("get"),
    post: record("post"),
    put: record("put"),
    delete: record("delete"),
    use: record("use"),
  } as unknown as Router;
  return { router, calls };
}

// Registration order as [method, path] for routes and [method, tag] for
// mounted sub-routers (see fakeSubRouter).
export const routeTable = (calls: RouteCall[]) =>
  calls.map((c) => (c.method === "use" ? [c.method, c.handler] : [c.method, c.path]));

export function fakeSubRouter<T>(tag: string) {
  const build = vi.fn().mockReturnValue({ router: tag });
  return { build } as unknown as T;
}

export function fakeDelegate() {
  return {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirstOrThrow: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    aggregate: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

export function fakePrisma() {
  const delegates = {
    amazonAd: fakeDelegate(),
    amazonAdPrice: fakeDelegate(),
    amazonAdCategory: fakeDelegate(),
    amazonCountry: fakeDelegate(),
    country: fakeDelegate(),
    currency: fakeDelegate(),
    currencyExchangeRate: fakeDelegate(),
    activityEvent: fakeDelegate(),
    systemLog: { ...fakeDelegate(), groupBy: vi.fn() },
    amazonExclusionRule: fakeDelegate(),
    scraperMetric: {
      ...fakeDelegate(),
      createMany: vi.fn(),
      groupBy: vi.fn(),
    },
    scraperConfig: { upsert: vi.fn() },
    exclusionRuleFingerprint: { findUnique: vi.fn(), upsert: vi.fn() },
  };
  const $executeRaw = vi.fn().mockResolvedValue(1);
  const $queryRaw = vi.fn().mockResolvedValue([]);
  const $transaction = vi.fn((operations: unknown[]) => Promise.all(operations));
  const prisma = { ...delegates, $executeRaw, $queryRaw, $transaction } as unknown as PrismaClient;
  return { prisma, $executeRaw, $queryRaw, $transaction, ...delegates };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export function resetSingleton(klass: unknown) {
  (klass as { instance?: unknown }).instance = undefined;
}

// Keeps the stored fingerprints in memory, like the table would
export function fakeExclusionRuleFingerprintRepository(
  stored = new Map<string, Map<string, string>>()
) {
  const getByMarketplace = vi.fn(async (marketplace: string) => stored.get(marketplace));
  const set = vi.fn(async (marketplace: string, fingerprint: Map<string, string>) => {
    stored.set(marketplace, fingerprint);
  });
  const repository = { getByMarketplace, set } as unknown as ExclusionRuleFingerprintRepository;
  return { repository, stored, getByMarketplace, set };
}
