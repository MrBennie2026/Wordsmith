const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow;
let ttsProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('Wordsmith.html');
  mainWindow.webContents.openDevTools(); // Remove in production
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle text-to-speech request from renderer
ipcMain.handle('speak', async (event, text, voiceName = 'en-US-AriaNeural') => {
  return new Promise((resolve, reject) => {
    try {
      // Use Windows SAPI5 (built-in, no external dependencies)
      const psCommand = `
        Add-Type -AssemblyName System.Speech;
        $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer;
        $speak.Speak('${text.replace(/'/g, "\\'")}');
      `;

      const ps = spawn('powershell.exe', ['-Command', psCommand]);

      ps.on('error', (err) => {
        console.error('TTS Error:', err);
        reject(err);
      });

      ps.on('exit', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          reject(new Error(`PowerShell exited with code ${code}`));
        }
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        ps.kill();
        reject(new Error('TTS timeout'));
      }, 60000);

    } catch (err) {
      reject(err);
    }
  });
});

// Handle stop speech
ipcMain.handle('stop-speak', async (event) => {
  try {
    const psCommand = `
      Add-Type -AssemblyName System.Speech;
      $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer;
      $speak.Pause();
    `;
    
    spawn('powershell.exe', ['-Command', psCommand]);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
