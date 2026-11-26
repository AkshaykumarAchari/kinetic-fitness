/** Pure, monotonic-clock timer state: robust to delayed background ticks. */
export function createCountdown(seconds, now = 0) {
  if (!Number.isSafeInteger(seconds) || seconds<1 || seconds>7200) throw new RangeError('Seconds must be 1..7200');
  return { totalMs:seconds*1000, remainingMs:seconds*1000, running:false, endsAt:null };
}
export function countdownAction(state, action, now) {
  if (!Number.isFinite(now)) throw new TypeError('Invalid clock');
  const current = countdownTick(state, now);
  if (action==='start' && current.remainingMs>0) return {...current,running:true,endsAt:now+current.remainingMs};
  if (action==='pause') return {...current,running:false,endsAt:null};
  if (action==='reset') return {...current,running:false,remainingMs:current.totalMs,endsAt:null};
  return current;
}
export function countdownTick(state, now) {
  if (!Number.isFinite(now)) throw new TypeError('Invalid clock');
  if (!state.running) return state;
  const left=Math.max(0,state.endsAt-now);
  return {...state,remainingMs:left,running:left>0,endsAt:left>0?state.endsAt:null};
}
export const formatCountdown = ms => {
  const s=Math.ceil(Math.max(0,ms)/1000);
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
};
export const formatStopwatch = ms => {
  const total=Math.floor(Math.max(0,ms)/100);
  const s=Math.floor(total/10);
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}.${total%10}`;
};
export function createStopwatch(){ return { elapsedMs:0, running:false, startedAt:null }; }
export function stopwatchTick(state,now) {return state.running?{...state,elapsedMs:Math.max(0,now-state.startedAt)}:state;}
export function stopwatchAction(state,action,now){
  const current=stopwatchTick(state,now);
  if(action==='start'&&!current.running) return {...current,running:true,startedAt:now-current.elapsedMs};
  if(action==='pause') return {...current,running:false,startedAt:null};
  if(action==='reset') return createStopwatch();
  return current;
}
