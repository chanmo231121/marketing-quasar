<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white" height-hint="120"> <!-- 툴바 높이 증가 -->
      <q-toolbar>
        <q-btn dense flat round icon="menu" @click="toggleLeftDrawer" />
        <q-toolbar-title class="q-mx-auto">
          <router-link to="/" class="row items-center no-decoration text-white">
            <q-avatar>
              <img src="../assets/maglo.png" alt="Logo" />
            </q-avatar>
            <span class="q-ml-sm">Maglo</span>
          </router-link>
        </q-toolbar-title>
      </q-toolbar>

      <!-- q-tabs 영역 -->
      <q-tabs class="q-mx-auto" align="center" dense>
        <q-route-tab to="/page1" label="키워드 단일검색" />
        <q-route-tab to="/page2" label="키워드 연관검색" />
        <q-route-tab to="/page3" label="키워드 조합" />
        <q-route-tab to="/page4" label="키워드 랭킹순위" />
      </q-tabs>
    </q-header>

    <!-- 첫 번째 배너 -->
    <div class="banner-container">
      <div class="banner-content">
        <span class="banner-text">배너 자리</span>
      </div>
    </div>

    <!-- 두 번째 세로 배너 (좌측과 우측 배너) -->
    <div class="vertical-banner-container-left">
      <div class="vertical-banner-content">
        <span class="vertical-banner-text">배너 왼쪽</span>
      </div>
    </div>

    <div class="vertical-banner-container-right">
      <div class="vertical-banner-content">
        <span class="vertical-banner-text">배너 오른쪽</span>
      </div>
    </div>

    <!-- 추가된 세로 배너 (좌측과 우측 배너) -->
    <div class="vertical-banner-container-left-below">
      <div class="vertical-banner-content">
        <span class="vertical-banner-text">배너 왼쪽 아래</span>
      </div>
    </div>

    <div class="vertical-banner-container-right-below">
      <div class="vertical-banner-content">
        <span class="vertical-banner-text">배너 오른쪽 아래</span>
      </div>
    </div>

    <!-- 배너 바로 아래에 글씨를 추가 -->


    <q-drawer v-model="leftDrawerOpen" side="left" bordered persistent></q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer elevated class="bg-grey-8 text-white">
      <q-toolbar>
        <q-toolbar-title class="q-mx-auto">
          <router-link to="/" class="row items-center no-decoration text-white">
            <q-avatar>
              <img src="../assets/maglo.png" alt="Logo" />
            </q-avatar>
            <span class="q-ml-sm">Maglo</span>
          </router-link>
        </q-toolbar-title>
      </q-toolbar>
    </q-footer>
  </q-layout>
</template>

<script>
import { ref } from 'vue';

export default {
  setup() {
    const leftDrawerOpen = ref(false);
    const toggleLeftDrawer = () => {
      leftDrawerOpen.value = !leftDrawerOpen.value; // leftDrawerOpen을 사용해야 합니다.
    };

    return {
      leftDrawerOpen,
      toggleLeftDrawer,
    };
  },
};
</script>

<style scoped>
/* 배너를 화면 상단에 고정시켜 위치 변경 없이 항상 보이도록 설정 */
.banner-container {
  position: absolute; /* 스크롤과 함께 움직이도록 절대 위치로 변경 */
  top: 180px; /* q-header 높이만큼 아래로 배너를 배치 */
  left: 50%;
  transform: translateX(-50%); /* 배너를 화면 중앙에 정렬 */
  width: 100%;
  max-width: 1000px; /* 배너의 최대 크기 설정 */
  background-color: #f0f0f0;
  height: 100px; /* 배너 크기 고정 */
  border-radius: 8px;
  z-index: 1000; /* 다른 콘텐츠보다 위에 표시되도록 설정 */
}

.banner-content {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%; /* 배너 크기와 맞추기 */
}

.banner-text {
  font-size: 18px;
  font-weight: bold;
  color: #666;
}

/* 세로 배너 (좌측) */
.vertical-banner-container-left {
  position: absolute; /* 스크롤과 함께 움직이도록 절대 위치로 변경 */
  top: 180px; /* 배너 높이 아래로 배치 */
  left: calc(50% - 680px); /* 화면의 중앙에서 450px 왼쪽으로 위치 */
  width: 150px;
  height: 700px; /* 고정된 높이로 설정 */
  background-color: #f0f0f0;
  z-index: 1000; /* 다른 콘텐츠보다 위에 표시되도록 설정 */
}

.vertical-banner-container-left-below {
  position: absolute; /* 스크롤과 함께 움직이도록 절대 위치로 변경 */
  top: 900px; /* 기존 배너 아래로 배치 */
  left: calc(50% - 680px); /* 화면의 중앙에서 450px 왼쪽으로 위치 */
  width: 150px;
  height: 700px; /* 고정된 높이로 설정 */
  background-color: #f0f0f0;
  z-index: 1000; /* 다른 콘텐츠보다 위에 표시되도록 설정 */
}

.vertical-banner-container-right {
  position: absolute; /* 스크롤과 함께 움직이도록 절대 위치로 변경 */
  top: 180px; /* 배너 높이 아래로 배치 */
  right: calc(50% - 680px); /* 화면의 중앙에서 450px 오른쪽으로 위치 */
  width: 150px;
  height: 700px; /* 고정된 높이로 설정 */
  background-color: #f0f0f0;
  z-index: 1000; /* 다른 콘텐츠보다 위에 표시되도록 설정 */
}

.vertical-banner-container-right-below {
  position: absolute; /* 스크롤과 함께 움직이도록 절대 위치로 변경 */
  top: 900px; /* 기존 배너 아래로 배치 */
  right: calc(50% - 680px); /* 화면의 중앙에서 450px 오른쪽으로 위치 */
  width: 150px;
  height: 700px; /* 고정된 높이로 설정 */
  background-color: #f0f0f0;
  z-index: 1000; /* 다른 콘텐츠보다 위에 표시되도록 설정 */
}

.vertical-banner-content {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.vertical-banner-text {
  writing-mode: vertical-rl; /* 세로 텍스트 */
  font-size: 18px;
  font-weight: bold;
  color: #666;
}

/* 배너 바로 아래에서 글씨를 시작하도록 설정 */


.content-below-banner h2 {
  font-size: 24px;
  font-weight: bold;
  margin: 0;
}

.content-below-banner p {
  font-size: 16px;
  margin: 5px 0;
}
</style>
