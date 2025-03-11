import { getStockfishWorker } from "./getStockfishWorker.js";
import { Fen, Move, VerboseMove } from "./common.js";
import { Chess } from "chess.js";

/*

  const stockfish = new Stockfish();
  window.stockfish = stockfish;

  const resultProperty = new Property<StockfishResult | null>(null);
  resultProperty.lazyLink((result) => console.log(result));
  await stockfish.getPropertyEvaluation(
    "rnbqkbnr/p3pppp/2p5/1p6/P1pPP3/8/1P3PPP/RNBQKBNR w KQkq - 0 1",
    "depth 24",
    resultProperty,
  );
  console.log("finished");

 */

export type StockfishOptions = {
  hashSizeInMegabytes?: number;
};

export type StockfishResult = {
  bestMove: Move;
  bestVerboseMove: VerboseMove;
  continuation: VerboseMove[];
  type: "cp" | "mate";
  evaluation: number;
  depth: number;
};

export type StockfishInfo = {
  depth?: number;
  seldepth?: number;
  time?: number;
  nodes?: number;
  pv?: string[];
  multipv?: number;
  score?: {
    type: "cp" | "mate";
    evaluation: number;
    isLowerBound: boolean;
    isUpperBound: boolean;
  };
  currmove?: string;
  currmovenumber?: number;
  hashfull?: number;
  nps?: number;
  tbhits?: number;
  sbhits?: number;
  cpuload?: number;
  string?: string;
  // The engine should only send this if the option "UCI_ShowRefutations" is set to true.
  // refutation?: string[];
  // The engine should only send this if the option "UCI_ShowCurrLine" is set to true.
  // currline?: [ number, ...string[] ]
};

const infoCommands = [
  "depth",
  "seldepth",
  "time",
  "nodes",
  "pv",
  "multipv",
  "score",
  "currmove",
  "currmovenumber",
  "hashfull",
  "nps",
  "tbhits",
  "sbhits",
  "cpuload",
  "string",
  "refutation",
  "currline",
];

type StockfishTask = {
  fen: string;
  timeString: string; // 'depth 20', 'infinite', 'movetime 2000'
  startCallback?: () => void;
  infoCallback?: (info: StockfishInfo) => void;
  completeCallback: (result: StockfishResult) => void;
  // TODO: reject callback?
};

export class Stockfish {
  private readonly worker: Worker;
  private isLoaded: boolean = false;
  private isReady: boolean = false;
  private readonly taskQueue: StockfishTask[] = [];
  private readonly infos: StockfishInfo[] = [];
  private currentTask: StockfishTask | null = null;

  public constructor(providedOptions?: StockfishOptions) {
    // TODO: decide on the best option?
    const hashSizeInMegabytes = providedOptions?.hashSizeInMegabytes ?? 16;

    this.worker = getStockfishWorker();

    this.sendCommand("uci");
    this.sendCommand("isready");
    this.sendCommand("setoption name Use NNUE value true");
    this.sendCommand(`setoption name Hash value ${hashSizeInMegabytes}`);

    // https://gist.github.com/aliostad/f4470274f39d29b788c1b09519e67372

    if (this.worker.addEventListener) {
      this.worker.addEventListener("message", this.onMessage.bind(this));
    } else {
      // @ts-expect-error // worker_threads compatibility
      this.worker.on("message", this.onMessage.bind(this));
    }
  }

  public isBusy(): boolean {
    return this.currentTask !== null;
  }

  public getEvaluation(fen: Fen, timeString: string): Promise<StockfishResult> {
    return new Promise((resolve) => {
      this.taskQueue.push({
        fen: fen,
        timeString: timeString,
        completeCallback: resolve,
      });
      this.checkNextTask();
    });
  }

  public getPropertyEvaluation(
    fen: Fen,
    timeString: string,
    resultProperty: { set value(value: StockfishResult | null) },
  ): Promise<StockfishResult> {
    return new Promise((resolve) => {
      this.taskQueue.push({
        fen: fen,
        timeString: timeString,
        infoCallback: (info) => {
          if (info.pv && info.score) {
            resultProperty.value = Stockfish.resultFromInfo(fen, info);
          }
        },
        completeCallback: (result) => {
          resultProperty.value = result;
          resolve(result);
        },
      });
      this.checkNextTask();
    });
  }

  public startInfiniteEvaluation(
    fen: Fen,
    completeCallback: (result: StockfishResult) => void,
    options?: {
      start?: () => void;
      info?: (info: StockfishInfo) => void;
    },
  ): void {
    this.taskQueue.push({
      fen: fen,
      timeString: "infinite",
      startCallback: options?.start,
      infoCallback: options?.info,
      completeCallback: completeCallback,
    });
    this.checkNextTask();
  }

  public stop(): void {
    this.sendCommand("stop");
  }

  private sendCommand(command: string): void {
    // console.log("command", command);

    this.worker.postMessage(command);
  }

  private onMessage(event: MessageEvent): void {
    const string =
      typeof event === "string" ? (event as string) : (event.data as string);
    console.log(string);

    if (string === "uciok") {
      this.isLoaded = true;
    }
    if (string === "readyok") {
      this.isReady = true;
    }

    const bits = string.split(" ");
    const firstBit = bits[0];

    if (firstBit === "info") {
      const info: StockfishInfo = {};

      let currentCommand: string | null = null;
      let queuedBits: string[] = [];

      const applyCommand = () => {
        if (currentCommand) {
          if (currentCommand === "depth") {
            info.depth = parseInt(queuedBits[0], 10);
          } else if (currentCommand === "seldepth") {
            info.seldepth = parseInt(queuedBits[0], 10);
          } else if (currentCommand === "time") {
            info.time = parseInt(queuedBits[0], 10);
          } else if (currentCommand === "nodes") {
            info.nodes = parseInt(queuedBits[0], 10);
          } else if (currentCommand === "pv") {
            info.pv = queuedBits.slice(); // defensive copy
          } else if (currentCommand === "multipv") {
            info.multipv = parseInt(queuedBits[0], 10);
          } else if (currentCommand === "score") {
            if (queuedBits[0] !== "cp" && queuedBits[0] !== "mate") {
              throw new Error("Invalid score type");
            }
            info.score = {
              type: queuedBits[0] as "cp" | "mate",
              evaluation: parseInt(queuedBits[1], 10),
              isLowerBound: queuedBits.includes("lowerbound"),
              isUpperBound: queuedBits.includes("upperbound"),
            };
          } else if (currentCommand === "currmove") {
            info.currmove = queuedBits[0];
          } else if (currentCommand === "currmovenumber") {
            info.currmovenumber = parseInt(queuedBits[0], 10);
          } else if (currentCommand === "hashfull") {
            info.hashfull = parseInt(queuedBits[0], 10);
          } else if (currentCommand === "nps") {
            info.nps = parseInt(queuedBits[0], 10);
          } else if (currentCommand === "tbhits") {
            info.tbhits = parseInt(queuedBits[0], 10);
          } else if (currentCommand === "sbhits") {
            info.sbhits = parseInt(queuedBits[0], 10);
          } else if (currentCommand === "cpuload") {
            info.cpuload = parseInt(queuedBits[0], 10);
          }
        }
        currentCommand = null;
        queuedBits = [];
      };

      for (let i = 1; i < bits.length; i++) {
        if (bits[i] === "string") {
          info.string = bits.slice(i + 1).join(" ");
        } else if (infoCommands.includes(bits[i])) {
          applyCommand();
          currentCommand = bits[i];
        } else {
          queuedBits.push(bits[i]);
        }
      }
      applyCommand();

      if (this.currentTask) {
        this.infos.push(info);
        this.currentTask.infoCallback?.(info);
      }
    } else if (firstBit === "bestmove") {
      const bestLanMove = bits[1];

      if (this.currentTask) {
        const lastMatchingInfo = this.infos
          .reverse()
          .find((info) => info.score && info.pv && info.pv[0] === bestLanMove);

        if (lastMatchingInfo) {
          this.currentTask.completeCallback?.(
            Stockfish.resultFromInfo(this.currentTask.fen, lastMatchingInfo),
          );

          this.currentTask = null;
          this.checkNextTask();
        } else {
          throw new Error("No matching info found");
        }
      }
    }
  }

  private checkNextTask(): void {
    if (this.currentTask) {
      return;
    }

    const nextTask = this.taskQueue.shift();
    if (nextTask) {
      this.currentTask = nextTask;
      this.sendCommand(`position fen ${nextTask.fen}`);
      this.sendCommand(`go ${nextTask.timeString}`);

      this.currentTask.startCallback?.();
    }
  }

  public static resultFromInfo(fen: Fen, info: StockfishInfo): StockfishResult {
    if (!info.pv || !info.score) {
      throw new Error("Invalid result info");
    }
    const lanMoves = info.pv!;
    const board = new Chess(fen);
    const continuation: VerboseMove[] = [];
    for (const lanMove of lanMoves) {
      const verboseMove = board.move(lanMove);
      if (!verboseMove) {
        throw new Error("Invalid move");
      }
      continuation.push(verboseMove);
    }

    return {
      bestMove: continuation[0].san,
      bestVerboseMove: continuation[0],
      continuation,
      type: info.score!.type,
      evaluation: info.score!.evaluation,
      depth: info.depth ?? 0, // TODO: can we guarantee this?
    };
  }
}
