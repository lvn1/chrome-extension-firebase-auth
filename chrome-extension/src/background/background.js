const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
const FIREBASE_HOSTING_URL = 'https://testvorgan.web.app/'; // Replace with your Firebase hosting URL

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

// Function to capture screenshot
async function captureScreenshot() {
    try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Capture the visible area of the tab
        const screenshot = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
        return screenshot;
    } catch (error) {
        console.error('Error capturing screenshot:', error);
        throw error;
    }
}

// Function to upload screenshot to Firebase Storage
async function uploadScreenshot(screenshotDataUrl) {
    try {
        const auth = await getAuthFromOffscreen();
        if (!auth || !auth.uid) {
            throw new Error('User not authenticated');
        }

        // Convert data URL to blob
        const response = await fetch(screenshotDataUrl);
        const blob = await response.blob();

        // Generate timestamp for unique filename
        const timestamp = new Date().toISOString();
        const filename = `screenshots/${auth.uid}/${timestamp}.png`;

        // Send message to offscreen document to handle the upload
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                target: 'offscreen',
                action: 'uploadScreenshot',
                data: {
                    blob: blob,
                    filename: filename
                }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });
    } catch (error) {
        console.error('Error uploading screenshot:', error);
        throw error;
    }
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
    } else if (message.action === 'takeScreenshot') {
        captureScreenshot()
            .then(screenshot => uploadScreenshot(screenshot))
            .then(url => sendResponse({ success: true, url: url }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});
