'use strict';

const electron = require("electron");
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const production = false;
const debug = production ? function() { } : console.log;

let mainWindow;
function createWindow() {
    mainWindow = new BrowserWindow({ width: 830, height: 600 , minWidth: 830, minHeight: 550, frame: true, autoHideMenuBar: true});
    mainWindow.loadURL('file://' + __dirname + '/index.html');
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', function () {
        debug("Main window closed")
    });
}


app.on('ready', createWindow);

app.on('window-all-closed', function () {
    debug("Quiting")
    app.quit();
});