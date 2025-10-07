export class Semaphore {
  private max: number;
  private active = 0;
  private q: Array<{
    fn: () => Promise<any>;
    resolve: (v: any) => void;
    reject: (e: any) => void;
  }> = [];

  constructor(max: number) {
    this.max = Math.max(1, Number(max || 1));
  }

  setMax(n: number) {
    this.max = Math.max(1, Number(n || 1));
    this.drain();
  }

  getActive() {
    return this.active;
  }

  getQueued() {
    return this.q.length;
  }

  isSaturated(threshold = 5) {
    return this.getQueued() >= threshold;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active < this.max) {
      this.active++;
      return this.exec(fn);
    }
    return new Promise<T>((resolve, reject) => {
      this.q.push({ fn, resolve, reject });
      this.drain();
    });
  }

  private drain() {
    while (this.active < this.max && this.q.length) {
      const task = this.q.shift()!;
      this.active++;
      this.exec(task.fn).then(task.resolve, task.reject);
    }
  }

  private async exec<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } finally {
      this.active--;
      this.drain();
    }
  }
}