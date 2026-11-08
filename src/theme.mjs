export function resolveTheme(choice,systemDark=true){return choice==='light'||choice==='dark'?choice:systemDark?'dark':'light';}
export function appearanceSetting(value){if(!['system','dark','light'].includes(value))throw new Error('Choose system, light, or dark appearance.');return value;}
