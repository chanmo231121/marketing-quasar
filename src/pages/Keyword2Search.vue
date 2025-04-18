<template>
  <div id="app">
    <div class="content-below-banner">
      <h6><strong>Maglo - 키워드 연관 검색량 조회기</strong></h6>
      <p>키워드의 조회수를 확인 할 수 있는 키워드 연관 검색량 조회기입니다.</p>
      <p>한줄에 하나씩 키워드를 입력해주세요.</p>
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
            <button
              @click="fetchKeywords"
              :disabled="loading || hintKeyword.trim() === ''"
              class="primary-btn dense-btn">
              {{ loading ? '불러오는 중...' : '검색' }}
            </button>
            <button
              class="negative-btn dense-btn"
              @click="clearInput"
              :disabled="loading || hintKeyword === ''">
              키워드 초기화
            </button>
          </div>
        </div>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="keyword_list">
        <div class="button-container">
          <button
            @click="downloadExcel"
            class="secondary-btn dense-btn">
            엑셀 다운로드(CSV)
          </button>
          <button
            class="negative-btn dense-btn"
            @click="clearSearchResults"
            :disabled="loading || keywords.length === 0">
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
            <th colspan="2">월평균클릭수</th>
            <th colspan="2">월평균클릭율</th>
            <th rowspan="2">경쟁정도</th>
            <th rowspan="2">월평균노출광고수</th>
          </tr>
          <tr>
            <th>PC</th>
            <th>Mobile</th>
            <th>PC</th>
            <th>Mobile</th>
            <th>PC</th>
            <th>Mobile</th>
          </tr>
          </thead>
          <tbody class="sch_tbody">
          <tr v-if="keywords.length === 0">
            <td colspan="12" class="null_td">키워드를 조회하십시오.</td>
          </tr>
          <tr v-for="(keyword, index) in keywords" :key="index">
            <td><input type="checkbox" v-model="keyword.checked" /></td>
            <td>{{ index + 1 }}</td>
            <td>{{ keyword['연관키워드'] }}</td>
            <td>{{ keyword['월간검색수_PC'] }}</td>
            <td>{{ keyword['월간검색수_모바일'] }}</td>
            <td>{{ keyword['월간검색수_PC'] + keyword['월간검색수_모바일'] }}</td>
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
import { ref, getCurrentInstance } from 'vue';
import { api } from 'boot/axios.js';
import * as XLSX from 'xlsx';

export default {
  setup() {
    const hintKeyword = ref('');
    const keywords = ref([]);
    const loading = ref(false);
    const error = ref('');
    const selectAll = ref(false);
    const { proxy } = getCurrentInstance();

    const showDialog = (msg) => {
      proxy.$q.dialog({
        title: '알림 📢',
        message: msg,
        ok: '확인'
      });
    };

    const toggleSelectAll = () => {
      keywords.value.forEach((keyword) => {
        keyword.checked = selectAll.value;
      });
    };

    const fetchKeywords = async () => {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        showDialog('🔐 로그인이 필요합니다. 로그인 후 다시 시도해주세요 🙏');
        return;
      }

      let keywordList = hintKeyword.value.split('\n').map(k => k.trim()).filter(k => k.length);

      if (!keywordList.length) {
        showDialog('📝 키워드를 입력해주세요.');
        return;
      }

      if (keywordList.length > 5) {
        keywordList = keywordList.slice(0, 5);
        showDialog('⚠️ 최대 5개까지 검색 가능합니다. 앞에서부터 5개만 검색됩니다.');
      }

      loading.value = true;

      try {
        const response = await api.get('/api/keyword2', {
          params: { hintKeyword: keywordList.join(',') }
        });

        // 백엔드에서 approvalMessage가 있을 경우 해당 메시지를 다이얼로그로 표시하고 검색 결과를 초기화합니다.
        if (response.data?.approvalMessage) {
          showDialog(response.data.approvalMessage);
          keywords.value = [];
          return;
        }

        if (Array.isArray(response.data) && response.data.length) {
          keywords.value = response.data.map(k => ({ ...k, checked: false }));
        } else {
          showDialog('😢 연관된 키워드가 없습니다.');
        }
      } catch (err) {
        console.error(err);

        const errorMessage =
          err.response?.data?.error ||       // 🔍 기존 키
          err.response?.data?.message ||     // ✅ 추가된 메시지 키
          '❌ 키워드 불러오기 실패. 다시 시도해주세요.';

        showDialog(errorMessage);
      } finally {
        loading.value = false;
      }
    };

    const clearSearchResults = () => {
      keywords.value = [];
      error.value = '';
    };

    const clearInput = () => {
      hintKeyword.value = '';
    };

    const downloadExcel = () => {
      if (keywords.value.length === 0) {
        showDialog('📂 다운로드할 데이터가 없습니다.');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(keywords.value);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Keywords');

      try {
        XLSX.writeFile(wb, 'all_keywords.xlsx');
        showDialog('✅ 엑셀 파일 다운로드 완료!');
      } catch (err) {
        console.error(err);
        showDialog('⚠️ 엑셀 다운로드 중 오류가 발생했습니다.');
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
      downloadExcel
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
</style>
