<template>
  <q-layout view="hHh lpR fFf" class="no-drawer-push">
    <!-- ✅ 관리자 사이드바 -->
    <q-drawer
      v-if="isLoggedIn && (userInfo.role === 'ADMIN' || userInfo.role === 'DEV')"
      v-model="leftDrawerOpen"
      side="left"
      bordered
      show-if-above
      behavior="overlay"
      :width="200"
      :mini="isMiniMode"
      @mouseover="isMiniMode = false"
      @mouseleave="isMiniMode = true"
      transition-show="slide-right"
      transition-hide="slide-left"
    >
      <q-list>
        <q-item-label header class="text-grey">관리자 메뉴</q-item-label>

        <!--
        <q-item clickable v-ripple to="/admin/approval">
          <q-item-section avatar><q-icon name="check_circle" /></q-item-section>
          <q-item-section v-if="!isMiniMode">승인심사</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/admin/rejected-users">
          <q-item-section avatar><q-icon name="cancel" /></q-item-section>
          <q-item-section v-if="!isMiniMode">거절목록</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/admin/user-tracking">
          <q-item-section avatar><q-icon name="manage_accounts" /></q-item-section>
          <q-item-section v-if="!isMiniMode">사원관리</q-item-section>
        </q-item>
        -->

        <!-- 테스트 메뉴만 남김 -->
        <q-item clickable v-ripple to="/admin/test">
          <q-item-section avatar><q-icon name="person" /></q-item-section>
          <q-item-section v-if="!isMiniMode">Control Tower</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <!-- ✅ 상단 헤더 -->
    <q-header elevated class="bg-primary text-white" height-hint="120">
      <q-toolbar>
        <q-btn
          flat dense round icon="menu"
          class="q-mr-sm"
          @click="toggleDrawer"
          v-if="isLoggedIn && userInfo.role === 'ADMIN'"
        />

        <!-- 🔹 왼쪽: 로고 -->
        <q-toolbar-title class="row items-center">
          <router-link to="/" class="no-decoration text-white row items-center">
            <q-avatar><img src="../assets/maglo2.png" alt="Logo" /></q-avatar>
            <!-- 클래스 추가: handwriting -->
            <span class="q-ml-sm handwriting">Maglo</span>
          </router-link>
        </q-toolbar-title>

        <!-- 🔸 오른쪽: 사용자 정보 및 기기 승인 -->
        <div class="column items-end">
          <div class="row q-gutter-xs items-center">
            <template v-if="!isLoggedIn">
              <q-btn to="/login" label="Login" flat dense class="text-white" />
              <q-btn to="/signup" label="Signup" flat dense class="text-white" />
            </template>
            <template v-else>
              <div class="text-white text-subtitle2">{{ userInfo.name }} {{ userInfo.role }}</div>
              <q-btn label="프로필" @click="goToProfile" flat dense class="text-white" />
              <q-btn label="로그아웃" @click="logout" flat dense class="text-white" />
            </template>
          </div>

          <div v-if="isLoggedIn" class="row q-gutter-xs q-mt-xs">
            <q-btn icon="vpn_key" label="기기승인요청" flat dense color="yellow" class="bg-grey-9" @click="requestDeviceApproval"  />

            <q-btn :label="`승인상태: ${userInfo.status === 'NORMAL' ? '승인완료' : '미승인'}`"
                   flat dense color="green" class="bg-grey-9" />
            <q-btn :label="`만료일: ${userInfo.approvedUntil || '없음'}`"
                   flat dense color="orange" class="bg-grey-9" />
          </div>
        </div>
      </q-toolbar>

      <q-tabs class="q-mx-auto custom-tabs" align="center" dense>
      <q-route-tab to="/single-search" class="custom-tab">
        <q-icon name="search" size="20px" class="tab-icon" /> 키워드 단일검색
      </q-route-tab>
      <q-route-tab to="/related-search" class="custom-tab">
        <q-icon name="link" size="20px" class="tab-icon" /> 키워드 연관검색
      </q-route-tab>
      <q-route-tab to="/keyword-mix" class="custom-tab">
        <q-icon name="code" size="20px" class="tab-icon" /> 키워드 조합
      </q-route-tab>
      <q-route-tab to="/ranking-search" class="custom-tab">
        <q-icon name="star" size="20px" class="tab-icon" /> 키워드 랭킹순위
      </q-route-tab>
        <!-- 공지사항 메뉴 추가 -->
        <q-route-tab to="/notices" class="custom-tab">
          <q-icon name="announcement" size="20px" class="tab-icon" /> 공지사항
        </q-route-tab>

      </q-tabs>
    </q-header>

    <!-- ✅ 배너 복구 (배너 기능 미구현으로 주석 처리) -->
    <!--
    <div v-if="!hideBanner" class="banner-container">
      <div class="banner-content"><span class="banner-text">배너 자리</span></div>
    </div>
    <div v-if="!hideBanner" class="vertical-banner-container-left">
      <div class="vertical-banner-content"><span class="vertical-banner-text">배너 왼쪽</span></div>
    </div>
    <div v-if="!hideBanner" class="vertical-banner-container-right">
      <div class="vertical-banner-content"><span class="vertical-banner-text">배너 오른쪽</span></div>
    </div>
    <div v-if="!hideBanner" class="vertical-banner-container-left-below">
      <div class="vertical-banner-content"><span class="vertical-banner-text">배너 왼쪽 아래</span></div>
    </div>
    <div v-if="!hideBanner" class="vertical-banner-container-right-below">
      <div class="vertical-banner-content"><span class="vertical-banner-text">배너 오른쪽 아래</span></div>
    </div>
    -->

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer elevated class="bg-grey-10 text-white q-pa-md text-center">
      <div class="text-subtitle2">📊 Maglo v1.0.0 - 키워드 분석 도우미</div>
      <div class="text-caption q-mt-xs">
        ⓒ 2025 Maglo. All rights reserved. |
        <router-link to="/notices" class="text-white">공지사항</router-link> |
        <a href="#" @click.prevent="showContactCard = true" class="text-white">고객센터</a>
      </div>

      <!-- 🪪 고객센터 명함 다이얼로그 -->
      <q-dialog v-model="showContactCard" persistent transition-show="fade" transition-hide="fade">
        <q-card style="min-width: 320px; max-width: 400px;">
          <q-card-section class="bg-primary text-white text-center">
            <div class="text-h6">💼 고객센터</div>
          </q-card-section>
          <q-separator />
          <q-card-section class="q-pt-md text-center">
            <q-avatar size="100px" class="q-mb-md">
              <img src="../assets/maglo2.png" alt="최진우" />
            </q-avatar>
            <div class="text-subtitle1 q-mb-xs"><strong>👤 이름:</strong> 최진우</div>
            <div class="text-body2 q-mb-xs">
              <strong>📧 메일:</strong>
              <a href="mailto:jaychoi9282@naver.com" class="text-primary">jaychoi9282@naver.com</a>
            </div>
            <div class="text-body2">
              <strong>📱 번호:</strong> 010-8465-9281
            </div>
          </q-card-section>
          <q-card-actions align="center">
            <q-btn flat label="닫기" color="primary" v-close-popup />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </q-footer>

  </q-layout>
</template>

<script>
import { useRouter } from 'vue-router'
import { useUserStore } from 'src/stores/userStore'
import { storeToRefs } from 'pinia'
import { api } from 'boot/axios.js'
import { computed, ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'

export default {
  setup() {
    const router = useRouter()
    const $q = useQuasar()
    const userStore = useUserStore()
    const { isLoggedIn, userInfo } = storeToRefs(userStore)

    // 기존 코드들...
    const leftDrawerOpen = ref(true)
    const isMiniMode = ref(true)

    const toggleDrawer = () => {
      leftDrawerOpen.value = !leftDrawerOpen.value
    }

    userStore.initialize()

    onMounted(async () => {
      if (isLoggedIn.value) {
        try {
          const res = await api.get('/api/v1/users/me', {
            headers: { Authorization: `Bearer ${userStore.accessToken}` },
            withCredentials: true
          })
          userStore.userInfo = res.data
          localStorage.setItem('userInfo', JSON.stringify(res.data))
        } catch (e) {
          console.error('유저 상태 동기화 실패:', e)
        }
      }
    })

    const goToProfile = () => {
      router.push('/profile')
    }

    const logout = async () => {
      try {
        await api.post('/api/v1/users/logout', {}, {
          headers: { Authorization: `Bearer ${userStore.accessToken}` },
          withCredentials: true
        })
        userStore.logout()
        $q.dialog({ title: '로그아웃 완료', message: '정상적으로 로그아웃 되었습니다.', ok: '확인' })
          .onOk(() => router.push('/'))
      } catch (err) {
        console.error('로그아웃 실패:', err)
        $q.dialog({ title: '로그아웃 실패', message: '문제가 발생했습니다.', ok: '확인' })
      }
    }

    const hideBanner = computed(() =>
      ['/login', '/signup', '/admin/approval', '/admin/rejected-users', '/admin/user-tracking'].includes(router.currentRoute.value.path)
    )

    // 기기승인요청 함수
    const requestDeviceApproval = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        $q.dialog({
          title: '🔐 로그인 필요',
          message: '로그인 후 기기 승인 요청이 가능합니다.',
          ok: '확인'
        })
        return
      }

      const userId = userInfo.value.id
      const deviceKey = `deviceId_${userId}`
      let localUuid = localStorage.getItem(deviceKey)

      if (!localUuid) {
        localUuid = Math.random().toString(36).substring(2, 10)
        localStorage.setItem(deviceKey, localUuid)
      }

      // 중복 요청 방지
      if (userInfo.value.status === 'PENDING_APPROVAL') {
        $q.dialog({
          title: '승인 대기 중',
          message: '이미 승인 요청을 보낸 상태입니다.',
          ok: '확인'
        })
        return
      }

      if (userInfo.value.deviceId === localUuid && userInfo.value.status === 'NORMAL') {
        $q.dialog({
          title: '기기 이미 승인됨',
          message: '이 기기는 이미 승인된 기기입니다.',
          ok: '확인'
        })
        return
      }

      try {
        const res = await api.post('/api/v1/users/device-approval/request', { deviceId: localUuid }, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        })

        $q.dialog({
          title: '승인 요청 완료',
          message: res.data.message,
          ok: '확인'
        })

        userStore.userInfo.status = 'PENDING_APPROVAL'
        userStore.userInfo.deviceId = localUuid
        userStore.userInfo.approvedUntil = null
        localStorage.setItem('userInfo', JSON.stringify(userStore.userInfo))
      } catch (err) {
        console.error('기기승인요청 오류:', err)
        $q.dialog({
          title: '요청 실패',
          message: '기기 승인 요청 중 문제가 발생했습니다.',
          ok: '확인'
        })
      }
    }
    const showContactCard = ref(false) // ① 다이얼로그 상태


    return {
      isLoggedIn,
      userInfo,
      logout,
      goToProfile,
      hideBanner,
      leftDrawerOpen,
      toggleDrawer,
      isMiniMode,
      requestDeviceApproval,
      showContactCard
    }
  }
}
</script>

<style scoped>
.no-drawer-push .q-page-container {
  padding-left: 0 !important;
}

/* 배너 관련 스타일 - 나중에 배너 기능 적용 시 활용할 수 있도록 주석 처리 */
/*
.banner-container {
  position: absolute;
  top: 180px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 1000px;
  background-color: #f0f0f0;
  height: 100px;
  border-radius: 8px;
  z-index: 1000;
}
.banner-content, .vertical-banner-content {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
.banner-text, .vertical-banner-text {
  font-size: 18px;
  font-weight: bold;
  color: #666;
}
.vertical-banner-container-left,
.vertical-banner-container-left-below,
.vertical-banner-container-right,
.vertical-banner-container-right-below {
  position: absolute;
  width: 150px;
  height: 700px;
  background-color: #f0f0f0;
  z-index: 1000;
}
.vertical-banner-container-left {
  top: 180px;
  left: calc(50% - 680px);
}
.vertical-banner-container-left-below {
  top: 900px;
  left: calc(50% - 680px);
}
.vertical-banner-container-right {
  top: 180px;
  right: calc(50% - 680px);
}
.vertical-banner-container-right-below {
  top: 900px;
  right: calc(50% - 680px);
}
*/

/* Maglo 필기체 적용 */
.handwriting {
  font-family: 'Pacifico', cursive;
}


</style>
