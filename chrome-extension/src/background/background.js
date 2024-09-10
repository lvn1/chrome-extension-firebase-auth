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
    if (message.action === 'signIn') {
        getAuthFromOffscreen()
            .then(user => {
                chrome.storage.local.set({user: user}, () => {
                    sendResponse({user: user});
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
