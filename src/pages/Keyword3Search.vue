<template>
  <div id="app">
    <div class="content-below-banner">
      <h6><strong>Maglo - 키워드 연간 검색량</strong></h6>
      <p>키워드의 연관검색량을 볼 수 있는 연관검색량입니다. </p>
      <p>네이버검색광고에 MAGLO를 통해 접속 후 데이터를 반환합니다.</p>
    </div>


    <header class="main-container">
      <!-- 입력 영역 -->

      <div class="input-container">
        <q-card-section class="text-caption text-grey">
          ※ 입력하신 네이버 계정 정보는 저장되지 않으며, 로그인 처리 후 로그아웃을 클릭하시면 폐기됩니다.
        </q-card-section>
        <div class="search-wrapper">

          <textarea
            v-model="keywordInput"
            placeholder="한 줄에 하나씩 키워드를 입력하세요 (최대 5개)"
            rows="4"
          ></textarea>

          <div class="button-group">

            <button
              @click="handleSearch"
              :disabled="loading"
              class="primary-btn dense-btn"

            >

              {{ loading ? '조회 중...' : '검색' }}
            </button>
            <button
              class="negative-btn dense-btn"
              @click="logout"
              :disabled="!loggedIn"
            >
              로그아웃
            </button>

          </div>
        </div>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <q-dialog v-model="loginDialog">
        <q-card>
          <q-card-section>
            <div class="text-h6">네이버 로그인</div>
          </q-card-section>
          <q-card-section v-if="loading" class="row items-center justify-center">
            <q-spinner color="primary" size="40px" />
            <div class="q-ml-sm">로그인 중입니다...</div>
          </q-card-section>

          <q-card-section v-else>
            <q-input filled v-model="naverId" label="네이버 아이디" />
            <q-input filled v-model="naverPw" label="네이버 비밀번호" type="password" />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="취소" color="primary" v-close-popup />
            <q-btn flat label="로그인" color="primary" @click="login" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <div class="keyword_list">
        <div class="button-container">
          <button class="secondary-btn dense-btn" @click="downloadExcel">엑셀 다운로드(CSV)</button>
          <button
            class="negative-btn dense-btn"
            @click="clearResults"
            :disabled="keywords.length === 0"
          >
            검색 초기화
          </button>
        </div>

        <div class="keyword-excel-container" v-if="keywords.length > 0">
          <div class="keyword-list-container">
            <button
              v-for="(kw, index) in keywords"
              :key="index"
              @click="selectKeyword(kw)"
              :class="{ active: kw === selectedKeyword }"
            >
              {{ kw }}
            </button>
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
            <tr>
              <th>월</th>
              <th>PC</th>
              <th>Mobile</th>
            </tr>
            </thead>
            <tbody>
            <tr v-if="!selectedKeyword || selectedTrend.length === 0">
              <td colspan="3" class="no-data">키워드를 조회하십시오.</td>
            </tr>
            <tr v-else v-for="(item, index) in selectedTrend" :key="index">
              <td>{{ item.month }}</td>
              <td>{{ item.pc }}</td>
              <td>{{ item.mobile }}</td>
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
import * as XLSX from 'xlsx';

export default {
  data() {
    return {
      keywordInput: '',
      keywords: [],
      keywordTrends: {},
      selectedKeyword: null,
      naverId: '',
      naverPw: '',
      loginDialog: false,
      loggedIn: false,
      token: '',
      loading: false,
      error: ''
    };
  },
  computed: {
    selectedTrend() {
      return this.keywordTrends[this.selectedKeyword] || [];
    }
  },
  methods: {

    logout() {
      this.token = '';
      this.loggedIn = false;
      this.keywordInput = '';
      this.keywords = [];
      this.keywordTrends = {};
      this.selectedKeyword = null;
      this.error = '';
      alert('네이버에서 로그아웃되었습니다.');
    },

    handleSearch() {
      if (!this.loggedIn) {
        this.loginDialog = true;
      } else {
        this.searchKeywords();
      }
    },
    async login() {
      this.loading = true;
      this.error = '';
      try {
        const res = await api.post('/api/keyword3/login', {
          username: this.naverId,
          password: this.naverPw
        });
        if (res.data.token) {
          this.token = res.data.token;
          this.loggedIn = true;
          this.loginDialog = false;
          await this.searchKeywords();
        } else {
          this.error = '로그인에 실패했습니다.';
        }
      } catch (err) {
        console.error(err);
        this.error = '로그인 요청 중 오류 발생';
      } finally {
        this.loading = false;
      }
    },
    async searchKeywords() {
      this.loading = true;
      this.error = '';
      try {
        const keywords = this.keywordInput
          .split('\n')
          .map(k => k.trim())
          .filter(k => k.length > 0)
          .slice(0, 5);

        const res = await api.post('/api/keyword3/keywords', {
          keywords
        }, {
          headers: { Authorization: `Bearer ${this.token}` }
        });

        this.keywords = keywords;
        this.keywordTrends = {};
        res.data.forEach(item => {
          this.keywordTrends[item.keyword] = item.trend;
        });
        this.selectedKeyword = keywords[0] || null;
      } catch (err) {
        console.error(err);
        this.error = '데이터 요청 중 오류 발생';
      } finally {
        this.loading = false;
      }
    },
    selectKeyword(keyword) {
      this.selectedKeyword = keyword;
    },
    resetAll() {
      this.keywordInput = '';
      this.keywords = [];
      this.keywordTrends = {};
      this.selectedKeyword = null;
      this.error = '';
    },
    clearResults() {
      this.keywords = [];
      this.keywordTrends = {};
      this.selectedKeyword = null;
    },
    downloadExcel() {
      const trendData = this.keywordTrends[this.selectedKeyword];
      if (!trendData || trendData.length === 0) {
        alert('데이터가 없습니다.');
        return;
      }
      const wsData = trendData.map(item => ({
        Month: item.month,
        PC: item.pc,
        Mobile: item.mobile
      }));
      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '검색량 추이');
      XLSX.writeFile(wb, 'keyword_trend.xlsx');
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nanum+Gothic&display=swap');

#app {
  font-family: 'Nanum Gothic', sans-serif;
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
