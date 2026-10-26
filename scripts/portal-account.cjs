const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

async function main() {
  const options = Object.fromEntries(process.argv.slice(2).map(value => { const [key,...rest] = value.replace(/^--/,'').split('='); return [key,rest.join('=')]; }));
  if (!/^\S+@\S+\.\S+$/.test(options.email || '') || !['worker','client'].includes(options.kind) || !/^[1-9]\d*$/.test(options.id || '')) throw new Error('Use --email=person@example.com --kind=worker|client --id=actual-shiftcare-id. Supply the password on stdin.');
  if (process.stdin.isTTY) throw new Error('Supply the password on stdin from a password manager; do not place it in command arguments.');
  let password='';
  for await (const chunk of process.stdin) { password+=chunk; if(password.length>202)throw new Error('Password exceeds the supported length.'); }
  password=password.replace(/\r?\n$/,'');
  if(password.length<12||password.length>200)throw new Error('Use a password between 12 and 200 characters.');
  const salt=crypto.randomBytes(32).toString('hex'), passwordHash=crypto.scryptSync(password,salt,64).toString('hex');
  const account={email:options.email.trim().toLowerCase(),kind:options.kind,nativeId:options.id,salt,passwordHash,...(options.name?{name:options.name}:{})};
  const directory=path.resolve(__dirname,'../.local');await fs.mkdir(directory,{recursive:true,mode:0o700});
  const file=path.join(directory,`portal-account-${crypto.randomUUID()}.json`);
  await fs.writeFile(file,JSON.stringify(account,null,2),{mode:0o600,flag:'wx'});
  console.log(`Salted account entry saved privately to ${file}. Add this entry to OCD_PORTAL_ACCOUNTS after confirming the person’s ShiftCare ID and access.`);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
