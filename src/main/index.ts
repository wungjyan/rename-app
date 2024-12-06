import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  dialog,
  IpcMainInvokeEvent,
  OpenDialogOptions
} from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function isDirectorySync(path) {
  try {
    const stats = fs.statSync(path)
    return stats.isDirectory()
  } catch (err) {
    console.error('Error:', err)
    throw new Error('isDirectorySync error')
  }
}

function getFilesInDirectory(directory, ignoreDir) {
  try {
    const files: string[] = []
    const items = fs.readdirSync(directory, { withFileTypes: true })

    for (const item of items) {
      if (item.name === '.DS_Store') {
        continue
      }
      const fullPath = path.join(directory, item.name)
      if (ignoreDir) {
        if (item.isFile()) {
          files.push(fullPath)
        }
      } else {
        files.push(fullPath)
      }
    }

    return files
  } catch (err) {
    console.log(err)
    throw new Error('getFilesInDirectory error')
  }
}

ipcMain.handle(
  'select-files',
  async (_event: IpcMainInvokeEvent, exportDir = false, ignoreDir = true) => {
    console.log(ignoreDir)

    let properties = <OpenDialogOptions['properties']>[]
    if (exportDir) {
      properties = ['openDirectory']
    } else {
      properties = ['openFile', 'multiSelections']
    }

    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties
    })
    if (!canceled) {
      if (filePaths.length === 1 && isDirectorySync(filePaths[0])) {
        // 遍历获取一级文件路径
        return getFilesInDirectory(filePaths[0], ignoreDir)
      } else {
        return filePaths
      }
    } else {
      return []
    }
  }
)

ipcMain.handle('rename-files', async (_event: IpcMainInvokeEvent, selectedFiles, params) => {
  try {
    selectedFiles = JSON.parse(selectedFiles)
    params = JSON.parse(params)
    // console.log(selectedFiles, params)
    const renamedPaths: Array<{ path: string; isRenamed: boolean }> = []
    let sortNum = Number(params.startNum || 0)
    for (const p of selectedFiles) {
      const parentDir = path.dirname(p)
      const ext = path.extname(p)
      const fileName = path.basename(p, ext)
      console.log('fileName===', fileName)

      // 这里是生成新名字和新路径
      let newFileName = ''
      if (params.renameType === 0) {
        newFileName = fileName.replace(new RegExp(params.searchStr, 'g'), params.replaceStr)
      } else if (params.renameType === 1) {
        newFileName = fileName.replace(eval(params.searchStr), params.replaceStr)
      } else if (params.renameType === 2) {
        const sortNumText = `${params.numPrefix}${sortNum}${params.numSuffix}`
        sortNum++
        newFileName = params.numLocation === 0 ? sortNumText + fileName : fileName + sortNumText
      }

      console.log('newFileName =', newFileName)

      if (newFileName === fileName) {
        renamedPaths.push({
          path: p,
          isRenamed: false
        })
      } else {
        // const newPath = path.join(parentDir, newFileName)
        const newPath = generateUniqueFileNamePath(parentDir, newFileName, ext)
        // 这里执行重命名
        fs.renameSync(p, newPath)
        renamedPaths.push({
          path: newPath,
          isRenamed: true
        })
      }
    }
    return { success: true, renamedPaths }
  } catch (error) {
    console.log(error)
    return { success: false, error }
  }
})

ipcMain.handle('recover-file', async (_event: IpcMainInvokeEvent, oldPath, newPath) => {
  try {
    fs.renameSync(newPath, oldPath)
    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
})

// 生成唯一的文件名，避免覆盖
function generateUniqueFileNamePath(directory, fileName, ext) {
  let newFileName = fileName + ext
  let newPath = path.join(directory, newFileName)
  let counter = 1

  while (fs.existsSync(newPath)) {
    newFileName = `${fileName}(${counter})${ext}`
    newPath = path.join(directory, newFileName)
    counter++
  }

  return newPath
}
