export class Lock {
  private promise: Promise<void> = Promise.resolve();

  public acquire(): Promise<() => void> {
    let release!: () => void;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });

    const previous = this.promise;
    this.promise = this.promise.then(() => wait);

    return previous.then(() => release);
  }

  public async runExclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
}
