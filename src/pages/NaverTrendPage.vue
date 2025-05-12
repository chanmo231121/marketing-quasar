<template>
  <q-page class="q-pa-md">
    <div id="app">
      <!-- 배너 -->
      <div class="content-below-banner">
        <div v-if="isEditing">
          <input v-model="bannerTitle" class="banner-input" placeholder="배너 제목" />
          <textarea
            v-model="bannerContent"
            class="banner-textarea"
            rows="4"
            placeholder="배너 내용을 입력하세요 (줄바꿈 가능)"
          ></textarea>
          <div class="edit-actions">
            <button class="save-btn" @click="saveBanner">저장</button>
            <button class="cancel-btn" @click="cancelEdit">취소</button>
          </div>
        </div>
        <div v-else>
          <h6><strong>{{ bannerTitle }}</strong></h6>
          <p class="banner-paragraph">
            {{ bannerContent }}
            <q-btn
              v-if="userInfo?.role === 'DEV'"
              icon="edit"
              flat
              round
              dense
              color="primary"
              @click="startEdit"
              class="inline-edit-btn"
            />
          </p>
        </div>
      </div>

      <!-- 입력 영역 -->
      <div class="main-container">
        <div class="input-container">
          <div class="option-wrapper q-mb-md">
            <q-input v-model="startDate" label="시작일" type="date" outlined dense class="flex-1" />
            <q-input v-model="endDate" label="종료일" type="date" outlined dense class="flex-1" />
            <q-select v-model="timeUnit" :options="timeUnitOptions" label="단위" outlined dense emit-value map-options class="flex-1" />
            <q-select v-model="gender" :options="genderOptions" label="성별" outlined dense emit-value map-options class="flex-1" />
            <q-select v-model="device" :options="deviceOptions" label="디바이스" outlined dense emit-value map-options class="flex-1" />
          </div>

          <div class="search-wrapper">
            <textarea
              v-model="rawKeywords"
              placeholder="주제어: 연관검색어1, 연관검색어2 형식으로 입력 (한 줄에 하나씩, 최대 100개)"
              rows="4"
            ></textarea>
            <div class="button-group">
              <button @click="fetchTrendData" :disabled="loading || rawKeywords.trim() === ''" class="primary-btn dense-btn">
                <template v-if="loading">
                  <q-spinner color="white" size="20px" />
                  <span style="color: white; font-size: 14px;">{{ currentProgress }}/{{ totalKeywords }}</span>
                </template>
                <template v-else>
                  검색
                </template>
              </button>
              <button class="negative-btn dense-btn" @click="clearInputs" :disabled="loading || rawKeywords === ''">초기화</button>
            </div>
          </div>
        </div>

        <div v-if="chartData.labels.length > 0" class="chart-wrapper">
          <div class="button-container">
            <button @click="downloadExcel" class="secondary-btn dense-btn">엑셀 다운로드 (CSV)</button>
          </div>
          <line-chart :chart-data="chartData" />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, getCurrentInstance, onMounted } from 'vue'
import { api } from 'boot/axios'
import LineChart from 'components/LineChart.vue'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { useUserStore } from 'stores/userStore'
import { storeToRefs } from 'pinia'

const rawKeywords = ref('')
const chartData = ref({ labels: [], datasets: [] })

const startDate = ref(dayjs().subtract(3, 'month').format('YYYY-MM-DD'))
const endDate = ref(dayjs().format('YYYY-MM-DD'))
const gender = ref('')
const device = ref('pc')
const timeUnit = ref('month')

const genderOptions = [
  { label: '전체', value: '' },
  { label: '여성', value: 'f' },
  { label: '남성', value: 'm' }
]
const deviceOptions = [
  { label: '전체', value: '' },
  { label: 'PC', value: 'pc' },
  { label: '모바일', value: 'mo' }
]
const timeUnitOptions = [
  { label: '월별', value: 'month' },
  { label: '일별', value: 'date' }
]

const bannerTitle = ref('')
const bannerContent = ref('')
const isEditing = ref(false)

const loading = ref(false)
const currentProgress = ref(0)
const totalKeywords = ref(0)

const userStore = useUserStore()
const { userInfo } = storeToRefs(userStore)
const { proxy } = getCurrentInstance()
const showDialog = msg => proxy.$q.dialog({ title: '알림', message: msg, ok: '확인' })

onMounted(async () => {
  try {
    const res = await api.get('/api/v1/banner', { params: { page: 'naver-trend' } })
    bannerTitle.value = res.data.title
    bannerContent.value = res.data.description1
  } catch (e) {
    console.error(e)
  }
})

const startEdit = () => { isEditing.value = true }
const cancelEdit = () => { isEditing.value = false; onMounted() }

const saveBanner = async () => {
  try {
    await api.put('/api/v1/banner/update', {
      title: bannerTitle.value,
      description1: bannerContent.value,
      description2: ''
    }, { params: { page: 'naver-trend' } })
    isEditing.value = false
    showDialog('✅ 배너가 저장되었습니다.')
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    showDialog('❌ 저장 실패')
  }
}

const fetchTrendData = async () => {
  const lines = rawKeywords.value
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  const keywordGroups = []

  for (const line of lines) {
    if (line.includes(':')) {
      const [groupName, keywordStr] = line.split(':')
      const keywords = keywordStr.split(',').map(k => k.trim()).filter(Boolean)
      if (keywords.length > 0) {
        keywordGroups.push({ groupName: groupName.trim(), keywords })
      }
    } else {
      keywordGroups.push({ groupName: line, keywords: [line] })
    }
  }

  if (keywordGroups.length === 0) return
  if (keywordGroups.length > 100) return showDialog('최대 100개까지 입력 가능합니다.')

  loading.value = true
  currentProgress.value = 0
  totalKeywords.value = keywordGroups.length

  const batches = []
  for (let i = 0; i < keywordGroups.length; i += 5)
    batches.push(keywordGroups.slice(i, i + 5))

  const allResults = []
  try {
    for (const batch of batches) {
      const payload = {
        startDate: startDate.value,
        endDate: endDate.value,
        timeUnit: timeUnit.value,
        keywordGroups: batch,
        device: device.value,
        ages: ['1', '2', '3', '4', '5', '6'],
        gender: gender.value
      }
      const res = await api.post('/api/naver/trend', payload)
      allResults.push(...res.data.results)
      currentProgress.value += batch.length
    }

    if (allResults.length === 0) return
    chartData.value.labels = allResults[0].data.map(item => item.period)
    chartData.value.datasets = allResults.slice(0, 5).map(group => ({
      label: group.title,
      data: group.data.map(d => d.ratio),
      fill: false,
      tension: 0.3
    }))
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    showDialog('❌ 데이터 요청 실패')
  } finally {
    loading.value = false
  }
}

const clearInputs = () => {
  rawKeywords.value = ''
  chartData.value = { labels: [], datasets: [] }
}

const downloadExcel = () => {
  if (chartData.value.datasets.length === 0) return
  const data = chartData.value.labels.map((label, i) => {
    const row = { 기간: label }
    chartData.value.datasets.forEach(dataset => {
      row[dataset.label] = dataset.data[i]
    })
    return row
  })
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'TrendData')
  XLSX.writeFile(wb, 'trend_data.xlsx')
}
</script>

<style scoped>
#app { font-family:Avenir,Helvetica,Arial,sans-serif; text-align:center; color:#2c3e50 }
* { font-family:'Nanum Gothic',sans-serif }

.banner-paragraph {
  white-space: pre-wrap;
}
.banner-input, .banner-textarea {
  width: 100%;
  font-size: 1em;
  margin-bottom: 6px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.edit-actions {
  margin-top: 6px;
}
.save-btn, .cancel-btn {
  padding: 6px 12px;
  font-size: 14px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}
.save-btn { background: #4CAF50; color: white; }
.cancel-btn { background: #ccc; color: #333; }

.content-below-banner {
  position: relative;
  top: 185px;
  left: 0;
  width: 100%;
  padding: 10px;
  font-family: Arial, sans-serif;
  color: #333;
  text-align: left;
  max-width: 1000px;
  margin-left: auto;
  margin-right: auto;
}

.main-container {
  width: 69.6%;
  margin: 250px auto 200px auto;
  text-align: center;
  position: relative;
  padding-bottom: 120px;
}

.input-container {
  margin: 140px 0;
  width: 100%;
  max-width: 1000px;
  margin-left: auto;
  margin-right: auto;
  margin-top: -20px;
}

.option-wrapper {
  display: flex;
  gap: 20px;
  justify-content: space-between;
  flex-wrap: wrap;
}
.option-wrapper > * {
  flex: 1;
  min-width: 180px;
}

.search-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 30px;
}

textarea {
  padding: 10px;
  font-size: 14px;
  width: calc(100% - 150px);
  resize: vertical;
  box-sizing: border-box;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 40%;
}

.button-container {
  position: absolute;
  top: -15px;
  right: 0;
  display: flex;
  gap: 10px;
  margin-top: -40px;
}

.primary-btn {
  background-color: #1976D2;
  color: white;
  border: none;
  border-radius: 4px;
}
.primary-btn:hover {
  background-color: #1565C0;
}
.negative-btn {
  background-color: #F44336;
  color: white;
  border: none;
  border-radius: 4px;
}
.negative-btn:hover {
  background-color: #D32F2F;
}
.secondary-btn {
  background-color: #26A69A;
  color: white;
  border: none;
  border-radius: 4px;
}
.secondary-btn:hover {
  background-color: #1F8C80;
}
.dense-btn {
  padding: 14px 12px;
  font-size: 14px;
  cursor: pointer;
}

.chart-wrapper {
  width: 100%;
  max-width: 1000px;
  margin: 30px auto 0;
  padding: 10px;
  box-sizing: border-box;
  position: relative;
}
.chart-wrapper canvas {
  width: 100% !important;
  max-height: 300px !important;
}

.inline-edit-btn {
  margin-left: 6px;
}
</style>
