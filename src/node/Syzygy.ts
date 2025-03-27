import { Fen } from "../model/common.js";
import child_process from "child_process";
import { LRUCache } from "lru-cache";

export type SyzygyResult = {
  wdl: number;
  dtz: number;
};

export type SyzygyOptions = {
  cache?: number | LRUCache<Fen, SyzygyResult>;
};

export class Syzygy {
  private readonly process: child_process.ChildProcessWithoutNullStreams;
  private readonly cache: LRUCache<Fen, SyzygyResult> | null;
  private readonly tasks: {
    fen: Fen;
    callback: (result: SyzygyResult) => void;
  }[] = [];

  public constructor(options: SyzygyOptions) {
    if (typeof options.cache === "number") {
      this.cache = new LRUCache({ max: options.cache });
    } else if (options.cache) {
      this.cache = options.cache;
    } else {
      this.cache = null;
    }

    this.process = child_process.spawn(
      "./scripts/syzygy_fens.py",
      [`/Volumes/One Touch/syzygy/to-6`],
      {
        cwd: ".",
      },
    );

    this.process.on("error", (error) => {
      throw error;
    });

    this.process.stdout.on("data", (data: Buffer) => {
      const output = data.toString();

      const lines = output
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const line of lines) {
        const json = JSON.parse(line);

        if (json.error) {
          throw new Error(json.error);
        }

        const fen = json.fen as Fen;
        const wdl = json.wdl as number;
        const dtz = json.dtz as number;

        const result = { wdl, dtz };

        if (this.cache) {
          this.cache.set(fen, result);
        }

        for (let i = this.tasks.length - 1; i >= 0; i--) {
          const task = this.tasks[i];
          if (task.fen === fen) {
            task.callback(result);
            this.tasks.splice(i, 1);
          }
        }
      }
    });
  }

  public async evaluateFen(fen: Fen): Promise<SyzygyResult> {
    const cachedResult = this.cache?.get(fen);
    if (cachedResult) {
      return cachedResult;
    } else {
      const hasFenTask = this.tasks.some((task) => task.fen === fen);

      return new Promise((resolve) => {
        this.tasks.push({
          fen: fen,
          callback: resolve,
        });

        if (!hasFenTask) {
          this.sendFen(fen);
        }
      });
    }
  }

  public async dispose(): Promise<void> {
    this.process.kill();
  }

  private sendFen(fen: Fen): void {
    this.process.stdin.write(fen + "\n");
  }
}
