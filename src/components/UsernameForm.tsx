"use client";

import { useState } from "react";

export interface AnalysisConfig {
  username: string;
  depth: number;
  gameCount: number;
}

interface UsernameFormProps {
  onSubmit: (config: AnalysisConfig) => void;
  loading: boolean;
}

const PRESETS = [
  { label: "Quick Scan", depth: 10, games: 20, desc: "~5 min, finds major blunders" },
  { label: "Standard", depth: 14, games: 50, desc: "~15 min, balanced analysis" },
  { label: "Deep", depth: 18, games: 100, desc: "~45 min, catches subtle mistakes" },
] as const;

export default function UsernameForm({ onSubmit, loading }: UsernameFormProps) {
  const [username, setUsername] = useState("");
  const [preset, setPreset] = useState(1);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    onSubmit({
      username: trimmed,
      depth: PRESETS[preset].depth,
      gameCount: PRESETS[preset].games,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-white mb-3">
          Gambit
        </h1>
        <p className="text-lg text-zinc-400 max-w-md">
          Find your recurring chess weaknesses. Fix them with targeted drills.
        </p>
      </div>

      <div className="w-full max-w-md space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Chess.com username"
            className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>

        {/* Analysis depth selector */}
        <div className="flex gap-2">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setPreset(i)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors border ${
                preset === i
                  ? "border-amber-600 bg-amber-600/10 text-amber-400"
                  : "border-zinc-700 bg-zinc-800 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <div className="font-medium">{p.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 text-zinc-600 text-sm text-center">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Feature text="Stockfish-powered analysis" />
          <Feature text="Weakness clustering" />
          <Feature text="Targeted drills" />
        </div>
        <p className="max-w-sm">All analysis runs locally in your browser. No data is sent to any server.</p>
      </div>
    </form>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
      {text}
    </span>
  );
}
