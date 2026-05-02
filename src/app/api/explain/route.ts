import { NextRequest, NextResponse } from "next/server";

interface ExplainRequest {
  topConcepts: { name: string; avgActivation: number }[];
  frequency: number;
  avgCpLoss: number;
  gamePhases: Record<string, number>;
  playerElo?: number;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { explanation: generateFallbackExplanation(await req.json()) },
      { status: 200 }
    );
  }

  const body: ExplainRequest = await req.json();

  const prompt = buildPrompt(body);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { explanation: generateFallbackExplanation(body) },
        { status: 200 }
      );
    }

    const data = await res.json();
    const explanation =
      data.content?.[0]?.text || generateFallbackExplanation(body);

    return NextResponse.json({ explanation });
  } catch {
    return NextResponse.json(
      { explanation: generateFallbackExplanation(body) },
      { status: 200 }
    );
  }
}

function buildPrompt(body: ExplainRequest): string {
  const conceptList = body.topConcepts
    .map((c) => `${c.name.replace(/_/g, " ")} (strength: ${(c.avgActivation * 100).toFixed(0)}%)`)
    .join(", ");

  const dominantPhase = Object.entries(body.gamePhases || {}).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] || "middlegame";

  const eloContext = body.playerElo
    ? ` The player is rated around ${body.playerElo}.`
    : "";

  return `You are a chess coach. A player has a recurring weakness pattern in their games.${eloContext}

Pattern details:
- Key concepts involved: ${conceptList}
- Appears ${body.frequency} times across their recent games
- Average centipawn loss: ${Math.round(body.avgCpLoss)}
- Most common in: ${dominantPhase}

Write a 2-3 sentence coaching explanation of this weakness pattern. Be specific about what the player is likely doing wrong and give one concrete piece of advice. Do not use bullet points. Write in second person ("you tend to...").`;
}

function generateFallbackExplanation(body: ExplainRequest): string {
  const concepts = body.topConcepts || [];
  if (concepts.length === 0) {
    return `This pattern appears ${body.frequency} times in your games with an average loss of ${Math.round(body.avgCpLoss)} centipawns. Focus on calculating more carefully in these positions.`;
  }

  const conceptName = concepts[0].name.replace(/_/g, " ");
  return `You have a recurring issue with ${conceptName} that has appeared ${body.frequency} times in your recent games. Each occurrence costs you an average of ${Math.round(body.avgCpLoss)} centipawns. Practice recognizing this pattern before making your move.`;
}
