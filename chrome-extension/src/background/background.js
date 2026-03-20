// 1. Import Firebase (Ensure you use the 'web-extension' path for MV3)
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth/web-extension';
import { getFirestore, doc, setDoc, collection } from 'firebase/firestore';

// the config will be publicly visible in the extension's source code
// but that's generally fine for Firebase client-side apps
// and security is applied at the firestore rules level, not the client code level
const firebaseConfig = {
  //put config here
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
const FIREBASE_HOSTING_URL = 'https://your-project-id.web.app'; // Replace with your Firebase hosting URL

let creatingOffscreenDocument;

async function hasOffscreenDocument() {
    const matchedClients = await clients.matchAll();
    return matchedClients.some((client) => client.url.endsWith(OFFSCREEN_DOCUMENT_PATH));
}

async function setupOffscreenDocument() {
    if (await hasOffscreenDocument()) return;

    if (creatingOffscreenDocument) {
        await creatingOffscreenDocument;
    } else {
        creatingOffscreenDocument = chrome.offscreen.createDocument({
            url: OFFSCREEN_DOCUMENT_PATH,
            reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
            justification: 'Firebase Authentication'
        });
        await creatingOffscreenDocument;
        creatingOffscreenDocument = null;
    }
}

async function getAuthFromOffscreen() {
    await setupOffscreenDocument();
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({action: 'getAuth', target: 'offscreen'}, (response) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(response);
            }
        });
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target === 'offscreen') return false;
    if (message.action === 'signIn') {
        getAuthFromOffscreen()
            .then(user => {
                if (user.success == false) {
                    console.log('Received unsuccessful auth response from offscreen document');
                    return sendResponse({error: user.error});
                }
                console.log('Received user from offscreen:', user.email+ " uid "+user.uid);
                //token is not stored in the extension, only the minimal user info is stored for convenience,
                // but the token is not stored since it can be easily obtained again from the offscreen document if needed, 
                // storing it would require additional security considerations
                const user_stored = {
                    'email': user.email,
                    'uid': user.uid,
                    'name': user.displayName
                };
                try {
                    signInWithFirebase(user.idToken); 
                    writeTestData('chrom-ext-login', user.uid, {email: user.email, name: user.displayName, timestamp: new Date().toISOString()}, (response) => {
                        // Handle response if needed
                        console.log('Response from writeTestData:', response);
                    });
                } catch (error) {
                    console.log('Error during local Firebase sign-in:', error);
                    sendResponse({error: error.message});
                }
                chrome.storage.local.set({'user': user_stored}, () => {
                        console.log('User stored in local storage:', user_stored);
                        sendResponse({user: user_stored});
                });
            })
            .catch(error => {
                console.error('Authentication error:', error);
                sendResponse({error: error.message});
            });
        return true; // Indicates we will send a response asynchronously
    } else if (message.action === 'signOut') {
        chrome.storage.local.remove('user', () => {
            sendResponse();
        });
        return true;
    }
});


async function signInWithFirebase(googleIdToken) {
    // 2. THE KEY: Sign in the SDK using the ID Token, this allow us to directly read/write data to firestore
    
    const credential = GoogleAuthProvider.credential(googleIdToken);
    const userCredential = await signInWithCredential(auth, credential);
    //loggin uid to match it with other uid logs to ensure that the same user is authenticated in both places
    console.log('Local Firebase sdk initialization successful:', userCredential.user.email +" uid "+userCredential.user.uid);
    return userCredential;
}

function writeTestData(collection_name, uid, data, sendResponse) {
   // setDoc will create or overwrite the document
    data['uid'] = uid;
    data['id'] = uid; 
    setDoc(doc(db, 'chrom-last-login', uid), data)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));

    const myCollection = collection(db, collection_name);

    //to add a document with a auto generated Id
    // 1. Create a reference with a generated ID (does NOT hit the network yet)
    const newDocRef = doc(myCollection); 
    const autoId = newDocRef.id;

    // 2. Add the ID to your data object if you want
    data['id'] = autoId ;
    // 3. Save the document
    setDoc(newDocRef, data)
      .then(() => sendResponse({ success: true, id: autoId }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
}

