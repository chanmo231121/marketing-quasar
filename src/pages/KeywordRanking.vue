<template>
  <div id="app">
    <div class="content-below-banner">
      <h6><strong>Maglo - 키워드 랭킹순위</strong></h6>
      <p>키워드의 랭킹순위를 보수 있는 키워드 랭킹순위입니다.</p>
      <p>한 줄에 하나씩 키워드를 입력하고 아래 키워드를 클릭해주세요.</p>
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
            >
              {{ loading ? `불러오는 중 ${currentProgress}/${totalKeywords}` : '검색' }}
            </button>
            <button class="negative-btn dense-btn" @click="resetAll" :disabled="loading || keywordInput === ''">
              키워드 초기화
            </button>
          </div>
        </div>
      </div>

      <div class="keyword_list">
        <div class="button-container">
          <button @click="downloadExcel" class="secondary-btn dense-btn excel-download-small-btn">
            엘셀 다운로드(CSV)
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
              <th>파매자</th>
              <th>제목</th>
              <th>URL</th>
              <th>파매자</th>
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
import { Dialog } from 'quasar';
import { api } from 'boot/axios.js';
import * as XLSX from 'xlsx';

export default {
  data() {
    return {
      keywordInput: '',
      keywords: [],
      adsData: {},
      pcAdsData: [],
      mobileAdsData: [],
      combinedTableData: [],
      loading: false,
      error: '',
      selectedKeyword: null,
      currentProgress: 0,
      totalKeywords: 0
    };
  },
  methods: {
    async processKeywords() {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        this.showDialog('🔐 로그인이 필요합니다. 로그인 후 다시 시도해주세요 🙏');
        return;
      }

      const processedKeywords = this.keywordInput
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);

      if (processedKeywords.length > 100) {
        this.showDialog('⚠️ 키워드는 최대 100개까지 입력 가능합니다.');
        return;
      }

      this.keywords = processedKeywords;
      this.adsData = {};
      this.loading = true;
      this.currentProgress = 0;
      this.totalKeywords = processedKeywords.length;

      try {
        const response = await api.get('/api/naver-ads/search', {
          params: {
            keywords: encodeURIComponent(processedKeywords.join('\n'))
          }
        });

        // 백엔드에서 approvalMessage가 포함되어 있을 경우, 해당 메시지를 표시하고 검색 결과를 초기화합니다.
        if (response.data?.approvalMessage) {
          this.showDialog(response.data.approvalMessage);
          this.adsData = {};
          return;
        }

        const grouped = {};
        for (const ad of response.data) {
          if (!grouped[ad.Keyword]) grouped[ad.Keyword] = [];
          grouped[ad.Keyword].push(ad);
        }
        this.adsData = grouped;

        const allEmpty = Object.values(this.adsData).every(arr => arr.length === 0);
        if (!allEmpty) {
          this.showDialog('✅ 모든 키워드 데이터를 가져왔습니다.');
        }
      } catch (err) {
        if (err.response?.status === 401) {
          // 토큰 만료 등 별도 처리는 axios에서 자동 refresh 시키므로 안내 생략
          return;
        }

        let errorMsg = '❌ 키워드 랭킹 조회 실패. 다시 시도해주세요.';
        if (err.response?.data?.message) {
          errorMsg = ` ${err.response.data.message}`;
        } else if (err.response?.data?.error) {
          errorMsg = ` ${err.response.data.error}`;
        } else if (err.message) {
          errorMsg = ` ${err.message}`;
        }

        this.showDialog(errorMsg);
        console.error('❌ 랭킹 조회 에러:', err);
      } finally {
        this.loading = false;
      }
    },

    getNaverAdsData(keyword) {
      this.selectedKeyword = keyword;
      const data = this.adsData[keyword];
      if (!data || data.length === 0) {
        this.showDialog('😢 해당 키워드의 데이터가 없습니다.');
        this.combinedTableData = [];
        return;
      }

      this.pcAdsData = data.filter(ad => ad.Platform === 'PC');
      this.mobileAdsData = data.filter(ad => ad.Platform === 'Mobile');
      this.combineTableData();
    },

    combineTableData() {
      const maxLength = Math.max(this.pcAdsData.length, this.mobileAdsData.length);
      this.combinedTableData = Array.from({ length: maxLength }, (_, i) => ({
        pc: this.pcAdsData[i] || {},
        mobile: this.mobileAdsData[i] || {}
      }));
    },

    downloadExcel() {
      const allData = Object.values(this.adsData).flat();
      if (allData.length === 0) {
        this.showDialog('📂 다운로드할 데이터가 없습니다.');
        return;
      }

      const time = new Date().toLocaleTimeString();
      const wsData = allData.map(ad => ({
        시간: time,
        키워드: ad.Keyword,
        순위: ad.Rank,
        플랫폼: ad.Platform,
        판매자: ad.SellerName,
        제목: ad.Title,
        부제목: ad.Subtitle,
        기간: ad.Period,
        URL: ad['Main URL']
      }));

      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '광고 데이터');
      XLSX.writeFile(wb, 'naver_ads_data.xlsx');
    },

    resetAll() {
      this.keywordInput = '';
      this.keywords = [];
      this.adsData = {};
      this.combinedTableData = [];
      this.selectedKeyword = null;
      this.currentProgress = 0;
      this.totalKeywords = 0;
    },

    clearSearchResults() {
      if (Object.keys(this.adsData).length === 0) {
        this.showDialog('📭 삭제할 데이터가 없습니다.');
        return;
      }
      this.adsData = {};
      this.pcAdsData = [];
      this.mobileAdsData = [];
      this.combinedTableData = [];
      this.selectedKeyword = null;
    },

    showDialog(message) {
      Dialog.create({
        title: '알림 📢',
        message,
        ok: '확인'
      });
    }
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

/* 그리드 레이아웃: 한 줄에 6개의 키워드 버튼 표시 */
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

/* 선택된 버튼에 적용할 활성화 스타일 */
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
</style>
