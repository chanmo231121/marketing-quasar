<template>
  <q-layout view="hHh lpR fFf">
    <!-- 모바일 상단 헤더 -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title class="row items-center">
          <q-avatar><img src="../assets/maglo2.png" alt="Maglo" /></q-avatar>
          <span class="q-ml-sm">Maglo</span>
        </q-toolbar-title>

        <!-- 로그인 상태에 따라 버튼 변경 -->
        <div class="row items-center q-gutter-sm">
          <template v-if="isLoggedIn">
            <q-btn flat dense round icon="logout" @click="logout" />
          </template>
          <template v-else>
            <q-btn flat dense label="로그인" @click="goToLogin" />
            <q-btn flat dense label="회원가입" @click="goToSignup" />
          </template>
        </div>
      </q-toolbar>
    </q-header>

    <!-- 하단 탭 메뉴 -->
    <q-footer elevated class="bg-white text-primary">
      <q-tabs v-model="tab" dense align="justify" class="text-primary">
        <q-route-tab icon="search" to="/m/page1"   label="단일검색" />
        <q-route-tab icon="link"   to="/m/page2"   label="연관검색" />
        <q-route-tab icon="code"   to="/m/page3"   label="조합기"   />
        <q-route-tab icon="star"   to="/m/page4"   label="랭킹"     />
        <q-route-tab icon="announcement" to="/m/notices" label="공지" />
      </q-tabs>
    </q-footer>

    <!-- 페이지 컨텐츠 -->
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useUserStore } from 'src/stores/userStore'
import { storeToRefs } from 'pinia'
import { api } from 'boot/axios.js'

export default {
  setup() {
    const router = useRouter()
    const $q = useQuasar()
    const userStore = useUserStore()
    const { isLoggedIn } = storeToRefs(userStore)

    const tab = ref('')

    const logout = async () => {
      try {
        await api.post('/api/v1/users/logout', {}, {
          headers: { Authorization: `Bearer ${userStore.accessToken}` },
          withCredentials: true
        })
        userStore.logout()
        $q.dialog({ title: '로그아웃 완료', message: '정상적으로 로그아웃 되었습니다.' })
          .onOk(() => router.push('/m/login'))
      } catch (err) {
        console.error('로그아웃 실패:', err)
        $q.dialog({ title: '로그아웃 실패', message: '문제가 발생했습니다.' })
      }
    }

    const goToLogin = () => {
      router.push('/m/login')
    }
    const goToSignup = () => {
      router.push('/m/signup')
    }

    onMounted(() => {
      tab.value = router.currentRoute.value.path.replace(/^\/m/, '')
    })

    return {
      tab,
      logout,
      isLoggedIn,
      goToLogin,
      goToSignup
    }
  }
}
</script>

<style scoped>
.q-toolbar-title span {
  font-family: 'Pacifico', cursive;
  font-size: 18px;
  font-weight: bold;
}
</style>
