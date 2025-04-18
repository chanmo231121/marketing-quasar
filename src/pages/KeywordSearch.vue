<template>
  <div id="app">
    <div class="content-below-banner">
      <h6><strong>Maglo - 키워드 단일 검색량 조회기</strong></h6>
      <p>키워드의 조회수를 확인할 수 있는 키워드 단일 검색량 조회기입니다.</p>
      <p>한 줄에 하나씩 키워드를 입력해주세요.</p>
    </div>
    <header class="main-container">
      <div class="input-container">
        <div class="search-wrapper">
          <textarea
            v-model="hintKeyword"
            placeholder="키워드를 입력하세요 (한 줄에 하나씩 최대 100개까지)"
            rows="4"
          ></textarea>
          <div class="button-group">
            <button
              @click="fetchKeywords"
              :disabled="loading || hintKeyword.trim() === ''"
              class="primary-btn dense-btn">
              {{ loading ? `불러오는 중 ${currentProgress}/${totalKeywords}` : '검색' }}
            </button>
            <button class="negative-btn dense-btn" @click="clearInput" :disabled="loading || hintKeyword === ''">키워드 초기화</button>
          </div>
        </div>
      </div>

      <div class="keyword_list">
        <div class="button-container">
          <button @click="downloadExcel" class="secondary-btn dense-btn">엑셀 다운로드(CSV)</button>
        </div>

        <table class="table table-striped">
          <thead>
          <tr>
            <th>NO</th>
            <th>키워드</th>
            <th>월간검색수(PC)</th>
            <th>월간검색수(Mobile)</th>
            <th>검색수합계</th>
            <th>클릭수(PC)</th>
            <th>클릭수(Mobile)</th>
            <th>클릭률(PC)</th>
            <th>클릭률(Mobile)</th>
            <th>경쟁정도</th>
            <th>광고노출수</th>
          </tr>
          </thead>
          <tbody>
          <tr v-if="keywords.length === 0">
            <td colspan="11">키워드를 조회하십시오.</td>
          </tr>
          <tr v-for="(k, index) in keywords" :key="index">
            <td>{{ index + 1 }}</td>
            <td>{{ k['연관키워드'] }}</td>
            <td>{{ k['월간검색수_PC'] }}</td>
            <td>{{ k['월간검색수_모바일'] }}</td>
            <td>{{ k['월간검색수_PC'] + k['월간검색수_모바일'] }}</td>
            <td>{{ k['월평균클릭수_PC'] }}</td>
            <td>{{ k['월평균클릭수_모바일'] }}</td>
            <td>{{ k['월평균클릭률_PC'] }}%</td>
            <td>{{ k['월평균클릭률_모바일'] }}%</td>
            <td>{{ k['경쟁정도'] }}</td>
            <td>{{ k['월평균노출광고수'] }}</td>
          </tr>
          </tbody>
        </table>
      </div>
    </header>
  </div>
</template>

<script>
import { ref, getCurrentInstance } from 'vue';
import { api } from 'boot/axios.js';
import * as XLSX from 'xlsx';

export default {
  setup() {
    const hintKeyword = ref('');
    const keywords = ref([]);
    const loading = ref(false);
    const currentProgress = ref(0);
    const totalKeywords = ref(0);
    const { proxy } = getCurrentInstance();

    const showDialog = (msg) => {
      proxy.$q.dialog({
        title: '알림 📢',
        message: msg,
        ok: '확인'
      });
    };

    const fetchKeywords = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        showDialog('🔐 로그인이 필요합니다. 로그인 후 다시 시도해주세요 🙏');
        return;
      }

      const keywordList = hintKeyword.value
        .split('\n')
        .map((kw) => kw.trim())
        .filter(Boolean);

      if (keywordList.length === 0) {
        showDialog('키워드를 입력해주세요.');
        return;
      }

      if (keywordList.length > 100) {
        showDialog('최대 100개 키워드까지 입력할 수 있습니다.');
        return;
      }

      loading.value = true;
      keywords.value = [];
      currentProgress.value = 0;
      totalKeywords.value = keywordList.length;

      try {
        await api.get('/api/keywords/increment-usage');

        const batches = [];
        for (let i = 0; i < keywordList.length; i += 5) {
          batches.push(keywordList.slice(i, i + 5));
        }

        for (const batch of batches) {
          const encoded = batch.join(',');
          const res = await api.get('/api/keywords', {
            params: { hintKeyword: encoded }
          });

          // approvalMessage가 존재하면, 해당 메시지를 다이얼로그로 표시하고 나머지 처리를 중단합니다.
          if (res.data.approvalMessage) {
            showDialog(res.data.approvalMessage);
            keywords.value = [];
            return;
          }

          if (res.data.results && Array.isArray(res.data.results)) {
            keywords.value.push(...res.data.results);
            currentProgress.value += batch.length;
          }
        }

        if (keywords.value.length === 0) {
          showDialog('검색 결과가 없습니다.');
        }
      } catch (err) {
        const errorMsg =
          err.response?.data?.error ||
          err.response?.data?.message || // ✅ message도 확인하도록 추가
          '❌ 키워드 검색 실패. 다시 시도해주세요.';

        showDialog(errorMsg);
        console.error(err);
      } finally {
        loading.value = false;
      }
    };

    const clearInput = () => {
      hintKeyword.value = '';
      keywords.value = [];
    };

    const downloadExcel = () => {
      if (keywords.value.length === 0) {
        showDialog('📂 다운로드할 데이터가 없습니다.');
        return;
      }

      const wsData = keywords.value.map((k, i) => ({
        NO: i + 1,
        키워드: k['연관키워드'],
        월간검색수_PC: k['월간검색수_PC'],
        월간검색수_모바일: k['월간검색수_모바일'],
        검색수합계: k['월간검색수_PC'] + k['월간검색수_모바일'],
        월평균클릭수_PC: k['월평균클릭수_PC'],
        월평균클릭수_모바일: k['월평균클릭수_모바일'],
        월평균클릭률_PC: k['월평균클릭률_PC'] + '%',
        월평균클릭률_모바일: k['월평균클릭률_모바일'] + '%',
        경쟁정도: k['경쟁정도'],
        월평균노출광고수: k['월평균노출광고수'],
      }));

      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '키워드 데이터');
      XLSX.writeFile(wb, 'keyword_data.xlsx');
    };

    return {
      hintKeyword,
      keywords,
      loading,
      currentProgress,
      totalKeywords,
      fetchKeywords,
      clearInput,
      downloadExcel,
    };
  }
};
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
  padding-bottom: 120px; /* ✅ 여유 공간 추가 */

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

.primary-btn {
  background-color: #1976D2;
  color: white;
  border: none;
  border-radius: 4px;
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

.primary-btn.loading {
  background-color: #FFC107;
  color: #000;
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
</style>
