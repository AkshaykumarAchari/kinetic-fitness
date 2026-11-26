import { EXERCISES, EXERCISE_MAP, GROUPS, DAYS, DAY_LABELS } from './exercises.js';
import { addExercise, defaultDay, normalizeDay, todayKey, LOCAL_DATE, activityForWeek, completedToday, MAX_EXERCISES_PER_DAY } from './workout.js';
import { createCountdown, countdownAction, countdownTick, formatCountdown, createStopwatch, stopwatchTick, stopwatchAction, formatStopwatch } from './timers.js';
import { watchAuth, signInGoogle, signOutGoogle, readPlans, writePlan, isAuthConfigured } from './auth.js';

const $ = id => document.getElementById(id);
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const state = {
  category:'All', query:'', selectedDay:todayKey(), user:null, plans:{}, dirtyDays:new Set(),
  pendingExerciseId:null, syncStatus:'guest', revisions:{}, mode:'countdown', countdown:createCountdown(60), stopwatch:createStopwatch(),
  stats:readStats(), lastToday:LOCAL_DATE(), authGeneration:0, toastTimeout:null
};

function readStats() {
  try {
    const raw = JSON.parse(localStorage.getItem('kinetic-session-stats-v1') || '{}');
    return { sessions:Number.isSafeInteger(raw.sessions) && raw.sessions>=0?raw.sessions:0,
      trainedMs:Number.isFinite(raw.trainedMs) && raw.trainedMs>=0?Math.min(raw.trainedMs,1e12):0 };
  } catch { return {sessions:0,trainedMs:0}; }
}
function storeStats(){
  try {localStorage.setItem('kinetic-session-stats-v1',JSON.stringify(state.stats));}
  catch { /* Storage unavailable: tools still work for this session. */ }
}
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function notify(message){
  const el=$('toast'); el.textContent=message; el.classList.add('visible');
  clearTimeout(state.toastTimeout); state.toastTimeout=setTimeout(()=>el.classList.remove('visible'),4500);
}
function errorMessage(error,context='Could not complete action') {
  if (error?.code==='auth/unauthorized-domain') return 'Add this website domain to Firebase Authentication > Authorized domains.';
  if (error?.code==='permission-denied') return 'Access denied. Verify and deploy your Firestore security rules.';
  if (error?.code==='auth/popup-closed-by-user') return 'Google sign-in was cancelled.';
  if (error?.code==='auth/network-request-failed' || error?.code==='unavailable') return 'Network unavailable. Check the connection and retry.';
  if (!isAuthConfigured()) return 'Google sign-in needs a Firebase project configuration. See README.md.';
  console.error(context,error);
  return `${context}. Please retry.`;
}
function renderStats() {
  $('stat-completed').textContent=state.user ? completedToday(state.plans[todayKey()]??[]):toStringSafe(0);
  $('stat-sessions').textContent=state.stats.sessions;
  $('stat-minutes').textContent=Math.floor(state.stats.trainedMs/60000);
}
function toStringSafe(n){return String(n);}
function renderActivity() {
  const values=state.user?activityForWeek(state.plans):[0,0,0,0,0,0,0];
  const max=Math.max(3,...values);
  const today=todayKey();
  $('activity-bars').innerHTML=DAYS.map((day,i)=>`<div class="bar-col ${day===today?'active':''}"><div class="bar-holder"><div class="bar-fill" style="--bar-height:${values[i]?Math.max(12,Math.round(values[i]/max*100)):4}%" title="${DAY_LABELS[i]}: ${values[i]} completed movements"></div></div><span>${day.toUpperCase()}</span></div>`).join('');
  $('activity-bars').setAttribute('aria-label',`Completed exercises this week: ${values.map((v,i)=>`${DAY_LABELS[i]} ${v}`).join(', ')}`);
  $('activity-note').textContent=state.user ? 'Your completion data is stored privately in your Google account.' : 'Sign in to track completed exercises across devices.';
}
function renderFilters(){
  $('filter-pills').innerHTML=GROUPS.map(group=>`<button type="button" class="filter-pill ${state.category===group?'selected':''}" data-filter="${escapeHtml(group)}" aria-pressed="${state.category===group}">${escapeHtml(group)}</button>`).join('');
}
function renderExercises(){
  const q=state.query.trim().toLowerCase();
  const filtered=EXERCISES.filter(e=>(state.category==='All'||state.category===e.group)&&(!q||[e.name,e.group,e.target,e.equipment].join(' ').toLowerCase().includes(q)));
  $('exercise-grid').innerHTML=filtered.map(e=>`<article class="exercise-card"><button class="exercise-visual" data-view="${e.id}" aria-label="Watch ${escapeHtml(e.name)} 3D demonstration"><img src="assets/posters/${e.id}.webp" alt="Stylized 3D model demonstrating ${escapeHtml(e.name)}" loading="lazy"><span class="video-length">3D · 06 SEC</span><span class="visual-play">${icon('play')}</span></button><div class="exercise-info"><div class="exercise-meta"><span>${escapeHtml(e.group)}</span><span class="level">${escapeHtml(e.level)}</span></div><h3>${escapeHtml(e.name)}</h3><p>${escapeHtml(e.target)}</p><div class="card-bottom"><span>${escapeHtml(e.equipment)}</span><button type="button" data-view="${e.id}" aria-label="View ${escapeHtml(e.name)}">View demo ${icon('arrow')}</button></div></div></article>`).join('');
  $('exercise-empty').hidden=filtered.length>0;
}
function renderPlan(){
  $('plan-gate').hidden=!!state.user;
  $('plan-loading').hidden=!state.user || state.syncStatus!=='loading';
  $('plan-error').hidden=!state.user || state.syncStatus!=='error';
  $('plan-app').hidden=!state.user || state.syncStatus!=='ready';
  if (!state.user || state.syncStatus!=='ready') return;
  $('plan-title').textContent=`${DAY_LABELS[DAYS.indexOf(state.selectedDay)]} • ${state.selectedDay==='sun'?'Recovery':'Your workout'}`;
  $('day-tabs').innerHTML=DAYS.map((day,i)=>`<button type="button" class="day-tab ${state.selectedDay===day?'active':''}" data-day="${day}" role="tab" aria-selected="${day===state.selectedDay}">${day.toUpperCase()}<span>${state.plans[day]?.length??0} moves</span></button>`).join('');
  const items=state.plans[state.selectedDay]??[];
  const today=state.selectedDay===todayKey();
  $('plan-items').innerHTML=items.length?items.map((row,i)=>{
    const e=EXERCISE_MAP.get(row.id); if (!e) return '';
    const done=today && row.completedOn===LOCAL_DATE();
    return `<article class="plan-row" data-id="${row.id}"><div class="plan-movement"><img src="assets/posters/${row.id}.webp" alt="" loading="lazy"><div><strong>${escapeHtml(e.name)}</strong><button type="button" data-view="${row.id}">Watch 3D guide ↗</button></div></div><label class="plan-input">SETS<input type="number" data-field="sets" min="1" max="10" step="1" value="${row.sets}" aria-label="Sets for ${escapeHtml(e.name)}"></label><label class="plan-input">REPS / SEC<input type="number" data-field="reps" min="1" max="180" step="1" value="${row.reps}" aria-label="Reps or hold seconds for ${escapeHtml(e.name)}"></label><label class="plan-input">REST (SEC)<input type="number" data-field="restSec" min="0" max="300" step="1" value="${row.restSec}" aria-label="Rest seconds for ${escapeHtml(e.name)}"></label><div class="plan-actions"><button class="plan-check ${done?'done':''}" data-complete="${row.id}" type="button" aria-label="${done?'Unmark':'Mark'} ${escapeHtml(e.name)} complete" title="${today?'Mark completed today':'Completion available only for today'}" ${today?'':'disabled'}>${icon('check')}</button><button class="plan-remove" data-remove="${row.id}" type="button" aria-label="Remove ${escapeHtml(e.name)}">${icon('x')}</button></div></article>`;
  }).join(''):`<div class="plan-empty"><strong>Recovery is part of progress.</strong>Nothing scheduled here yet. Add a movement from the library to build this day.</div>`;
  $('plan-sync').textContent=state.dirtyDays.has(state.selectedDay)?'● Unsaved changes':'✓ Up to date';
  $('plan-sync').style.color=state.dirtyDays.has(state.selectedDay)?'#b9f767':'';
  $('plan-message').textContent=items.length>=MAX_EXERCISES_PER_DAY?'Day limit reached (12 exercises).':'Add more movements from the exercise library.';
  renderActivity();renderStats();
}
function markChanged(){
  const day=state.selectedDay;
  state.revisions[day]=(state.revisions[day]??0)+1;
  state.dirtyDays.add(day);
}
function markDirty(){markChanged();renderPlan();}
function openExercise(id){
  const e=EXERCISE_MAP.get(id); if (!e) return;
  $('dialog-title').textContent=e.name; $('dialog-group').textContent=`${e.group.toUpperCase()} / ${e.level.toUpperCase()}`;
  $('dialog-target').textContent=e.target+' · '+e.equipment;
  $('dialog-cues').replaceChildren(...e.cues.map(cue=>{const li=document.createElement('li');li.textContent=cue;return li;}));
  $('dialog-add').dataset.add=id;
  const video=$('dialog-video');
  video.src=`assets/clips/${e.id}.mp4`;video.poster=`assets/posters/${e.id}.webp`;
  video.load();$('exercise-dialog').showModal();video.play().catch(()=>{});
}
function closeExercise(){
  const video=$('dialog-video');video.pause();video.removeAttribute('src');video.load();$('exercise-dialog').close();
}
async function toggleSignIn(){
  if (state.user){
    try {await signOutGoogle();notify('You have signed out. Your saved plan stays private.');}
    catch(e){notify(errorMessage(e,'Could not sign out'));}
    return;
  }
  if (!isAuthConfigured()){ notify('To enable Google login, add Firebase settings in src/firebase-config.js. See README.');return;}
  try {await signInGoogle();}
  catch(e){notify(errorMessage(e,'Google sign-in failed'));}
}
async function onAuthChanged(user){
  const generation=++state.authGeneration;
  state.user=user;state.dirtyDays.clear();state.revisions={};state.selectedDay=todayKey();state.plans={};
  state.syncStatus=user?'loading':'guest';
  const btn=$('auth-button');btn.classList.toggle('signed-in',!!user);
  btn.querySelector('span').textContent=user?`${(user.displayName||'Account').split(' ')[0]} · Sign out`:'Sign in with Google';
  btn.setAttribute('aria-label',user?'Sign out of Google':'Sign in with Google');
  renderPlan();renderActivity();renderStats();
  if(user) await loadPrivatePlans(generation);
  else state.pendingExerciseId=null;
}
async function loadPrivatePlans(generation=state.authGeneration){
  const user=state.user; if(!user) return;
  state.syncStatus='loading';renderPlan();
  try {
    const remote=await readPlans(user.uid);
    if(state.authGeneration!==generation || state.user?.uid!==user.uid) return;
    for(const day of DAYS) state.plans[day]=normalizeDay(remote[day],day);
    if(state.pendingExerciseId){
      state.plans[state.selectedDay]=addExercise(state.plans[state.selectedDay],state.pendingExerciseId);
      state.dirtyDays.add(state.selectedDay);state.pendingExerciseId=null;
    }
    state.syncStatus='ready';
    notify(`Welcome back${user.displayName?', '+user.displayName.split(' ')[0]:''}. Your plan is ready.`);
  } catch(e){
    if(state.authGeneration!==generation)return;
    state.syncStatus='error';state.plans={};
    notify(errorMessage(e,'Unable to load private plan. Editing disabled'));
  }
  renderPlan();renderActivity();renderStats();
}
async function saveDay(){
  if(!state.user || state.syncStatus!=='ready') return notify('Connect and load your private plan before saving.');
  const day=state.selectedDay;const uid=state.user.uid;const revision=state.revisions[day]??0;
  const btn=$('plan-save');btn.disabled=true;btn.textContent='Saving...';
  try {
    const items=normalizeDay({items:state.plans[day]},day);
    await writePlan(uid,day,items);
    if (state.user?.uid===uid){
      if ((state.revisions[day]??0)===revision) state.dirtyDays.delete(day);
      notify((state.revisions[day]??0)===revision?`${DAY_LABELS[DAYS.indexOf(day)]} plan saved securely.`:'Saved the earlier version; newer edits still need saving.');
    }
  } catch(e){notify(errorMessage(e,'Could not save your plan'));}
  finally {btn.disabled=false;btn.innerHTML=`Save this day ${icon('arrow')}`;renderPlan();}
}
function handlePlanInput(input){
  const rowElement=input.closest('.plan-row');const id=rowElement?.dataset.id;
  const field=input.dataset.field; const items=state.plans[state.selectedDay];
  const row=items?.find(item=>item.id===id);
  if(!row || !['sets','reps','restSec'].includes(field)) return;
  const min=Number(input.min),max=Number(input.max),newVal=Number(input.value);
  if(!Number.isSafeInteger(newVal)||newVal<min||newVal>max){ input.setCustomValidity(`Use a whole number from ${min} to ${max}`);input.reportValidity();return; }
  input.setCustomValidity('');
  if(row[field]===newVal)return;
  row[field]=newVal;markChanged();
  $('plan-sync').textContent='● Unsaved changes';$('plan-sync').style.color='#b9f767';
}
function handleComplete(id){
  if(state.selectedDay!==todayKey()) return notify('You can only mark movements complete on the current day.');
  const row=state.plans[state.selectedDay]?.find(item=>item.id===id);if(!row) return;
  row.completedOn=row.completedOn===LOCAL_DATE()?null:LOCAL_DATE();markDirty();
}
function handleAddToPlan(id){
  if(!EXERCISE_MAP.has(id)) return;
  if(!state.user){state.pendingExerciseId=id;closeExercise();notify('Sign in with Google to add this movement to your private plan.');toggleSignIn();return;}
  if(state.syncStatus!=='ready') return notify('Your private plan must finish syncing before changes can be made.');
  const existing=state.plans[state.selectedDay]??[];
  const updated=addExercise(existing,id);
  if(updated===existing) return notify(existing.length>=MAX_EXERCISES_PER_DAY?'This day is full (max 12).':'This movement is already in your day.');
  state.plans[state.selectedDay]=updated;markChanged();
  closeExercise();renderPlan();notify('Added to your day. Save to sync it.');
  document.querySelector('#plan').scrollIntoView({behavior:'smooth'});
}
function renderTimer(){
  const stopwatch=state.mode==='stopwatch';const timer=stopwatch?state.stopwatch:state.countdown;
  const display=stopwatch?formatStopwatch(timer.elapsedMs):formatCountdown(timer.remainingMs);
  $('timer-display').textContent=display;
  $('timer-mode-label').textContent=stopwatch?'ELAPSED TIME':'TIME REMAINING';
  $('timer-status').textContent=timer.running?'KEEP GOING':(!stopwatch&&timer.remainingMs===0?'NICE WORK. DONE!':'READY WHEN YOU ARE');
  const pct=stopwatch?Math.min(1,(timer.elapsedMs%60000)/60000):1-timer.remainingMs/timer.totalMs;
  $('timer-disc').style.background=`conic-gradient(var(--green) ${Math.max(0,pct)*100}%,#29372c ${Math.max(0,pct)*100}%)`;
  $('timer-start').querySelector('span').textContent=timer.running?'Pause timer':(stopwatch?'Start stopwatch':timer.remainingMs===0?'Restart timer':'Start timer');
  $('timer-start').querySelector('use').setAttribute('href',timer.running?'#i-pause':'#i-play');
  $('timer-presets').hidden=stopwatch;
  $('timer-disc').setAttribute('aria-label',stopwatch?`Stopwatch ${display}`:`Countdown ${display}`);
}
function tick(){
  const now=performance.now();
  const previous=state.countdown;
  state.countdown=countdownTick(previous,now);
  state.stopwatch=stopwatchTick(state.stopwatch,now);
  if(previous.running&&!state.countdown.running&&state.countdown.remainingMs===0){
    state.stats.sessions++;state.stats.trainedMs+=previous.totalMs;
    storeStats();renderStats();notify('Countdown complete. Solid work!');
  }
  if(LOCAL_DATE()!==state.lastToday){state.lastToday=LOCAL_DATE();renderPlan();}
  renderTimer();
}
function timerAct(action){
  const now=performance.now();
  if(state.mode==='countdown'){
    if(action==='start' && !state.countdown.running && state.countdown.remainingMs===0)state.countdown=createCountdown(state.countdown.totalMs/1000);
    state.countdown=countdownAction(state.countdown,action==='start'&&state.countdown.running?'pause':action,now);
  } else {
    const before=stopwatchTick(state.stopwatch,now);
    const realAction=action==='start'&&before.running?'pause':action;
    if((realAction==='pause'||realAction==='reset')&&before.running&&before.elapsedMs>=1000){
      const accounted=before.elapsedMs-(state.stopwatch.accountedMs||0);
      if(accounted>0){state.stats.trainedMs+=accounted;storeStats();renderStats();}
    }
    state.stopwatch=stopwatchAction(before,realAction,now);
    // Avoid crediting the same stopwatch segment twice if restarted.
    if(realAction==='pause')state.stopwatch.accountedMs=state.stopwatch.elapsedMs;
    if(realAction==='start')state.stopwatch.accountedMs=before.accountedMs||0;
  }
  renderTimer();
}
function switchMode(mode){
  if(!['countdown','stopwatch'].includes(mode))return;
  state.mode=mode;
  document.querySelectorAll('.mode-tab').forEach(b=>{const selected=b.dataset.mode===mode;b.classList.toggle('active',selected);b.setAttribute('aria-selected',selected);});
  renderTimer();
}
function updateNav(){
  const hash=(window.location.hash||'#overview').slice(1);const target=['overview','exercises','tools','plan'].includes(hash)?hash:'overview';
  document.querySelectorAll('[data-nav]').forEach(link=>{link.classList.toggle('selected',link.dataset.nav===target);link.classList.toggle('active',link.dataset.nav===target)});
  $('breadcrumb-current').textContent=target.toUpperCase();
  $('page-header-title').textContent=({overview:'Training dashboard',exercises:'Exercise library',tools:'Training tools',plan:'My weekly workout'})[target];
  closeMenu();
}
function closeMenu(){$('sidebar').classList.remove('open');$('mobile-shade').hidden=true;$('menu-toggle').setAttribute('aria-expanded','false');}
function initEvents(){
  document.querySelectorAll('[data-nav]').forEach(el=>el.addEventListener('click',()=>setTimeout(updateNav,0)));
  window.addEventListener('hashchange',updateNav);
  $('menu-toggle').addEventListener('click',()=>{const show=!$('sidebar').classList.contains('open');$('sidebar').classList.toggle('open',show);$('mobile-shade').hidden=!show;$('menu-toggle').setAttribute('aria-expanded',String(show));});
  $('mobile-shade').addEventListener('click',closeMenu);
  $('auth-button').addEventListener('click',toggleSignIn);
  $('plan-signin').addEventListener('click',toggleSignIn);
  $('exercise-search').addEventListener('input',e=>{state.query=e.target.value.slice(0,100);renderExercises();});
  $('filter-pills').addEventListener('click',e=>{const button=e.target.closest('[data-filter]');if(button){state.category=button.dataset.filter;renderFilters();renderExercises();}});
  $('exercise-grid').addEventListener('click',e=>{const btn=e.target.closest('[data-view]');if(btn)openExercise(btn.dataset.view);});
  $('dialog-close').addEventListener('click',closeExercise);
  $('exercise-dialog').addEventListener('click',e=>{if(e.target===$('exercise-dialog'))closeExercise();});
  $('exercise-dialog').addEventListener('close',()=>{$('dialog-video').pause();});
  $('dialog-add').addEventListener('click',e=>handleAddToPlan(e.currentTarget.dataset.add));
  $('day-tabs').addEventListener('click',e=>{const button=e.target.closest('[data-day]');if(button && DAYS.includes(button.dataset.day)){state.selectedDay=button.dataset.day;renderPlan();}});
  $('plan-items').addEventListener('click',e=>{
    const view=e.target.closest('[data-view]');if(view){openExercise(view.dataset.view);return;}
    const complete=e.target.closest('[data-complete]');if(complete){handleComplete(complete.dataset.complete);return;}
    const remove=e.target.closest('[data-remove]');if(remove){state.plans[state.selectedDay]=state.plans[state.selectedDay].filter(row=>row.id!==remove.dataset.remove);markDirty();}
  });
  $('plan-items').addEventListener('change',e=>{if(e.target.matches('[data-field]'))handlePlanInput(e.target);});
  $('plan-save').addEventListener('click',saveDay);
  $('plan-retry').addEventListener('click',()=>loadPrivatePlans());
  $('timer-start').addEventListener('click',()=>timerAct('start'));
  $('timer-reset').addEventListener('click',()=>timerAct('reset'));
  document.querySelectorAll('.mode-tab').forEach(button=>button.addEventListener('click',()=>switchMode(button.dataset.mode)));
  $('timer-presets').addEventListener('click',e=>{const button=e.target.closest('[data-seconds]');if(!button)return;
    state.countdown=createCountdown(Number(button.dataset.seconds));
    document.querySelectorAll('.preset').forEach(b=>b.classList.toggle('selected',b===button));renderTimer();
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
  window.addEventListener('beforeunload',e=>{
    if (state.user && state.dirtyDays.size){e.preventDefault();e.returnValue='';}
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
}
function init(){
  $('header-date').textContent=new Intl.DateTimeFormat('en-IN',{weekday:'short',day:'numeric',month:'short'}).format(new Date()).toUpperCase();
  renderFilters();renderExercises();renderActivity();renderStats();renderPlan();renderTimer();updateNav();initEvents();
  setInterval(tick,100);
  watchAuth(onAuthChanged).catch(e=>notify(errorMessage(e,'Google authentication unavailable')));
}
init();
