import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  selectFiles: (exportDir, ignoreDir) => ipcRenderer.invoke('select-files', exportDir, ignoreDir),
  renameFiles: (selectedFiles, params) => ipcRenderer.invoke('rename-files', selectedFiles, params),
  recoverFile: (oldPath, newPath) => ipcRenderer.invoke('recover-file', oldPath, newPath)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
