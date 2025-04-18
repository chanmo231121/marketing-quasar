<template>
  <div class="content-below-banner">
    <h6><strong>Maglo - 키워드 조합기</strong></h6>
    <p>키워드를 조합할 때 사용할 수 있는 키워드 조합기입니다.</p>
    <p>한줄에 하나씩 키워드를 입력해주세요.</p>
  </div>

  <q-page class="q-pa-sm" style="display: flex; align-items: flex-start; min-height: 100vh">
    <div class="keyword-mix-container">
      <div class="main-content">
        <!-- 키워드 입력창 (4개) -->
        <div class="input-container">
          <div v-for="i in 4" :key="i" class="keyword-input">
            <q-input
              filled
              v-model="keywords[i - 1]"
              :label="`키워드 ${i}`"
              placeholder="한 줄에 하나씩 키워드를 입력해주세요"
              rows="20"
              type="textarea"
            />
          </div>
        </div>

        <!-- 조합 선택 및 결과 창 -->
        <div class="pattern-result-container">
          <!-- 패턴 선택 창 -->
          <div class="pattern-container">
            <div class="pattern-controls">
              <q-btn flat dense color="primary" @click="toggleAll(true)">전체선택</q-btn>
              <q-btn flat dense color="negative" @click="toggleAll(false)" class="q-ml-sm">전체해제</q-btn>
            </div>

            <!-- 그룹별 패턴 리스트 -->
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

          <!-- 결과창 및 컨트롤 버튼 -->
          <div class="result-and-controls-container">
            <!-- 결과 창 -->
            <div class="result-container">
              <div class="result-controls-wrapper">
                <div class="result-controls">
                  <q-checkbox dense v-model="addSpaces" label="공백추가" />
                  <q-btn flat dense color="negative" @click="resetCombinations" class="q-ml-sm">내역초기화</q-btn>
                </div>
                <q-separator color="grey-4" class="q-my-md" />
              </div>

              <!-- 조합 결과 리스트 -->
              <q-list bordered dense separator>
                <q-item v-for="(combination, index) in combinations" :key="index">
                  <q-item-section>{{ combination }}</q-item-section>
                </q-item>
                <q-item v-if="combinations.length === 0">
                  <q-item-section>키워드를 조회하십시오.</q-item-section>
                </q-item>
              </q-list>
            </div>

            <!-- 결과 컨트롤 버튼 -->
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
</template>

<script>
import { ref } from 'vue'
import * as XLSX from 'xlsx'
import { copyToClipboard, Dialog } from 'quasar'
import { useUserStore } from 'stores/userStore.js'
import { api } from 'boot/axios.js' // 꼭 추가해야 함!

export default {
  setup() {
    const keywords = ref(Array(4).fill(''))
    const combinations = ref([])
    const selectedPatterns = ref([])
    const loading = ref(false)
    const addSpaces = ref(false)

    const patternList = [
      { title: '1개 조합', patterns: ['1', '2', '3', '4'] },
      {
        title: '2개 조합',
        patterns: [
          '1+2', '1+3', '1+4', '2+1', '2+3', '2+4',
          '3+1', '3+2', '3+4', '4+1', '4+2', '4+3',
        ]
      },
      {
        title: '3개 조합',
        patterns: [
          '1+2+3', '1+2+4', '1+3+2', '1+3+4',
          '2+1+3', '2+1+4', '2+3+1', '2+3+4',
          '3+1+2', '3+1+4', '3+2+1', '3+2+4',
          '3+4+1', '3+4+2', '4+1+2', '4+1+3',
          '4+2+1', '4+2+3', '4+3+1', '4+3+2',
        ]
      },
      {
        title: '4개 조합',
        patterns: [
          '1+2+3+4', '1+2+4+3', '1+3+2+4', '1+3+4+2',
          '1+4+2+3', '1+4+3+2', '2+1+3+4', '2+1+4+3',
          '2+3+1+4', '2+3+4+1', '2+4+1+3', '2+4+3+1',
          '3+1+2+4', '3+1+4+2', '3+2+1+4', '3+2+4+1',
          '3+4+1+2', '3+4+2+1', '4+1+2+3', '4+1+3+2',
          '4+2+1+3', '4+2+3+1', '4+3+1+2', '4+3+2+1',
        ]
      }
    ]

    const showDialog = (message) => {
      Dialog.create({
        title: '알림 📢',
        message: message,
        ok: '확인'
      })
    }

    const generateCombinations = async () => {
      const userStore = useUserStore()

      console.log(userStore.userInfo)
      // 로그인 및 상태 체크
      if (!userStore.isLoggedIn || !userStore.userInfo.status) {
        showDialog('🔐 로그인이 필요합니다. 로그인 후 다시 시도해주세요 🙏')
        return
      }

      if (userStore.userInfo.status === 'PENDING_REAPPROVAL') {
        showDialog('⛔ 기간만료! 재승인을 해주세요.')
        return
      }

      // 승인된 회원이라도 백엔드와 동일한 변수명( canUseKeywordMix )으로 권한 체크
      if (!userStore.userInfo.canUseKeywordMix) {
        showDialog('⛔ 키워드조합 기능 사용이 제한된 계정입니다. 관리자에게 문의해주세요.')
        return
      }

      // 일반 사용자 상태 체크 (예: NORMAL 상태가 아니면 제한)
      if (
        userStore.userInfo.status !== 'NORMAL' &&
        userStore.userInfo.role !== 'ADMIN' &&
        userStore.userInfo.role !== 'DEV'
      ) {
        showDialog('⛔ 오른쪽 상단에 있는 승인요청을 해주세요!')
        return
      }

      // ✅ 로그 전송 - axios 사용 (키워드 조합 기능 실행 로그)
      try {
        const userId = userStore.userInfo.id
        const uuid = localStorage.getItem(`deviceId_${userId}`) || '-'
        await api.post('/api/admin/logs/custom', {
          keyword: '키워드조합기 실행',
          uuid
        })
      } catch (err) {
        console.error('로그 전송 실패:', err)
        const msg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          '❌ 키워드 조합기 실행 중 오류가 발생했습니다.'
        showDialog(msg)
        return
      }

      // 🔄 조합 로직 실행
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

      try {
        XLSX.writeFile(wb, 'keyword_combinations.xlsx')
        showDialog('📦 엑셀 다운로드가 완료되었습니다!')
      } catch (err) {
        console.error(err)
        showDialog('❌ 엑셀 저장 중 오류가 발생했습니다.')
      }
    }

    const copyCombinations = () => {
      copyToClipboard(combinations.value.join('\n'))
        .then(() => {
          showDialog('📋 복사되었습니다!')
        })
        .catch(() => {
          showDialog('⚠️ 복사 실패! 다시 시도해주세요.')
        })
    }

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
      copyCombinations
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
  max-width: 1200px; /* 최대 너비 설정 */
  margin: 200px auto 0 auto; /* 상단 여백 추가 */
  min-height: 100vh; /* 최소 높이 설정 */
}

.main-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 1000px; /* 최대 너비 설정 */
  min-width: 800px; /* 최소 너비 설정 */
  padding-bottom: 120px; /* ✅ 여유 공간 추가 */

}

.input-container {
  display: flex;
  gap: 8px;
  width: 100%;
  flex-wrap: nowrap; /* 줄바꿈 방지 */
}

.keyword-input {
  flex: 1;
  min-width: 200px; /* 최소 너비 설정 */
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%; /* 가로크기 result-container와 일치 */
  margin-top: 8px;
}

.full-width-btn {
  width: 100%;
  box-sizing: border-box;
  height: 90px; /* 원하는 높이로 조정 (기본보다 높게 설정) */
  font-size: 18px; /* 글씨 크기도 조금 늘려주면 보기 좋음 */
}

.pattern-result-container {
  display: flex;
  gap: 10px;
  width: 100%;
  height: auto; /* 고정 높이 설정 */
  overflow: hidden; /* 내용이 넘치지 않도록 */
}

.pattern-container {
  flex: 1 1 110%; /* flex-grow: 1, flex-shrink: 1, flex-basis: 50% */
  min-width: 300px; /* 최소 너비 설정 */
  height: 100%; /* 부모 컨테이너의 높이를 상속 */
  overflow-y: visible; /* 스크롤 제거 */
  border: 1px solid #ccc;
}

.result-container {
  flex: 1 1 110%; /* flex-grow: 1, flex-shrink: 1, flex-basis: 50% */
  min-width: 300px; /* 최소 너비 설정 */
  height: 100%; /* 부모 컨테이너의 높이를 상속 */
  overflow-y: visible; /* 스크롤 제거 */
  border: 1px solid #ccc;
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
  font-size: 11px; /* 폰트 크기 축소 */
}

.pattern-divider {
  border-top: 2px solid #ddd; /* 구분선 스타일 */
  margin: 8px 0;
}

.result-container {
  flex: none; /* flex-grow, flex-shrink 해제 */
  height: 400px; /* 고정 높이 설정 (원하는 값으로 조정 가능) */
  border: 1px solid #ccc;
  padding: 8px;
  background: #fff;
  overflow-y: auto; /* 스크롤 허용 */
  font-size: 12px; /* 결과 내역 폰트 크기 조정 */
}

.result-controls-wrapper {
  position: sticky;
  top: -10px;
  background: white; /* 배경색 추가 */
  z-index: 1; /* 다른 요소 위에 표시 */
  padding: 8px 0; /* 여백 추가 */
}

.content-below-banner {
  position: relative;
  top: 200px; /* 배너 높이인 120px + 배너의 마진 100px (상단과 텍스트 사이 간격) */
  left: 0;
  width: 100%;
  padding: 10px;
  font-family: Arial, sans-serif;
  color: #333;
  text-align: left;
  max-width: 1000px; /* 내용이 너무 커지지 않도록 제한 */
  margin-left: auto;
  margin-right: auto;
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

/* 선택된 버튼에 적용할 활성화 스타일 */
.keyword-list-container button.active {
  background-color: #FF9800; /* 예: 오렌지색 하이라이트 */
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
</style>
