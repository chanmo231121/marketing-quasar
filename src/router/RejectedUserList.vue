<template>
  <div id="app">
    <!-- 배너 아래 설명 -->
    <div class="content-below-banner">
      <h6><strong>Maglo - 거절된 유저 목록</strong></h6>
      <p>거절된 유저를 확인하고 삭제 또는 복구할 수 있습니다.</p>
    </div>

    <!-- 메인 콘텐츠 -->
    <header class="main-container">
      <!-- 프로 거절 목록 -->
      <div class="user-approval-wrapper">
        <div class="text-h6 q-mb-md">거절된 프로 유저 목록</div>

        <q-table
          :rows="users"
          :columns="columns"
          row-key="id"
          flat
          bordered
          :pagination="{ rowsPerPage: 0 }"
          hide-pagination
          class="q-mt-md"
          no-data-label="거절된 사람이 없습니다."
        >
          <template v-slot:body-cell-actions="props">
            <q-td align="center">
              <q-btn
                color="negative"
                dense
                label="삭제"
                @click="confirmDelete(props.row.id)"
              />
              <q-btn
                color="info"
                dense
                label="취소"
                class="q-ml-sm"
                @click="restoreUser(props.row.id)"
              />
            </q-td>
          </template>
        </q-table>
      </div>

      <!-- 관리자 거절 목록 (개발자만 볼 수 있음) -->
      <div v-if="userInfo.role === 'DEV'" class="user-approval-wrapper q-mt-xl">
        <div class="text-h6 q-mb-md">거절된 관리자 유저 목록</div>

        <q-table
          :rows="admins"
          :columns="columns"
          row-key="id"
          flat
          bordered
          :pagination="{ rowsPerPage: 0 }"
          hide-pagination
          class="q-mt-md"
          no-data-label="거절된 관리자가 없습니다."
        >
          <template v-slot:body-cell-actions="props">
            <q-td align="center">
              <q-btn
                color="negative"
                dense
                label="삭제"
                @click="confirmDelete(props.row.id, true)"
              />
              <q-btn
                color="info"
                dense
                label="취소"
                class="q-ml-sm"
                @click="restoreUser(props.row.id, true)"
              />
            </q-td>
          </template>
        </q-table>
      </div>
    </header>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios.ts'
import { useUserStore } from 'stores/userStore.js'
import { storeToRefs } from 'pinia'

const $q = useQuasar()
const users = ref([])
const admins = ref([])

const userStore = useUserStore()
const { userInfo } = storeToRefs(userStore)

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const columns = [
  { name: 'name', label: '🧑 이름', field: 'name', align: 'left' },
  { name: 'email', label: '✉️ 이메일', field: 'email', align: 'left' },
  { name: 'role', label: '🎯 역할', field: 'role', align: 'left' },
  { name: 'createdAt', label: '📅 가입일', field: 'createdAt', align: 'left', format: formatDate },
  { name: 'ipAddress', label: '🌐 IP 주소', field: 'ipAddress', align: 'left' }, // ✅ 추가
  { name: 'rejectReason', label: '❌ 거절 사유', field: 'rejectReason', align: 'left' },
  { name: 'actions', label: '🛠️ 처리', field: 'actions', align: 'center' }
]

const fetchRejectedUsers = async () => {
  try {
    const res = await api.get('/api/v1/admin/users/rejected')
    users.value = res.data
  } catch (err) {
    console.error('거절 유저 불러오기 실패:', err)
  }
}

const fetchRejectedAdmins = async () => {
  try {
    const res = await api.get('/api/v1/admin/admins/rejected')
    admins.value = res.data
  } catch (err) {
    console.error('거절 관리자 불러오기 실패:', err)
  }
}

const confirmDelete = (userId, isAdmin = false) => {
  $q.dialog({
    title: '삭제 확인',
    message: '정말 삭제하시겠습니까?',
    cancel: true,
    persistent: true
  }).onOk(() => deleteUser(userId, isAdmin))
}

const deleteUser = async (userId, isAdmin = false) => {
  try {
    await api.delete(`/api/v1/admin/users/${userId}`)
    if (isAdmin) {
      admins.value = admins.value.filter(u => u.id !== userId)
    } else {
      users.value = users.value.filter(u => u.id !== userId)
    }
  } catch (err) {
    console.error('삭제 실패:', err)
  }
}

const restoreUser = async (userId, isAdmin = false) => {
  try {
    const url = isAdmin
      ? `/api/v1/admin/admins/restore/${userId}`
      : `/api/v1/admin/users/restore/${userId}`

    await api.put(url)

    if (isAdmin) {
      admins.value = admins.value.filter(u => u.id !== userId)
    } else {
      users.value = users.value.filter(u => u.id !== userId)
    }

    $q.dialog({
      title: '복구 완료',
      message: '거절 취소되어 승인 대기 상태로 이동되었습니다.',
      ok: '확인'
    })
  } catch (err) {
    console.error('복구 실패:', err)
    $q.dialog({
      title: '오류',
      message: '거절 취소에 실패했습니다. 다시 시도해주세요.',
      ok: '확인'
    })
  }
}

onMounted(() => {
  fetchRejectedUsers()
  if (userInfo.value.role === 'DEV') {
    fetchRejectedAdmins()
  }
})
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

.user-approval-wrapper {
  max-width: 1000px;
  margin: 0 auto;
  text-align: left;
  padding: 10px;
}

.q-table th,
.q-table td {
  word-break: break-word;
  font-size: 13px;
}

.q-table thead th {
  font-weight: bold;
  background-color: #f0f4f8;
  font-size: 14px;
}
</style>
