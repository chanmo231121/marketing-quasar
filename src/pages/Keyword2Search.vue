<template>
  <div id="app">
    <div class="content-below-banner">
      <h6><strong>최진우 병신 - 키워드 검색량 조회기</strong></h6>
      <p>키워드의 조회수를 확인 할 수 있는 키워드 검색량 조회기입니다.</p>
      <p>니똥고 망고똥고.</p>
    </div>
    <header class="main-container">
      <div class="input-container">
        <div class="search-wrapper">
          <textarea
            v-model="hintKeyword"
            placeholder="키워드를 입력하세요 (한 줄에 하나씩 최대 5개까지)"
            rows="4"
          ></textarea>
          <div class="button-group">
            <button @click="fetchKeywords" :disabled="loading">
              {{ loading ? '불러오는 중...' : '검색' }}
            </button>
            <button class="reset-keyword-button" @click="clearInput" :disabled="loading || hintKeyword === ''">
              키워드 초기화
            </button>
            <button class="extra-button" @click="extraFunction">
              엑셀 업로드
            </button>
          </div>
        </div>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="keyword_list">
        <div class="button-container">
          <button @click="downloadExcel" class="excel-download-button">엑셀로 다운로드</button>
          <button class="reset-button" @click="clearSearchResults" :disabled="loading || keywords.length === 0">
            검색 초기화
          </button>
        </div>

        <table cellpadding="0" cellspacing="0" id="mytable2" class="table table-striped">
          <thead>
          <tr>
            <th rowspan="2">
              <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
            </th>
            <th rowspan="2">NO</th>
            <th rowspan="2">키워드</th>
            <th colspan="2">월간검색수</th>
            <th rowspan="2">검색수합계</th>
            <th colspan="2">월간 블로그 발행</th>
            <th rowspan="2">네이버쇼핑<br />카테고리</th>
            <th colspan="2">월평균클릭수</th>
            <th colspan="2">월평균클릭율</th>
            <th rowspan="2">경쟁정도</th>
            <th rowspan="2">월평균노출광고수</th>
          </tr>
          <tr>
            <th>PC</th>
            <th>Mobile</th>
            <th>수량</th>
            <th>포화도</th>
            <th>PC</th>
            <th>Mobile</th>
            <th>PC</th>
            <th>Mobile</th>
          </tr>
          </thead>
          <tbody class="sch_tbody">
          <tr v-if="keywords.length === 0">
            <td colspan="15" class="null_td">키워드를 조회하십시오.</td>
          </tr>
          <tr v-for="(keyword, index) in keywords" :key="index">
            <td>
              <input type="checkbox" v-model="keyword.checked" />
            </td>
            <td>{{ index + 1 }}</td>
            <td>{{ keyword['연관키워드'] }}</td>
            <td>{{ keyword['월간검색수_PC'] }}</td>
            <td>{{ keyword['월간검색수_모바일'] }}</td>
            <td>{{ keyword['월간검색수_PC'] + keyword['월간검색수_모바일'] }}</td>
            <td>{{ keyword['월간블로그발행수량'] || 'N/A' }}</td>
            <td>{{ keyword['월간블로그발행포화도'] || 'N/A' }}</td>
            <td>X</td>
            <td>{{ keyword['월평균클릭수_PC'] }}</td>
            <td>{{ keyword['월평균클릭수_모바일'] }}</td>
            <td>{{ keyword['월평균클릭률_PC'] ? keyword['월평균클릭률_PC'] + '%' : 'N/A' }}</td>
            <td>{{ keyword['월평균클릭률_모바일'] ? keyword['월평균클릭률_모바일'] + '%' : 'N/A' }}</td>
            <td>{{ keyword['경쟁정도'] }}</td>
            <td>{{ keyword['월평균노출광고수'] }}</td>
          </tr>
          </tbody>
        </table>
      </div>
    </header>
  </div>
</template>

<script>
import { ref } from 'vue';
import axios from 'axios';
import * as XLSX from 'xlsx';

export default {
  setup() {
    const hintKeyword = ref('');
    const keywords = ref([]);
    const loading = ref(false);
    const error = ref('');
    const selectAll = ref(false);

    // 전체 선택/해제 토글
    const toggleSelectAll = () => {
      keywords.value.forEach((keyword) => {
        keyword.checked = selectAll.value;
      });
    };

    // 키워드 조회
    const fetchKeywords = async () => {
      const keywordList = hintKeyword.value.split('\n').map((keyword) => keyword.trim()).filter((keyword) => keyword.length > 0);

      if (keywordList.length === 0) {
        error.value = '키워드를 입력해주세요.';
        return;
      }

      loading.value = true;
      error.value = '';

      try {
        const response = await axios.get('http://localhost:8080/api/keyword2', {
          params: { hintKeyword: keywordList.join(',') },
        });

        if (response.data && response.data.length > 0) {
          keywords.value = [...keywords.value, ...response.data.map((keyword) => ({ ...keyword, checked: false }))];
        } else {
          error.value = '연관된 키워드가 없습니다.';
        }
      } catch (err) {
        error.value = '키워드 불러오기 실패';
        console.error(err);
      } finally {
        loading.value = false;
      }
    };

    // 검색 결과 초기화
    const clearSearchResults = () => {
      keywords.value = [];
      error.value = '';
    };

    // 입력 초기화
    const clearInput = () => {
      hintKeyword.value = '';
    };

    // 추가 기능 (엑셀 업로드)
    const extraFunction = () => {
      alert('추가 버튼이 클릭되었습니다!');
    };

    // 엑셀 다운로드
    const downloadExcel = () => {
      const checkedKeywords = keywords.value.filter((keyword) => keyword.checked);

      if (checkedKeywords.length === 0) {
        alert('체크된 항목이 없습니다.');
        return;
      }

      // 엑셀 파일로 변환할 데이터를 준비
      const wsData = checkedKeywords.map((keyword, index) => ({
        NO: index + 1,
        키워드: keyword['연관키워드'],
        월간검색수_PC: keyword['월간검색수_PC'],
        월간검색수_모바일: keyword['월간검색수_모바일'],
        검색수합계: keyword['월간검색수_PC'] + keyword['월간검색수_모바일'],
        월간블로그발행수량: keyword['월간블로그발행수량'] || 'N/A',
        월간블로그발행포화도: keyword['월간블로그발행포화도'] || 'N/A',
        네이버쇼핑카테고리: 'X',
        월평균클릭수_PC: keyword['월평균클릭수_PC'],
        월평균클릭수_모바일: keyword['월평균클릭수_모바일'],
        월평균클릭률_PC: keyword['월평균클릭률_PC'] ? keyword['월평균클릭률_PC'] + '%' : 'N/A',
        월평균클릭률_모바일: keyword['월평균클릭률_모바일'] ? keyword['월평균클릭률_모바일'] + '%' : 'N/A',
        경쟁정도: keyword['경쟁정도'],
        월평균노출광고수: keyword['월평균노출광고수'],
      }));

      // 워크북 생성
      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '키워드 데이터');

      // 엑셀 파일 다운로드
      try {
        XLSX.writeFile(wb, 'checked_keyword_data.xlsx');
        console.log('엑셀 파일이 다운로드되었습니다.');
      } catch (error) {
        console.error('엑셀 파일 다운로드 중 오류 발생:', error);
        alert('엑셀 파일 다운로드 중 오류가 발생했습니다.');
      }
    };

    return {
      hintKeyword,
      keywords,
      loading,
      error,
      selectAll,
      toggleSelectAll,
      fetchKeywords,
      clearSearchResults,
      clearInput,
      extraFunction,
      downloadExcel,
    };
  },
};
</script>


<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
}

.main-container {
  width: 69.6%;
  margin: 250px auto 0 auto;
  text-align: center;
  position: relative;
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

.reset-keyword-button {
  background-color: #ff6347;
  color: white;
  border: none;
}

.reset-keyword-button:disabled {
  background-color: #ddd;
}

.extra-button {
  background-color: #4CAF50;
  color: white;
  border: none;
}

.extra-button:hover {
  background-color: #45a049;
}

.button-container {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  gap: 10px;
  margin-top: -40px;
}

.excel-download-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 14px;
}



.excel-download-button:hover {
  background-color: #45a049;
}

.reset-button,
.excel-download-button {
  padding: 8px 12px; /* reset-button과 동일한 padding */
  font-size: 14px; /* reset-button과 동일한 font-size */
  cursor: pointer;
  border: none;
  white-space: nowrap;
}


.reset-button {
  background-color: red;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.reset-button:disabled {
  background-color: #ddd;
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

td {
  background-color: #f9f9f9;
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
</style>
