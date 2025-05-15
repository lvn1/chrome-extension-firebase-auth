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
        
        if (!tab) {
            throw new Error('No active tab found');
        }

        // Capture the visible area of the tab with specific quality settings
        const screenshot = await chrome.tabs.captureVisibleTab(null, {
            format: 'png',
            quality: 100
        });

        // Verify that we got a valid data URL
        if (!screenshot || !screenshot.startsWith('data:image/png;base64,')) {
            throw new Error('Invalid screenshot format');
        }

        // Verify the data URL contains actual image data
        const base64Data = screenshot.split(',')[1];
        if (!base64Data || base64Data.length < 100) {  // Basic sanity check
            throw new Error('Screenshot data is too small or empty');
        }

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

        // Validate the data URL
        if (!screenshotDataUrl || !screenshotDataUrl.startsWith('data:image/png;base64,')) {
            throw new Error('Invalid screenshot format');
        }

        // Convert data URL to blob more carefully
        const base64Data = screenshotDataUrl.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        const blob = new Blob(byteArrays, { type: 'image/png' });

        // Verify blob size
        if (blob.size < 100) {  // Basic sanity check
            throw new Error('Generated blob is too small');
        }

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
        // Clear both local storage and offscreen cache
        Promise.all([
            new Promise(resolve => chrome.storage.local.remove('user', resolve)),
            new Promise(resolve => 
                chrome.runtime.sendMessage(
                    {action: 'clearAuth', target: 'offscreen'},
                    () => resolve()
                )
            )
        ]).then(() => sendResponse());
        return true;
    } else if (message.action === 'takeScreenshot') {
        captureScreenshot()
            .then(screenshot => uploadScreenshot(screenshot))
            .then(url => sendResponse({ success: true, url: url }))
            .catch(error => {
                console.error('Screenshot error:', error);
                // If not authenticated, send specific error
                if (error.message === 'User not authenticated') {
                    sendResponse({ 
                        success: false, 
                        error: 'Please sign in again to take screenshots',
                        requiresAuth: true 
                    });
                } else {
                    sendResponse({ success: false, error: error.message });
                }
            });
        return true;
    }
});
