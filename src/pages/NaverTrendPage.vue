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

          <div class="q-mb-sm option-inline">
            <div class="label">기간</div>
            <div class="row items-center q-gutter-sm">
              <!-- Preset 버튼들 -->
              <q-btn flat :outline="selectedPreset !== 'all'" label="전체" @click="selectPreset('all')" size="sm" class="preset-btn" />
              <q-btn flat :outline="selectedPreset !== '1m'" label="1개월" @click="selectPreset('1m')" size="sm" class="preset-btn" />
              <q-btn flat :outline="selectedPreset !== '3m'" label="3개월" @click="selectPreset('3m')" size="sm" class="preset-btn" />
              <q-btn flat :outline="selectedPreset !== '1y'" label="1년" @click="selectPreset('1y')" size="sm" class="preset-btn" />
              <q-btn flat :outline="selectedPreset !== 'custom'" label="직접입력" @click="selectPreset('custom')" size="sm" class="preset-btn" />

              <!-- 단위 드롭다운 -->
              <q-select
                v-model="timeUnit"
                :options="timeUnitOptions"
                dense
                outlined
                emit-value
                map-options
                style="width: 100px"
              />
            </div>
          </div>

          <!-- ✅ 기간 -->
          <div class="date-range-wrapper q-mb-sm">
            <div class="row items-center q-gutter-sm">
              <!-- 시작일 -->
              <q-select v-model="startYear" :options="yearOptions" dense outlined emit-value map-options style="width: 100px;" label="연도" />
              <q-select v-model="startMonth" :options="monthOptions" dense outlined emit-value map-options style="width: 80px;" label="월" />
              <q-select v-model="startDay" :options="getDaysInMonth(startYear, startMonth)" dense outlined emit-value map-options style="width: 80px;" label="일" />

              <span class="q-mx-sm">-</span>

              <!-- 종료일 -->
              <q-select v-model="endYear" :options="yearOptions" dense outlined emit-value map-options style="width: 100px;" label="연도" />
              <q-select v-model="endMonth" :options="monthOptions" dense outlined emit-value map-options style="width: 80px;" label="월" />
              <q-select v-model="endDay" :options="getDaysInMonth(endYear, endMonth, true)" dense outlined emit-value map-options style="width: 80px;" label="일" />
            </div>
            <div class="text-caption text-grey-7 q-mt-xs" style="margin-left: 4px;">· 2016년 1월 이후 조회할 수 있습니다.</div>
          </div>
          <!-- ✅ 범위 -->
          <div class="q-mb-sm option-inline">
            <div class="label">범위</div>
            <q-option-group
              v-model="device"
              :options="deviceOptions"
              type="checkbox"
              dense
              inline
            />
          </div>

          <!-- ✅ 성별 -->
          <div class="q-mb-md option-inline">
            <div class="label">성별</div>
            <q-option-group
              v-model="gender"
              :options="genderOptions"
              type="checkbox"
              dense
              inline
            />
          </div>
          <!-- ✅ 연령 -->
          <div class="q-mb-md option-inline" style="flex-wrap: wrap;">
            <div class="label">연령</div>
            <q-option-group
              v-model="ages"
              :options="ageOptions"
              type="checkbox"
              dense
              inline
              class="age-group"
            />
          </div>

          <div class="search-wrapper">
            <textarea
              v-model="rawKeywords"
              :placeholder="`여름옷/반팔, 반바지, 린넨 ...\nex) 자켓/겨울자켓,방풍자켓,린넨자켓 ...\n(한 줄에 하나씩, 최대 100개)`"
              rows="4"
            />
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
import { ref, computed, getCurrentInstance, onMounted, watch } from 'vue'
import { api } from 'boot/axios'
import LineChart from 'components/LineChart.vue'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { useUserStore } from 'stores/userStore'
import { storeToRefs } from 'pinia'

// ✅ 날짜 선택 로직
const today = dayjs()
const yesterday = today.subtract(1, 'day')

const yearOptions = Array.from({ length: yesterday.year() - 2016 + 1 }, (_, i) => String(2016 + i))
const monthOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

const selectedPreset = ref('custom') // 초기값은 직접입력

// ✅ 시작일: 고정된 최소값
const startYear = ref('2016')
const startMonth = ref('01')
const startDay = ref('01')

// ✅ 종료일: 어제까지 제한
const endYear = ref(yesterday.format('YYYY'))
const endMonth = ref(yesterday.format('MM'))
const endDay = ref(yesterday.format('DD'))

// ✅ 월에 따른 날짜 수 반환
const getDaysInMonth = (year, month, isEnd = false) => {
  if (!year || !month) return []
  const maxDay = dayjs(`${year}-${month}-01`).daysInMonth()
  const limit = isEnd && dayjs(`${year}-${month}-01`).isSame(yesterday, 'month')
    ? parseInt(yesterday.format('DD'))
    : maxDay
  return Array.from({ length: limit }, (_, i) => String(i + 1).padStart(2, '0'))
}

// ✅ 실제 API 요청용 날짜 포맷
const startDate = computed(() => `${startYear.value}-${startMonth.value}-${startDay.value}`)
const endDate = computed(() => `${endYear.value}-${endMonth.value}-${endDay.value}`)

const rawKeywords = ref('')
const chartData = ref({ labels: [], datasets: [] })
const fullResults = ref([])

const device = ref([])

watch(device, (val, prev) => {
  const hasAll = val.includes('all')
  const hasPC = val.includes('pc')
  const hasMO = val.includes('mo')

  // "전체" 체크 시: 모두 선택
  if (hasAll && (!prev.includes('all') || prev.length < 3)) {
    device.value = ['all', 'pc', 'mo']
    return
  }

  // "전체" 해제 시: 모두 해제
  if (!hasAll && prev.includes('all') && prev.length === 3) {
    device.value = []
    return
  }

  // "PC + 모바일" 수동 선택 → 전체 포함
  if (hasPC && hasMO && !hasAll) {
    device.value = ['all', 'pc', 'mo']
    return
  }

  // PC나 모바일 중 하나만 선택 → 전체 제거
  if ((hasPC || hasMO) && (!hasPC || !hasMO) && hasAll) {
    device.value = val.filter(v => v !== 'all')
    return
  }
})

const gender = ref([])
watch(gender, (val, prev) => {
  const hasAll = val.includes('');
  const hasMale = val.includes('m');
  const hasFemale = val.includes('f');

  // 전체 체크 시: 모두 선택
  if (hasAll && (!prev.includes('') || prev.length < 3)) {
    gender.value = ['', 'm', 'f'];
    return;
  }

  // 전체 해제 시: 모두 해제
  if (!hasAll && prev.includes('') && prev.length === 3) {
    gender.value = [];
    return;
  }

  // 남 + 여 선택 시 전체 포함
  if (hasMale && hasFemale && !hasAll) {
    gender.value = ['', 'm', 'f'];
    return;
  }

  // 둘 중 하나만 있을 때 전체 제거
  if ((hasMale || hasFemale) && (!hasMale || !hasFemale) && hasAll) {
    gender.value = val.filter(v => v !== '');
    return;
  }
})
const timeUnit = ref('month')

const genderOptions = [
  { label: '전체', value: '' },
  { label: '여성', value: 'f' },
  { label: '남성', value: 'm' }
]
const deviceOptions = [
  { label: '전체', value: 'all' },
  { label: 'PC', value: 'pc' },
  { label: '모바일', value: 'mo' }
]
const timeUnitOptions = [
  { label: '월간', value: 'month' },
  { label: '주간', value: 'week' },
  { label: '일간', value: 'date' }
]
const ages = ref([])

const ageOptions = [
  { label: '전체', value: 'all' },
  { label: '~12', value: '1' },
  { label: '13~18', value: '2' },
  { label: '19~24', value: '3' },
  { label: '25~29', value: '4' },
  { label: '30~34', value: '5' },
  { label: '35~39', value: '6' },
  { label: '40~44', value: '7' },
  { label: '45~49', value: '8' },
  { label: '50~54', value: '9' },
  { label: '55~59', value: '10' },
  { label: '60~', value: '11' }
]

watch(ages, (val, prev) => {
  const hasAll = val.includes('all')
  const base = ['1', '2', '3', '4', '5', '6']

  if (hasAll && (!prev.includes('all') || prev.length < 7)) {
    ages.value = ['all', ...base]
    return
  }

  if (!hasAll && prev.includes('all') && prev.length === 7) {
    ages.value = []
    return
  }

  const selectedOnly = val.filter(v => v !== 'all')
  if (selectedOnly.length === 6 && !hasAll) {
    ages.value = ['all', ...base]
    return
  }

  if (hasAll && selectedOnly.length < 6) {
    ages.value = selectedOnly
    return
  }
})
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

const startEdit = () => {
  isEditing.value = true
}
const cancelEdit = () => {
  isEditing.value = false;
  onMounted()
}

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
  const lines = rawKeywords.value.split('\n').map(l => l.trim()).filter(Boolean)
  const keywordGroups = []

  for (const line of lines) {
    const splitMatch = line.match(/^([^/:<>@|=-]+)[/:<>@|=-](.+)$/)
    if (splitMatch) {
      const groupName = splitMatch[1].trim()
      const keywordStr = splitMatch[2].trim()
      const keywords = keywordStr.split(',').map(k => k.trim()).filter(Boolean)

      if (keywords.length > 20) {
        showDialog(`❌ "${groupName}" 그룹은 연관 키워드를 최대 20개까지만 입력할 수 있습니다.`)
        return
      }

      if (keywords.length > 0) {
        keywordGroups.push({ groupName, keywords })
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
        device: device.value.includes('pc') && device.value.includes('mo') ? '' :
          device.value.includes('pc') ? 'pc' :
            device.value.includes('mo') ? 'mo' : '',
        ages: ages.value.length === 0 ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'] : ages.value,
        gender: gender.value.length === 0 || gender.value.length === 2 ? '' : gender.value[0]
      }
      const res = await api.post('/api/naver/trend', payload)
      allResults.push(...res.data.results)
      currentProgress.value += batch.length
    }
    fullResults.value = allResults
    chartData.value.labels = allResults[0].data.map(item => item.period)
    chartData.value.datasets = allResults.slice(0, 10).map(group => ({
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
  fullResults.value = []
}

const downloadExcel = () => {
  if (fullResults.value.length === 0) return

  const labels = fullResults.value[0].data.map(item => item.period)

  // ✅ 메타 정보 행
  const metaRows = [
    ['주제', '통검'],
    ['범위', (device.value.includes('pc') && device.value.includes('mo')) ? '합계' :
      device.value.includes('pc') ? 'PC' :
        device.value.includes('mo') ? '모바일' : '전체'],
    ['기간', `${timeUnitOptions.find(opt => opt.value === timeUnit.value)?.label || ''} : ${startDate.value} ~ ${endDate.value}`],
    ['성별', gender.value.length === 0 || gender.value.includes('') ? '전체(여성,남성)' :
      gender.value.includes('f') ? '여성' : '남성'],
    ['연령대', ages.value.includes('all') || ages.value.length === 0 ? '전체' :
      ageOptions.filter(opt => ages.value.includes(opt.value)).map(opt => opt.label).join(', ')],
  ]

  // ✅ 주제어/연관검색어/갯수 표시
  const topicRow = ['주제어']
  const keywordRow = ['날짜']
  const relatedRow = ['연관검색어']
  const countRow = ['연관갯수']

  fullResults.value.forEach(group => {
    topicRow.push(group.title)
    keywordRow.push(group.title)
    relatedRow.push(group.keywords?.join(', ') || '')
    countRow.push(group.keywords?.length || 1)
  })

  // ✅ 날짜별 데이터
  const dataRows = labels.map((label, i) => {
    const row = [label]
    fullResults.value.forEach(dataset => {
      row.push(dataset.data[i].ratio)
    })
    return row
  })

  // ✅ 통합 시트 작성
  const finalData = [
    ...metaRows.map(row => [...row]),
    [],
    topicRow,
    relatedRow,
    countRow,
    [],
    keywordRow,
    ...dataRows
  ]

  const ws = XLSX.utils.aoa_to_sheet(finalData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'TrendData')
  XLSX.writeFile(wb, 'trend_data.xlsx')
}

const selectPreset = (preset) => {
  selectedPreset.value = preset

  const end = dayjs().subtract(1, 'day') // 어제까지가 유효한 종료일
  let start

  if (preset === 'all') {
    setDateRange(dayjs('2016-01-01'), end)
  } else if (preset === '1m') {
    start = end.subtract(1, 'month')
    setDateRange(start, end)
  } else if (preset === '3m') {
    start = end.subtract(3, 'month')
    setDateRange(start, end)
  } else if (preset === '1y') {
    start = end.subtract(1, 'year')
    setDateRange(start, end)
  }
  // custom은 무시
}

const setDateRange = (from, to) => {
  startYear.value = from.format('YYYY')
  startMonth.value = from.format('MM')
  startDay.value = from.format('DD')
  endYear.value = to.format('YYYY')
  endMonth.value = to.format('MM')
  endDay.value = to.format('DD')
}

</script>


<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50
}

* {
  font-family: 'Nanum Gothic', sans-serif
}

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

.save-btn {
  background: #4CAF50;
  color: white;
}

.cancel-btn {
  background: #ccc;
  color: #333;
}

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

.option-inline {
  display: flex;
  align-items: center;
  gap: 20px;
}

.option-inline .label {
  min-width: 40px;
  font-weight: bold;
  font-size: 14px;
}

.date-range-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-left: 60px;
}

.preset-btn {
  height: 36px;
  min-width: 100px;
  padding: 0 12px;
  border: 1px solid #dcdcdc !important;
  border-radius: 4px;
  background-color: white !important;
  color: #212121;
  text-transform: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Roboto', 'Nanum Gothic', sans-serif;
  font-size: 14px !important; /* ✅ 동일하게 */
  font-weight: 500 !important; /* ✅ 동일하게 */
  line-height: 1.4;
}

.preset-btn .q-btn__content {
  font-size: 14px !important; /* ✅ 버튼 내부 텍스트 */
  font-weight: 500 !important;
}

.preset-btn.q-btn--flat:before {
  box-shadow: none !important;
  background: none !important;
}

.preset-btn.q-btn--outline {
  border-color: #1976d2 !important;
  color: #1976d2 !important;
}

.age-group .q-option-group--inline {
  flex-wrap: wrap;
}

.age-group .q-option-group__label {
  min-width: 70px;
  text-align: center;
}
</style>
