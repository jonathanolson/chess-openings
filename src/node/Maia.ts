import _ from "lodash";
import fs from "fs";
import { Fen, Move } from "../model/common.js";
import child_process from "child_process";
import { Chess } from "chess.js";
import { Lock } from "./Lock.js";
import { LRUCache } from "lru-cache";

export type MaiaResult = Record<Move, number>;

export type MaiaOptions = {
  elo: 1100 | 1200 | 1300 | 1400 | 1500 | 1600 | 1700 | 1800 | 1900;
  logOutput?: boolean;
  cache?: number | LRUCache<Fen, MaiaResult>;
};

export class Maia {
  private readonly process: child_process.ChildProcessWithoutNullStreams;
  private readonly lock: Lock;
  private readonly cache: LRUCache<Fen, MaiaResult> | null;

  public constructor(options: MaiaOptions) {
    const weightsFile = `./data/maia-weights/maia-${options.elo}.pb.gz`;

    if (!fs.existsSync(weightsFile)) {
      throw new Error(`Weights file not found: ${weightsFile}`);
    }

    this.lock = new Lock();

    if (typeof options.cache === "number") {
      this.cache = new LRUCache({ max: options.cache });
    } else if (options.cache) {
      this.cache = options.cache;
    } else {
      this.cache = null;
    }

    this.process = child_process.spawn("lc0", [`--weights=${weightsFile}`], {
      cwd: ".",
    });

    this.process.on("error", (error) => {
      throw error;
    });

    if (options.logOutput) {
      this.process.stdout.on("data", (data) => {
        console.log(data.toString());
      });
    }

    this.sendCommand("uci");
    this.sendCommand("ucinewgame");
    this.sendCommand("setoption name VerboseMoveStats value true");

    // TODO: no isready needed?
  }

  public async evaluateFen(fen: Fen): Promise<MaiaResult> {
    const cachedResult = this.cache?.get(fen);
    if (cachedResult) {
      return cachedResult;
    }

    return this.lock.runExclusive(() => {
      return new Promise((resolve) => {
        // RE-check the cache, since we may have already had a request for it.
        // const cachedResult = this.cache?.get(fen);
        // if (cachedResult) {
        //   resolve(cachedResult);
        // }
        // TODO: why errors from this?

        const result: MaiaResult = {};
        const moveMap: Record<string, Move> = {}; // convert to SAN

        // Set up defaults
        for (const verboseMove of new Chess(fen).moves({ verbose: true })) {
          const move = verboseMove.san;
          result[move] = 0;
          moveMap[verboseMove.lan] = move;
        }

        const handler = (data: Buffer) => {
          const output = data.toString();

          const lines = output
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

          for (const line of lines) {
            // Extract the last depth and score from "info depth" lines
            const infoMatch = line.match(
              /info string ([^ ]+) .*? ?\(P: +(\d+\.\d+)%/,
            );
            if (infoMatch) {
              const uciMove = infoMatch[1];

              if (uciMove !== "node") {
                const policy =
                  Math.round(parseFloat(infoMatch[2]) * 100) / 10000;

                const move = moveMap[uciMove];

                if (!move) {
                  throw new Error(`Move not found: ${uciMove}`);
                }

                result[move] = policy;
              }
            }

            const bestmoveMatch = line.match(/bestmove /);
            if (bestmoveMatch) {
              this.process.stdout.off("data", handler); // Remove listener after first response

              // TODO: potentially validate things adding up to 1?

              const sortedResult: MaiaResult = {};

              const sortedKeys = _.sortBy(
                Object.keys(result),
                (key) => -result[key],
              );
              for (const key of sortedKeys) {
                sortedResult[key] = result[key];
              }

              if (this.cache) {
                this.cache.set(fen, sortedResult);
              }

              resolve(sortedResult);
            }
          }
        };

        this.process.stdout.on("data", handler);

        this.sendCommand(`position fen ${fen}`);
        this.sendCommand(`go nodes 1`);
      });
    });
  }

  public async dispose(): Promise<void> {
    this.process.kill();
  }

  private sendCommand(cmd: string): void {
    this.process.stdin.write(cmd + "\n");
  }
}

export const sampleMaiaResult = (result: MaiaResult): Move => {
  const moves = Object.keys(result);
  if (moves.length === 0) {
    throw new Error("MaiaResult is empty; no moves to sample.");
  }

  const total = moves.reduce((acc, move) => acc + result[move], 0);
  if (total <= 0 || isNaN(total)) {
    throw new Error("Total probability is non-positive or invalid: " + total);
  }

  let threshold = Math.random() * total;

  for (const move of moves) {
    threshold -= result[move];
    if (threshold <= 0) {
      return move;
    }
  }

  return moves[moves.length - 1];
};
