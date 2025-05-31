<template>
  <div id="app">
    <div class="content-below-banner">
      <div v-if="isEditing">
        <input v-model="bannerTitle" class="banner-input" placeholder="배너 제목" />
        <textarea
          v-model="bannerContent"
          class="banner-textarea"
          rows="4"
          placeholder="배너 내용을 입력하세요 (줄바꿈 가능)"
        ></textarea>
        <div class="edit-actions">
          <button class="save-btn" @click="saveBanner">저장</button>
          <button class="cancel-btn" @click="cancelEdit">취소</button>
        </div>
      </div>
      <div v-else>
        <h6><strong>{{ bannerTitle }}</strong></h6>
        <p class="banner-paragraph">
          {{ bannerContent }}
          <q-btn
            v-if="userInfo?.role === 'DEV'"
            icon="edit"
            flat
            round
            dense
            color="primary"
            @click="startEdit"
            class="inline-edit-btn"
          />
        </p>
      </div>
    </div>

    <header class="main-container">
      <div class="input-container">
        <q-btn color="primary" label="코드 검색" @click="showCode = true" class="q-mb-md" />

        <q-banner
          v-if="showCode"
          class="bg-grey-2 text-dark q-pa-md q-mb-lg"
        >

          <div><strong>🔐 코드:</strong> <span class="text-primary text-weight-bold">{{ code }}</span></div>
        </q-banner>
      </div>
    </header>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from 'boot/axios'
import { useQuasar } from 'quasar'
import { useUserStore } from 'stores/userStore'
import { storeToRefs } from 'pinia'

const $q = useQuasar()
const code = ref('')
const week = ref('')
const date = ref('')
const showCode = ref(false)

const bannerTitle = ref('Maglo - 인증 코드 확인 페이지')
const bannerContent = ref('이 페이지에서 주별 바뀌어진 인증 코드를 확인할 수 있습니다.')
const isEditing = ref(false)

const userStore = useUserStore()
const { userInfo } = storeToRefs(userStore)

const fetchBanner = async () => {
  try {
    const res = await api.get('/api/v1/banner', { params: { page: 'auth-code' } })
    bannerTitle.value = res.data.title || bannerTitle.value
    bannerContent.value = res.data.description1 || bannerContent.value
  } catch (err) {
    console.error(err)
  }
}

const saveBanner = async () => {
  try {
    await api.put('/api/v1/banner/update', {
      title: bannerTitle.value,
      description1: bannerContent.value,
      description2: '',
    }, {
      params: { page: 'auth-code' },
    })
    isEditing.value = false
    $q.dialog({
      title: '알림 📢',
      message: '✅ 배너가 저장되었습니다.'
    })
  } catch (err) {
    $q.dialog({
      title: '알림 📢',
      message: '❌ 배너 저장 실패'
    })
    console.error(err)
  }
}

const startEdit = () => {
  isEditing.value = true
}
const cancelEdit = () => {
  isEditing.value = false;
  fetchBanner()
}

onMounted(async () => {
  fetchBanner()
  try {
    const res = await api.get('/api/code')
    code.value = res.data.code
    week.value = res.data.week
    date.value = res.data.date
  } catch (err) {
    console.error('인증 코드 불러오기 실패', err)
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nanum+Gothic&display=swap');

#app {
  font-family: 'Nanum Gothic', sans-serif;
  text-align: center;
  color: #2c3e50;
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

.banner-paragraph {
  white-space: pre-wrap;
}

.banner-input, .banner-textarea {
  width: 100%;
  font-size: 1em;
  margin-bottom: 6px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.edit-actions {
  margin-top: 6px;
}

.edit-btn, .save-btn, .cancel-btn {
  margin-right: 6px;
  padding: 6px 12px;
  font-size: 14px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}

.edit-btn {
  background: #1976D2;
  color: white;
}

.save-btn {
  background: #4CAF50;
  color: white;
}

.cancel-btn {
  background: #ccc;
  color: #333;
}

.main-container {
  width: 69.6%;
  margin: 250px auto 200px auto;
  text-align: center;
  position: relative;
  padding-bottom: 120px;
}

.input-container {
  margin: 140px 0;
  width: 100%;
  max-width: 1000px;
  margin-left: auto;
  margin-right: auto;
  margin-top: -20px;
}

.inline-edit-btn {
  display: inline-block;
  vertical-align: middle;
  margin-left: 6px;
}
</style>
