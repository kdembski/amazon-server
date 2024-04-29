export class RequestQueueService {
  private timeout;
  private interval?: ReturnType<typeof setInterval>;
  private queue: RequestQueueItem<any>[] = [];

  constructor(timeout: number) {
    this.timeout = timeout;
  }

  push<T>(callback: () => Promise<T>) {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    if (!resolve || !reject) return;

    this.queue.push({ callback, resolve, reject });
    if (!this.interval) this.run();

    return promise;
  }

  run() {
    const callback = () => {
      const item = this.queue.shift();
      if (!item) {
        clearInterval(this.interval);
        return;
      }

      item.callback().then(item.resolve).catch(item.reject);
    };

    callback();
    this.interval = setInterval(callback, this.timeout);
  }
}

interface RequestQueueItem<T> {
  callback: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}
