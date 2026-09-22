import { describe, expect, it } from "vitest";

import { MediaPreloadScheduler, type MediaPreloadPriority } from "./mediaPreloadScheduler";

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
};

function deferred(): Deferred {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("MediaPreloadScheduler", () => {
  it("pauses queued background work while an interactive load is active", async () => {
    const pending = new Map<string, Deferred>();
    const starts: Array<[string, MediaPreloadPriority]> = [];
    const loader = (path: string, priority: MediaPreloadPriority) => {
      starts.push([path, priority]);
      const task = deferred();
      pending.set(path, task);
      return task.promise;
    };
    const scheduler = new MediaPreloadScheduler(loader, (callback) => callback(), 2);

    scheduler.enqueueBackground(["bg-1", "bg-2", "bg-3"]);
    expect(starts).toEqual([
      ["bg-1", "low"],
      ["bg-2", "low"],
    ]);

    const interactive = scheduler.prioritize(["selected"]);
    expect(starts[starts.length - 1]).toEqual(["selected", "high"]);

    pending.get("bg-1")?.resolve();
    pending.get("bg-2")?.resolve();
    await flushMicrotasks();
    expect(starts.some(([path]) => path === "bg-3")).toBe(false);

    pending.get("selected")?.resolve();
    await interactive;
    await flushMicrotasks();
    expect(starts[starts.length - 1]).toEqual(["bg-3", "low"]);
  });

  it("removes a queued background image when user intent promotes it", async () => {
    const pending = new Map<string, Deferred>();
    const starts: Array<[string, MediaPreloadPriority]> = [];
    const loader = (path: string, priority: MediaPreloadPriority) => {
      starts.push([path, priority]);
      const task = deferred();
      pending.set(`${path}:${priority}`, task);
      return task.promise;
    };
    const scheduler = new MediaPreloadScheduler(loader, (callback) => callback(), 1);

    scheduler.enqueueBackground(["bg-active", "clicked"]);
    const interactive = scheduler.prioritize(["clicked"]);
    expect(starts).toEqual([
      ["bg-active", "low"],
      ["clicked", "high"],
    ]);

    pending.get("clicked:high")?.resolve();
    await interactive;
    pending.get("bg-active:low")?.resolve();
    await flushMicrotasks();

    expect(starts.filter(([path]) => path === "clicked")).toHaveLength(1);
  });
});
