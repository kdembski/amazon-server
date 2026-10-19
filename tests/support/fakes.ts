import { vi } from "vitest";
import type { Request, Response, Router } from "express";
import type { PrismaClient } from "@prisma/client";
import type { ActivityEventService } from "@/modules/monitoring/services/ActivityEventService";
import type { ScraperMetricService } from "@/modules/monitoring/services/ScraperMetricService";
import type { DiscordService } from "@/shared/discord/DiscordService";
import type { AmazonConversionErrorDiscordService } from "@/modules/marketplaces/amazon/services/AmazonConversionErrorDiscordService";
import type { AmazonPricingErrorDiscordService } from "@/modules/marketplaces/amazon/services/AmazonPricingErrorDiscordService";

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

export function fakeScraperMetricService() {
  const add = vi.fn().mockResolvedValue(0);
  const deleteOlderThan = vi.fn().mockResolvedValue(0);
  const getSummaries = vi.fn().mockResolvedValue([]);
  const service = {
    add,
    deleteOlderThan,
    getSummaries,
  } as unknown as ScraperMetricService;
  return { service, add, deleteOlderThan, getSummaries };
}

export function fakeAmazonConversionErrorDiscordService() {
  const send = vi.fn().mockResolvedValue(undefined);
  const setChannel = vi.fn();
  const service = {
    send,
    setChannel,
  } as unknown as AmazonConversionErrorDiscordService;
  return { service, send, setChannel };
}

export function fakeAmazonPricingErrorDiscordService() {
  const send = vi.fn().mockResolvedValue(undefined);
  const service = { send } as unknown as AmazonPricingErrorDiscordService;
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
  } = {}
) {
  return {
    params: {},
    query: {},
    body: undefined,
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
    update: vi.fn(),
    delete: vi.fn(),
  };
}

export function fakePrisma() {
  const delegates = {
    amazonAd: fakeDelegate(),
    amazonAdPrice: fakeDelegate(),
    amazonAdCategory: fakeDelegate(),
    country: fakeDelegate(),
    currency: fakeDelegate(),
    currencyExchangeRate: fakeDelegate(),
    activityEvent: fakeDelegate(),
    amazonSearchRule: fakeDelegate(),
    scraperMetric: {
      ...fakeDelegate(),
      createMany: vi.fn(),
      groupBy: vi.fn(),
    },
  };
  const $executeRaw = vi.fn().mockResolvedValue(1);
  const $transaction = vi.fn((operations: unknown[]) => Promise.all(operations));
  const prisma = { ...delegates, $executeRaw, $transaction } as unknown as PrismaClient;
  return { prisma, $executeRaw, $transaction, ...delegates };
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
