import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js';

// the config will be publicly visible in the extension's source code
// but that's generally fine for Firebase client-side apps
// and security is applied at the firestore rules level, not the client code level
const firebaseConfig = {
  // Your web app's Firebase configuration
  // Replace with the config you copied from Firebase Console
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
let isAuthInProgress = false; // The Lock

// This gives you a reference to the parent frame, i.e. the offscreen document.
const PARENT_FRAME = document.location.ancestorOrigins[0];

const PROVIDER = new GoogleAuthProvider();

function sendResponse(result) {
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const minimalData = {
        success: true,
        idToken: credential.idToken,
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName
      };
  console.log(`Auth Flow: Success! Authenticated as ${minimalData.email}`);
  window.parent.postMessage(JSON.stringify(minimalData), PARENT_FRAME);
}

function sendError(error) {
  console.log("Auth Flow: Error during sign-in:", error);
  const errorData = {
    success: false,
    error: error,
    code: -1
  };
  window.parent.postMessage(JSON.stringify(errorData), PARENT_FRAME);
}
window.addEventListener('message', async function({data}) {
  if (data.initAuth) {
    if (isAuthInProgress) {
      console.log("Auth already in progress, ignoring duplicate request.");
      return;
    }
    isAuthInProgress = true;
    console.log("Auth Flow: Received results from Extension. Opening Popup...");
    
    try {
      const result = await signInWithPopup(auth, PROVIDER);
      sendResponse(result);
    } catch (error) {
      // Only log if it's NOT a cancellation we caused
      if (error.code !== 'auth/cancelled-popup-request') {
        sendError(error);
      }
    } finally {
      isAuthInProgress = false; // Unlock it
    }

  } else {
    console.log("Auth Flow: Received message from Extension, but it doesn't have the expected initAuth property. Ignoring.");
  } 
});
