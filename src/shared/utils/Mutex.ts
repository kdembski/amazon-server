// Runs callbacks one at a time, in the order they were passed
export class Mutex {
  private last: Promise<unknown> = Promise.resolve();

  run<T>(callback: () => Promise<T>): Promise<T> {
    const result = this.last.then(callback);
    this.last = result.catch(() => undefined);
    return result;
  }
}
