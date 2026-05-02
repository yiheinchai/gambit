import * as ort from "onnxruntime-web";
import { Chess } from "chess.js";
import { assetUrl } from "./base-path";

let CONCEPT_NAMES: string[] = [];
let conceptDim = 0;

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
  p: [0, 1], n: [1, 1], b: [2, 1], r: [3, 1], q: [4, 1], k: [5, 1],
  P: [0, 0], N: [1, 0], B: [2, 0], R: [3, 0], Q: [4, 0], K: [5, 0],
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
      const r = 7 - rank;
      tensor[channel * 64 + r * 8 + file] = 1.0;
    }
  }

  if (chess.turn() === "w") {
    for (let i = 0; i < 64; i++) tensor[12 * 64 + i] = 1.0;
  }

  const fenParts = fen.split(" ");
  const castling = fenParts[2] || "-";
  if (castling.includes("K")) tensor[13 * 64 + 0 * 8 + 7] = 1.0;
  if (castling.includes("Q")) tensor[13 * 64 + 0 * 8 + 0] = 1.0;
  if (castling.includes("k")) tensor[13 * 64 + 7 * 8 + 7] = 1.0;
  if (castling.includes("q")) tensor[13 * 64 + 7 * 8 + 0] = 1.0;

  const ep = fenParts[3] || "-";
  if (ep !== "-") {
    const epFile = ep.charCodeAt(0) - "a".charCodeAt(0);
    const epRank = parseInt(ep[1]) - 1;
    tensor[14 * 64 + epRank * 8 + epFile] = 1.0;
  }

  return tensor;
}

let session: ort.InferenceSession | null = null;
let modelVersion: string | null = null;

async function getSession(): Promise<ort.InferenceSession> {
  if (!session) {
    ort.env.wasm.wasmPaths = assetUrl("onnx/");
    session = await ort.InferenceSession.create(assetUrl("models/concept_classifier.onnx"), {
      executionProviders: ["wasm"],
    });

    try {
      const res = await fetch(assetUrl("models/concepts.json"));
      if (res.ok) {
        const manifest = await res.json();
        CONCEPT_NAMES = manifest.concept_names || [];
        conceptDim = manifest.concept_dim || CONCEPT_NAMES.length;
        modelVersion = `${manifest.type || "unknown"}-${conceptDim}`;
      }
    } catch { /* use defaults */ }
  }
  return session;
}

export function getModelVersion(): string | null {
  return modelVersion;
}

export async function classifyPosition(fen: string): Promise<ConceptResult> {
  const sess = await getSession();
  const tensor = fenToTensor(fen);
  const inputTensor = new ort.Tensor("float32", tensor, [1, 15, 8, 8]);
  const results = await sess.run({ board: inputTensor });
  const activations = results.concepts.data as Float32Array;

  const topConcepts = Array.from(activations)
    .map((val, i) => ({ name: CONCEPT_NAMES[i] || `feature_${i}`, activation: val }))
    .filter((c) => c.activation > 0)
    .sort((a, b) => b.activation - a.activation)
    .slice(0, 5);

  return { activations: new Float32Array(activations), topConcepts };
}

export async function computeConceptDiff(
  fen: string,
  playedMove: string,
  bestMove: string
): Promise<ConceptDiff> {
  function tryMove(fromFen: string, move: string): string {
    const chess = new Chess(fromFen);
    try {
      chess.move(move);
      return chess.fen();
    } catch {
      try {
        const from = move.slice(0, 2);
        const to = move.slice(2, 4);
        const promotion = move[4];
        chess.move({ from, to, promotion });
        return chess.fen();
      } catch {
        return fromFen;
      }
    }
  }

  const afterPlayed = await classifyPosition(tryMove(fen, playedMove));
  const afterBest = await classifyPosition(tryMove(fen, bestMove));

  const dim = afterBest.activations.length;
  const diff = new Float32Array(dim);
  const missed: { name: string; delta: number }[] = [];
  const gained: { name: string; delta: number }[] = [];

  for (let i = 0; i < dim; i++) {
    diff[i] = afterBest.activations[i] - afterPlayed.activations[i];
    const name = CONCEPT_NAMES[i] || `feature_${i}`;
    if (diff[i] > 0.1) {
      missed.push({ name, delta: diff[i] });
    } else if (diff[i] < -0.1) {
      gained.push({ name, delta: -diff[i] });
    }
  }

  missed.sort((a, b) => b.delta - a.delta);
  gained.sort((a, b) => b.delta - a.delta);

  return { diff, missed, gained };
}

let modelAvailable: boolean | null = null;

export async function isModelAvailable(): Promise<boolean> {
  if (modelAvailable !== null) return modelAvailable;
  if (typeof window === "undefined") { modelAvailable = false; return false; }
  try {
    const res = await fetch(assetUrl("models/concept_classifier.onnx"), { method: "HEAD" });
    modelAvailable = res.ok;
  } catch {
    modelAvailable = false;
  }
  return modelAvailable;
}
