/* Verified service access inside the existing application. No demo identity grants access. */
(() => {
  let host, controller, account, bookings=[], requests=[], configured=false, enabled=false, timer, watch, journey, busy=false;
  const esc = v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function api(action,data,keepalive=false) {
    const response=await fetch(`/api/portal?action=${action}`,{cache:'no-store',...(data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{}),...(keepalive?{keepalive:true}:{signal:controller?.signal})});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Service access unavailable.');return result;
  }
  const message=text=>{const node=host?.querySelector('[data-live-message]');if(node)node.textContent=text;};
  function render() {
    if(!host)return;
    host.innerHTML=`<header class="page-header"><div><span class="eyebrow">OCD Brilliance</span><h1>Your services</h1><p>${account?esc(account.name):'Sign in with your verified service account.'}</p></div><a class="btn" href="#/office/automation/shared">Office workspace</a>${account?'<button class="btn" data-live-action="logout">Sign out</button>':''}</header><p role="status" data-live-message></p>
      ${!account?`<section class="panel"><h2>Service sign-in</h2>${configured?'<form data-live-form="login"><label>Email<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button class="btn primary">Sign in</button></form>':'<p>Ask the office to configure your verified ShiftCare access. Demo accounts do not provide access to live services.</p>'}</section>`:
      `<div class="native-service-list">${bookings.length?bookings.map(b=>`<article class="panel"><h2>${esc(new Date(b.startAt).toLocaleString())}</h2><p>${b.cancelled?'Cancelled':b.completed?'Completed':esc(b.workers.map(w=>w.name).join(', '))}</p><p>${account.kind==='worker'?esc(b.clients.map(c=>c.name).join(', ')):''}</p><p>Arrival: ${b.arrival.phase==='en-route'?`about ${b.arrival.remainingMinutes} minutes`:b.arrival.phase==='arrived'?'Worker marked arrival':'No current estimate'}</p>${!b.cancelled&&!b.completed?`<details><summary>${account.kind==='worker'?'Report a service change':'Confirm or request a change'}</summary><form data-live-form="request" data-shift="${esc(b.id)}"><label>Request<select name="kind" data-native-select>${(account.kind==='worker'?['sickness','change']:['confirm','cancel','change']).map(k=>`<option value="${k}">${esc({sickness:'Report sickness',change:'Request a change',confirm:'Confirm attendance',cancel:'Request cancellation'}[k])}</option>`).join('')}</select></label><label>Reason or preferred change<textarea name="reason" maxlength="2000"></textarea></label><p>The office checks this request before changing the roster or charges.</p><button class="btn primary">Send to office review</button></form></details>${account.kind==='worker'&&enabled?`<div class="native-arrival-controls">${journey?.shiftId===b.id?`<p>Arrival sharing is active. Leaving this page ends sharing.</p><button class="btn" data-live-action="stop" data-shift="${esc(b.id)}">Stop sharing</button><button class="btn" data-live-action="arrive" data-shift="${esc(b.id)}">I have arrived</button>`:`<label class="checkbox"><input type="checkbox" data-live-consent="${esc(b.id)}"><span>Share my arrival estimate for this visit. My coordinates are used for routing and are not stored or shown to the participant.</span></label><button class="btn" data-live-action="start" data-shift="${esc(b.id)}">Start arrival sharing</button>`}</div>`:''}`:''}</article>`).join(''):'<section class="panel"><p>No services were returned for the next seven days.</p></section>'}</div><section class="panel"><h2>Your recent requests</h2>${requests.length?requests.map(r=>`<p>${esc(r.shiftId)} · ${esc(r.status.replaceAll('-',' '))} · ${esc(new Date(r.createdAt).toLocaleDateString())}</p>`).join(''):'<p>No requests have been submitted.</p>'}</section>`}`;
  }
  async function refresh() {const result=await api('bookings');bookings=result.bookings;requests=result.requests;enabled=result.arrivalsEnabled;if(!host?.querySelector('form :focus'))render();}
  function clearWatch(){if(watch!==undefined)navigator.geolocation?.clearWatch(watch);watch=undefined;busy=false;}
  async function end(action='stop',keepalive=false){clearWatch();const previous=journey;journey=null;if(previous)await api(action,{shiftId:previous.shiftId,sessionId:previous.sessionId},keepalive);}
  function locate(){
    let last=0;
    watch=navigator.geolocation.watchPosition(async position=>{
      if(!journey||busy||Date.now()-last<15000)return;busy=true;last=Date.now();const current=journey;
      try{const result=await api('eta',{shiftId:current.shiftId,sessionId:current.sessionId,coordinates:[position.coords.longitude,position.coords.latitude],accuracy:position.coords.accuracy,observedAt:position.timestamp});if(journey?.sessionId===current.sessionId){message(`Arrival estimate: about ${result.journey.remainingMinutes} minutes.`);}}
      catch(error){if(error.name!=='AbortError')message(error.message);}
      finally{busy=false;}
    },()=>{if(journey)api('unavailable',{shiftId:journey.shiftId,sessionId:journey.sessionId}).catch(()=>{});message('Location is unavailable. The participant will see that no current estimate is available.');},{enableHighAccuracy:true,maximumAge:0,timeout:15000});
  }
  async function click(event){const button=event.target.closest('[data-live-action]');if(!button)return;event.preventDefault();button.disabled=true;
    try{const action=button.dataset.liveAction;
      if(action==='logout'){await end();await api('logout',{});account=null;bookings=[];clearInterval(timer);render();}
      else if(action==='start'){if(!navigator.geolocation)throw new Error('This device does not support location sharing.');const consent=host.querySelector(`[data-live-consent="${CSS.escape(button.dataset.shift)}"]`)?.checked;if(!consent)throw new Error('Choose arrival sharing for this visit first.');await end();const result=await api('start',{shiftId:button.dataset.shift,consent:true});journey={...result.journey,shiftId:button.dataset.shift};render();locate();}
      else{await end(action);await refresh();}
    }catch(error){if(error.name!=='AbortError')message(error.message);}finally{button.disabled=false;}
  }
  async function submit(event){const form=event.target.closest('[data-live-form]');if(!form)return;event.preventDefault();event.stopPropagation();const button=form.querySelector('button');button.disabled=true;
    try{if(form.dataset.liveForm==='login'){const result=await api('login',{email:form.elements.email.value,password:form.elements.password.value});account=result.account;await refresh();timer=setInterval(()=>refresh().catch(error=>message(error.message)),15000);}
      else{form.dataset.requestId||=crypto.randomUUID();await api('request',{shiftId:form.dataset.shift,requestId:form.dataset.requestId,kind:form.elements.kind.value,reason:form.elements.reason.value});delete form.dataset.requestId;await refresh();message('Your request is with the office for review.');}
    }catch(error){if(error.name!=='AbortError')message(error.message);}finally{button.disabled=false;}
  }
  function unmount(){end('stop',true).catch(()=>{});clearInterval(timer);controller?.abort();host?.removeEventListener('click',click);host?.removeEventListener('submit',submit);host=null;}
  async function mount(element){unmount();host=element;controller=new AbortController();account=null;bookings=[];requests=[];host.addEventListener('click',click);host.addEventListener('submit',submit);host.innerHTML='<p role="status">Loading verified service access…</p>';
    try{const result=await api('session');account=result.account;configured=result.configured;enabled=result.arrivalsEnabled;render();if(account){await refresh();timer=setInterval(()=>refresh().catch(error=>message(error.message)),15000);}}
    catch(error){if(error.name!=='AbortError'&&host){render();message(error.message);}}
  }
  window.OCD_LIVE_PORTAL={mount,unmount};
})();
