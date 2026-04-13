export interface ChatMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

export type ModelKey = "strategist" | "critic" | "synthesizer";

export interface RoundDef {
  id: string;
  speaker: string;
  cls: string;
  label: string;
  modelKey: ModelKey;
  buildMessages: (
    brief: string,
    history: Record<string, string>,
  ) => ChatMessage[];
  system: string;
}

const DEBATE_TRANSCRIPT_ROUNDS: ReadonlyArray<[string, string]> = [
  ["r1", "PLANNER (Round 1)"],
  ["r2", "CHALLENGER (Round 2)"],
  ["r3", "PLANNER (Round 3)"],
  ["r4", "CHALLENGER (Round 4)"],
  ["r5", "PLANNER (Round 5)"],
  ["r6", "CHALLENGER (Round 6)"],
  ["r7", "PLANNER (Round 7)"],
  ["r8", "CHALLENGER (Round 8)"],
];

function debateTranscriptThrough(
  brief: string,
  history: Record<string, string>,
  lastRoundId: string,
): string {
  const chunks = [`BRIEF:\n${brief}\n`];
  for (const [id, label] of DEBATE_TRANSCRIPT_ROUNDS) {
    const text = history[id];
    if (typeof text === "string" && text.length > 0) {
      chunks.push(`${label}:\n${text}\n`);
    }
    if (id === lastRoundId) break;
  }
  return chunks.join("\n");
}

const STRATEGIST_SYSTEM_OPENING = `You are a sharp, opinionated strategic advisor. When given a brief, propose a concrete, actionable strategy. Be direct. No fluff. Use bullet points where useful. Max 200 words.`;
const STRATEGIST_SYSTEM_DEFENSE = `You are a sharp, opinionated strategic advisor defending your position under pressure. Be direct. Concede where the challenger has a point, but hold firm where you're confident. Max 200 words.`;
const CRITIC_SYSTEM = `You are a ruthless but fair devil's advocate. Find the weakest points, challenge them with better alternatives or hard questions, and acknowledge what improved when it did. Do not agree just to be polite. Be specific. Max 200 words.`;

export const ROUNDS: RoundDef[] = [
  {
    id: "r1",
    speaker: "Planner",
    cls: "strategist",
    label: "Round 1 — opening strategy",
    modelKey: "strategist",
    buildMessages: (brief) => [
      {
        role: "user",
        content: `Here is the situation:\n\n${brief}\n\nPropose your strategy. Be direct, specific, and actionable. Max 200 words.`,
      },
    ],
    system: STRATEGIST_SYSTEM_OPENING,
  },
  {
    id: "r2",
    speaker: "Challenger",
    cls: "critic",
    label: "Round 2 — challenge",
    modelKey: "critic",
    buildMessages: (brief, history) => [
      {
        role: "user",
        content: `${debateTranscriptThrough(brief, history, "r1")}\nChallenge this strategy. Find the weakest points. Propose better alternatives where you disagree. Be specific. Max 200 words.`,
      },
    ],
    system: CRITIC_SYSTEM,
  },
  {
    id: "r3",
    speaker: "Planner",
    cls: "strategist",
    label: "Round 3 — defense (1 of 3)",
    modelKey: "strategist",
    buildMessages: (brief, history) => [
      {
        role: "user",
        content: `${debateTranscriptThrough(brief, history, "r2")}\nDefend or refine your position (first of three defense passes). Concede where the challenger is right. Hold firm where you're not. Max 200 words.`,
      },
    ],
    system: STRATEGIST_SYSTEM_DEFENSE,
  },
  {
    id: "r4",
    speaker: "Challenger",
    cls: "critic",
    label: "Round 4 — challenge",
    modelKey: "critic",
    buildMessages: (brief, history) => [
      {
        role: "user",
        content: `${debateTranscriptThrough(brief, history, "r3")}\nPush back on what still fails; acknowledge what improved. Max 200 words.`,
      },
    ],
    system: CRITIC_SYSTEM,
  },
  {
    id: "r5",
    speaker: "Planner",
    cls: "strategist",
    label: "Round 5 — defense (2 of 3)",
    modelKey: "strategist",
    buildMessages: (brief, history) => [
      {
        role: "user",
        content: `${debateTranscriptThrough(brief, history, "r4")}\nDefend or refine again (second of three defense passes). Max 200 words.`,
      },
    ],
    system: STRATEGIST_SYSTEM_DEFENSE,
  },
  {
    id: "r6",
    speaker: "Challenger",
    cls: "critic",
    label: "Round 6 — challenge",
    modelKey: "critic",
    buildMessages: (brief, history) => [
      {
        role: "user",
        content: `${debateTranscriptThrough(brief, history, "r5")}\nChallenge what still does not hold; credit stronger replies. Max 200 words.`,
      },
    ],
    system: CRITIC_SYSTEM,
  },
  {
    id: "r7",
    speaker: "Planner",
    cls: "strategist",
    label: "Round 7 — defense (3 of 3)",
    modelKey: "strategist",
    buildMessages: (brief, history) => [
      {
        role: "user",
        content: `${debateTranscriptThrough(brief, history, "r6")}\nDefend or refine (third and final defense pass). Be explicit about what you concede vs. what you stand on. Max 200 words.`,
      },
    ],
    system: STRATEGIST_SYSTEM_DEFENSE,
  },
  {
    id: "r8",
    speaker: "Challenger",
    cls: "critic",
    label: "Round 8 — final challenge",
    modelKey: "critic",
    buildMessages: (brief, history) => [
      {
        role: "user",
        content: `${debateTranscriptThrough(brief, history, "r7")}\nLast word before resolution: concede where they convinced you; push back where they did not. Max 200 words.`,
      },
    ],
    system: CRITIC_SYSTEM,
  },
  {
    id: "r9",
    speaker: "Resolver",
    cls: "synthesis",
    label: "Final resolution",
    modelKey: "synthesizer",
    buildMessages: (brief, history) => [
      {
        role: "user",
        content: `You observed a structured exchange: a planner defended their position in three passes against a challenger. Resolve the strongest threads into one final recommendation.\n\n${debateTranscriptThrough(brief, history, "r8")}\nFormat your response exactly as:\n\nVERDICT: (1 decisive sentence)\n\nKEY ACTIONS:\n- (action 1)\n- (action 2)\n- (action 3)\n- (action 4)\n\nWATCH OUT FOR:\n- (risk 1)\n- (risk 2)`,
      },
    ],
    system: `You are a neutral senior advisor resolving a planner–challenger exchange into a final recommendation. Be decisive. No hedging. Follow the exact format requested.`,
  },
];
