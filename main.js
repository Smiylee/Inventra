import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

// Set up database path
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'store.db');
const dbSource = process.env.NODE_ENV === 'development' 
  ? path.join(__dirname, 'prisma/store.db')
  : path.join(process.resourcesPath, 'store.db');

// Set up logging
const logPath = path.join(userDataPath, 'app.log');
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logPath, logMessage);
  console.log(message);
};

log('App starting...');
log(`Database path: ${dbPath}`);
log(`Database source: ${dbSource}`);

// Copy database if it doesn't exist
if (!fs.existsSync(dbPath)) {
  try {
    // Ensure directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    // In dev mode, we might not have the DB in the expected place if not built, 
    // but let's assume standard structure or skip if dev.
    if (fs.existsSync(dbSource)) {
        fs.copyFileSync(dbSource, dbPath);
        log('Database copied successfully');
    } else {
        log(`Database source not found at: ${dbSource}`);
    }
  } catch (error) {
    log(`Failed to copy database: ${error.message}`);
  }
}

// Set environment variables for the Express app
process.env.DATABASE_URL = `file:${dbPath.replace(/\\/g, '/')}`;
process.env.PORT = 3000; 
process.env.SESSION_DB_PATH = userDataPath; 

async function createWindow() {
  log('Creating window...');
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Open DevTools for debugging
  mainWindow.webContents.openDevTools();

  // Import and start the Express app
  log('Importing Express app...');
  try {
      await import('./home-page/app.mjs');
      log('Express app imported successfully');
  } catch (e) {
      log(`Failed to start server: ${e.stack}`);
  }

  const startUrl = `http://localhost:${process.env.PORT}`;
  log(`Target URL: ${startUrl}`);

  const pollServer = async () => {
    try {
      const response = await fetch(startUrl);
      if (response.ok) {
        log('Server is ready, loading URL...');
        mainWindow.loadURL(startUrl);
        return;
      } else {
          log(`Server responded with status: ${response.status}`);
      }
    } catch (e) {
      // Server not ready yet
    }
    setTimeout(pollServer, 300);
  };

  pollServer();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
