import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const manifest=[
  {
    "source": "PancakeDEXAutomation.tsx",
    "target": "src/components/PancakeDEXAutomation.tsx",
    "before": "00af2da7a8fc707583722f8193970435032d26af",
    "after": "308077317e4b66fcf5757ba902a4c8d50d67b941"
  },
  {
    "source": "PancakeUpcomingListings.tsx",
    "target": "src/components/PancakeUpcomingListings.tsx",
    "before": "8e99c8a508a3afff2adb13205f10dd9aa966cc5a",
    "after": "864db89194e9f9f1cfea44aafd77653973845778"
  },
  {
    "source": "PancakeObservationSummary.tsx",
    "target": "src/components/PancakeObservationSummary.tsx",
    "before": null,
    "after": "d6d0c143f7cc837a3f7d7cbd66490f01788fa69a"
  },
  {
    "source": "pancakeObservation.mjs",
    "target": "src/components/pancakeObservation.mjs",
    "before": null,
    "after": "81807a2f052ff60ddda809aa4a68ce61b558b42d"
  }
];
const normalize=s=>s.replace(/\r\n/g,'\n');
export function blobHash(text) {
  const bytes=Buffer.from(normalize(text),'utf8');
  return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function checkedPath(root,relative) {
  const resolved=path.resolve(root,relative);
  if(!resolved.startsWith(root+path.sep))throw Error('INTEGRATION_PATH_INVALID');
  let current=root;
  for(const part of relative.split('/')) {
    current=path.join(current,part);
    try {if(fs.lstatSync(current).isSymbolicLink())throw Error('INTEGRATION_SYMLINK_REJECTED');}
    catch(error) {if(error.code!=='ENOENT')throw error;}
  }
  return resolved;
}
export function integrateObservation({targetRoot,payloadRoot,apply=false,entries=manifest}) {
  targetRoot=fs.realpathSync(targetRoot);payloadRoot=fs.realpathSync(payloadRoot);
  const changes=entries.map(entry=>{
    const target=checkedPath(targetRoot,entry.target),source=checkedPath(payloadRoot,entry.source);
    if(!fs.statSync(path.dirname(target)).isDirectory())throw Error('INTEGRATION_COMPONENT_DIRECTORY_MISSING');
    const content=fs.readFileSync(source,'utf8');
    if(blobHash(content)!==entry.after)throw Error('INTEGRATION_PAYLOAD_CHANGED: '+entry.source);
    const existed=fs.existsSync(target),old=existed?fs.readFileSync(target,'utf8'):null;
    const current=old===null?null:blobHash(old);
    const already=current===entry.after;
    if(!already&&current!==entry.before)throw Error('INTEGRATION_VERSION_MISMATCH: '+entry.target);
    return {...entry,target,content,existed,old,already};
  });
  const pending=changes.filter(change=>!change.already);
  const plan={mode:apply?'APPLY':'CHECK',files:changes.map(c=>({path:c.target,status:c.already?'ALREADY_APPLIED':'READY'})),backupDirectory:null};
  if(!apply||!pending.length)return plan;
  const backup=fs.mkdtempSync(path.join(targetRoot,'.alfaquant-observation-backup-'));
  plan.backupDirectory=backup;
  for(const change of pending) {
    if(change.existed) {
      const destination=path.join(backup,change.target.slice(targetRoot.length+1));
      fs.mkdirSync(path.dirname(destination),{recursive:true});
      fs.writeFileSync(destination,change.old,{flag:'wx'});
    }
  }
  const applied=[];
  try {
    for(const change of pending) {
      // Check again immediately before each write; do not overwrite intervening edits.
      const current=fs.existsSync(change.target)?fs.readFileSync(change.target,'utf8'):null;
      if(current!==change.old)throw Error('INTEGRATION_TARGET_CHANGED: '+change.target);
      const temporary=change.target+'.alfaquant-'+process.pid+'.tmp';
      try {
        fs.writeFileSync(temporary,change.content,{flag:'wx'});
        fs.renameSync(temporary,change.target);
      } finally {if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
      applied.push(change);
    }
    return plan;
  } catch(error) {
    for(const change of applied.reverse()) {
      if(change.existed)fs.writeFileSync(change.target,change.old);
      else fs.unlinkSync(change.target);
    }
    throw error;
  }
}
const ownPath=fileURLToPath(import.meta.url);
if(process.argv[1]&&path.resolve(process.argv[1])===ownPath) {
  const [targetRoot,mode]=process.argv.slice(2);
  if(!targetRoot||!['--check','--apply'].includes(mode)||process.argv.length!==4) {
    console.error('Usage: node scripts/integrate-observation-panel.mjs <working-project-root> --check|--apply');
    process.exitCode=1;
  } else {
    try {console.log(JSON.stringify(integrateObservation({
      targetRoot,payloadRoot:path.resolve(path.dirname(ownPath),'..'),apply:mode==='--apply'
    }),null,2));}
    catch(error) {console.error(error.message);process.exitCode=1;}
  }
}
