const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const http = require('node:http');
const { AutomationStore } = require('../.backend/automation/store.js');
const { AutomationService, policy, hash } = require('../.backend/automation/service.js');
const { ShiftCareGateway } = require('../.backend/automation/shiftcare-gateway.js');
const { NativeEvidenceCollector } = require('../.backend/automation/collectors.js');
const { EvidenceFiles } = require('../.backend/automation/evidence.js');
const { DocumentOperations } = require('../.backend/automation/document-operations.js');
const { Microsoft365Mailbox } = require('../.backend/automation/microsoft365.js');
const { ShiftCareOperations } = require('../.backend/automation/shiftcare-operations.js');
const { createPortalHandler } = require('../.backend/automation/portal.handler.js');
const { PortalIdentity } = require('../.backend/automation/portal-identity.js');
const { prepare } = require('../.backend/automation/handlers.js');
const { extractPerson } = require('../.backend/automation/person-extraction.js');
const { extractEvidence } = require('../lib/evidence-extraction.cjs');
const { sessionCookie } = require('../lib/staff-auth.cjs');
const owner='office@example.test';
const env={SHIFTCARE_ACCOUNT_ID:'345',SHIFTCARE_API_KEY:'fictional-only',SHIFTCARE_TIME_ZONE:'Australia/Perth',SHIFTCARE_API_REGION:'au'};
async function setup(t) {
  const previous={...process.env},directory=await fs.mkdtemp(path.join(os.tmpdir(),'ocd-completion-'));
  Object.assign(process.env,{WORKFLOW_STAFF_EMAIL:owner,WORKFLOW_STAFF_PASSWORD:'fixture',WORKFLOW_SESSION_SECRET:'fictional-32-character-service-secret',WORKFLOW_DATA_DIR:directory,SERVICE_POSTCODES:'6027',SHIFTCARE_TIME_ZONE:'Australia/Perth',AUTOMATION_RUN_WORKER:'false'});
  for(const key of ['DATABASE_URL','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','VERCEL','WORKFLOW_STAFF_ACCOUNTS','OCD_NATIVE_FIELD_MAPPINGS','OCD_PORTAL_ACCOUNTS','SHIFTCARE_ACCOUNT_ID','SHIFTCARE_API_KEY','OCD_SHIFTCARE_WRITE_OPERATIONS','MICROSOFT365_TENANT_ID','MICROSOFT365_CLIENT_ID','MICROSOFT365_CLIENT_SECRET','MICROSOFT365_MAILBOX','MICROSOFT365_INGEST_FROM'])delete process.env[key];
  const store=new AutomationStore({directory,scope:'local',env:{}}),service=new AutomationService(store);
  t.after(async()=>{for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous);await fs.rm(directory,{recursive:true,force:true});});
  return {store,service,directory};
}
async function prepared(service,workflow,payload) {const job=await service.enqueue({workflow,sourceId:crypto.randomUUID(),owner,payload},owner);await service.process();return (await service.store.read()).jobs.find(j=>j.id===job.id);}
const approve=(service,job)=>service.decide(job.id,job.revision,{action:'approve',sourceReviewed:true,proposalHash:job.proposalHash},owner);
function pdf(text) {
  const stream=`BT /F1 12 Tf 40 700 Td (${text.replace(/[\\()]/g,'\\$&')}) Tj ET`;
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
  let output='%PDF-1.4\n', offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(output));output+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
  const start=Buffer.byteLength(output);output+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;return Buffer.from(output);
}

test('native reads paginate fully and stop rather than returning an incomplete result',async t=>{
  await setup(t);const calls=[];
  const gateway=new ShiftCareGateway(env,async url=>{calls.push(new URL(url));const page=Number(new URL(url).searchParams.get('page'));return Response.json({documents:Array.from({length:page===1?20:5},(_,i)=>({id:page*100+i})),_metadata:{total_count:25}});});
  assert.equal((await gateway.list('staff_files','documents',{user_id:'123'})).length,25);assert.equal(calls.length,2);
  const endless=new ShiftCareGateway(env,async()=>Response.json({documents:Array.from({length:20},(_,id)=>({id}))}));
  await assert.rejects(endless.list('staff_files','documents',{},2),{status:422});
  await assert.rejects(gateway.json('https://foreign.example.test/clients'),{status:422});
});
test('visit collector uses worker attendance and explicit notes rather than scheduled or payable hours',async t=>{
  const {service}=await setup(t);
  const fetcher=async url=>{const p=new URL(url).pathname;
    if(p.endsWith('/shifts'))return Response.json({shifts:[{id:'10',start_at:'2026-10-14T09:00:00+08:00',end_at:'2026-10-14T10:00:00+08:00',staff:[{id:'123'}],clients:[{id:'456',fund_name:'Reviewed fund'}]}]});
    if(p.endsWith('/timesheets'))return Response.json({timesheets:[{shift_id:'10',staff_id:'123',clockin_at:'2026-10-14T09:15:00+08:00',clockout_at:'2026-10-14T10:30:00+08:00',items:[{payable_id:'44',payable_name:'Worked hours',payable_unit:'hours',amount:8}]}]});
    if(p.endsWith('/progress_notes'))return Response.json({progress_notes:[{id:'5',shift_id:'10',staff:{id:'123'},message:'Extra support explained by worker.',category:'incident'}]});
    if(p.endsWith('/invoices'))return Response.json({invoices:[{id:'20',invoice_items:[{shift_id:'10',payer:'Reviewed payer'}]}]});
    throw new Error('Unexpected fixture read');};
  const job=await service.enqueue({workflow:'W10',sourceId:'period-1',payload:{evidenceReference:'Fixture native review',periodFrom:'2026-10-14',periodTo:'2026-10-14'}},owner);
  const data=await new NativeEvidenceCollector(env,fetcher).collect(job);
  assert.equal(data.visits[0].clockIn,'2026-10-14T09:15:00+08:00');assert.equal(data.visits[0].kilometres,null);assert.equal(data.visits[0].significantIssue,true);
  const proposal=prepare('W10',{...job.payload,...data},policy());assert.equal(proposal.missing.length,0);assert.match(proposal.fields.exceptions[0].findings.join(' '),/duration differ/);assert.equal(proposal.fields.exceptions[0].findings.some(f=>f.includes('payer')),false);
});
test('failed native evidence collection never produces a complete financial report',async t=>{
  const {service}=await setup(t);const job=await service.enqueue({workflow:'W11',sourceId:'period-2',payload:{evidenceReference:'Fixture review',periodFrom:'2026-10-14',periodTo:'2026-10-14'}},owner);
  const collector=new NativeEvidenceCollector(env,async url=>new URL(url).pathname.endsWith('/timesheets')?new Response('',{status:403}):Response.json({shifts:[],progress_notes:[]}));
  await assert.rejects(collector.collect(job),{status:502});
  const proposal=prepare('W11',{...job.payload,collectionError:'Native read failed'},policy());assert.ok(proposal.missing.length);assert.equal(proposal.fields.sourceComplete,false);
});
test('compliance collection retains verified non-expiring evidence and missing categories',async t=>{
  const {service}=await setup(t);const fetcher=async url=>{const p=new URL(url).pathname;
    if(p.endsWith('/qualifications')&&p.includes('/staffs/'))return Response.json([{id:7,user_id:123,qualification_id:2,expires_at:null}]);
    if(p.endsWith('/qualifications'))return Response.json({qualifications:[{id:2,name:'First aid'}]});
    if(p.endsWith('/staff_files'))return Response.json({documents:[{id:5,user_id:123,category:'Induction',no_expiration:'true'}]});
    return Response.json({id:123,role:'staff'});};
  const job=await service.enqueue({workflow:'W12',sourceId:'documents',payload:{evidenceReference:'Original native records',workerId:'123'}},owner);
  const collected=await new NativeEvidenceCollector(env,fetcher).collect(job),proposal=prepare('W12',{...job.payload,...collected},policy());
  assert.equal(proposal.fields.documents[0].status,'verified_non_expiring');assert.equal(proposal.fields.documents[1].status,'needs_evidence');
});
test('original evidence is private, deduplicated and checked for integrity',async t=>{
  const {service,store}=await setup(t),job=await prepared(service,'W01',{evidenceReference:'Fixture source',postcode:'6027'}),files=new EvidenceFiles(store);
  const bytes=Buffer.from('Full name: Alex Fixture\nDOB: 1990-01-01');
  const file=await files.save(job.id,'../original.txt','text/plain',bytes,'Fixture original');
  assert.equal((await files.save(job.id,'original.txt','text/plain',bytes,'Fixture original')).id,file.id);
  assert.equal((await store.read()).files.length,1);assert.equal(file.name,'.._original.txt');assert.equal((await files.extract(file.id)).text,bytes.toString());
  await assert.rejects(files.save(job.id,'wrong.pdf','application/pdf',bytes,'Fixture original'),{status:422});
  await fs.writeFile(path.join(path.dirname(store.file),'automation-files-local',file.id),'changed');await assert.rejects(files.get(file.id),{status:409});
});
test('real PDF text extraction and labelled birth-date mapping work without external services',async t=>{
  await setup(t);const result=await extractEvidence(pdf('Full name: Alex Fixture; DOB: 14 March 1981; First name: Alex; Family name: Fixture'),'application/pdf');
  assert.match(result.text,/Alex Fixture/);const person=extractPerson(result.text);assert.equal(person.fields.dob,'1981-03-14');assert.equal(person.fields.firstName,'Alex');assert.equal(person.fields.familyName,'Fixture');
  assert.equal(extractPerson('DOB: 31/02/1990').fields.dob,undefined);
});
test('scanned image OCR uses the installed local model',async t=>{
  await setup(t);const {createCanvas}=require('@napi-rs/canvas'),canvas=createCanvas(900,140),context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,900,140);context.fillStyle='black';context.font='40px "Liberation Sans"';context.fillText('FIRST NAME: ALEX',30,80);
  const result=await extractEvidence(canvas.toBuffer('image/png'),'image/png');assert.match(result.text,/ALEX/i);assert.equal(result.method,'Image OCR');
});
test('mail attachments retain original bytes and extraction evidence without sending or mutating mail',async t=>{
  const {service,store}=await setup(t);const original=Buffer.from('Full name: Alex Fixture\nDOB: 1990-01-01');let writes=0;
  const mailEnv={MICROSOFT365_TENANT_ID:'fixture.test',MICROSOFT365_CLIENT_ID:'fixture',MICROSOFT365_CLIENT_SECRET:'fixture',MICROSOFT365_MAILBOX:'office@example.test',MICROSOFT365_INGEST_FROM:'2026-10-01T00:00:00Z'};
  const fetcher=async(url,options)=>{if(String(url).includes('/token'))return Response.json({access_token:'fixture-token',expires_in:3600});if(options.method!=='GET')writes++;return String(url).includes('/attachments/a1')?Response.json({'@odata.type':'#microsoft.graph.fileAttachment',contentBytes:original.toString('base64')}):Response.json({value:[{id:'a1',name:'original.txt',contentType:'text/plain',size:original.length,isInline:false}]});};
  const job=await service.enqueue({workflow:'W02',sourceId:'mail-original',sourceKind:'microsoft365',payload:{evidenceReference:'Original mail',messageId:'m1'}},owner);
  const result=await new Microsoft365Mailbox(service,mailEnv,fetcher).importAttachments(job.id,new EvidenceFiles(store));
  assert.equal(result.fileIds.length,1);assert.equal((await new EvidenceFiles(store).get(result.fileIds[0])).bytes.toString(),original.toString());assert.equal(writes,0);
});
test('client document filing verifies category, visibility and original file hash independently',async t=>{
  const {store}=await setup(t),files=new EvidenceFiles(store);let document,writes=0;const bytes=pdf('Original signed fixture agreement');
  const nativeEnv={...env,OCD_SHIFTCARE_WRITE_OPERATIONS:'document.file',SHIFTCARE_DOCUMENT_HOSTS:'files.example.test'};
  const fetcher=async(url,options={})=>{const p=new URL(url).pathname;
    if(new URL(url).hostname==='files.example.test'){assert.equal(options.headers,undefined);return new Response(bytes);}
    if(p.endsWith('/document_types'))return Response.json({document_types:[{id:'3',name:'Service agreement'}]});
    if(p.endsWith('/clients/456'))return Response.json({id:'456'});
    if(p.endsWith('/download'))return Response.json({url:'https://files.example.test/original',expires_at:new Date(Date.now()+60000).toISOString()});
    if(options.method==='POST'){writes++;assert.ok(options.body instanceof FormData);document={id:'99',client_id:'456',document_type_id:'3',staff_visible:false,no_expiration:true,expires_at:null};return Response.json(document,{status:201});}
    return Response.json({documents:document?[document]:[]});};
  const operations=new DocumentOperations(files,nativeEnv,fetcher),service=new AutomationService(store,operations.registry());
  let job=await service.enqueue({workflow:'W05',sourceId:'signed-agreement',payload:{evidenceReference:'Checked original',nativeId:'456',documentName:'agreement.pdf',returned:true,signedChecked:true,filingChecked:true,documentTypeId:'3',noExpiration:true}},owner);
  const file=await files.save(job.id,'agreement.pdf','application/pdf',bytes,'Original fixture');
  await store.mutate(state=>state.jobs[0].payload.fileId=file.id);await service.process();job=(await store.read()).jobs[0];job=await approve(service,job);job=await service.execute(job.id,job.revision,owner);assert.equal(job.status,'awaiting_verification');
  job=await service.verify(job.id,job.revision,{},owner);assert.equal(job.receipt.method,'api-read-back');assert.equal(job.receipt.details.nativeFileHash,file.sha256);assert.equal(writes,1);
});
test('ShiftCare communication task creation still requires evidence of the actual staff communication',async t=>{
  const {store}=await setup(t);let saved,writes=0;const fetcher=async(url,options)=>{if(options.method==='POST'){writes++;saved={id:'88',...JSON.parse(options.body)};return Response.json(saved,{status:201});}return Response.json(new URL(url).pathname.includes('/staff/')?{id:'123',role:'staff'}:saved);};
  const operations=new DocumentOperations(new EvidenceFiles(store),{...env,OCD_SHIFTCARE_WRITE_OPERATIONS:'communication.handoff'},fetcher),service=new AutomationService(store,operations.registry());
  let job=await prepared(service,'W13',{evidenceReference:'Checked service update',recipient:'Participant 456',message:'Reviewed service update.',channel:'native',assigneeId:'123',outcomeVerified:true});job=await approve(service,job);job=await service.execute(job.id,job.revision,owner);
  await assert.rejects(service.verify(job.id,job.revision,{},owner),{status:422});
  job=await service.verify(job.id,job.revision,{communicationChecked:true,communicationReference:'Checked ShiftCare communication entry'},owner);assert.equal(job.receipt.details.deliveryEvidence,'staff-native-communication');assert.equal(writes,1);
});
test('approved review periods and deadlines create one owned follow-up without native writes',async t=>{
  const {store}=await setup(t),clock=()=>new Date('2026-10-14T01:00:00Z'),service=new AutomationService(store,{},clock);
  await service.schedule({workflow:'W10',cadence:'weekly',weekday:3,localTime:'09:00',periodDays:7,includeCutoff:false,enabled:true},owner);
  assert.equal(await service.dueSchedules(),1);assert.equal(await service.dueSchedules(),0);assert.deepEqual((await store.read()).jobs[0].payload.period,{cutOffDate:'2026-10-14',from:'2026-10-07',to:'2026-10-13'});
  await service.enqueue({workflow:'W01',sourceId:'deadline',dueAt:'2026-10-14T08:00:00+08:00',payload:{evidenceReference:'Enquiry',postcode:'6027'}},owner);
  assert.equal(await service.followUpDeadlines(),1);assert.equal(await service.followUpDeadlines(),0);assert.ok((await store.read()).jobs[1].escalatedAt);
});
test('cover preflight blocks native leave and never applies an unavailable worker',async t=>{
  await setup(t);const shift={id:'10',start_at:'2026-10-14T09:00:00+08:00',end_at:'2026-10-14T10:00:00+08:00',clients:[{id:'456'}],staff:[{id:'124'}]},worker={id:'123',role:'staff'};let writes=0;
  const fetcher=async(url,options)=>{if(options.method!=='GET')writes++;const p=new URL(url).pathname;if(p.endsWith('/leaves'))return Response.json({leaves:[{start_at:shift.start_at,end_at:shift.end_at,approved_at:'2026-10-13T00:00:00Z'}]});if(p.endsWith('/shifts'))return Response.json({shifts:[]});if(p.endsWith('/invoices'))return Response.json({invoices:[]});return Response.json(p.includes('/staff/')?worker:shift);};
  const job={workflow:'W08',payload:{shiftId:'10',workerId:'123',payGroupId:'2',nativeSnapshotHash:hash(shift),workerSnapshotHash:hash(worker)}};
  await assert.rejects(new ShiftCareOperations(env,fetcher).preflight(job),{status:409});assert.equal(writes,0);
});
test('an invoice-linked service cannot be cancelled by the native adapter',async t=>{
  await setup(t);const shift={id:'10',clients:[{id:'456'}],staff:[{id:'123'}]};let writes=0;
  const fetcher=async(url,options)=>{if(options.method!=='GET')writes++;return Response.json(new URL(url).pathname.endsWith('/invoices')?{invoices:[{id:'55',invoice_items:[{shift_id:'10'}]}]}:shift);};
  await assert.rejects(new ShiftCareOperations(env,fetcher).preflight({workflow:'W07',payload:{shiftId:'10',nativeSnapshotHash:hash(shift),absentReason:'NSDO'}}),{status:409});assert.equal(writes,0);
});
test('reply routing retains an exact candidate and requires clarification for several occurrences',async t=>{
  await setup(t);
  const exact=prepare('W02',{evidenceReference:'Original reminder reply',subject:'ShiftCare service reminder',text:'Yes\nShift ID: 123'},policy());
  assert.equal(exact.fields.suggestedWorkflow,'W06');assert.equal(exact.fields.replyCandidate.shiftId,'123');
  const ambiguous=prepare('W02',{evidenceReference:'Original reminder reply',subject:'ShiftCare service reminder',text:'No\nShift ID: 123\nShift ID: 124'},policy());
  assert.equal(ambiguous.fields.replyCandidate.shiftId,'');assert.equal(ambiguous.fields.replyCandidate.ambiguous,true);
});

async function portalFixture(t) {
  const {store}=await setup(t),password='fictional-client-password',salt='a'.repeat(64),passwordHash=crypto.scryptSync(password,salt,64).toString('hex');
  const accounts=[{email:'worker@example.test',kind:'worker',nativeId:'123',salt,passwordHash},{email:'client@example.test',kind:'client',nativeId:'456',salt,passwordHash}];
  Object.assign(process.env,env,{OCD_PORTAL_ACCOUNTS:JSON.stringify(accounts),OCD_ARRIVAL_ENABLED:'true',MAPBOX_PUBLIC_TOKEN:'pk.fixture',WORKFLOW_DATA_DIR:path.dirname(store.file)});
  const now=Date.now(),shift={id:'10',published:true,start_at:new Date(now-3600000).toISOString(),end_at:new Date(now+3600000).toISOString(),address:'Fixture service address',clients:[{id:'456',first_name:'Alex',family_name:'Fixture',dob:'PRIVATE-DOB'}],staff:[{id:'123',name:'Worker Fixture',email:'PRIVATE-WORKER-EMAIL'}]};
  const foreign={...shift,id:'11',clients:[{id:'999',first_name:'Private other client'}],staff:[{id:'888',name:'Other worker'}]};
  const calls=[];const fetcher=async(url,options={})=>{const u=new URL(url);calls.push({url:u,method:options.method||'GET'});
    if(u.hostname==='api.mapbox.com')return u.pathname.includes('/forward')?Response.json({features:[{geometry:{coordinates:[115.8,-31.8]},properties:{match_code:{confidence:'exact'}}}]}):Response.json({code:'Ok',routes:[{duration:600}]});
    if(u.pathname.endsWith('/shifts'))return Response.json({shifts:[shift,foreign]});
    if(u.pathname.endsWith('/shifts/11'))return Response.json(foreign);
    if(u.pathname.endsWith('/shifts/10'))return Response.json(shift);
    return Response.json(u.pathname.includes('/staff/')?{id:'123',role:'staff'}:{id:'456'});};
  const handler=createPortalHandler(process.env,fetcher),server=http.createServer(handler).listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));const base=`http://127.0.0.1:${server.address().port}/api/portal`;
  const post=(action,data,cookie='')=>fetch(`${base}?action=${action}`,{method:'POST',headers:{'Content-Type':'application/json',cookie},body:JSON.stringify(data)});
  async function login(email){const response=await post('login',{email,password});assert.equal(response.status,200);return response.headers.get('set-cookie').split(';')[0];}
  return {shift,base,post,login,calls,store:new AutomationStore({directory:path.dirname(store.file),scope:env.SHIFTCARE_ACCOUNT_ID,env:{}})};
}
test('verified service identities scope bookings and requests and expose no private care or worker contacts',async t=>{
  const fixture=await portalFixture(t),cookie=await fixture.login('client@example.test');
  const response=await fetch(`${fixture.base}?action=bookings&id=999`,{headers:{cookie}}),body=await response.json();assert.equal(body.bookings.length,1);assert.equal(body.bookings[0].id,'10');assert.equal(JSON.stringify(body).includes('PRIVATE'),false);
  assert.equal((await fixture.post('request',{shiftId:'11',kind:'cancel',reason:'Away',requestId:'fixture-request-1'},cookie)).status,403);
  assert.equal((await fixture.post('request',{shiftId:'10',kind:'cancel',reason:'Away',requestId:'fixture-request-1'},cookie)).status,201);
  assert.equal((await fixture.post('request',{shiftId:'10',kind:'cancel',reason:'Away',requestId:'fixture-request-1'},cookie)).status,201);
  assert.equal((await fixture.store.read()).jobs.length,1);assert.equal((await fixture.store.read()).jobs[0].workflow,'W07');assert.equal(fixture.calls.some(c=>c.method!=='GET'),false);
  assert.equal((await fixture.post('start',{shiftId:'10',consent:true},cookie)).status,403);
});
test('real device ETA is consented, never stores coordinates and withdraws after reassignment',async t=>{
  const fixture=await portalFixture(t),worker=await fixture.login('worker@example.test'),client=await fixture.login('client@example.test');
  const started=await fixture.post('start',{shiftId:'10',consent:true},worker);assert.equal(started.status,200);const {journey}=await started.json();await new Promise(resolve=>setTimeout(resolve,5));
  const result=await fixture.post('eta',{shiftId:'10',sessionId:journey.sessionId,coordinates:[115.7,-31.7],accuracy:5,observedAt:Date.now()},worker);assert.equal(result.status,200);assert.equal((await result.json()).journey.remainingMinutes,10);
  assert.equal(JSON.stringify((await fixture.store.read()).arrivals).includes('115.7'),false);
  let body=await (await fetch(`${fixture.base}?action=bookings`,{headers:{cookie:client}})).json();assert.equal(body.bookings[0].arrival.remainingMinutes,10);assert.equal(JSON.stringify(body).includes(journey.sessionId),false);
  fixture.shift.staff=[{id:'124',name:'Different worker'}];body=await (await fetch(`${fixture.base}?action=bookings`,{headers:{cookie:client}})).json();assert.equal(body.bookings[0].arrival.remainingMinutes,null);
  assert.equal((await fixture.post('eta',{shiftId:'10',sessionId:journey.sessionId,coordinates:[115.7,-31.7],accuracy:5,observedAt:Date.now()},worker)).status,403);
});
test('service cookies cannot grant office access and rotate with identity changes',async t=>{
  const fixture=await portalFixture(t),cookie=await fixture.login('worker@example.test'),identity=new PortalIdentity(process.env);
  assert.equal(require('../lib/staff-auth.cjs').staffSession({headers:{cookie}}),null);assert.equal(identity.session({headers:{cookie}}).nativeId,'123');
  const accounts=JSON.parse(process.env.OCD_PORTAL_ACCOUNTS);accounts[0].nativeId='124';process.env.OCD_PORTAL_ACCOUNTS=JSON.stringify(accounts);assert.equal(identity.session({headers:{cookie}}),null);
  assert.equal((await fixture.post('request',{shiftId:'10',kind:'sickness',reason:'Unable to attend',requestId:'fixture-request-3'},cookie)).status,401);
});
