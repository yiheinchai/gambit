"use client";

import { useState } from "react";

interface UsernameFormProps {
  onSubmit: (username: string) => void;
  loading: boolean;
}

export default function UsernameForm({ onSubmit, loading }: UsernameFormProps) {
  const [username, setUsername] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed) onSubmit(trimmed);
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

      <div className="flex gap-3 w-full max-w-md">
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

      <div className="flex flex-col items-center gap-3 text-zinc-600 text-sm">
        <div className="flex gap-6">
          <Feature text="Stockfish-powered analysis" />
          <Feature text="Weakness clustering" />
          <Feature text="Targeted drills" />
        </div>
        <p>All analysis runs locally in your browser. No data is sent to any server.</p>
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
