export interface PositionEval {
  fen: string;
  depth: number;
  score: number; // centipawns from white's perspective
  bestMove: string;
  pv: string[]; // principal variation
}

export interface MistakeInfo {
  moveNumber: number;
  fen: string;
  movePlayed: string;
  bestMove: string;
  evalBefore: number;
  evalAfter: number;
  centipawnLoss: number;
  severity: "inaccuracy" | "mistake" | "blunder";
  gamePhase: "opening" | "middlegame" | "endgame";
}

type MessageHandler = (data: string) => void;

export class StockfishEngine {
  private worker: Worker | null = null;
  private messageHandler: MessageHandler | null = null;
  private ready = false;

  async init(): Promise<void> {
    if (this.worker) return;

    this.worker = new Worker("/stockfish/stockfish-18-lite-single.js");

    return new Promise((resolve) => {
      this.worker!.onmessage = (e) => {
        const line = typeof e.data === "string" ? e.data : e.data?.toString();
        if (line === "uciok") {
          this.ready = true;
          resolve();
        }
        this.messageHandler?.(line);
      };
      this.send("uci");
    });
  }

  private send(cmd: string) {
    this.worker?.postMessage(cmd);
  }

  async evaluate(fen: string, depth: number = 16): Promise<PositionEval> {
    if (!this.ready) await this.init();

    return new Promise((resolve) => {
      let bestMove = "";
      let score = 0;
      let pv: string[] = [];
      let resultDepth = 0;
      const isBlackToMove = fen.split(" ")[1] === "b";

      this.messageHandler = (line: string) => {
        if (line.startsWith("info") && line.includes(" depth ")) {
          const depthMatch = line.match(/\bdepth (\d+)/);
          const currentDepth = depthMatch ? parseInt(depthMatch[1]) : 0;

          if (currentDepth === depth) {
            const scoreMatch = line.match(/score cp (-?\d+)/);
            const mateMatch = line.match(/score mate (-?\d+)/);
            const pvMatch = line.match(/ pv (.+)/);

            if (scoreMatch) score = parseInt(scoreMatch[1]);
            if (mateMatch) {
              const mateIn = parseInt(mateMatch[1]);
              score = mateIn > 0 ? 10000 - mateIn : -10000 + mateIn;
            }
            if (pvMatch) pv = pvMatch[1].split(" ");
            resultDepth = currentDepth;
          }
        }

        if (line.startsWith("bestmove")) {
          const parts = line.split(" ");
          bestMove = parts[1];
          // Stockfish scores are from side-to-move perspective; normalize to white's perspective
          const normalizedScore = isBlackToMove ? -score : score;
          resolve({ fen, depth: resultDepth, score: normalizedScore, bestMove, pv });
        }
      };

      this.send("ucinewgame");
      this.send("position fen " + fen);
      this.send("go depth " + depth);
    });
  }

  async analyzeGame(
    fens: string[],
    moves: string[],
    playerColor: "white" | "black",
    depth: number = 16,
    onProgress?: (current: number, total: number) => void
  ): Promise<MistakeInfo[]> {
    const mistakes: MistakeInfo[] = [];
    const colorMultiplier = playerColor === "white" ? 1 : -1;

    for (let i = 0; i < moves.length; i++) {
      const isPlayerMove =
        (i % 2 === 0 && playerColor === "white") ||
        (i % 2 === 1 && playerColor === "black");

      if (!isPlayerMove) continue;

      onProgress?.(i, moves.length);

      const evalBefore = await this.evaluate(fens[i], depth);
      const evalAfter = await this.evaluate(fens[i + 1], depth);

      // Scores are normalized to white's perspective, so multiply by colorMultiplier
      // to get "from player's perspective" — positive = good for player
      const scoreBefore = evalBefore.score * colorMultiplier;
      const scoreAfter = evalAfter.score * colorMultiplier;
      const cpLoss = scoreBefore - scoreAfter;

      if (cpLoss > 50) {
        const moveNumber = Math.floor(i / 2) + 1;
        mistakes.push({
          moveNumber,
          fen: fens[i],
          movePlayed: moves[i],
          bestMove: evalBefore.bestMove,
          evalBefore: evalBefore.score,
          evalAfter: evalAfter.score,
          centipawnLoss: cpLoss,
          severity: classifySeverity(cpLoss),
          gamePhase: classifyGamePhase(fens[i], i),
        });
      }
    }

    return mistakes;
  }

  destroy() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
  }
}

function classifySeverity(
  cpLoss: number
): "inaccuracy" | "mistake" | "blunder" {
  if (cpLoss >= 200) return "blunder";
  if (cpLoss >= 100) return "mistake";
  return "inaccuracy";
}

function classifyGamePhase(fen: string, moveIndex: number): "opening" | "middlegame" | "endgame" {
  const pieces = fen.split(" ")[0].replace(/[^a-zA-Z]/g, "");
  const pieceCount = pieces.replace(/[kKpP]/g, "").length;

  if (moveIndex < 20) return "opening";
  if (pieceCount <= 6) return "endgame";
  return "middlegame";
}

let engineInstance: StockfishEngine | null = null;

export function getEngine(): StockfishEngine {
  if (!engineInstance) {
    engineInstance = new StockfishEngine();
  }
  return engineInstance;
}

export class StockfishPool {
  private engines: StockfishEngine[] = [];
  private busy: Set<number> = new Set();
  private readonly size: number;

  constructor(size: number = 2) {
    // Cap at navigator.hardwareConcurrency or 4
    const maxWorkers = typeof navigator !== "undefined"
      ? Math.min(navigator.hardwareConcurrency || 2, 4)
      : 2;
    this.size = Math.min(size, maxWorkers);
  }

  async init(): Promise<void> {
    while (this.engines.length < this.size) {
      const engine = new StockfishEngine();
      await engine.init();
      this.engines.push(engine);
    }
  }

  private async acquire(): Promise<{ engine: StockfishEngine; idx: number }> {
    // Wait for a free engine
    while (true) {
      for (let i = 0; i < this.engines.length; i++) {
        if (!this.busy.has(i)) {
          this.busy.add(i);
          return { engine: this.engines[i], idx: i };
        }
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  private release(idx: number) {
    this.busy.delete(idx);
  }

  async analyzeGame(
    fens: string[],
    moves: string[],
    playerColor: "white" | "black",
    depth: number = 16,
    onProgress?: (current: number, total: number) => void
  ): Promise<MistakeInfo[]> {
    const { engine, idx } = await this.acquire();
    try {
      return await engine.analyzeGame(fens, moves, playerColor, depth, onProgress);
    } finally {
      this.release(idx);
    }
  }

  destroy() {
    for (const engine of this.engines) engine.destroy();
    this.engines = [];
    this.busy.clear();
  }
}

let poolInstance: StockfishPool | null = null;

export function getPool(size: number = 2): StockfishPool {
  if (!poolInstance) {
    poolInstance = new StockfishPool(size);
  }
  return poolInstance;
}
