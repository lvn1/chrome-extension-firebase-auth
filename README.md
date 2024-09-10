# We're writing this guide because the official Google guide is missing a few important steps, linked below:

[Official Google guide - Authenticate with Firebase in a Chrome extension](https://firebase.google.com/docs/auth/web/chrome-extension)

[Dev.to Guide](https://dev.to/lvn1/google-authentication-in-a-chrome-extension-with-firebase-2bmo)

You can clone the repo here or start from scratch by following the tutorial below.

[Github repo](https://github.com/lvn1/chrome-extension-firebase-auth)

## If you find this guide helpful please give us a star :)

## Prerequisites
This will work on any operating system. For the purposes of this guide we'll be using Mac OS

- Google Chrome browser
- A Google account (Will be linked to Firebase and Chrome Web Store)
- A Chrome web store developer account ($5 one time fee)
- Node.js and npm installed (Latest or LTS version)

## Step 1: Create the Project Structure
**a)** Create a new directory for your project: 

```
mkdir firebase-chrome-auth
cd firebase-chrome-auth
```

**b)** Create two subdirectories:
    
```
mkdir chrome-extension
mkdir firebase-project
```

## Step 2: Set up the Firebase Project
**a)** Go to the Firebase Console.
**b)** Click "Add project" and follow the steps to create a new project.
**c)** Once created, click on "Web" to add a web app to your project.
**d)** Register your app with a nickname (e.g., "Chrome Extension Auth"). Also select hosting, we'll add it later in command line.
**e)** Copy the Firebase configuration object. You'll need this later.
```
const firebaseConfig = {
  apiKey: "example",
  authDomain: "example.firebaseapp.com",
  projectId: "example",
  storageBucket: "example",
  messagingSenderId: "example",
  appId: "example"
};
```
**f)** Navigate to the firebase-project directory
    `cd firebase-project`
**g)** Initialize a new npm project
    `npm init -y`
**h)** Create a public dir `mkdir public`
**i)** Create an index.html file 
_firebase-project/public/index.html_
```
<!DOCTYPE html>
<html>
 <head>
  <title>Firebase Auth for Chrome Extension</title>
 </head>
 <body>
  <h1>Firebase Auth for Chrome Extension</h1>
  <script type="module" src="signInWithPopup.js"></script>
 </body>
</html>
```
**j)** Create a signInWithPopup.js file 
_firebase-project/public/signInWithPopup.js_

```
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  // Your web app's Firebase configuration
  // Replace with the config you copied from Firebase Console
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
```

**k)** Deploy the Firebase project
```
npm install -g firebase-tools (You might need to run this as sudo)
firebase login
firebase init hosting (Use existing project which we created in the firebase console earlier)

What do you want to use as your public directory? public
Configure as a single-page app (rewrite all urls to /index.html)? Yes
Set up automatic builds and deploys with GitHub? No
File public/index.html already exists. Overwrite? No

firebase deploy
```
**Note the hosting URL provided after deployment. You'll need this for the Chrome extension.**

### Step 3: Set up the Chrome Extension

**a)** Navigate to the chrome-extension directory
```
cd ../chrome-extension
npm init -y
mkdir src
mkdir src/public
mkdir src/background
mkdir src/popup
```

**b)** We'll be using webpack to build our extension, you can install it with the following command along with firebase
`npm i -D webpack webpack-cli html-webpack-plugin copy-webpack-plugin firebase` and create a basic webpack config file 
_chrome-extension/webpack.config.js_
```
const path = require('path'),
 CopyWebpackPlugin = require('copy-webpack-plugin'),
 HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    background: './src/background/background.js',
    popup: './src/popup/popup.js',
  },
  mode: 'development',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src", "popup", "popup.html"),
      filename: "popup.html",
      chunks: ["firebase_config"]
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: './public/' }
      ],
    }),
  ],
};
```
In the package.json file, add the script:
```
"scripts": {
    "release": "webpack --config webpack.config.js && zip -r dist.zip dist/*"
  },
```

**c)** Create a manifest.json file 
_chrome-extension/src/public/manifest.json_
```
{
  "manifest_version": 3,
  "name": "Firebase Auth Extension",
  "version": "1.0",
  "description": "Chrome extension with Firebase Authentication",
  "permissions": [
    "identity",
    "storage",
    "offscreen"
  ],
  "host_permissions": [
    "https://*.firebaseapp.com/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html"
  },
  "web_accessible_resources": [
    {
      "resources": ["offscreen.html"],
      "matches": ["<all_urls>"]
    }
  ],
  "oauth2": {
    "client_id": "YOUR-ID.apps.googleusercontent.com",
    "scopes": [
      "openid", 
      "email", 
      "profile"
    ]
  },
  "key": "-----BEGIN PUBLIC KEY-----\nYOURPUBLICKEY\n-----END PUBLIC KEY-----"
}
```

**d)** Create a popup.html file
_chrome-extension/src/popup/popup.html_
```
<!DOCTYPE html>
<html>
<head>
    <title>Firebase Auth Extension</title>
</head>
<body>
    <h1>Firebase Auth Extension</h1>
    <div id="userInfo"></div>
    <button id="signInButton">Sign In</button>
    <button id="signOutButton" style="display:none;">Sign Out</button>
    <script src="popup.js"></script>
</body>
</html>
```

**e)** Create a popup.js file
_chrome-extension/src/popup/popup.js_
```
document.addEventListener('DOMContentLoaded', function() {
    const signInButton = document.getElementById('signInButton');
    const signOutButton = document.getElementById('signOutButton');
    const userInfo = document.getElementById('userInfo');

    function updateUI(user) {
        if (user) {
            userInfo.textContent = `Signed in as: ${user.email}`;
            signInButton.style.display = 'none';
            signOutButton.style.display = 'block';
        } else {
            userInfo.textContent = 'Not signed in';
            signInButton.style.display = 'block';
            signOutButton.style.display = 'none';
        }
    }

    chrome.storage.local.get(['user'], function(result) {
        updateUI(result.user);
    });

    signInButton.addEventListener('click', function() {
        chrome.runtime.sendMessage({action: 'signIn'}, function(response) {
            if (response.user) {
                updateUI(response.user);
            }
        });
    });

    signOutButton.addEventListener('click', function() {
        chrome.runtime.sendMessage({action: 'signOut'}, function() {
            updateUI(null);
        });
    });
});
```

**f)** Create a background.js file 
_chrome-extension/src/background/background.js_
```
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
```

**g)** Create an offscreen.html file
 _chrome-extension/src/public/offscreen.html_
```
<!DOCTYPE html>
<html>
<head>
    <title>Offscreen Document</title>
</head>
<body>
    <script src="offscreen.js"></script>
</body>
</html>
```

**h)** Create an offscreen.js file 
_chrome-extension/src/public/offscreen.js_
```
const FIREBASE_HOSTING_URL = 'https://your-project-id.web.app'; // Replace with your Firebase hosting URL

const iframe = document.createElement('iframe');
iframe.src = FIREBASE_HOSTING_URL;
document.body.appendChild(iframe);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getAuth' && message.target === 'offscreen') {
        function handleIframeMessage({data}) {
            try {
                const parsedData = JSON.parse(data);
                window.removeEventListener('message', handleIframeMessage);
                sendResponse(parsedData.user);
            } catch (e) {
                console.error('Error parsing iframe message:', e);
            }
        }

        window.addEventListener('message', handleIframeMessage);
        iframe.contentWindow.postMessage({initAuth: true}, FIREBASE_HOSTING_URL);
        return true; // Indicates we will send a response asynchronously
    }
});
```

## Step 4: Build and Upload your extension to the Chrome Web Store
**a)** Sign up and pay the one time $5 fee if you want to create and publish extensions in the Chrome Web Store (If you don't do this then you won't be able to get a public key or Extension ID which are needed for this tutorial to work and you will only be able to run your chrome extensions locally)
**b)** Navigate to the Chrome Web Store Developer Dashboard, click on the Items menu option on the left hand side and then click the '+ New item' on the right side of the page
**c)** Build and zip your extension using the script we created earlier like so: `npm run release`

*(Note: I use webpack, you can use Vite or anything else you prefer)*

**d)** Upload your Dist.zip file to the Chrome Web Store after clicking the new item button
**e)** Now you'll have a draft listing, you can fill in the info and save draft or complete it later.
**f)** You can find your Extension ID at the top of the page on the left side and to get your Public key, click on Package in the menu on the left and then click 'View public key'
**g)** Copy your Extension ID into the manifest.json where it says 'YOUR-ID' and copy your public key in between the -----BEGIN PUBLIC KEY----- and -----END PUBLIC KEY----- lines into your manifest where it says 'YOURPUBLICKEY' make sure it's between the two '/n' statements

## Step 5: Configure Firebase Authentication
**a)** In the Firebase Console, go to Authentication > Sign-in method.
**b)** Enable Google as a sign-in provider.
**c)** Add your Chrome extension's ID to the authorized domains list:
The format is: chrome-extension://YOUR_EXTENSION_ID

## Step 6: Load and Test the Extension
**a)** Open Google Chrome and go to chrome://extensions/.
**b)** Enable "Developer mode" in the top right corner.
**c)** Click "Load unpacked" and select your chrome-extension directory.
**d)** Click on the extension icon in Chrome's toolbar to open the popup.
**e)** Click the "Sign In" button and test the authentication flow.

## Troubleshooting

If you encounter CORS issues, ensure your Firebase hosting URL is correctly set in both background.js and offscreen.js.

Make sure your Chrome extension's ID is correctly added to Firebase's authorized domains.

Check the console logs in the popup, background script, and offscreen document for any error messages.

## Conclusion

You now have a Chrome extension that uses Firebase Authentication with an offscreen document to handle the sign-in process. This setup allows for secure authentication without exposing sensitive Firebase configuration details directly in the extension code.

Remember to replace placeholder values (like YOUR_EXTENSION_ID, YOUR-CLIENT-ID, YOUR_PUBLIC_KEY, and your-project-id) with your actual values before publishing your extension.

If you found this guide helpful please give us a star and follow us on Dev.to for more guides
[Dev.to](https://dev.to/lvn1)

