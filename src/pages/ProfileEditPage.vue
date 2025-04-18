<template>
  <q-page class="q-pa-md flex flex-center" style="margin-top: 40px;">
    <q-card class="q-pa-lg shadow-2" style="min-width: 300px; max-width: 500px;">
      <q-card-section>
        <div class="text-h6 text-center">프로필 수정</div>
      </q-card-section>

      <q-card-section class="q-gutter-sm">
        <q-input v-model="form.name" label="이름" dense />
        <q-input v-model="form.introduction" label="회사(소속)" dense />
        <q-input v-model="form.tlno" label="전화번호" dense />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn label="수정하기" color="primary" @click="submitUpdate" />
      </q-card-actions>
    </q-card>

    <!-- ✅ 성공 메시지 -->
    <q-dialog v-model="successDialog">
      <q-card>
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">수정 완료</div>
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

    <!-- ❌ 에러 메시지 -->
    <q-dialog v-model="errorDialog">
      <q-card>
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">수정 실패</div>
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from 'boot/axios.js'
import { useUserStore } from 'src/stores/userStore'

const router = useRouter()
const userStore = useUserStore()

const form = ref({
  name: '',
  introduction: '',
  tlno: ''
})

// ✅ 알림 상태
const successDialog = ref(false)
const successMessage = ref('')
const errorDialog = ref(false)
const errorMessages = ref([])

const fetchProfile = async () => {
  try {
    const res = await api.get('/api/v1/users/profile', {
      headers: {
        Authorization: `Bearer ${userStore.accessToken}`
      }
    })
    form.value = {
      name: res.data.name,
      introduction: res.data.introduction,
      tlno: res.data.tlno
    }
  } catch (err) {
    console.error('프로필 불러오기 실패', err)
    errorMessages.value = ['프로필 정보를 불러올 수 없습니다.']
    errorDialog.value = true
  }
}

onMounted(() => {
  fetchProfile()
})

const submitUpdate = async () => {
  try {
    await api.put('/api/v1/users/profile', form.value, {
      headers: {
        Authorization: `Bearer ${userStore.accessToken}`
      }
    })
    userStore.userInfo.name = form.value.name
    userStore.userInfo.introduction = form.value.introduction
    userStore.userInfo.tlno = form.value.tlno
    localStorage.setItem('userInfo', JSON.stringify(userStore.userInfo))
    successMessage.value = '프로필이 성공적으로 수정되었습니다.'
    successDialog.value = true
  } catch (err) {
    console.error('프로필 수정 실패:', err)
    const data = err.response?.data
    if (data?.errors) {
      errorMessages.value = data.errors
    } else if (data?.message) {
      errorMessages.value = [data.message]
    } else {
      errorMessages.value = ['프로필 수정에 실패했습니다.']
    }
    errorDialog.value = true
  }
}

function goHome() {
  successDialog.value = false
  router.push('/')
}
</script>
