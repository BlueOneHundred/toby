export interface MobileCommand {
  seq: number;
  kind: "select" | "new" | "send" | "stop" | "model" | "providers" | "voice" | "voice-cancel";
  conversationId?: string;
  text?: string;
  provider?: "claude" | "codex";
  model?: string;
  audioBase64?: string;
  mimeType?: string;
  requestId?: string;
  send?: boolean;
}
export function parseMobileCommand(raw: unknown): MobileCommand {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid mobile command");
  const v = raw as Record<string, unknown>;
  const unknown = Object.keys(v).find(k => !["seq", "kind", "conversationId", "text", "provider", "model", "audioBase64", "mimeType", "requestId", "send"].includes(k));
  if (unknown) throw new Error("Unknown command field: " + unknown.slice(0,60));
  if (!Number.isSafeInteger(v.seq) || Number(v.seq) < 1 || Number(v.seq) >= Number.MAX_SAFE_INTEGER) throw new Error("Invalid command sequence");
  if (!["select", "new", "send", "stop", "model", "providers", "voice", "voice-cancel"].includes(String(v.kind))) throw new Error("Unsupported mobile command");
  if (v.conversationId !== undefined && (typeof v.conversationId !== "string" || !/^[a-zA-Z0-9_-]{1,160}$/.test(v.conversationId))) throw new Error("Invalid conversation");
  if (v.text !== undefined && (typeof v.text !== "string" || !v.text.trim() || v.text.length > 6000)) throw new Error("Invalid message");
  if (v.kind !== "new" && !v.conversationId) throw new Error("Choose a conversation");
  if (v.kind === "send" && !v.text) throw new Error("Enter a message");
  if(v.kind === "model") {
    if(!["claude","codex"].includes(String(v.provider)) || typeof v.model !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(v.model)) throw new Error("Choose a valid subscription model");
  } else if(v.provider !== undefined || v.model !== undefined) throw new Error("Unexpected model settings");
  if(v.kind === "voice" || v.kind === "voice-cancel") {
    if(typeof v.requestId !== "string" || !/^[-a-f0-9]{36}$/i.test(v.requestId)) throw new Error("Invalid recording");
    if(v.kind === "voice" && (typeof v.audioBase64 !== "string" || !v.audioBase64.length || v.audioBase64.length > 1400000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(v.audioBase64) || typeof v.mimeType !== "string" || !/^audio\/(mp4|webm|ogg|wav)(;.*)?$/.test(v.mimeType) || typeof v.send !== "boolean")) throw new Error("Use a shorter recording");
  } else if(v.audioBase64 !== undefined || v.mimeType !== undefined || v.requestId !== undefined || v.send !== undefined) throw new Error("Unexpected recording fields");
  return {seq: Number(v.seq), kind: v.kind as MobileCommand["kind"], ...(typeof v.conversationId === "string" ? {conversationId: v.conversationId} : {}), ...(typeof v.text === "string" ? {text: v.text.trim()} : {}), ...(v.kind === "model" ? {provider:v.provider as "claude"|"codex", model:v.model as string}: {}), ...((v.kind === "voice" || v.kind === "voice-cancel") ? {requestId:v.requestId as string}: {}), ...(v.kind === "voice" ? {audioBase64:v.audioBase64 as string,mimeType:v.mimeType as string,send:v.send as boolean}: {})};
}
export const mobileCommandSchema = { parse: parseMobileCommand };
export interface MobileSnapshot {
  avatars?: Record<string,string>;
  conversations: { id: string; botId?: string; title: string; status: string; provider: string; avatarShape?: string; avatarColor?: string; botName?: string; preview?: string; group?: boolean }[];
  providers?: {id:string;name:string;signedIn:boolean;models:{id:string;name:string;isDefault?:boolean;defaultEffort?:string;efforts?:string[]}[]}[];
  voice?: {id:string;phase:string;text?:string;error?:string;send?:boolean};
  selected?: { id: string; title: string; status: string; provider: string; model?: string; messages: { id: string; role: string; content: string; question?: {options:string[];custom:boolean}; provider?: string; model?: string; createdAt?: number; status?: string; speaker?: string }[]; queued: number; computer: boolean; group?: boolean; truncated?: boolean; browserUrl?: string };
}
export interface MobileStatus {
  paired: boolean; claimed: boolean; confirmed: boolean; inviteUrl?: string; error?: string;
}
export interface MobileReceipt { seq: number; ok: boolean; detail: string }
export interface MobileExchange { claimed: boolean; confirmed: boolean; revoked?: boolean; needsSnapshot?: boolean; command?: MobileCommand }
