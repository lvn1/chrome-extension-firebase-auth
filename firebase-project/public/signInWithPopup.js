import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDUnp1zjqoB5hc-3c4f9m289TtEQaI39EU",
  authDomain: "testvorgan.firebaseapp.com",
  projectId: "testvorgan",
  storageBucket: "testvorgan.firebasestorage.app",
  messagingSenderId: "521105889239",
  appId: "1:521105889239:web:33cbc3bf4e845444a75d92",
  measurementId: "G-V26T8W2SBL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();

// This gives you a reference to the parent frame, i.e. the offscreen document.
const PARENT_FRAME = document.location.ancestorOrigins[0];

const PROVIDER = new GoogleAuthProvider();

function sendResponse(result) {
  window.parent.postMessage(JSON.stringify(result), PARENT_FRAME);
}

window.addEventListener('message', function({data}) {
  if (data.initAuth) {
    signInWithPopup(auth, PROVIDER)
      .then(sendResponse)
      .catch(sendResponse);
  }
});
