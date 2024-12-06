<script setup>
import { isValidRegex } from '@utils'
// 导入文件方式
const selectType = ref(0)
const selectTypes = [
  { name: '批量选择文件', key: 0 },
  { name: '导入文件夹', key: 1 }
]

// 是否忽略文件夹
const ignoreDir = ref(true)
const ignoreDirTypes = [
  { name: '忽略文件夹', key: true },
  { name: '不忽略文件夹', key: false }
]

const tips =
  '<div><p>1.批量选择文件：你可以手动选择多个文件进行重命名，如果不忽略文件夹，文件夹也可以被选中重命名</p><p>2.导入文件夹：导入文件夹中所有的文件进行重命名，如果不忽略文件夹，文件夹也会被导入重命名</p><p>3.关于文件夹：不会递归修改子文件夹下的文件</p></div>'

// 命名方式
const renameType = ref(0)
const renameTypes = [
  { name: '替换文本', key: 0 },
  { name: '正则匹配', key: 1 },
  { name: '添加序号', key: 2 }
]

// 文本替换
const searchStr = ref('')
const replaceStr = ref('')

// 序号命名
const startNum = ref(0)
const numPrefix = ref('')
const numSuffix = ref('')

const numLocation = ref(0)
const numLocations = [
  { name: '加在名字前面', key: 0 },
  { name: '加在名字后面', key: 1 }
]

const selectedFiles = ref([])
const selectFiles = async () => {
  selectedFiles.value = await window.api.selectFiles(selectType.value === 1, ignoreDir.value)
  console.log(selectedFiles.value)
}

const renamedPaths = ref([])
const handleRename = async () => {
  const params = {
    renameType: renameType.value,
    ignoreDir: ignoreDir.value
  }
  if (renameType.value === 0 || renameType.value === 1) {
    if (searchStr.value === '') {
      ElMessage({
        message: renameType.value === 0 ? '请输入要匹配的文本' : '请输入要匹配的正则表达式',
        type: 'warning'
      })
      return
    }
    if (renameType.value === 1 && !isValidRegex(searchStr.value)) {
      ElMessage({
        message: '请输入正确的表达式',
        type: 'warning'
      })
      return
    }
    params.searchStr = searchStr.value
    params.replaceStr = replaceStr.value
  }
  if (renameType.value === 2) {
    params.startNum = startNum.value || 0
    params.numPrefix = numPrefix.value
    params.numSuffix = numSuffix.value
    params.numLocation = numLocation.value
  }

  selectedFiles.value = renamedPaths.value.length
    ? [...renamedPaths.value.map((i) => i.path)]
    : selectedFiles.value
  const res = await window.api.renameFiles(
    JSON.stringify(selectedFiles.value),
    JSON.stringify(params)
  )
  if (res.success) {
    ElMessage({
      message: '重命名成功',
      type: 'success'
    })
    renamedPaths.value = res.renamedPaths
  }
}

const handleRecoverItem = async (idx, newPath) => {
  const oldPath = selectedFiles.value[idx]
  const res = await window.api.recoverFile(oldPath, newPath)
  if (res.success) {
    ElMessage({
      message: '撤回成功',
      type: 'success'
    })
    selectedFiles.value[idx] = newPath
    renamedPaths.value[idx].path = oldPath
  }
}
</script>

<template>
  <div class="box">
    <div class="my-10">
      <el-space :size="10">
        <el-select v-model="selectType" placeholder="选择导入文件的方式" style="width: 140px">
          <el-option
            v-for="item in selectTypes"
            :key="item.key"
            :label="item.name"
            :value="item.key"
          />
        </el-select>
        <el-select v-model="ignoreDir" placeholder="是否忽略文件夹" style="width: 140px">
          <el-option
            v-for="item in ignoreDirTypes"
            :key="item.key"
            :label="item.name"
            :value="item.key"
          />
        </el-select>
        <el-tooltip class="box-item" effect="dark" :content="tips" raw-content placement="bottom"
          ><el-icon color="#CDD0D6"><IEpInfoFilled /></el-icon>
        </el-tooltip>
        <el-button type="primary" class="ml-20" @click="selectFiles">选择文件</el-button>
      </el-space>
    </div>

    <div class="my-10 fcc">
      <el-select
        v-model="renameType"
        placeholder="选择重命名的方式"
        style="width: 140px"
        class="mr-20"
      >
        <el-option
          v-for="item in renameTypes"
          :key="item.key"
          :label="item.name"
          :value="item.key"
        />
      </el-select>
      <template v-if="renameType === 0 || renameType === 1">
        <el-space :size="10">
          <el-input
            v-model="searchStr"
            style="width: 200px"
            :placeholder="renameType === 0 ? '输入要匹配的文本' : '输入要匹配的正则表达式'"
          />
          <el-icon><IEpDArrowRight /></el-icon>
          <el-input
            v-model="replaceStr"
            style="width: 200px"
            placeholder="输入要替换的新文本或为空"
          />
        </el-space>
      </template>
      <template v-if="renameType === 2">
        <el-space :size="10">
          <el-input v-model="numPrefix" style="width: 100px" placeholder="序号前缀" />
          <el-input v-model="startNum" style="width: 100px" placeholder="开始序号" />
          <el-input v-model="numSuffix" style="width: 100px" placeholder="序号后缀" />
          <el-select v-model="numLocation" placeholder="选择添加序号位置" style="width: 140px">
            <el-option
              v-for="item in numLocations"
              :key="item.key"
              :label="item.name"
              :value="item.key"
            />
          </el-select>
        </el-space>
      </template>

      <el-button type="primary" class="ml-20" @click="handleRename">执行重命名</el-button>
    </div>

    <div v-if="selectedFiles.length" class="file-list">
      <div>
        <div>修改前：</div>
        <p v-for="item in selectedFiles" :key="item" class="file-item">{{ item }}</p>
      </div>
      <div class="ml-20">
        <div>修改后：</div>
        <div v-for="(item, idx) in renamedPaths" :key="item" class="file-item">
          <span>{{ item.isRenamed ? item.path : '' }}</span>
          <el-button
            v-if="item.isRenamed"
            size="small"
            type="primary"
            class="ml-20"
            @click="handleRecoverItem(idx, item.path)"
            >撤回</el-button
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.box {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.fcc {
  display: flex;
  justify-content: center;
  align-items: center;
}
.my-10 {
  margin-top: 10px;
  margin-bottom: 10px;
}
.ml-20 {
  margin-left: 20px;
}
.mr-20 {
  margin-right: 20px;
}
.mx-10 {
  margin-left: 10px;
  margin-right: 10px;
}
.file-list {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 20px;
}

.file-item {
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
}
</style>
