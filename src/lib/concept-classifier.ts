import * as ort from "onnxruntime-web";
import { Chess } from "chess.js";

const CONCEPT_NAMES = [
  "fork_possible",
  "pin_exists",
  "skewer_possible",
  "discovered_attack",
  "back_rank_threat",
  "hanging_piece",
  "overloaded_defender",
  "trapped_piece",
  "passed_pawn",
  "isolated_pawn",
  "doubled_pawn",
  "backward_pawn",
  "open_file_rook",
  "bishop_pair",
  "bad_bishop",
  "knight_outpost",
  "weak_squares",
  "space_advantage",
  "king_exposed",
  "castled",
  "pawn_shield_broken",
  "material_up",
  "material_down",
  "material_imbalance",
  "is_opening",
  "is_middlegame",
  "is_endgame",
];

export { CONCEPT_NAMES };

export interface ConceptResult {
  activations: Float32Array;
  topConcepts: { name: string; activation: number }[];
}

export interface ConceptDiff {
  diff: Float32Array;
  missed: { name: string; delta: number }[];
  gained: { name: string; delta: number }[];
}

const PIECE_MAP: Record<string, [number, number]> = {
  p: [0, 1],
  n: [1, 1],
  b: [2, 1],
  r: [3, 1],
  q: [4, 1],
  k: [5, 1],
  P: [0, 0],
  N: [1, 0],
  B: [2, 0],
  R: [3, 0],
  Q: [4, 0],
  K: [5, 0],
};

function fenToTensor(fen: string): Float32Array {
  const tensor = new Float32Array(15 * 8 * 8);
  const chess = new Chess(fen);
  const board = chess.board();

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (!piece) continue;

      const key = piece.color === "w" ? piece.type.toUpperCase() : piece.type;
      const [pieceIdx, colorOffset] = PIECE_MAP[key];
      const channel = pieceIdx + colorOffset * 6;
      const r = 7 - rank; // chess.js board is rank 8 at index 0
      tensor[channel * 64 + r * 8 + file] = 1.0;
    }
  }

  // Channel 12: side to move
  if (chess.turn() === "w") {
    for (let i = 0; i < 64; i++) {
      tensor[12 * 64 + i] = 1.0;
    }
  }

  // Channel 13: castling rights
  const fenParts = fen.split(" ");
  const castling = fenParts[2] || "-";
  if (castling.includes("K")) tensor[13 * 64 + 0 * 8 + 7] = 1.0;
  if (castling.includes("Q")) tensor[13 * 64 + 0 * 8 + 0] = 1.0;
  if (castling.includes("k")) tensor[13 * 64 + 7 * 8 + 7] = 1.0;
  if (castling.includes("q")) tensor[13 * 64 + 7 * 8 + 0] = 1.0;

  // Channel 14: en passant
  const ep = fenParts[3] || "-";
  if (ep !== "-") {
    const epFile = ep.charCodeAt(0) - "a".charCodeAt(0);
    const epRank = parseInt(ep[1]) - 1;
    tensor[14 * 64 + epRank * 8 + epFile] = 1.0;
  }

  return tensor;
}

let session: ort.InferenceSession | null = null;

async function getSession(): Promise<ort.InferenceSession> {
  if (!session) {
    ort.env.wasm.wasmPaths = "/onnx/";
    session = await ort.InferenceSession.create("/models/concept_classifier.onnx", {
      executionProviders: ["wasm"],
    });
  }
  return session;
}

export async function classifyPosition(fen: string): Promise<ConceptResult> {
  const sess = await getSession();
  const tensor = fenToTensor(fen);
  const inputTensor = new ort.Tensor("float32", tensor, [1, 15, 8, 8]);
  const results = await sess.run({ board: inputTensor });
  const activations = results.concepts.data as Float32Array;

  const topConcepts = CONCEPT_NAMES.map((name, i) => ({
    name,
    activation: activations[i],
  }))
    .sort((a, b) => b.activation - a.activation)
    .slice(0, 5);

  return { activations: new Float32Array(activations), topConcepts };
}

export async function computeConceptDiff(
  fen: string,
  playedMove: string,
  bestMove: string
): Promise<ConceptDiff> {
  const chess = new Chess(fen);

  // Get concept vector after the played move
  const chessPlayed = new Chess(fen);
  try {
    chessPlayed.move(playedMove);
  } catch {
    try {
      const from = playedMove.slice(0, 2);
      const to = playedMove.slice(2, 4);
      const promotion = playedMove[4];
      chessPlayed.move({ from, to, promotion });
    } catch {
      // fallback
    }
  }
  const afterPlayed = await classifyPosition(chessPlayed.fen());

  // Get concept vector after the best move
  const chessBest = new Chess(fen);
  try {
    chessBest.move(bestMove);
  } catch {
    try {
      const from = bestMove.slice(0, 2);
      const to = bestMove.slice(2, 4);
      const promotion = bestMove[4];
      chessBest.move({ from, to, promotion });
    } catch {
      // fallback
    }
  }
  const afterBest = await classifyPosition(chessBest.fen());

  // Diff = best - played (positive = concept present in best but missed in played)
  const diff = new Float32Array(CONCEPT_NAMES.length);
  const missed: { name: string; delta: number }[] = [];
  const gained: { name: string; delta: number }[] = [];

  for (let i = 0; i < CONCEPT_NAMES.length; i++) {
    diff[i] = afterBest.activations[i] - afterPlayed.activations[i];
    if (diff[i] > 0.3) {
      missed.push({ name: CONCEPT_NAMES[i], delta: diff[i] });
    } else if (diff[i] < -0.3) {
      gained.push({ name: CONCEPT_NAMES[i], delta: -diff[i] });
    }
  }

  missed.sort((a, b) => b.delta - a.delta);
  gained.sort((a, b) => b.delta - a.delta);

  return { diff, missed, gained };
}

let modelAvailable: boolean | null = null;

export async function isModelAvailable(): Promise<boolean> {
  if (modelAvailable !== null) return modelAvailable;
  if (typeof window === "undefined") {
    modelAvailable = false;
    return false;
  }
  try {
    const res = await fetch("/models/concept_classifier.onnx", { method: "HEAD" });
    modelAvailable = res.ok;
  } catch {
    modelAvailable = false;
  }
  return modelAvailable;
}
