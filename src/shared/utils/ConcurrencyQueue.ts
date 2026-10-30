// Runs at most `concurrency` tasks at once, the others in the order they were added;
// a task gets how long it waited in the queue
export class ConcurrencyQueue {
  private concurrency;
  private tasks: { run: (waitedMs: number) => Promise<unknown>; addedAt: number }[] = [];
  private running = 0;

  constructor(concurrency: number) {
    this.concurrency = concurrency;
  }

  get size() {
    return this.tasks.length;
  }

  add(run: (waitedMs: number) => Promise<unknown>) {
    this.tasks.push({ run, addedAt: Date.now() });
    this.next();
  }

  private next() {
    while (this.running < this.concurrency && this.tasks.length) {
      const { run, addedAt } = this.tasks.shift()!;
      this.running++;
      run(Date.now() - addedAt)
        .catch(() => undefined)
        .finally(() => {
          this.running--;
          this.next();
        });
    }
  }
}
