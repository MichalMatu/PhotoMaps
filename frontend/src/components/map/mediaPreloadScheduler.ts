export type MediaPreloadPriority = "high" | "low";

type LoadMedia = (path: string, priority: MediaPreloadPriority) => Promise<void>;
type ScheduleIdle = (callback: () => void) => void;

export class MediaPreloadScheduler {
  private backgroundInFlight = 0;
  private backgroundQueue: string[] = [];
  private backgroundQueued = new Set<string>();
  private idlePumpScheduled = false;
  private interactiveLoads = 0;
  private interactiveIdleWaiters: Array<() => void> = [];

  constructor(
    private readonly loadMedia: LoadMedia,
    private readonly scheduleIdle: ScheduleIdle,
    private readonly backgroundConcurrency = 2,
  ) {}

  clearBackgroundQueue(): void {
    this.backgroundQueue = [];
    this.backgroundQueued.clear();
  }

  enqueueBackground(paths: string[]): void {
    for (const path of paths) {
      if (!path || this.backgroundQueued.has(path)) {
        continue;
      }
      this.backgroundQueue.push(path);
      this.backgroundQueued.add(path);
    }
    this.scheduleBackgroundPump();
  }

  async prioritize(paths: string[]): Promise<void> {
    const uniquePaths = [...new Set(paths.filter(Boolean))];
    if (uniquePaths.length === 0) {
      return;
    }

    const prioritized = new Set(uniquePaths);
    this.backgroundQueue = this.backgroundQueue.filter((path) => !prioritized.has(path));
    for (const path of prioritized) {
      this.backgroundQueued.delete(path);
    }

    await this.runInteractive(async () => {
      await Promise.all(uniquePaths.map((path) => this.loadMedia(path, "high")));
    });
  }

  async runInteractive<T>(task: () => Promise<T>): Promise<T> {
    this.interactiveLoads += 1;
    try {
      return await task();
    } finally {
      this.interactiveLoads -= 1;
      if (this.interactiveLoads === 0) {
        const waiters = this.interactiveIdleWaiters.splice(0);
        for (const resolve of waiters) {
          resolve();
        }
        this.scheduleBackgroundPump();
      }
    }
  }

  waitForInteractiveIdle(): Promise<void> {
    if (this.interactiveLoads === 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => this.interactiveIdleWaiters.push(resolve));
  }

  private scheduleBackgroundPump(): void {
    if (
      this.idlePumpScheduled ||
      this.interactiveLoads > 0 ||
      this.backgroundInFlight >= this.backgroundConcurrency ||
      this.backgroundQueue.length === 0
    ) {
      return;
    }

    this.idlePumpScheduled = true;
    this.scheduleIdle(() => {
      this.idlePumpScheduled = false;
      this.pumpBackgroundQueue();
    });
  }

  private pumpBackgroundQueue(): void {
    if (this.interactiveLoads > 0) {
      return;
    }

    while (this.backgroundInFlight < this.backgroundConcurrency && this.backgroundQueue.length > 0) {
      const path = this.backgroundQueue.shift();
      if (!path) {
        break;
      }
      this.backgroundQueued.delete(path);
      this.backgroundInFlight += 1;
      void this.loadMedia(path, "low").finally(() => {
        this.backgroundInFlight -= 1;
        this.scheduleBackgroundPump();
      });
    }
  }
}
