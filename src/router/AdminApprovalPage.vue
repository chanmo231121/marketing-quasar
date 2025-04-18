<template>
  <div id="app">
    <div class="content-below-banner">
      <h6><strong>Maglo - 프로 유저 승인 심사</strong></h6>
      <p>프로 유저의 가입 요청 또는 재승인 요청을 승인할 수 있습니다.</p>
    </div>

    <header class="main-container">
      <!-- 프로 유저 승인 대기 목록 -->
      <div class="user-approval-wrapper">
        <div class="text-h6 q-mb-md">승인 대기 중인 프로 유저 목록</div>
        <q-table
          :rows="users"
          :columns="columns"
          row-key="id"
          flat bordered
          hide-pagination
          class="q-mt-md"
          no-data-label="가입 승인 대기 중인 유저가 없습니다."
        >
          <template v-slot:body-cell-role="props">
            <q-td :props="props">
              <q-select v-model="props.row.role" :options="approvalRoleOptions" dense emit-value />
            </q-td>
          </template>
          <template v-slot:body-cell-actions="props">
            <q-td align="center">
              <q-btn color="primary" dense label="승인" class="q-mr-sm" @click="approveUser(props.row.id)" />
              <q-btn color="negative" dense label="거절" @click="rejectUser(props.row.id)" />
            </q-td>
          </template>
        </q-table>
      </div>

      <!-- 프로 유저 재승인 대기 목록 -->
      <div class="user-approval-wrapper q-mt-xl">
        <div class="text-h6 q-mb-md">재승인 대기 중인 프로 유저 목록</div>
        <q-table
          :rows="reapprovalUsers"
          :columns="columns"
          row-key="id"
          flat bordered
          hide-pagination
          class="q-mt-md"
          no-data-label="재승인 대기 중인 유저가 없습니다."
        >
          <template v-slot:body-cell-role="props">
            <q-td :props="props">
              <q-select v-model="props.row.role" :options="approvalRoleOptions" dense emit-value />
            </q-td>
          </template>
          <template v-slot:body-cell-actions="props">
            <q-td align="center">
              <q-btn color="primary" dense label="승인" class="q-mr-sm" @click="approveUser(props.row.id)" />
              <q-btn color="negative" dense label="거절" @click="rejectUser(props.row.id)" />
            </q-td>
          </template>
        </q-table>
      </div>

      <!-- 관리자 승인 및 재승인 목록 -->
      <template v-if="userInfo.role === 'DEV'">
        <div class="user-approval-wrapper q-mt-xl">
          <div class="text-h6 q-mb-md">승인 대기 중인 관리자 유저 목록</div>
          <q-table
            :rows="admins"
            :columns="columns"
            row-key="id"
            flat bordered
            hide-pagination
            class="q-mt-md"
            no-data-label="승인 대기 중인 관리자 유저가 없습니다."
          >
            <template v-slot:body-cell-role="props">
              <q-td :props="props">
                <q-select v-model="props.row.role" :options="adminApprovalRoleOptions" dense emit-value />
              </q-td>
            </template>
            <template v-slot:body-cell-actions="props">
              <q-td align="center">
                <q-btn color="primary" dense label="승인" class="q-mr-sm" @click="approveAdmin(props.row.id)" />
                <q-btn color="negative" dense label="거절" @click="rejectAdmin(props.row.id)" />
              </q-td>
            </template>
          </q-table>
        </div>

        <div class="user-approval-wrapper q-mt-xl">
          <div class="text-h6 q-mb-md">재승인 대기 중인 관리자 유저 목록</div>
          <q-table
            :rows="adminReapprovalUsers"
            :columns="columns"
            row-key="id"
            flat bordered
            hide-pagination
            class="q-mt-md"
            no-data-label="재승인 대기 중인 관리자 유저가 없습니다."
          >
            <template v-slot:body-cell-role="props">
              <q-td :props="props">
                <q-select v-model="props.row.role" :options="adminApprovalRoleOptions" dense emit-value />
              </q-td>
            </template>
            <template v-slot:body-cell-actions="props">
              <q-td align="center">
                <q-btn color="primary" dense label="승인" class="q-mr-sm" @click="approveAdmin(props.row.id)" />
                <q-btn color="negative" dense label="거절" @click="rejectAdmin(props.row.id)" />
              </q-td>
            </template>
          </q-table>
        </div>
      </template>
    </header>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios.js'
import { useUserStore } from 'stores/userStore.js'
import { storeToRefs } from 'pinia'

const $q = useQuasar()
const userStore = useUserStore()
const { userInfo } = storeToRefs(userStore)

const users = ref([])
const reapprovalUsers = ref([])
const admins = ref([])
const adminReapprovalUsers = ref([])

const approvalRoleOptions = [
  { label: 'PRO', value: 'PRO' },
  { label: 'ADMIN', value: 'ADMIN' }
]

const adminApprovalRoleOptions = [
  { label: 'PRO', value: 'PRO' },
  { label: 'ADMIN', value: 'ADMIN' },
  { label: 'DEV', value: 'DEV' },

]

const columns = [
  { name: 'name', label: '🧑 이름', field: 'name', align: 'left' },
  { name: 'email', label: '✉️ 이메일', field: 'email', align: 'left' },
  { name: 'introduction', label: '🏢 회사 (소속)', field: 'introduction', align: 'left' },
  { name: 'role', label: '🎯 역할', field: 'role', align: 'left' },
  { name: 'createdAt', label: '📅 가입일', field: 'createdAt', align: 'left' },
  { name: 'ipAddress', label: '🌐 IP 주소', field: 'ipAddress', align: 'left' },
  { name: 'actions', label: '⚙️ 승인/거절', field: 'actions', align: 'center' }
]

const fetchPendingUsers = async () => {
  const res = await api.get('/api/v1/admin/users/pending-pros')
  users.value = res.data
}

const fetchReapprovalPendingUsers = async () => {
  const res = await api.get('/api/v1/admin/users/reapproval-pending-pros')
  reapprovalUsers.value = res.data
}

const fetchPendingAdmins = async () => {
  const res = await api.get('/api/v1/admin/admins/pending')
  admins.value = res.data
}

const fetchReapprovalPendingAdmins = async () => {
  const res = await api.get('/api/v1/admin/admins/reapproval-pending')
  adminReapprovalUsers.value = res.data
}

const approveUser = async (userId) => {
  const user = [...users.value, ...reapprovalUsers.value].find(u => u.id === userId)
  await api.put(`/api/v1/admin/users/approve/${userId}`, { role: user.role })
  users.value = users.value.filter(u => u.id !== userId)
  reapprovalUsers.value = reapprovalUsers.value.filter(u => u.id !== userId)
  $q.dialog({ title: '✅ 승인 완료', message: '유저가 승인되었습니다.' })
}

const rejectUser = (userId) => {
  $q.dialog({
    title: '거절 사유 입력',
    message: '이 사용자를 왜 거절하시나요?',
    prompt: { model: '', type: 'text', isValid: val => val.length > 0 },
    cancel: true
  }).onOk(async (reason) => {
    await api.put(`/api/v1/admin/users/reject/${userId}`, { reason })
    users.value = users.value.filter(u => u.id !== userId)
    reapprovalUsers.value = reapprovalUsers.value.filter(u => u.id !== userId)
    $q.dialog({ title: '❌ 거절 완료', message: '유저가 거절되었습니다.' })
  })
}

const approveAdmin = async (userId) => {
  const user = [...admins.value, ...adminReapprovalUsers.value].find(u => u.id === userId)
  await api.put(`/api/v1/admin/admins/approve/${userId}`, { role: user.role })
  admins.value = admins.value.filter(u => u.id !== userId)
  adminReapprovalUsers.value = adminReapprovalUsers.value.filter(u => u.id !== userId)
  $q.dialog({ title: '✅ 승인 완료', message: '관리자가 승인되었습니다.' })
}

const rejectAdmin = (userId) => {
  $q.dialog({
    title: '거절 사유 입력',
    message: '이 관리자를 왜 거절하시나요?',
    prompt: { model: '', type: 'text', isValid: val => val.length > 0 },
    cancel: true
  }).onOk(async (reason) => {
    await api.put(`/api/v1/admin/admins/reject/${userId}`, { reason })
    admins.value = admins.value.filter(u => u.id !== userId)
    adminReapprovalUsers.value = adminReapprovalUsers.value.filter(u => u.id !== userId)
    $q.dialog({ title: '❌ 거절 완료', message: '관리자가 거절되었습니다.' })
  })
}

onMounted(() => {
  fetchPendingUsers()
  fetchReapprovalPendingUsers()
  if (userInfo.value.role === 'DEV') {
    fetchPendingAdmins()
    fetchReapprovalPendingAdmins()
  }
})
</script>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
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
