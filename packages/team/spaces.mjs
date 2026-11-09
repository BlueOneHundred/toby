import {randomUUID} from 'node:crypto';
export const PROVIDERS=['claude','codex','local','hosted','demo'];
const rank={guest:1,member:2,owner:3};
export function personalSpace(s,personId){return s.spaces.find(x=>x.personalFor===personId&&!x.deleted);}
export function roleIn(s,p,spaceId){
 if(!p?.active)return null;let current=s.spaces.find(x=>x.id===spaceId&&!x.deleted),role=null,seen=new Set();
 while(current){if(seen.has(current.id))return null;seen.add(current.id);if(current.personalFor)return current.personalFor===p.id?'owner':null;
  const own=s.memberships.find(m=>m.spaceId===current.id&&m.personId===p.id&&m.active);if(own&&rank[own.role]>(rank[role]||0))role=own.role;
  current=s.spaces.find(x=>x.id===current.parentId&&!x.deleted);
 }return role;
}
export function requireRole(s,p,spaceId,minimum='guest'){const role=roleIn(s,p,spaceId);if(!role||rank[role]<rank[minimum])throw new Error('Not found or not permitted.');return role;}
export function lineage(s,spaceId){const ids=[],seen=new Set();let x=s.spaces.find(x=>x.id===spaceId&&!x.deleted);while(x){if(seen.has(x.id))throw new Error('Invalid space hierarchy.');seen.add(x.id);ids.push(x.id);x=s.spaces.find(y=>y.id===x.parentId&&!y.deleted);}return ids;}
export function allowedProviders(s,p,spaceId){requireRole(s,p,spaceId);let allowed=[...PROVIDERS];for(const id of lineage(s,spaceId)){const space=s.spaces.find(x=>x.id===id);if(space.providers)allowed=allowed.filter(x=>space.providers.includes(x));}return allowed;}
export function addPersonalSpace(s,p){const own={id:randomUUID(),parentId:s.workspaceId,name:p.name+' · personal',personalFor:p.id,createdBy:p.id,revision:1};s.spaces.push(own);s.memberships.push({spaceId:own.id,personId:p.id,role:'owner',active:true});return own;}
export function migrateSpaces(s){
 const root={id:randomUUID(),parentId:null,name:'Workspace',createdBy:s.people.find(p=>p.role==='owner')?.id||null,revision:1};s.workspaceId=root.id;s.spaces=[root];s.memberships=[];
 for(const p of s.people){addPersonalSpace(s,p);if(p.role==='owner')s.memberships.push({spaceId:root.id,personId:p.id,role:p.role,active:p.active});}
 for(const b of s.bots){b.createdBy=b.ownerId;b.spaceId=personalSpace(s,b.ownerId).id;const grants=s.grants.filter(g=>g.botId===b.id&&g.active);if(grants.length){const space={id:randomUUID(),parentId:root.id,name:b.template.name,createdBy:b.ownerId,revision:1};s.spaces.push(space);s.memberships.push({spaceId:space.id,personId:b.ownerId,role:'owner',active:true});for(const g of grants)s.memberships.push({spaceId:space.id,personId:g.personId,role:'member',active:true});b.spaceId=space.id;}}
 for(const t of s.threads){t.spaceId=personalSpace(s,t.ownerId).id;t.createdBy=t.ownerId;t.shared=false;for(const m of t.messages){m.spaceId=t.spaceId;if(m.role==='user')m.personId=t.ownerId;}}
 for(const j of s.jobs){j.spaceId=s.threads.find(t=>t.id===j.threadId)?.spaceId||personalSpace(s,j.ownerId).id;j.createdBy=j.ownerId;}
 for(const n of s.notes||[]){n.spaceId=s.bots.find(b=>b.id===n.botId)?.spaceId||root.id;n.createdBy=n.ownerId;}
 for(const a of s.approvals)a.spaceId=s.jobs.find(j=>j.id===a.jobId)?.spaceId||root.id;
 s.connections=[];s.files=[];s.version=2;return s;
}
