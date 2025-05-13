<template>
  <q-page class="q-pa-md flex items-start justify-center" style="padding-top: 250px;">
    <q-card class="q-pa-lg shadow-2" style="min-width: 300px; max-width: 500px;">
      <q-card-section>
        <div class="text-h6 text-center">회원가입</div>
      </q-card-section>

      <q-card-section class="q-gutter-sm">
        <q-input v-model="form.name" label="이름" dense />
        <q-input v-model="form.email" label="이메일" type="email" dense />
        <q-input v-model="form.password" label="비밀번호" type="password" dense />
        <q-input v-model="form.confirmpassword" label="비밀번호 확인" type="password" dense />
        <q-input v-model="form.introduction" label="회사(소속)" dense />
        <q-input v-model="form.tlno" label="전화번호" dense />
        <!-- 역할(role) 입력란 제거 -->
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          label="가입하기"
          color="primary"
          :loading="isSubmitting"
          @click="submitForm"
        />
      </q-card-actions>
    </q-card>

    <!-- ✅ 성공 다이얼로그 -->
    <q-dialog v-model="successDialog">
      <q-card>
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">회원가입 완료</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup @click="goLogin" />
        </q-card-section>
        <q-card-section>
          <div class="text-positive">{{ successMessage }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="확인" color="primary" @click="goLogin" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ❌ 실패 다이얼로그 -->
    <q-dialog v-model="errorDialog">
      <q-card>
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">회원가입 실패</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <div class="text-negative" v-for="(msg, idx) in errorMessages" :key="idx">
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from 'boot/axios.js'

const router = useRouter()

const form = ref({
  name: '',
  email: '',
  password: '',
  confirmpassword: '',
  introduction: '',
  tlno: '',
  // role 필드 제거: 사용자가 직접 입력할 수 없도록 함
})

const ip = ref('') // 사용자 IP 저장용

// 페이지 진입 시 사용자 IP 조회
onMounted(async () => {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const data = await res.json()
    ip.value = data.ip
    console.log('사용자 IP:', ip.value)
  } catch (e) {
    console.error('IP 조회 실패:', e)
  }
})

const isSubmitting = ref(false)
const successDialog = ref(false)
const successMessage = ref('')
const errorDialog = ref(false)
const errorMessages = ref([])

async function submitForm() {
  isSubmitting.value = true
  errorMessages.value = []

  const payload = {
    ...form.value,
    ipAddress: ip.value,
  }

  console.log('📦 전송 데이터:', payload)

  try {
    const res = await api.post('/api/v1/users/signup', payload, {
      headers: { 'Content-Type': 'application/json' },
    })

    const deviceId = res.data.deviceId
    if (deviceId) {
      localStorage.setItem('deviceId', deviceId)
      console.log('🎯 저장된 deviceId:', deviceId)
    }

    successMessage.value = '회원가입이 성공적으로 완료되었습니다!'
    successDialog.value = true
  } catch (err) {
    const data = err.response?.data
    console.error('🔥 회원가입 실패 응답:', data)

    if (data?.errors) {
      errorMessages.value = data.errors
    } else if (data?.message || data?.error) {
      errorMessages.value = [data.message || data.error]
    } else {
      errorMessages.value = ['회원가입에 실패했습니다.']
    }

    errorDialog.value = true
  } finally {
    isSubmitting.value = false
  }
}

function goLogin() {
  successDialog.value = false
  router.push('/login')
}
</script>
