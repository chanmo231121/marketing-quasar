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
            v-model="keywordInput"
            placeholder="키워드를 한 줄에 하나씩 입력하세요"
            rows="4"
          ></textarea>
          <div class="button-group">
            <button @click="processKeywords" :disabled="loading">
              {{ loading ? '불러오는 중...' : '검색' }}
            </button>
            <button class="reset-keyword-button" @click="resetAll" :disabled="loading || keywordInput === ''">
              키워드 초기화
            </button>
          </div>
        </div>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="keyword_list">
        <!-- 버튼 컨테이너 추가 -->
        <div class="button-container">
          <button @click="downloadExcel" class="excel-download-button">엑셀로 다운로드</button>
          <button class="reset-button" @click="clearSearchResults" :disabled="loading || adsData.length === 0">
            검색 초기화
          </button>
        </div>

        <div v-if="keywords.length > 0">
          <div class="keyword-excel-container">
            <div class="keyword-list">
              <button
                v-for="(keyword, index) in keywords"
                :key="index"
                @click="getNaverAdsData(keyword)"
              >
                {{ keyword }}
              </button>
            </div>
          </div>
        </div>
        <div class="table-container">
          <table>
            <thead>
            <tr>
              <th rowspan="2" class="rank-header">
                순위
              </th>
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
                <a v-if="row.mobile['Main URL']" :href="row.mobile['Main URL']"
                   target="_blank">{{ row.mobile['Main URL'] }}</a>
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
import axios from 'axios';
import * as XLSX from 'xlsx'; // xlsx 라이브러리 임포트

export default {
  data() {
    return {
      keywordInput: '', // 키워드 입력값
      keywords: [], // 처리된 키워드 목록
      adsData: [],  // 전체 광고 데이터
      pcAdsData: [], // PC 광고 데이터
      mobileAdsData: [], // 모바일 광고 데이터
      combinedTableData: [], // PC와 모바일 데이터를 합친 테이블 데이터
      loading: false, // 데이터 로딩 상태
      error: '', // 에러 메시지
    };
  },
  methods: {
    // 키워드 처리 함수
    processKeywords() {
      this.keywords = this.keywordInput
        .split('\n') // 줄바꿈으로 분리
        .map((line) => line.trim()) // 공백 제거
        .filter((line) => line.length > 0); // 빈 줄 제거
    },

    // 네이버 광고 데이터 가져오기
    async getNaverAdsData(keyword) {
      this.loading = true;
      try {
        const response = await axios.get('http://localhost:8080/api/naver-ads/search', {
          params: {
            keywords: keyword
          }
        });
        console.log(response.data); // 데이터 확인용
        this.adsData = response.data; // 받아온 광고 데이터를 저장

        // PC와 모바일 데이터 분리
        this.pcAdsData = this.adsData.filter(ad => ad.Platform === 'PC');
        this.mobileAdsData = this.adsData.filter(ad => ad.Platform === 'Mobile');

        // PC와 모바일 데이터를 하나의 테이블로 통합
        this.combineTableData();
      } catch (error) {
        console.error('데이터를 가져오는 중 오류 발생:', error);
        this.error = '데이터를 가져오는 중 오류가 발생했습니다.';
      } finally {
        this.loading = false;
      }
    },

    // PC와 모바일 데이터를 하나의 테이블로 통합하는 함수
    combineTableData() {
      const maxLength = Math.max(this.pcAdsData.length, this.mobileAdsData.length);
      this.combinedTableData = [];

      for (let i = 0; i < maxLength; i++) {
        const pcData = this.pcAdsData[i] || {};
        const mobileData = this.mobileAdsData[i] || {};
        this.combinedTableData.push({
          pc: pcData,
          mobile: mobileData,
        });
      }
    },

    // 엑셀 파일로 다운로드
    downloadExcel() {
      if (this.adsData.length === 0) {
        alert('데이터가 없습니다.');
        return;
      }

      // 현재 시간을 가져오기
      const currentDate = new Date();
      const time = currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // 엑셀 파일로 변환할 데이터를 준비
      const wsData = this.adsData.map(ad => ({
        Date: ad.Date,
        Time: time, // 다운로드 시점의 시간
        Keyword: ad.Keyword,
        Rank: ad.Rank,
        SellerName: ad.SellerName, // 판매자명 추가
        Platform: ad.Platform,
        Title: ad.Title,
        Subtitle: ad.Subtitle, // subtitle 추가
        Period: ad.Period, // period 추가
        URL: ad['Main URL'],
      }));

      // 워크북 생성
      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '광고 데이터');

      // 엑셀 파일 다운로드
      try {
        XLSX.writeFile(wb, 'naver_ads_data.xlsx');
        console.log('엑셀 파일이 다운로드되었습니다.');
      } catch (error) {
        console.error('엑셀 파일 다운로드 중 오류 발생:', error);
        alert('엑셀 파일 다운로드 중 오류가 발생했습니다.');
      }
    },

    // 초기화 함수 (키워드 초기화)
    resetAll() {
      this.keywordInput = ''; // 키워드 입력창 초기화
      this.keywords = []; // 키워드 목록 초기화
      // adsData는 초기화하지 않음 (검색 결과는 유지)
    },

    // 검색 초기화 함수 (검색 결과 초기화)
    clearSearchResults() {
      if (this.adsData.length === 0) {
        alert('삭제할 데이터가 없습니다.');
        return;
      }
      this.adsData = []; // 광고 데이터 초기화
      this.pcAdsData = []; // PC 광고 데이터 초기화
      this.mobileAdsData = []; // 모바일 광고 데이터 초기화
      this.combinedTableData = []; // 통합 테이블 데이터 초기화

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

.keyword-list button {
  background-color: #008CBA;
  color: white;
  padding: 10px;
  margin: 5px;
  border: none;
  cursor: pointer;
}

.keyword-list button:hover {
  background-color: #007B9E;
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

.url-column {
  max-width: 200px; /* 최대 너비를 설정 */
  overflow-x: auto; /* 가로 스크롤이 가능하도록 설정 */
  white-space: nowrap; /* 줄 바꿈 방지 */
}

.url-column a {
  color: #0066cc;
  text-decoration: none;
  display: block; /* URL을 블록 요소로 처리하여 스크롤이 가능하게 만듦 */
}

.url-column span {
  color: #ccc;
}

.keyword-excel-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.no-data {
  text-align: center;
  color: #ccc;
  padding: 20px;
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
