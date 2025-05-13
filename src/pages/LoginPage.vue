<template>
  <q-page class="q-pa-md flex items-start justify-center" style="padding-top: 250px;">
    <q-card class="q-pa-lg shadow-2" style="min-width: 300px; max-width: 400px;">
      <q-card-section>
        <div class="text-h6 text-center">로그인</div>
      </q-card-section>

      <q-card-section class="q-gutter-sm">
        <q-input v-model="form.email" label="이메일" type="email" dense />
        <q-input v-model="form.password" label="비밀번호" type="password" dense />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          label="로그인"
          color="primary"
          :loading="isLoggingIn"
          :disable="isLoggingIn"
          @click="login"
        />
      </q-card-actions>
    </q-card>

    <!-- ✅ 성공 메시지 팝업 -->
    <q-dialog v-model="successDialog">
      <q-card>
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">로그인 성공</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup @click="goHome" />
        </q-card-section>
        <q-card-section>
          <div class="text-positive">{{ successMessage }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="확인" color="primary" @click="goHome" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ❌ 실패 메시지 팝업 -->
    <q-dialog v-model="errorDialog">
      <q-card>
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">로그인 실패</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <div v-for="(msg, idx) in errorMessages" :key="idx" class="text-negative">
            {{ msg }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="닫기" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from 'boot/axios.js'
import { useUserStore } from 'src/stores/userStore'

const router = useRouter()
const userStore = useUserStore()

const form = ref({
  email: '',
  password: '',
})

const isLoggingIn = ref(false)
const errorDialog = ref(false)
const errorMessages = ref([])
const successDialog = ref(false)
const successMessage = ref('')

async function login() {
  if (isLoggingIn.value) return

  isLoggingIn.value = true
  errorMessages.value = []

  try {
    const response = await api.post('/api/v1/users/login', {
      email: form.value.email,
      password: form.value.password,
    }, {
      withCredentials: true
    })

    const userData = response.data
    const accessToken = response.headers['authorization']?.replace('Bearer ', '')

    // 승인 대기 중인 경우


    if (accessToken) {
      // userStore에 로그인 정보 설정 (userInfo에 모든 데이터 포함)
      userStore.login(accessToken, {
        id: userData.id,  // id 추가
        name: userData.name,
        email: userData.email,
        role: userData.role,
        status: userData.status,
        approvedUntil: userData.approvedUntil,  // 승인 만료일 추가
        deviceId: userData.deviceId,
        canUseSingleSearch: userData.canUseSingleSearch,
        canUseRankingSearch: userData.canUseRankingSearch,
        canUseKeywordMix: userData.canUseKeywordMix,
        canUseRelatedSearch: userData.canUseRelatedSearch
      })

      successMessage.value = `${userData.name} ${userData.role}님 환영합니다!`
      successDialog.value = true
    } else {
      errorMessages.value = ['토큰이 전달되지 않았습니다.']
      errorDialog.value = true
    }
  } catch (err) {
    console.error('로그인 실패:', err)
    const data = err.response?.data

    // 에러 메시지 처리 (서버에서 여러 형태의 에러를 받을 수 있으므로 다양하게 처리)
    if (data?.errors && Array.isArray(data.errors)) {
      errorMessages.value = data.errors
    } else if (typeof data === 'string') {
      errorMessages.value = [data]
    } else if (data?.message || data?.error) {
      errorMessages.value = [data.message || data.error]
    } else {
      errorMessages.value = ['로그인에 실패했습니다.']
    }

    errorDialog.value = true
  } finally {
    isLoggingIn.value = false
  }
}

function goHome() {
  successDialog.value = false
  router.push('/')
}
</script>
