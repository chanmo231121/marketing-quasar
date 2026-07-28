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

    <q-page class="q-pa-sm" style="display: flex; align-items: flex-start; min-height: 100vh">
      <div class="keyword-mix-container">
        <div class="main-content">
          <!-- 키워드 입력창 (5개, 5번은 추가 키워드) -->
          <div class="input-container">
            <div v-for="i in 5" :key="i" class="keyword-input">
              <q-input
                filled
                v-model="keywords[i - 1]"
                :label="i === 5 ? '추가 키워드 (5)' : `키워드 ${i}`"
                placeholder="한 줄에 하나씩 키워드를 입력해주세요"
                rows="20"
                type="textarea"
              />
            </div>
          </div>

          <!-- 조합 선택 및 결과 창 -->
          <div class="pattern-result-container">
            <!-- 패턴 선택 -->
            <div class="pattern-container">
              <div class="pattern-controls">
                <q-btn flat dense color="primary" @click="toggleAll(true)">전체선택</q-btn>
                <q-btn flat dense color="negative" @click="toggleAll(false)" class="q-ml-sm">전체해제</q-btn>
              </div>

              <div class="pattern-section" v-for="(group, index) in groupedPatterns" :key="index">
                <div class="pattern-divider"></div>
                <div class="pattern-header">{{ group.title }}</div>
                <div class="pattern-list">
                  <q-checkbox
                    v-for="pattern in group.patterns"
                    :key="pattern"
                    dense
                    v-model="selectedPatterns"
                    :val="pattern"
                    :label="pattern"
                  />
                </div>
              </div>
            </div>

            <!-- 결과 및 컨트롤 -->
            <div class="result-and-controls-container">
              <div class="result-container">
                <div class="result-controls-wrapper">
                  <div class="result-controls">
                    <q-checkbox dense v-model="addSpaces" label="공백추가" />
                    <q-btn flat dense color="negative" @click="resetCombinations" class="q-ml-sm">내역초기화</q-btn>
                  </div>
                  <q-separator color="grey-4" class="q-my-md" />
                </div>

                <q-list bordered dense separator>
                  <q-item v-for="(combination, index) in combinations" :key="index">
                    <q-item-section>{{ combination }}</q-item-section>
                  </q-item>
                  <q-item v-if="combinations.length === 0">
                    <q-item-section>키워드를 조회하십시오.</q-item-section>
                  </q-item>
                </q-list>
              </div>

              <div class="controls q-mt-sm">
                <q-btn color="primary" dense @click="generateCombinations" :disable="loading" class="full-width-btn">
                  {{ loading ? '조합 중...' : '조합하기' }}
                </q-btn>
                <q-btn color="accent" dense @click="copyCombinations" :disable="combinations.length === 0" class="full-width-btn">
                  복사하기
                </q-btn>
                <q-btn color="secondary" dense @click="downloadCombinations" :disable="combinations.length === 0" class="full-width-btn">
                  엑셀 다운로드(CSV)
                </q-btn>
              </div>
            </div>
          </div>
        </div>
      </div>
    </q-page>
  </div>
</template>

<script>
import { ref, onMounted, } from 'vue'
import * as XLSX from 'xlsx'
import { copyToClipboard, Dialog } from 'quasar'
import { useUserStore } from 'stores/userStore.js'
import { api } from 'boot/axios.js'
import { storeToRefs } from 'pinia'


export default {
  setup() {
    const keywords = ref(Array(5).fill(''))
    const combinations = ref([])
    const selectedPatterns = ref([])
    const loading = ref(false)
    const addSpaces = ref(false)

    // 배너 관련
    const bannerTitle = ref('')
    const bannerContent = ref('')
    const isEditing = ref(false)

    const userStore = useUserStore()
    const { userInfo } = storeToRefs(userStore) // 이걸로 바꿔야 Vue template에서 반응해!

    // items에서 size개를 뽑는 순열 전부 생성 (입력 순서 기준이라 결과도 사전순)
    const permutations = (items, size) => {
      if (size === 0) return [[]]
      const result = []
      items.forEach(item => {
        permutations(items.filter(other => other !== item), size - 1).forEach(rest => {
          result.push([item, ...rest])
        })
      })
      return result
    }

    // 5번(추가 키워드) 칸이 반드시 포함된 size개 순열을 '1+2+5' 형태 문자열로
    const extraPatterns = (size) =>
      permutations([1, 2, 3, 4, 5], size)
        .filter(p => p.includes(5))
        .map(p => p.join('+'))
        .sort()

    const patternList = [
      { title: '1개 조합', patterns: ['1', '2', '3', '4'] },
      { title: '2개 조합', patterns: ['1+2', '1+3', '1+4', '2+1', '2+3', '2+4', '3+1', '3+2', '3+4', '4+1', '4+2', '4+3'] },
      {
        title: '3개 조합',
        patterns: [
          '1+2+3', '1+2+4', '1+3+2', '1+3+4', '2+1+3', '2+1+4', '2+3+1', '2+3+4',
          '3+1+2', '3+1+4', '3+2+1', '3+2+4', '3+4+1', '3+4+2', '4+1+2', '4+1+3',
          '4+2+1', '4+2+3', '4+3+1', '4+3+2'
        ]
      },
      {
        title: '4개 조합',
        patterns: [
          '1+2+3+4', '1+2+4+3', '1+3+2+4', '1+3+4+2', '1+4+2+3', '1+4+3+2',
          '2+1+3+4', '2+1+4+3', '2+3+1+4', '2+3+4+1', '2+4+1+3', '2+4+3+1',
          '3+1+2+4', '3+1+4+2', '3+2+1+4', '3+2+4+1', '3+4+1+2', '3+4+2+1',
          '4+1+2+3', '4+1+3+2', '4+2+1+3', '4+2+3+1', '4+3+1+2', '4+3+2+1'
        ]
      },
      // 아래는 추가 키워드(5번) 칸이 들어간 조합들 — 순열로 자동 생성
      { title: '1개 조합 (추가 키워드)', patterns: ['5'] },
      { title: '2개 조합 (추가 키워드 포함)', patterns: extraPatterns(2) },
      { title: '3개 조합 (추가 키워드 포함)', patterns: extraPatterns(3) },
      { title: '4개 조합 (추가 키워드 포함)', patterns: extraPatterns(4) },
      { title: '5개 조합 (추가 키워드 포함)', patterns: extraPatterns(5) }
    ]

    const showDialog = (message) => {
      Dialog.create({ title: '알림 📢', message, ok: '확인' })
    }

    const fetchBanner = async () => {
      try {
        const res = await api.get('/api/v1/banner', { params: { page: 'keyword-mix' } })
        bannerTitle.value = res.data.title
        bannerContent.value = res.data.description1
      } catch (e) {
        console.error('배너 로딩 실패', e)
      }
    }

    const saveBanner = async () => {
      try {
        await api.put('/api/v1/banner/update', {
          title: bannerTitle.value,
          description1: bannerContent.value,
          description2: ''
        }, {
          params: { page: 'keyword-mix' }
        })
        isEditing.value = false
        showDialog('✅ 배너가 저장되었습니다.')
      } catch (e) {
        console.error('배너 저장 실패', e)
        showDialog('❌ 배너 저장 실패')
      }
    }

    const startEdit = () => { isEditing.value = true }
    const cancelEdit = () => { isEditing.value = false; fetchBanner() }

    const generateCombinations = async () => {
      if (!userStore.isLoggedIn || !userStore.userInfo.status) {
        showDialog('🔐 로그인이 필요합니다. 로그인 후 다시 시도해주세요 🙏')
        return
      }
      const uuid = localStorage.getItem(`deviceId_${userStore.userInfo.id}`) || '-'

// ✅ UUID 먼저 검증
      try {
        await api.get('/api/v1/keyword-mix/validate-device', {
          headers: { 'X-Device-Id': uuid }
        })
      } catch (err) {
        const msg = err.response?.data?.error || '❌ 기기 인증 오류'
        showDialog(msg)
        return
      }

      if (userStore.userInfo.status === 'PENDING_REAPPROVAL') {
        showDialog('⛔ 기간만료! 재승인을 해주세요.')
        return
      }

      if (!userStore.userInfo.canUseKeywordMix) {
        showDialog('⛔ 키워드조합 기능 사용이 제한된 계정입니다.')
        return
      }

      if (
        userStore.userInfo.status !== 'NORMAL' &&
        userStore.userInfo.role !== 'ADMIN' &&
        userStore.userInfo.role !== 'DEV'
      ) {
        showDialog('⛔ 오른쪽 상단에 있는 승인요청을 해주세요! 하셨다면 대기해주세요!')
        return
      }

      try {
        const uuid = localStorage.getItem(`deviceId_${userStore.userInfo.id}`) || '-'
        await api.post('/api/admin/logs/custom', {
          keyword: '키워드조합기 실행',
          uuid
        })
      } catch (err) {
        console.error('로그 전송 실패:', err)
      }

      loading.value = true
      combinations.value = []

      const keywordLists = keywords.value.map(k =>
        k.split('\n').filter(item => item.trim() !== '')
      )

      if (selectedPatterns.value.length === 0) {
        showDialog('⚠️ 선택된 조합이 없습니다.')
        loading.value = false
        return
      }

      selectedPatterns.value.forEach(pattern => {
        const indices = pattern.split('+').map(i => parseInt(i) - 1)
        const combine = (index, result) => {
          if (index === indices.length) {
            const sep = addSpaces.value ? ' ' : ''
            combinations.value.push(result.join(sep))
            return
          }
          const list = keywordLists[indices[index]]
          if (!list || list.length === 0) return
          list.forEach(item => combine(index + 1, [...result, item]))
        }
        combine(0, [])
      })

      loading.value = false
    }

    const toggleAll = (select) => {
      selectedPatterns.value = select ? patternList.flatMap(g => g.patterns) : []
    }

    const resetCombinations = () => {
      combinations.value = []
      showDialog('🧹 조합 결과가 초기화되었습니다.')
    }

    const downloadCombinations = () => {
      if (combinations.value.length === 0) {
        showDialog('📂 다운로드할 데이터가 없습니다.')
        return
      }
      const ws = XLSX.utils.aoa_to_sheet(combinations.value.map(c => [c]))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Combinations')
      XLSX.writeFile(wb, 'keyword_combinations.xlsx')
    }

    const copyCombinations = () => {
      copyToClipboard(combinations.value.join('\n'))
        .then(() => showDialog('📋 복사되었습니다!'))
        .catch(() => showDialog('⚠️ 복사 실패! 다시 시도해주세요.'))
    }

    onMounted(fetchBanner)

    return {
      keywords,
      combinations,
      selectedPatterns,
      loading,
      addSpaces,
      groupedPatterns: patternList,
      generateCombinations,
      toggleAll,
      resetCombinations,
      downloadCombinations,
      copyCombinations,
      // 배너 관련
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
* {
  font-family: 'Nanum Gothic', sans-serif;
}

.keyword-mix-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  width: 100%;
  max-width: 1200px;
  margin: 200px auto 0 auto;
  min-height: 100vh;
}

.main-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 1000px;
  min-width: 800px;
  padding-bottom: 120px;
}

.input-container {
  display: flex;
  gap: 8px;
  width: 100%;
  flex-wrap: nowrap;
}

.keyword-input {
  flex: 1;
  min-width: 150px;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
  margin-top: 8px;
}

.full-width-btn {
  width: 100%;
  box-sizing: border-box;
  height: 90px;
  font-size: 18px;
}

.pattern-result-container {
  display: flex;
  gap: 10px;
  width: 100%;
  height: auto;
  overflow: hidden;
}

.pattern-container,
.result-container {
  flex: 1 1 110%;
  min-width: 300px;
  height: 100%;
  border: 1px solid #ccc;
  overflow-y: visible;
}

.result-container {
  flex: none;
  height: 400px;
  padding: 8px;
  background: #fff;
  overflow-y: auto;
  font-size: 12px;
}

.pattern-controls {
  display: flex;
  gap: 8px;
  margin-bottom: -15px;
}

.result-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.pattern-section {
  padding-top: 8px;
  width: 100%;
}

.pattern-header {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 8px;
  margin-left: 7px;
}

.pattern-list {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  justify-content: flex-start;
  padding: 14px;
  font-size: 11px;
}

.pattern-divider {
  border-top: 2px solid #ddd;
  margin: 8px 0;
}

.result-controls-wrapper {
  position: sticky;
  top: -10px;
  background: white;
  z-index: 1;
  padding: 8px 0;
}

.content-below-banner {
  position: relative;
  z-index: 1000; /* 이거 하나면 끝! */

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
