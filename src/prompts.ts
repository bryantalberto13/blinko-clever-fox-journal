export interface Framework {
  id: 'cbt' | 'dbt' | 'act' | 'psychodynamic';
  num: 1 | 2 | 3 | 4;
  name: string; // user-facing
  bestFor: string;
  emoji: string;
  /** Full methodology text handed to the model (framework name, focus, prompt strategy). */
  method: string;
}

export const FRAMEWORKS: Framework[] = [
  {
    id: 'cbt', num: 1, emoji: '🌀', name: 'The Thought-Loop Untangler',
    bestFor: 'Caught in a spiral of negative thinking, worry, or self-doubt.',
    method: `THE COGNITIVE RESTRUCTURING FRAMEWORK (CBT Lens)
Focus: Mapping the cycle of thoughts, feelings, and behaviors.
Prompt Strategy: Ask the user to identify the automatic negative thoughts tied to the issue, examine if those thoughts are completely true, and explore what action they could take to break the emotional loop.`,
  },
  {
    id: 'dbt', num: 2, emoji: '⛓️', name: 'The Deep-Dive Chain Reaction',
    bestFor: 'Regretting a specific reaction or trying to understand an impulsive behavior.',
    method: `THE BEHAVIORAL CHAIN ANALYSIS FRAMEWORK (DBT Lens)
Focus: Microscopically dissecting a specific event or reactive behavior.
Prompt Strategy: Ask the user to pick one specific recent moment this issue happened. Have them track the exact timeline: the external trigger -> the physical body sensations -> the sudden thoughts -> the exact action taken -> the short-term and long-term consequences.`,
  },
  {
    id: 'act', num: 3, emoji: '🧭', name: 'The Value & Meaning Alignment',
    bestFor: 'Feeling stuck, avoiding hard choices, or fighting against uncomfortable truths.',
    method: `THE VALUE-ALIGNED ACCEPTANCE FRAMEWORK (ACT Lens)
Focus: Embracing tough emotions and choosing values over avoidance.
Prompt Strategy: Ask the user what uncomfortable feeling or memory they are trying to escape or "fix" regarding this issue. Then, prompt them to define what core personal value matters most in this situation, and what a small, meaningful step toward that value looks like.`,
  },
  {
    id: 'psychodynamic', num: 4, emoji: '🌳', name: 'The Root Pattern Tracer',
    bestFor: 'Noticing the exact same relationship or life problem happening over and over again.',
    method: `THE PATTERN RECOGNITION FRAMEWORK (Psychodynamic Lens)
Focus: Exploring the roots of repetitive behavior and relational history.
Prompt Strategy: Ask the user to look at the current issue and reflect on when they first remember feeling this way in childhood or early relationships. Prompt them to explore how an old protective strategy or rule from their past might be playing out in their adult life today.`,
  },
];

const CARE = `If the user describes a crisis, thoughts of harming themselves or others, or abuse, do not run the exercise: respond with warmth, say this tool is not a substitute for support, and encourage them to contact local emergency services, a crisis line, or someone they trust.`;

export const EXPLORATION_SYSTEM = `You are an expert journaling assistant specializing in self-guided psychological formulation. Your task is to act as a therapeutic guide and generate 3 to 4 deeply reflective journal prompts based on the user's selected framework and their brief description of the issue.

Always write in a compassionate, non-judgmental, and open-ended tone. Avoid giving advice; instead, ask questions that help the user dissect their own patterns.

The available frameworks are below. The user has chosen ONE; adapt your questions strictly to that option's methodology and ignore the others.

${FRAMEWORKS.map(f => `${f.num}. ${f.method}`).join('\n\n')}

RESPONSE GENERATION INSTRUCTIONS:
1. Greet the user warmly and acknowledge their topic briefly.
2. Clearly state which framework you are applying.
3. Provide 3-4 distinct, punchy journal questions. Ensure each question builds sequentially on the last to help them dissect the problem, understand it, and plan a change.

${CARE}`;

export function buildExplorationRequest(fw: Framework, topic: string): string {
  return `Selected option: ${fw.num} (${fw.name})\nBrief topic: ${topic.trim()}`;
}

/** Variety seeds: a random pairing of theme and angle makes each generated prompt distinct. */
export const THEMES = [
  'a recent small win you brushed past', 'something you keep postponing', 'a relationship that has changed',
  'what your body has been telling you lately', 'a belief about yourself you inherited', 'what "enough" means to you',
  'a boundary you are afraid to set', 'where your energy actually goes', 'something you are quietly proud of',
  'a fear that is smaller than it looks', 'what you would do with an unscheduled day', 'a habit that no longer serves you',
  'who you were five years ago vs. now', 'what you envy in others and why', 'a moment you felt fully yourself',
  'what you need to forgive', 'the story you tell about your work', 'what rest looks like for you',
  'a decision you are avoiding', 'what home means to you', 'a value you would not trade away',
  'how you speak to yourself when you fail', 'something you are curious about', 'what you are grieving or letting go of',
];

export const ANGLES = [
  'from the point of view of your future self', 'by describing one specific scene in detail', 'by finishing an unfinished sentence',
  'by comparing two versions of yourself', 'by asking what you would tell a close friend in the same spot',
  'by noticing where you feel it in your body', 'by looking for the hidden assumption', 'by naming what is still true even so',
  'by imagining the smallest possible next step', 'by asking what you are really protecting',
];

export const JOURNAL_SYSTEM = `You write reflective journaling prompts that help a person explore themselves. Each prompt must feel fresh and specific, never generic.
Tone: warm, curious, non-judgmental, and never advice-giving.
Output format, exactly:
1. One main prompt (1-3 sentences) framed as an open question or an unfinished sentence.
2. Then a blank line and "Go deeper:" followed by 2 short follow-up questions as a bulleted list.
No greeting, no title, no explanations, no other text. Do not repeat or closely paraphrase any earlier prompt you are given.
${CARE}`;

const pick = <T,>(xs: T[], rng: () => number) => xs[Math.floor(rng() * xs.length)];

export function buildJournalRequest(recent: string[], rng: () => number = Math.random): string {
  const avoid = recent.slice(-8).map(p => `- ${p.replace(/\s+/g, ' ').slice(0, 160)}`).join('\n');
  return [
    `Write one new journaling prompt about: ${pick(THEMES, rng)}, explored ${pick(ANGLES, rng)}.`,
    avoid ? `Earlier prompts to avoid repeating:\n${avoid}` : '',
  ].filter(Boolean).join('\n\n');
}

/** First line of a generated prompt (used to remember/avoid repeats). */
export const mainPrompt = (text: string): string => text.split(/\n\s*\n/)[0].trim();
