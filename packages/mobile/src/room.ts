import { mobileCommandSchema, type MobileCommand, type MobileReceipt, type MobileSnapshot } from "./protocol";
import { sha256Hex, secureEqual } from "./crypto";

interface State { desktopHash: string; inviteHash: string; inviteExpires: number; phoneHash?: string; confirmed: boolean; revoked: boolean; seq: number; digest?: string; receipt?: MobileReceipt }
/** Only authorization and command identities are durable. Chat content is an ephemeral projection. */
export class MobileRoom {
  private latest?: MobileSnapshot;
  private heartbeat = 0;
  private revision = "";
  private pending?: MobileCommand;
  private pendingUntil = 0;
  constructor(private readonly storage: DurableObjectStorage) {}
  private get(allowRevoked = false): State {
    const row = this.storage.sql.exec<{ value: string }>("SELECT value FROM mobile WHERE id=1").toArray()[0];
    if (!row) throw new Error("Phone connection unavailable");
    const state = JSON.parse(row.value) as State;
    if (state.revoked && !allowRevoked) throw new Error("Phone connection revoked");
    return state;
  }
  private save(s: State): void { this.storage.sql.exec("INSERT OR REPLACE INTO mobile VALUES (1, ?)", JSON.stringify(s)); }
  async initialize(desktopHash: string, inviteHash: string): Promise<void> {
    this.storage.sql.exec("CREATE TABLE IF NOT EXISTS mobile (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL)");
    if (this.storage.sql.exec("SELECT id FROM mobile").toArray().length) {const current=this.get(true);if(current.desktopHash!==desktopHash||current.inviteHash!==inviteHash)throw new Error("Connection already exists");return;}
    this.save({ desktopHash, inviteHash, inviteExpires: Date.now() + 120_000, confirmed: false, revoked: false, seq: 0 });
    await this.storage.setAlarm(Date.now() + 120_000);
  }
  async claim(invite: string): Promise<{ token: string }> {
    const digest = await sha256Hex(invite);
    const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
    const phoneHash = await sha256Hex(token);
    const state = this.get();
    if (state.phoneHash || Date.now() >= state.inviteExpires || !await secureEqual(digest, state.inviteHash)) throw new Error("Pairing link expired or already used");
    const fresh = this.get();
    if (fresh.phoneHash || Date.now() >= fresh.inviteExpires) throw new Error("Pairing link expired or already used");
    this.save({ ...fresh, phoneHash, inviteHash: "" });
    return { token };
  }
  private async authorize(token: string): Promise<State> {
    const hash = await sha256Hex(token);
    const state = this.get();
    if (!state.phoneHash || !await secureEqual(hash, state.phoneHash)) throw new Error("Phone authorization failed");
    return this.get();
  }
  desktop(desktopHash: string, body: { snapshot?: MobileSnapshot; confirm?: boolean; revoke?: boolean; offline?: boolean; ack?: MobileReceipt }): unknown {
    const s = this.get(true);
    const previous = JSON.stringify(s);
    if (s.desktopHash !== desktopHash) throw new Error("Desktop authorization failed");
    if (body.revoke) { this.save({ ...s, revoked: true }); this.latest = undefined; this.pending = undefined; return { revoked: true }; }
    if (s.revoked || (!s.confirmed && Date.now() >= s.inviteExpires)) return { claimed: false, confirmed: false, revoked: true };
    if (body.confirm && s.phoneHash) s.confirmed = true;
    if (body.ack?.seq === s.seq) { s.receipt = { seq: s.seq, ok: Boolean(body.ack.ok), detail: String(body.ack.detail).slice(0, 300) }; this.pending = undefined; }
    if (JSON.stringify(s) !== previous) this.save(s);
    if (body.offline) { this.heartbeat = 0; this.latest = undefined; this.pending = undefined; }
    else { if (s.confirmed && body.snapshot) { this.latest = body.snapshot; this.revision = crypto.randomUUID(); } this.heartbeat = Date.now(); }
    if (this.pendingUntil < Date.now()) this.pending = undefined;
    return { claimed: Boolean(s.phoneHash), confirmed: s.confirmed, needsSnapshot: !this.latest, command: s.confirmed ? this.pending : undefined };
  }
  async poll(token: string, revision?: string): Promise<unknown> {
    const s = await this.authorize(token);
    const online = this.heartbeat > Date.now() - 15_000;
    return { protocol: 5, confirmed: s.confirmed, online, nextSeq: s.seq + 1, revision: this.revision, snapshot: online && s.confirmed && revision !== this.revision ? this.latest : undefined,
      receipt: s.receipt ?? (s.seq && !this.pending ? { seq: s.seq, ok: false, detail: "Outcome unknown. Check the chat before sending again." } : undefined) };
  }
  async command(token: string, raw: unknown): Promise<unknown> {
    await this.authorize(token);
    const command = mobileCommandSchema.parse(raw);
    const digest = await sha256Hex(JSON.stringify(command));
    const s = this.get();
    if (!s.confirmed || this.heartbeat <= Date.now() - 15_000 || !this.latest) throw new Error("Gratis is offline or the phone is not confirmed");
    if (command.seq <= s.seq) {
      if (command.seq !== s.seq || digest !== s.digest) throw new Error("Stale command. Refresh your phone");
      return { accepted: true, duplicate: true };
    }
    if (command.seq !== s.seq + 1) throw new Error("Refresh your phone before another command");
    if (this.pending && this.pendingUntil > Date.now()) throw new Error("Wait for the current action to finish");
    this.save({ ...s, seq: command.seq, digest, receipt: undefined });
    this.pending = command; this.pendingUntil = Date.now() + 60_000;
    return { accepted: true };
  }
  async forget(token: string): Promise<unknown> {
    const s = await this.authorize(token);
    this.save({ ...s, revoked: true }); this.latest = undefined; this.pending = undefined;
    return { revoked: true };
  }
  async alarm(): Promise<void> {
    // A confirmed trusted phone has no automatic expiry. Unconfirmed invites are removed.
    const s = this.get(true);
    if (!s.confirmed) { this.save({ ...s, revoked: true }); this.latest = undefined; this.pending = undefined; }
  }
}

export async function desktopHash(token: string): Promise<string> { return sha256Hex(token); }
