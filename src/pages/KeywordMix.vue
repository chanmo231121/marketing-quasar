<template>
  <div class="content-below-banner">
    <h6><strong>최진우 병신 - 키워드 검색량 조회기</strong></h6>
    <p>키워드의 조회수를 확인 할 수 있는 키워드 검색량 조회기입니다.</p>
    <p>니똥고 망고똥고.</p>
  </div>
  <q-page class="q-pa-sm" style="display: flex; align-items: flex-start; min-height: 100vh;">

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

        <!-- 조합하기 및 다운로드 버튼 -->
        <div class="controls">
          <q-btn
            color="primary"
            dense
            @click="generateCombinations"
            :disable="loading"
          >
            {{ loading ? '조합 중...' : '조합하기' }}
          </q-btn>
          <q-btn
            color="secondary"
            dense
            @click="downloadCombinations"
            class="q-ml-sm"
            :disable="combinations.length === 0"
          >
            다운받기
          </q-btn>
        </div>

        <!-- 패턴 선택 및 결과 창 -->
        <div class="pattern-result-container">
          <!-- 패턴 선택 창 -->
          <div class="pattern-container">
            <!-- 전체선택 및 전체배제 버튼 -->
            <div class="pattern-controls">
              <q-btn flat dense color="primary" @click="toggleAll(true)">전체선택</q-btn>
              <q-btn flat dense color="negative" @click="toggleAll(false)" class="q-ml-sm">전체해제</q-btn>
            </div>

            <!-- 패턴 리스트 -->
            <div class="pattern-section" v-for="(group, index) in groupedPatterns" :key="index">
              <div class="pattern-divider"></div> <!-- 구분선 추가 -->
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

          <!-- 결과 창 -->
          <div class="result-container">
            <!-- 키워드 사이 공백추가 체크박스 및 결과내역초기화 버튼 -->
            <div class="result-controls-wrapper">
              <div class="result-controls">
                <q-checkbox
                  dense
                  v-model="addSpaces"
                  label="공백추가"
                />
                <q-btn flat dense color="negative" @click="resetCombinations" class="q-ml-sm">내역초기화</q-btn>
              </div>
              <!-- 구분선 추가 -->
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
        </div>
      </div>
    </div>
  </q-page>
</template>

<script>
import { ref } from 'vue';
import * as XLSX from 'xlsx';  // xlsx 라이브러리 가져오기

export default {
  setup() {
    const keywords = ref(Array(4).fill(''));
    const combinations = ref([]);
    const selectedPatterns = ref([]);
    const loading = ref(false);
    const addSpaces = ref(false); // 키워드 사이 공백추가 체크박스 상태

    const patternList = [
      {
        title: '2개 조합',
        patterns: [
          '1+2', '1+3', '1+4', '2+1', '2+3', '2+4',
          '3+1', '3+2', '3+4', '4+1', '4+2', '4+3',
        ],
      },
      {
        title: '3개 조합',
        patterns: [
          '1+2+3', '1+2+4', '1+3+2', '1+3+4',
          '2+1+3', '2+1+4', '2+3+1', '2+3+4',
          '3+1+2', '3+1+4', '3+2+1', '3+2+4',
          '3+4+1', '3+4+2', '4+1+2', '4+1+3',
          '4+2+1', '4+2+3', '4+3+1', '4+3+2',
        ],
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
        ],
      },
    ];

    const generateCombinations = () => {
      loading.value = true;
      combinations.value = [];

      // 각 키워드 입력창의 값을 줄바꿈 기준으로 분리
      const keywordLists = keywords.value.map((keyword) =>
        keyword.split('\n').filter((k) => k.trim() !== '')
      );

      // 선택된 패턴에 따라 조합 생성
      selectedPatterns.value.forEach((pattern) => {
        const indices = pattern.split('+').map((index) => parseInt(index) - 1);

        // 각 패턴에 대한 조합 생성
        const combineKeywords = (currentIndex, currentCombination) => {
          if (currentIndex === indices.length) {
            // 모든 인덱스를 처리한 경우, 조합을 결과에 추가
            const separator = addSpaces.value ? ' ' : ''; // 공백 추가 여부
            combinations.value.push(currentCombination.join(separator));
            return;
          }

          const currentKeywordList = keywordLists[indices[currentIndex]] || [];
          currentKeywordList.forEach((keyword) => {
            combineKeywords(currentIndex + 1, [...currentCombination, keyword]);
          });
        };

        combineKeywords(0, []);
      });

      loading.value = false;
    };

    const toggleAll = (select) => {
      selectedPatterns.value = select ? patternList.flatMap(group => group.patterns) : [];
    };

    // 결과내역초기화
    const resetCombinations = () => {
      combinations.value = [];
    };

    // 엑셀 다운로드 함수
    const downloadCombinations = () => {
      const wb = XLSX.utils.book_new();  // 새로운 워크북 생성
      const ws = XLSX.utils.aoa_to_sheet(combinations.value.map(combination => [combination]));  // 조합 데이터를 워크시트 형식으로 변환

      XLSX.utils.book_append_sheet(wb, ws, 'Combinations');  // 워크북에 시트 추가

      // 엑셀 파일 다운로드
      XLSX.writeFile(wb, 'keyword_combinations.xlsx');
    };

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
    };
  },
};
</script>

<style scoped>
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
  gap: 8px;
  margin-top: 8px;
}

.pattern-result-container {
  display: flex;
  gap: 10px;
  width: 100%;
  height: auto; /* 고정 높이 설정 */
  overflow: hidden; /* 내용이 넘치지 않도록 */
}

.pattern-container,
.result-container {
  flex: 1 1 110%; /* flex-grow: 1, flex-shrink: 1, flex-basis: 50% */
  min-width: 300px; /* 최소 너비 설정 */
  height: 100%; /* 부모 컨테이너의 높이를 상속 */
  overflow-y: visible;  /* 스크롤 제거 */
  border: 1px solid #ccc;
}

.pattern-controls,
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
}

.pattern-list {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  justify-content: flex-start;
  padding: 6px;
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
  top: 0;
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

.q-btn.q-ml-sm {
  margin-left: 8px;
}
</style>
