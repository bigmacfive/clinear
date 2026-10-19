export const stages = [
  "Backlog",
  "Ready",
  "Running",
  "Review",
  "Done",
] as const;
export type Stage = (typeof stages)[number];
export type AgentId = "claude" | "codex" | "grok";
export type Flag = "" | "blocked" | "failed" | "interrupted";
export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: string;
}
export interface Source {
  title: string;
  url: string;
  excerpts: string[];
}
export interface Card {
  origin?: "human" | "research";
  reviewOf?: string;
  id: string;
  number: number;
  projectId: string;
  title: string;
  description: string;
  acceptance: string;
  stage: Stage;
  boardOrder?: number;
  flag: Flag;
  agent: AgentId;
  owner: string;
  dependencies: string[];
  issueUrl: string;
  worktree: string;
  branch: string;
  sources: Source[];
  feedback: string;
  commentDraft: string;
  publishedUrl: string;
  createdAt: string;
  updatedAt: string;
}
export interface Run {
  id: string;
  cardId: string;
  agent: AgentId;
  status: "running" | "succeeded" | "failed" | "cancelled" | "interrupted";
  startedAt: string;
  endedAt: string;
  summary: string;
  diff: string;
  exitCode: number | null;
}
export interface RunEvent {
  id: number;
  runId: string;
  cardId: string;
  type: string;
  text: string;
  createdAt: string;
}
export interface AgentStatus {
  id: AgentId;
  path: string;
  installed: boolean;
  auth: "unverified" | "verified" | "failed";
  detail: string;
}
export interface Settings {
  githubTransport: "composio" | "gh";
  nodePath: string;
  claudePath: string;
  codexPath: string;
  grokPath: string;
  composioUserId: string;
  composioAuthConfigId: string;
  model: string;
  provider: string;
}
export interface Snapshot {
  automations: Automation[];
  projects: Project[];
  cards: Card[];
  runs: Run[];
  agents: AgentStatus[];
  settings: Settings;
  integrations: { cline: boolean; parallel: boolean; composio: boolean };
  runtime: { dataDir: string };
}
export interface Proposal {
  title: string;
  description: string;
  acceptance: string;
  agent: AgentId;
  dependsOn: number[];
}
export interface Automation {
  id: string;
  projectId: string;
  goal: string;
  enabled: boolean;
  researchEnabled: boolean;
  intervalHours: number;
  runBudget: number;
  runsUsed: number;
  nextResearchAt: string;
  lastResearchAt: string;
  lastMessage: string;
  maxIdeas: number;
}
