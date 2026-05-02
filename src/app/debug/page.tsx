
import { useState } from "react";

interface TestResult {
  name: string;
  status: "pending" | "running" | "pass" | "fail";
  detail: string;
  duration?: number;
}

export default function DebugPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  function update(name: string, patch: Partial<TestResult>) {
    setResults((prev) =>
      prev.map((r) => (r.name === name ? { ...r, ...patch } : r))
    );
  }

  async function runTests() {
    setRunning(true);
    const tests: TestResult[] = [
      { name: "Stockfish JS loads", status: "pending", detail: "" },
      { name: "Stockfish UCI init", status: "pending", detail: "" },
      { name: "Position evaluation", status: "pending", detail: "" },
      { name: "Chess.com API fetch", status: "pending", detail: "" },
      { name: "PGN parsing", status: "pending", detail: "" },
      { name: "IndexedDB access", status: "pending", detail: "" },
      { name: "ONNX concept model", status: "pending", detail: "" },
      { name: "Concept diff pipeline", status: "pending", detail: "" },
    ];
    setResults(tests);

    // Test 1: Stockfish JS loads as Worker
    update("Stockfish JS loads", { status: "running" });
    try {
      const t0 = performance.now();
      const base = import.meta.env.BASE_URL || "/";
      const worker = new Worker(`${base}stockfish/stockfish-18-lite-single.js`);
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout after 10s")), 10000);
        worker.onmessage = (e) => {
          const line = typeof e.data === "string" ? e.data : "";
          if (line.includes("Stockfish") || line === "uciok" || line.startsWith("id")) {
            clearTimeout(timeout);
            resolve();
          }
        };
        worker.onerror = (e) => {
          clearTimeout(timeout);
          reject(new Error(e.message || "Worker error"));
        };
        worker.postMessage("uci");
      });
      const dur = Math.round(performance.now() - t0);
      update("Stockfish JS loads", { status: "pass", detail: `Worker created in ${dur}ms`, duration: dur });

      // Test 2: UCI init
      update("Stockfish UCI init", { status: "running" });
      const t1 = performance.now();
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout waiting for uciok")), 15000);
        worker.onmessage = (e) => {
          const line = typeof e.data === "string" ? e.data : "";
          if (line === "uciok") {
            clearTimeout(timeout);
            resolve();
          }
        };
        worker.postMessage("uci");
      });
      const dur1 = Math.round(performance.now() - t1);
      update("Stockfish UCI init", { status: "pass", detail: `UCI ready in ${dur1}ms`, duration: dur1 });

      // Test 3: Evaluate a position
      update("Position evaluation", { status: "running" });
      const t2 = performance.now();
      const evalResult = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout on eval")), 30000);
        let bestMove = "";
        let score = "";
        worker.onmessage = (e) => {
          const line = typeof e.data === "string" ? e.data : "";
          if (line.includes("score cp")) {
            const m = line.match(/score cp (-?\d+)/);
            if (m) score = m[1];
          }
          if (line.startsWith("bestmove")) {
            bestMove = line.split(" ")[1];
            clearTimeout(timeout);
            resolve(`bestmove=${bestMove}, score=${score}cp`);
          }
        };
        worker.postMessage("position startpos");
        worker.postMessage("go depth 10");
      });
      const dur2 = Math.round(performance.now() - t2);
      update("Position evaluation", { status: "pass", detail: `${evalResult} (${dur2}ms)`, duration: dur2 });

      worker.terminate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      for (const name of ["Stockfish JS loads", "Stockfish UCI init", "Position evaluation"]) {
        setResults((prev) =>
          prev.map((r) => r.name === name && r.status !== "pass" ? { ...r, status: "fail", detail: msg } : r)
        );
      }
    }

    // Test 4: Chess.com API
    update("Chess.com API fetch", { status: "running" });
    try {
      const t3 = performance.now();
      const res = await fetch("https://api.chess.com/pub/player/erik/stats");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const blitz = data?.chess_blitz?.last?.rating || "N/A";
      const dur3 = Math.round(performance.now() - t3);
      update("Chess.com API fetch", { status: "pass", detail: `erik blitz: ${blitz} (${dur3}ms)`, duration: dur3 });
    } catch (err) {
      update("Chess.com API fetch", { status: "fail", detail: err instanceof Error ? err.message : String(err) });
    }

    // Test 5: PGN parsing
    update("PGN parsing", { status: "running" });
    try {
      const { Chess } = await import("chess.js");
      const chess = new Chess();
      const pgn = `[Event "Test"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 *`;
      chess.loadPgn(pgn);
      const history = chess.history();
      if (history.length !== 7) throw new Error(`Expected 7 moves, got ${history.length}`);
      update("PGN parsing", { status: "pass", detail: `Parsed ${history.length} moves: ${history.join(" ")}` });
    } catch (err) {
      update("PGN parsing", { status: "fail", detail: err instanceof Error ? err.message : String(err) });
    }

    // Test 6: IndexedDB
    update("IndexedDB access", { status: "running" });
    try {
      const { getDB } = await import("@/lib/db");
      const db = await getDB();
      const storeNames = Array.from(db.objectStoreNames);
      update("IndexedDB access", {
        status: "pass",
        detail: `Stores: ${storeNames.join(", ")}`,
      });
    } catch (err) {
      update("IndexedDB access", { status: "fail", detail: err instanceof Error ? err.message : String(err) });
    }

    // Test 7: ONNX concept model
    update("ONNX concept model", { status: "running" });
    try {
      const t5 = performance.now();
      const { isModelAvailable, classifyPosition } = await import("@/lib/concept-classifier");
      const available = await isModelAvailable();
      if (!available) throw new Error("Model not found at /models/concept_classifier.onnx");

      const result = await classifyPosition("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1");
      const topConcept = result.topConcepts[0];
      const dur5 = Math.round(performance.now() - t5);
      update("ONNX concept model", {
        status: "pass",
        detail: `Top concept: ${topConcept.name} (${(topConcept.activation * 100).toFixed(0)}%), ${result.activations.length} dims (${dur5}ms)`,
        duration: dur5,
      });
    } catch (err) {
      update("ONNX concept model", { status: "fail", detail: err instanceof Error ? err.message : String(err) });
    }

    // Test 8: Concept diff pipeline
    update("Concept diff pipeline", { status: "running" });
    try {
      const t6 = performance.now();
      const { computeConceptDiff } = await import("@/lib/concept-classifier");
      const diff = await computeConceptDiff(
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        "e5",
        "c5"
      );
      const dur6 = Math.round(performance.now() - t6);
      const missedNames = diff.missed.map((m) => m.name).join(", ") || "none";
      update("Concept diff pipeline", {
        status: "pass",
        detail: `Missed: [${missedNames}], ${diff.diff.length} dims (${dur6}ms)`,
        duration: dur6,
      });
    } catch (err) {
      update("Concept diff pipeline", { status: "fail", detail: err instanceof Error ? err.message : String(err) });
    }

    setRunning(false);
  }

  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Gambit — Diagnostics</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Tests the full stack: Stockfish WASM, Chess.com API, PGN parsing, IndexedDB, ONNX concept model, and concept diff pipeline.
      </p>

      <button
        onClick={runTests}
        disabled={running}
        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 text-white font-medium rounded-lg mb-6"
      >
        {running ? "Running..." : "Run All Tests"}
      </button>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((r) => (
            <div
              key={r.name}
              className={`p-3 rounded-lg border ${
                r.status === "pass"
                  ? "border-green-700 bg-green-900/20"
                  : r.status === "fail"
                    ? "border-red-700 bg-red-900/20"
                    : r.status === "running"
                      ? "border-amber-700 bg-amber-900/20"
                      : "border-zinc-700 bg-zinc-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  {r.status === "pass" ? "+" : r.status === "fail" ? "x" : r.status === "running" ? "~" : "-"}
                </span>
                <span className="font-medium text-sm">{r.name}</span>
                {r.duration !== undefined && (
                  <span className="text-zinc-500 text-xs ml-auto">{r.duration}ms</span>
                )}
              </div>
              {r.detail && (
                <p className="text-zinc-400 text-xs mt-1 ml-5">{r.detail}</p>
              )}
            </div>
          ))}

          {!running && results.length > 0 && (
            <p className="text-sm mt-4">
              <span className="text-green-400">{passCount} passed</span>
              {failCount > 0 && (
                <span className="text-red-400 ml-2">{failCount} failed</span>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
