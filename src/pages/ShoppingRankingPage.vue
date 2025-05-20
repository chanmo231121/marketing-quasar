<template>
  <div id="app">
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

    <header class="main-container">
      <div class="input-container">
        <div class="search-wrapper">
          <textarea v-model="keywordInput" placeholder="키워드를 입력하세요 (한 줄에 하나씩 최대 10개까지)" rows="4"></textarea>
          <div class="button-group">
            <button
              @click="processKeywords"
              :disabled="loading || !keywordInput.trim()"
              class="primary-btn dense-btn"
              style="position: relative; display: flex; justify-content: center; align-items: center; gap: 8px;"
            >
              <template v-if="loading">
                <q-spinner color="white" size="20px" />
                <span style="color: white; font-size: 14px;">
      {{ currentProgress }}/{{ totalKeywords }}
    </span>
              </template>
              <template v-else>
                검색
              </template>
            </button>
            <button
              class="negative-btn dense-btn"
              @click="resetAll"
              :disabled="loading || !keywordInput"
            >
              키워드 초기화
            </button>
          </div>
        </div>
      </div>

      <div class="keyword_list">
        <div class="button-container">
          <button
            class="secondary-btn dense-btn"
            @click="downloadProgram"
          >
            프로그램 다운로드
          </button>
          <button @click="downloadExcel" class="secondary-btn dense-btn excel-download-small-btn">
            엑셀 다운로드(CSV)
          </button>
          <button class="negative-btn dense-btn" @click="clearSearchResults" :disabled="loading || !Object.keys(adsData).length">
            검색 초기화
          </button>
        </div>

        <div class="keyword-list-container" v-if="keywords.length">
          <button
            v-for="(keyword, idx) in keywords"
            :key="idx"
            @click="getNaverAdsData(keyword)"
            :class="{ active: keyword === selectedKeyword }"
          >
            {{ keyword }}
          </button>
        </div>

        <div class="table-container">
          <table>
            <thead>
            <tr>
              <th rowspan="2">순위</th>
              <th colspan="3">PC</th>
              <th colspan="3">MO</th>
            </tr>
            <tr>
              <!-- 순서: 제목 → 판매자 → 가격 -->
              <th>타이틀</th>
              <th>판매자</th>
              <th>가격</th>
              <th>타이틀</th>
              <th>판매자</th>
              <th>가격</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(row, i) in combinedTableData" :key="i">
              <td>{{ i + 1 }}</td>
              <!-- PC: 제목 먼저, 그다음 판매자명1 -->
              <td>{{ row.pc['타이틀'] || '-' }}</td>
              <td>{{ row.pc['판매자명1'] || '-' }}</td>
              <td>{{ row.pc['가격'] || '-' }}</td>
              <!-- MO: 제목 먼저, 그다음 판매처 -->
              <td>{{ row.mobile['타이틀'] || '-' }}</td>
              <td>{{ row.mobile['판매처'] || '-' }}</td>
              <td>{{ row.mobile['가격'] || '-' }}</td>
            </tr>
            <tr v-if="!combinedTableData.length">
              <td colspan="7" class="no-data">키워드를 조회하십시오.</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </header>
  </div>
</template>

<script>
import { api } from 'boot/axios.js'
import * as XLSX from 'xlsx'
import { onMounted, ref, getCurrentInstance } from 'vue'
import { useUserStore } from 'stores/userStore'
import { storeToRefs } from 'pinia'

export default {
  setup() {
    const keywordInput = ref('')
    const keywords = ref([])
    const adsData = ref({})         // { [keyword]: { pc: [], mobile: [] } }
    const pcAdsData = ref([])
    const mobileAdsData = ref([])
    const combinedTableData = ref([])
    const selectedKeyword = ref(null)
    const loading = ref(false)
    const currentProgress = ref(0)
    const totalKeywords = ref(0)
    const failedList = ref([])

    // 배너
    const bannerTitle = ref('')
    const bannerContent = ref('')
    const isEditing = ref(false)

    const { proxy } = getCurrentInstance()
    const userStore = useUserStore()
    const { userInfo } = storeToRefs(userStore)

    const showDialog = msg => {
      proxy.$q.dialog({ title: '알림 📢', message: msg, ok: '확인' })
    }

    const fetchBanner = async () => {
      try {
        const res = await api.get('/api/v1/banner', { params: { page: 'shopping-ranking' } })
        bannerTitle.value = res.data.title
        bannerContent.value = res.data.description1
      } catch (e) {
        console.error(e)
      }
    }
    const saveBanner = async () => {
      try {
        await api.put('/api/v1/banner/update', {
          title: bannerTitle.value,
          description1: bannerContent.value,
          description2: ''
        }, { params: { page: 'shopping-ranking' }})
        isEditing.value = false
        showDialog('✅ 배너가 저장되었습니다.')
      } catch {
        showDialog('❌ 배너 저장 실패')
      }
    }
    const startEdit = () => isEditing.value = true
    const cancelEdit = () => { isEditing.value = false; fetchBanner() }

    // 키워드 처리
    const processKeywords = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        showDialog('🔐 로그인이 필요합니다. 로그인 후 다시 이용해주세요.')
        return
      }

      const lines = keywordInput.value.split('\n').map(l => l.trim()).filter(Boolean)
      if (!lines.length) return
      if (lines.length > 100) {
        showDialog('⚠️ 키워드는 최대 100개까지 입력 가능합니다.')
        return
      }

      keywords.value = lines
      adsData.value = {}
      loading.value = true
      currentProgress.value = 0
      totalKeywords.value = lines.length
      failedList.value = []

      for (const keyword of lines) {
        try {
          const res = await fetch(`http://localhost:5000/crawl?keyword=${encodeURIComponent(keyword)}`)
          const data = await res.json()

          if (data.error) {
            failedList.value.push(keyword)
            continue
          }

          const pcItems = data[keyword]?.pc || []
          const moItems = data[keyword]?.mobile || []

          adsData.value[keyword] = {
            pc: pcItems,
            mobile: moItems
          }
        } catch (err) {
          console.error(err) // 추가
          failedList.value.push(keyword)
        }

        currentProgress.value += 1
      }

      loading.value = false

      if (failedList.value.length > 0) {
        showDialog(`⚠️ 일부 키워드에서 실패가 발생했습니다.\n(${failedList.value.length}개)`)
      } else {
        showDialog('✅ 모든 키워드 데이터를 가져왔습니다.')
      }
    }



    const getNaverAdsData = keyword => {
      selectedKeyword.value = keyword
      const data = adsData.value[keyword] || { pc: [], mobile: [] }
      pcAdsData.value = data.pc
      mobileAdsData.value = data.mobile
      combineTableData()
    }

    const combineTableData = () => {
      const maxLen = Math.max(pcAdsData.value.length, mobileAdsData.value.length)
      combinedTableData.value = Array.from({ length: maxLen }, (_, i) => ({
        pc: pcAdsData.value[i] || {},
        mobile: mobileAdsData.value[i] || {}
      }))
    }

    const resetAll = () => {
      keywordInput.value = ''
      keywords.value = []
      adsData.value = {}
      pcAdsData.value = []
      mobileAdsData.value = []
      combinedTableData.value = []
      selectedKeyword.value = null
      currentProgress.value = 0
      totalKeywords.value = 0
    }

    const clearSearchResults = () => {
      adsData.value = {}
      pcAdsData.value = []
      mobileAdsData.value = []
      combinedTableData.value = []
      selectedKeyword.value = null
    }

    const downloadExcel = () => {
      const rows = []

      // adsData: { [keyword]: { pc: [], mobile: [] } }
      Object.entries(adsData.value).forEach(([, data]) => {
        // PC 아이템
        data.pc.forEach(item => {
          rows.push({
            '현재시각':    item['현재시각'],
            '키워드':      item['키워드'],
            '기기':        'PC',
            '광고 구분':   item['광고 구분'],
            '노출순위':    item['노출순위'],
            '타이틀':      item['타이틀'],
            '가격':        item['가격'],
            '배송비':      item['배송비'],
            '판매자명1':   item['판매자명1'],
            '판매자명2':   item['판매자명2'],
            '판매자명3':   item['판매자명3'],
            '판매자명4':   item['판매자명4'],
            '판매자명5':   item['판매자명5'],
            '별점':        item['별점'],
            '리뷰수':      item['리뷰수'],
            '등록일':      item['등록일'],
            '찜수':        item['찜수'],
            '구매수':      item['구매수']
          })
        })

        // 모바일 아이템
        data.mobile.forEach(item => {
          rows.push({
            '현재시각':    item['현재시각'],
            '키워드':      item['키워드'],
            '기기':        '모바일',
            '광고 구분':   item['광고 구분'],
            '노출순위':    item['노출순위'],
            '타이틀':      item['타이틀'],
            '가격':        item['가격'],
            '배송비':      item['배송비'],
            // 모바일 판매처를 판매자명1에 할당
            '판매자명1':   item['판매처'] || '',
            '판매자명2':   '',
            '판매자명3':   '',
            '판매자명4':   '',
            '판매자명5':   '',
            '별점':        item['평점'] || item['별점'] || '',
            '리뷰수':      item['리뷰수'] || '',
            '등록일':      item['등록일'] || '',
            '찜수':        item['찜'] || item['찜수'] || '',
            '구매수':      item['구매수'] || ''
          })
        })
      })

      if (rows.length === 0 && failedList.value.length === 0) {
        showDialog('📂 다운로드할 데이터가 없습니다.')
        return
      }

      // 엑셀 워크북/시트 생성
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, '크롤링 결과')

      // 실패 키워드 시트 (선택)
      if (failedList.value.length) {
        const failRows = failedList.value.map(k => ({
          '키워드': k,
          '비고':  '데이터 없음'
        }))
        const wsFail = XLSX.utils.json_to_sheet(failRows)
        XLSX.utils.book_append_sheet(wb, wsFail, '실패 키워드')
      }

      // 파일 저장
      XLSX.writeFile(wb, 'naver_shopping_data.xlsx')
    }

    onMounted(fetchBanner)

    return {
      keywordInput, keywords, adsData,
      pcAdsData, mobileAdsData, combinedTableData,
      selectedKeyword, loading, currentProgress, totalKeywords,
      processKeywords, getNaverAdsData, combineTableData,
      resetAll, clearSearchResults, downloadExcel,
      bannerTitle, bannerContent, isEditing,
      saveBanner, cancelEdit, startEdit, userInfo,
      downloadProgram
    }
  }
}
const downloadProgram = () => {
  window.open('http://maglo6.s3-website.ap-northeast-2.amazonaws.com/Maglo.zip', '_blank')
}

</script>


<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
}

* {
  font-family: 'Nanum Gothic', sans-serif;
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

button {
  padding: 13px 16px;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
}

button:disabled {
  background-color: #ddd;
}

button:hover {
  background-color: darkred;
}

button.negative-btn:disabled {
  background-color: #D32F2F;
  color: white;
  cursor: not-allowed;
  opacity: 1;
}

button.primary-btn:disabled {
  background-color: #1565C0;
  color: white;
  cursor: not-allowed;
  opacity: 1;
}

.button-container {
  position: absolute;
  top: -15px;
  right: 0;
  display: flex;
  gap: 10px;
  margin-top: -40px;
}

.error {
  color: red;
  font-size: 14px;
}

.keyword_list {
  margin-top: 20px;
  width: 100%;
  max-width: 1000px;
  margin-left: auto;
  margin-right: auto;
  position: relative;
}

.table-container {
  margin-top: 20px;
  padding: 20px;
  border: 1px solid #ddd;
}

table {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  border-collapse: collapse;
  table-layout: fixed;
}

th,
td {
  padding: 6px;
  font-size: 13px;
  border: 1px solid #ddd;
  text-align: center;
}

th {
  background-color: #f4f4f4;
}

table td {
  word-break: break-word;
}

table th,
table td {
  min-width: 100px;
}

.content-below-banner {
  position: relative;
  top: 200px;
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

.primary-btn {
  background-color: #1976D2;
  color: white;
  border: none;
  border-radius: 4px;
}

.primary-btn:hover {
  background-color: #1565C0;
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

.negative-btn {
  background-color: #F44336;
  color: white;
  border: none;
  border-radius: 4px;
}

.negative-btn:hover {
  background-color: #D32F2F;
}

.dense-btn {
  padding: 14px 12px;
  font-size: 14px;
  cursor: pointer;
}

/* 키워드 버튼 영역 */
.keyword-list-container {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
  max-height: 200px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid #ddd;
  margin-top: 10px;
  box-sizing: border-box;
}

.keyword-list-container button {
  background-color: #008CBA;
  color: white;
  padding: 8px 12px;
  margin: 0;
  border: none;
  cursor: pointer;
}

.keyword-list-container button:hover {
  background-color: #007B9E;
}

.keyword-list-container button.active {
  background-color: #FF9800;
}

.url-column {
  max-width: 200px;
  overflow-x: auto;
  white-space: nowrap;
}

.url-column a {
  color: #0066cc;
  text-decoration: none;
  display: block;
}

.url-column span {
  color: #ccc;
}

/* 배너 수정 관련 */
.banner-paragraph {
  white-space: pre-wrap;
}
.banner-input,
.banner-textarea {
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
.save-btn,
.cancel-btn {
  margin-right: 6px;
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
.q-btn--flat.q-btn--dense.q-btn--round:hover {
  background-color: transparent !important;
  box-shadow: none !important;
}
.inline-edit-btn {
  display: inline-block;
  vertical-align: middle;
  margin-left: 6px;
}


</style>
