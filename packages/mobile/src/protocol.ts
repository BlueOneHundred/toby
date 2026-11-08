export interface MobileCommand {
  seq: number;
  kind: "select" | "new" | "send" | "stop" | "model" | "providers";
  conversationId?: string;
  text?: string;
  provider?: "claude" | "codex";
  model?: string;
}
export function parseMobileCommand(raw: unknown): MobileCommand {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid mobile command");
  const v = raw as Record<string, unknown>;
  const unknown = Object.keys(v).find(k => !["seq", "kind", "conversationId", "text", "provider", "model"].includes(k));
  if (unknown) throw new Error("Unknown command field: " + unknown.slice(0,60));
  if (!Number.isSafeInteger(v.seq) || Number(v.seq) < 1 || Number(v.seq) >= Number.MAX_SAFE_INTEGER) throw new Error("Invalid command sequence");
  if (!["select", "new", "send", "stop", "model", "providers"].includes(String(v.kind))) throw new Error("Unsupported mobile command");
  if (v.conversationId !== undefined && (typeof v.conversationId !== "string" || !/^[a-zA-Z0-9_-]{1,160}$/.test(v.conversationId))) throw new Error("Invalid conversation");
  if (v.text !== undefined && (typeof v.text !== "string" || !v.text.trim() || v.text.length > 6000)) throw new Error("Invalid message");
  if (v.kind !== "new" && !v.conversationId) throw new Error("Choose a conversation");
  if (v.kind === "send" && !v.text) throw new Error("Enter a message");
  if(v.kind === "model") {
    if(!["claude","codex"].includes(String(v.provider)) || typeof v.model !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(v.model)) throw new Error("Choose a valid subscription model");
  } else if(v.provider !== undefined || v.model !== undefined) throw new Error("Unexpected model settings");
  return {seq: Number(v.seq), kind: v.kind as MobileCommand["kind"], ...(typeof v.conversationId === "string" ? {conversationId: v.conversationId} : {}), ...(typeof v.text === "string" ? {text: v.text.trim()} : {}), ...(v.kind === "model" ? {provider:v.provider as "claude"|"codex", model:v.model as string}: {})};
}
export const mobileCommandSchema = { parse: parseMobileCommand };
export interface MobileSnapshot {
  conversations: { id: string; title: string; status: string; provider: string; avatarShape?: string; avatarColor?: string; botName?: string; preview?: string; group?: boolean }[];
  providers?: {id:string;name:string;signedIn:boolean;models:{id:string;name:string;isDefault?:boolean;defaultEffort?:string;efforts?:string[]}[]}[];
  selected?: { id: string; title: string; status: string; provider: string; model?: string; messages: { id: string; role: string; content: string; provider?: string; model?: string; createdAt?: number; status?: string; speaker?: string }[]; queued: number; computer: boolean; group?: boolean; truncated?: boolean; browserUrl?: string };
}
export interface MobileStatus {
  paired: boolean; claimed: boolean; confirmed: boolean; inviteUrl?: string; error?: string;
}
export interface MobileReceipt { seq: number; ok: boolean; detail: string }
export interface MobileExchange { claimed: boolean; confirmed: boolean; revoked?: boolean; needsSnapshot?: boolean; command?: MobileCommand }
