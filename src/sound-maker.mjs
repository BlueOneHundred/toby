// Toby: sound effects and music from ElevenLabs (make_sound), with Tavin's own API key (the custom connection
// named "elevenlabs" in Toby). Several takes are made and measured so the bot can pick one by measurement
// (rankTakes in media.mjs), since nobody on the team can hear.
export const SFX_MODELS = ['eleven_text_to_sound_v2', 'eleven_text_to_sound_v3'];
export const MUSIC_MODELS = ['music_v1', 'music_v2', 'music_v2_5'];
// Words that made Jane's first takes sound "mechanical" or "like someone hitting something" (17 Nov).
export const HARSH = /\b(click|clicks|clack|tap|taps|knock|knocks|bang|clang|clank|hit|hits|thud|slam|impact|smash|crash|punch)\b/i;

export function soundPromptProblems(prompt, kind, seconds = 2) {
  const out = [];
  if (/[—–]/.test(prompt)) out.push('Remove the em or en dash from the prompt.');
  // A short grain (a page flip, the tap on the phone) may be a tap; a sound under an action must not be.
  if (kind === 'effect' && seconds > 1) {
    const plain = prompt.replace(/\bno\s+\w+/gi, '');
    const m = plain.match(HARSH);
    if (m) out.push(`The prompt asks for "${m[0]}": hard hits sounded mechanical in Jane's reel. Describe a soft, continuous sound instead and end with "no clicks, no taps, no impacts".`);
  }
  if (kind === 'music' && !/instrumental|no vocals|no singing/i.test(prompt)) out.push('Music must be instrumental: add "instrumental, no vocals" to the prompt.');
  return out;
}

export async function elevenLabs({path, body, key, fetchImpl = fetch, signal}) {
  const res = await fetchImpl('https://api.elevenlabs.io' + path, {method: 'POST', headers: {'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg'}, body: JSON.stringify(body), signal});
  if (res.status === 401 || res.status === 403) {
    const t = await res.text().catch(() => '');
    throw new Error('ElevenLabs refused Toby\'s key' + (/permission|scope/i.test(t) ? ' (the key is not allowed to use this: in ElevenLabs, give the key access to Sound Effects and Music)' : '') + '. Ask Tavin to check the "elevenlabs" connection in Toby.');
  }
  if (res.status === 429) throw new Error('ElevenLabs is busy or the monthly credits are used up. Try again later and tell Toby.');
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error('ElevenLabs could not make the sound: ' + t.slice(0, 300)); }
  const bytes = Buffer.from(await res.arrayBuffer());
  const credits = Number(res.headers.get('character-cost')) || null;
  return {bytes, credits};
}

export const effectBody = ({prompt, seconds, influence = 0.5, model = SFX_MODELS[0]}) => ({text: prompt, duration_seconds: seconds, prompt_influence: influence, model_id: model});
export const musicBody = ({prompt, seconds, model = MUSIC_MODELS[0]}) => ({prompt, music_length_ms: Math.round(seconds * 1000), model_id: model, force_instrumental: true});
