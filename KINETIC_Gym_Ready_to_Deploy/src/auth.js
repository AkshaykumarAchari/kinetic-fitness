import { firebaseConfig } from './firebase-config.js';
import { DAYS } from './exercises.js';

/** Firebase SDK is loaded only when configuration is provided.
 * No personal data is stored outside the user's private Firestore documents.
 */
let contextPromise;
async function context() {
  if (!firebaseConfig || !firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.authDomain || !firebaseConfig.appId) {
    throw new Error('Google sign-in needs Firebase setup. See README.md for the 5-minute configuration.');
  }
  contextPromise ??= (async () => {
    const [appSdk,authSdk,dbSdk] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js')
    ]);
    const app=appSdk.initializeApp(firebaseConfig);
    const auth=authSdk.getAuth(app);
    const db=dbSdk.getFirestore(app);
    return {authSdk,dbSdk,auth,db};
  })().catch(error=>{contextPromise=null; throw error;});
  return contextPromise;
}
export const isAuthConfigured = () => !!(firebaseConfig?.apiKey && firebaseConfig?.authDomain && firebaseConfig?.projectId && firebaseConfig?.appId);
export async function watchAuth(callback) {
  if (!isAuthConfigured()) { callback(null); return () => {}; }
  const {authSdk,auth}=await context();
  await authSdk.getRedirectResult(auth).catch(err=> { console.warn('Redirect auth result:',err.code??err.message); });
  return authSdk.onAuthStateChanged(auth, callback, error => console.error('Auth state error:',error));
}
export async function signInGoogle() {
  const {authSdk,auth}=await context();
  const provider=new authSdk.GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  try { return await authSdk.signInWithPopup(auth,provider); }
  catch (e) {
    // Redirect is the supported fallback for mobile/blocked popups.
    if (['auth/popup-blocked','auth/popup-closed-by-user','auth/cancelled-popup-request'].includes(e.code)) {
      if(e.code==='auth/popup-closed-by-user') throw e;
      return authSdk.signInWithRedirect(auth,provider);
    }
    throw e;
  }
}
export async function signOutGoogle(){const {authSdk,auth}=await context();return authSdk.signOut(auth);}
export async function readPlans(uid) {
  const {dbSdk,db,auth}=await context();
  if (auth.currentUser?.uid!==uid) throw new Error('Please sign in first');
  // Read explicit seven document IDs. A collection query would require
  // broader `list` permissions; deny listing entirely in Firestore rules.
  const documents=await Promise.all(DAYS.map(day=>dbSdk.getDoc(dbSdk.doc(db,'users',uid,'plans',day))));
  const out={};
  documents.forEach((snapshot,i)=>{if(snapshot.exists())out[DAYS[i]]=snapshot.data();});
  return out;
}
export async function writePlan(uid,day,items) {
  const {dbSdk,db,auth}=await context();
  if (auth.currentUser?.uid!==uid) throw new Error('Please sign in first');
  await dbSdk.setDoc(dbSdk.doc(db,'users',uid,'plans',day),{
    day,items,updatedAt:dbSdk.serverTimestamp()
  });
}
