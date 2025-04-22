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
          <textarea v-model="keywordInput" placeholder="키워드를 입력하세요(100개 까지)" rows="4"></textarea>
          <div class="button-group">
            <button
              @click="processKeywords"
              :disabled="loading || keywordInput.trim() === ''"
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
              :disabled="loading || keywordInput === ''"
            >
              키워드 초기화
            </button>
          </div>
        </div>
      </div>

      <div class="keyword_list">
        <div class="button-container">
          <button @click="downloadExcel" class="secondary-btn dense-btn excel-download-small-btn">
            엑셀 다운로드(CSV)
          </button>
          <button class="negative-btn dense-btn" @click="clearSearchResults" :disabled="loading || Object.keys(adsData).length === 0">
            검색 초기화
          </button>
        </div>

        <div class="keyword-list-container" v-if="keywords.length > 0">
          <button
            v-for="(keyword, index) in keywords"
            :key="index"
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
              <th>판매자</th>
              <th>제목</th>
              <th>URL</th>
              <th>판매자</th>
              <th>제목</th>
              <th>URL</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(row, index) in combinedTableData" :key="index">
              <td>{{ index + 1 }}</td>
              <td>{{ row.pc.SellerName || '-' }}</td>
              <td>{{ row.pc.Subtitle || '-' }}</td>
              <td class="url-column">
                <a v-if="row.pc['Main URL']" :href="row.pc['Main URL']" target="_blank">{{ row.pc['Main URL'] }}</a>
                <span v-else>-</span>
              </td>
              <td>{{ row.mobile.SellerName || '-' }}</td>
              <td>{{ row.mobile.Subtitle || '-' }}</td>
              <td class="url-column">
                <a v-if="row.mobile['Main URL']" :href="row.mobile['Main URL']" target="_blank">{{ row.mobile['Main URL'] }}</a>
                <span v-else>-</span>
              </td>
            </tr>
            <tr v-if="combinedTableData.length === 0">
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
    const adsData = ref({})
    const pcAdsData = ref([])
    const mobileAdsData = ref([])
    const combinedTableData = ref([])
    const selectedKeyword = ref(null)
    const loading = ref(false)
    const currentProgress = ref(0)
    const totalKeywords = ref(0)
    const failedList = ref([])
    let limitExceeded = false  // ← 추가: 사용량 초과 플래그

    // 배너 관련
    const bannerTitle = ref('')
    const bannerContent = ref('')
    const isEditing = ref(false)

    const { proxy } = getCurrentInstance()
    const userStore = useUserStore()
    const { userInfo } = storeToRefs(userStore)

    const showDialog = (msg) => {
      proxy.$q.dialog({ title: '알림 📢', message: msg, ok: '확인' })
    }

    const fetchBanner = async () => {
      try {
        const res = await api.get('/api/v1/banner', { params: { page: 'keyword-ranking' } })
        bannerTitle.value = res.data.title
        bannerContent.value = res.data.description1
      } catch (err) {
        console.error(err)
      }
    }

    const saveBanner = async () => {
      try {
        await api.put('/api/v1/banner/update', {
          title: bannerTitle.value,
          description1: bannerContent.value,
          description2: ''
        }, {
          params: { page: 'keyword-ranking' }
        })
        isEditing.value = false
        showDialog('✅ 배너가 저장되었습니다.')
      } catch (err) {
        showDialog('❌ 배너 저장 실패')
        console.error(err)
      }
    }

    const startEdit = () => { isEditing.value = true }
    const cancelEdit = () => { isEditing.value = false; fetchBanner() }

    const processKeywords = async () => {
      const accessToken = localStorage.getItem('accessToken')
      if (!accessToken) {
        showDialog('🔐 로그인이 필요합니다. 로그인 후 다시 시도해주세요 🙏')
        return
      }

      const processedKeywords = keywordInput.value
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)

      if (processedKeywords.length > 100) {
        showDialog('⚠️ 키워드는 최대 100개까지 입력 가능합니다.')
        return
      }

      keywords.value = processedKeywords
      adsData.value = {}
      failedList.value = []
      loading.value = true
      currentProgress.value = 0
      totalKeywords.value = processedKeywords.length
      limitExceeded = false

      // ✅ 각 요청을 비동기적으로 처리하면서 진행률 업데이트
      processedKeywords.forEach((keyword, index) => {
        api.post('/api/naver-ads/search', {
          keywords: [keyword]
        }, {
          headers: {
            'X-Is-First': index === 0,
            'X-Device-Id': localStorage.getItem(`deviceId_${userInfo.value.id}`) || ''
          }
        }).then(res => {
          if (res.data?.error?.includes('기기 불일치')) {
            showDialog(res.data.error)
            return
          }

          const data = res.data.data || []
          const failed = res.data.failedKeywords || []

          if (data.length === 0 || failed.includes(keyword)) {
            failedList.value.push(keyword)
            adsData.value[keyword] = []
          } else {
            adsData.value[keyword] = data
          }
        }).catch(err => {
          const errorMsg = err?.response?.data?.error || '❌ 처리 중 오류 발생'

          if (errorMsg.includes('기기 불일치')) {
            showDialog(errorMsg)
            return
          }
          if (errorMsg.includes('하루 최대')) {
            limitExceeded = true
          }

          failedList.value.push(keyword)
          adsData.value[keyword] = []
          showDialog(errorMsg)
          console.error(`${keyword} 처리 실패:`, err)
        }).finally(() => {
          currentProgress.value++

          // ✅ 모든 키워드 처리 완료 후 한 번만 dialog
          if (currentProgress.value === processedKeywords.length) {
            loading.value = false

            if (Object.values(adsData.value).every(arr => arr.length === 0)) {
              if (!limitExceeded) {
                showDialog('📭 키워드 데이터가 없습니다.')
              }
            } else {
              proxy.$q.dialog({
                title: '알림 📢',
                message: '✅ 모든 키워드 데이터를 가져왔습니다.',
                ok: '확인'
              }).onOk(() => {
                if (failedList.value.length > 0) {
                  const first = failedList.value[0]
                  const count = failedList.value.length
                  const message = count === 1
                    ? `📭 '${first}' 키워드는 광고 데이터가 없습니다.`
                    : `📭 '${first}' 외 ${count - 1}개의 키워드는 광고 데이터가 없습니다.`
                  proxy.$q.dialog({ title: '알림 📢', message, ok: '확인' })
                }
              })
            }
          }
        })
      })
    }


    const getNaverAdsData = (keyword) => {
      selectedKeyword.value = keyword
      const data = adsData.value[keyword]
      if (!data || data.length === 0) {
        showDialog('😢 해당 키워드의 데이터가 없습니다.')
        combinedTableData.value = []
        return
      }

      pcAdsData.value = data.filter(ad => ad.Platform === 'PC')
      mobileAdsData.value = data.filter(ad => ad.Platform === 'Mobile')
      combineTableData()
    }

    const combineTableData = () => {
      const maxLength = Math.max(pcAdsData.value.length, mobileAdsData.value.length)
      combinedTableData.value = Array.from({ length: maxLength }, (_, i) => ({
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
      if (Object.keys(adsData.value).length === 0) {
        showDialog('📭 삭제할 데이터가 없습니다.')
        return
      }
      adsData.value = {}
      pcAdsData.value = []
      mobileAdsData.value = []
      combinedTableData.value = []
      selectedKeyword.value = null
    }

    const downloadExcel = () => {
      const allData = Object.values(adsData.value).flat()
      const failedKeywords = failedList.value

      if (allData.length === 0 && failedKeywords.length === 0) {
        showDialog('📂 다운로드할 데이터가 없습니다.')
        return
      }

      const time = new Date().toLocaleTimeString()
      const wsData = allData.map(ad => ({
        시간: time,
        키워드: ad.Keyword,
        순위: ad.Rank,
        플랫폼: ad.Platform,
        판매자: ad.SellerName,
        제목: ad.Title,
        부제목: ad.Subtitle,
        기간: ad.Period,
        URL: ad['Main URL'] || '-'
      }))

      const wb = XLSX.utils.book_new()
      if (wsData.length > 0) {
        const ws = XLSX.utils.json_to_sheet(wsData)
        XLSX.utils.book_append_sheet(wb, ws, '광고 데이터')
      }
      if (failedKeywords.length > 0) {
        const noAdSheetData = failedKeywords.map(keyword => ({
          시간: time,
          키워드: keyword,
          비고: '광고 데이터 없음'
        }))
        const wsFail = XLSX.utils.json_to_sheet(noAdSheetData)
        XLSX.utils.book_append_sheet(wb, wsFail, '광고 없음 키워드')
      }
      XLSX.writeFile(wb, 'naver_ads_data.xlsx')
    }

    onMounted(fetchBanner)

    return {
      keywordInput,
      keywords,
      adsData,
      pcAdsData,
      mobileAdsData,
      combinedTableData,
      selectedKeyword,
      loading,
      currentProgress,
      totalKeywords,
      processKeywords,
      getNaverAdsData,
      combineTableData,
      resetAll,
      clearSearchResults,
      downloadExcel,
      bannerTitle,
      bannerContent,
      isEditing,
      saveBanner,
      cancelEdit,
      startEdit,
      userInfo
    }
  }
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
