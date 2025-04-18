<template>
  <div id="app">
    <div class="content-below-banner">
      <h6><strong>Maglo - 승인된 유저 목록</strong></h6>
      <p>현재 서비스 사용이 승인된 유저 목록입니다.</p>
    </div>

    <header class="main-container">
      <div class="user-approval-wrapper">
        <template v-if="userInfo.role === 'DEV'">
          <!-- 관리자 유저 목록 (만료 버튼 포함) -->
          <div class="text-h6 q-mb-md">관리자 유저 목록</div>
          <q-table
            :rows="adminUsers"
            :columns="columns"
            row-key="id"
            flat
            bordered
            :pagination="{ rowsPerPage: 0 }"
            hide-pagination
            class="q-mt-md q-mb-xl"
            no-data-label="관리자 유저가 없습니다."
            @row-click="onRowClick"
          >
            <template v-slot:body-cell-actions="props">
              <q-td :props="props">
                <q-btn
                  unelevated
                  color="negative"
                  label="만료"
                  class="q-px-md q-py-xs"
                  @click.stop="expireUser(props.row)"
                />
              </q-td>
            </template>
          </q-table>

          <!-- 프로 유저 목록 (만료 버튼 포함) -->
          <div class="text-h6 q-mb-md">프로 유저 목록</div>
          <q-table
            :rows="proUsers"
            :columns="columns"
            row-key="id"
            flat
            bordered
            :pagination="{ rowsPerPage: 0 }"
            hide-pagination
            class="q-mt-md"
            no-data-label="프로 유저가 없습니다."
            @row-click="onRowClick"
          >
            <template v-slot:body-cell-actions="props">
              <q-td :props="props">
                <q-btn
                  unelevated
                  color="negative"
                  label="만료"
                  class="q-px-md q-py-xs"
                  @click.stop="expireUser(props.row)"
                />
              </q-td>
            </template>
          </q-table>
        </template>

        <template v-else>
          <div class="text-h6 q-mb-md">💼 승인된 프로 유저 목록</div>
          <q-table
            :rows="proUsers"
            :columns="columns"
            row-key="id"
            flat
            bordered
            :pagination="{ rowsPerPage: 0 }"
            hide-pagination
            class="q-mt-md"
            no-data-label="프로 유저가 없습니다."
            @row-click="onRowClick"
          >
            <template v-slot:body-cell-actions="props">
              <q-td :props="props">
                <q-btn
                  unelevated
                  color="negative"
                  label="만료"
                  class="q-px-md q-py-xs"
                  @click.stop="expireUser(props.row)"
                />
              </q-td>
            </template>
          </q-table>
        </template>
      </div>
    </header>

    <!-- ✅ 유저 상세 정보 다이얼로그 -->
    <q-dialog v-model="dialog">
      <q-card style="min-width: 1100px; max-width: 90vw;">
        <q-card-section>
          <div class="text-h6">{{ selectedUser?.name || '유저 상세 정보' }}</div>
        </q-card-section>

        <q-separator />

        <q-card-section>
          <!-- 기본 정보 -->
          <div class="user-detail-row">
            <div class="detail-item"><strong>이메일:</strong> {{ selectedUser?.email || '-' }}</div>
            <div class="detail-item"><strong>상태:</strong> {{ selectedUser?.status || '-' }}</div>
            <div class="detail-item"><strong>가입일:</strong> {{ formatDate(selectedUser?.createdAt) }}</div>
            <div class="detail-item"><strong>승인 IP:</strong> {{ selectedUser?.ipAddress || '-' }}</div>
            <div class="detail-item"><strong>UUID:</strong> {{ selectedUser?.deviceId || '-' }}</div>
            <div class="detail-item"><strong>만료일:</strong> {{ formatDate(selectedUser?.approvedUntil) }}</div>
          </div>

          <q-separator class="q-my-md" />

          <!-- 연장 UI -->
          <div class="user-detail-row">
            <div class="detail-item">
              <strong>연장 기간:</strong>
              <div class="row items-center q-gutter-xs q-mt-xs">
                <q-btn flat dense label="1주 연장" color="primary" @click="selectExtensionDays(7)" />
                <q-btn flat dense label="1달 연장" color="primary" @click="selectExtensionDays(30)" />
                <q-input dense type="date" v-model="customDate" style="width: 150px" />
                <q-btn flat dense label="적용" color="secondary" @click="applyExtension" />
              </div>
            </div>
            <div class="detail-item">
              <strong>자동 연장:</strong>
              <div class="q-mt-xs">
                <q-checkbox
                  v-model="autoExtend"
                  label="자동 연장"
                  color="green"
                  @update:model-value="updateAutoExtend"
                />
              </div>
            </div>
          </div>

          <q-separator class="q-my-md" />

          <!-- 사용량 정보 -->
          <div class="user-detail-row q-mb-sm">
            <div class="detail-item">
              <strong>🔍 단일 검색</strong>
              <q-checkbox
                v-model="selectedUser.canUseSingleSearch"
                @update:model-value="value => updateFeatureUsage('single', value)"
                label="사용 여부"
              />
              <div>{{ selectedUser.canUseSingleSearch ? '✅ 가능' : '❌ 불가' }}</div>
              <div>
                일일 제한:
                <q-input v-model.number="selectedUser.singleSearchLimit" type="number" dense outlined style="width: 100px" @blur="updateSearchLimit('single')" />
                회
              </div>
              <div>오늘 사용: {{ selectedUser?.singleSearchUsed ?? '-' }}회</div>
              <q-btn dense flat color="negative" label="초기화" size="sm" @click="resetUsage('single')" />
            </div>
            <div class="detail-item">
              <strong>📊 랭킹 검색</strong>
              <q-checkbox
                v-model="selectedUser.canUseRankingSearch"
                @update:model-value="value => updateFeatureUsage('ranking', value)"
                label="사용 여부"
              />
              <div>{{ selectedUser.canUseRankingSearch ? '✅ 가능' : '❌ 불가' }}</div>
              <div>
                일일 제한:
                <q-input v-model.number="selectedUser.rankingSearchLimit" type="number" dense outlined style="width: 100px" @blur="updateSearchLimit('ranking')" />
                회
              </div>
              <div>오늘 사용: {{ selectedUser?.rankingSearchUsed ?? '-' }}회</div>
              <q-btn dense flat color="negative" label="초기화" size="sm" @click="resetUsage('ranking')" />
            </div>
            <div class="detail-item">
              <strong>🔁 연관검색</strong>
              <q-checkbox
                v-model="selectedUser.canUseRelatedSearch"
                @update:model-value="value => updateFeatureUsage('related', value)"
                label="사용 여부"
              />
              <div>{{ selectedUser.canUseRelatedSearch ? '✅ 가능' : '❌ 불가' }}</div>
              <div>일일 제한: 무제한</div>
            </div>
            <div class="detail-item">
              <strong>🧩 키워드 조합기</strong>
              <q-checkbox
                v-model="selectedUser.canUseKeywordMix"
                @update:model-value="value => updateFeatureUsage('mixer', value)"
                label="사용 여부"
              />
              <div>{{ selectedUser.canUseKeywordMix ? '✅ 가능' : '❌ 불가' }}</div>
              <div>일일 제한: 무제한</div>
            </div>
          </div>

          <q-separator class="q-my-md" />

          <!-- 로그 테이블 -->
          <div class="user-detail-row">
            <div class="detail-item" style="width: 100%">
              <strong>📄 유저 활동 로그</strong>
              <div class="row q-gutter-sm q-mb-md items-end">
                <q-input v-model="logSearch.startDate" label="날짜 선택" type="date" dense />
                <q-btn label="검색" color="primary" @click="fetchUserLogsByDate" dense />
                <q-btn label="초기화" color="negative" @click="resetLogSearch" dense />
              </div>
              <q-table
                :rows="logs"
                :columns="logColumns"
                row-key="id"
                flat bordered dense
                class="q-mt-sm"
                hide-pagination
                :pagination="{ rowsPerPage: 0 }"
                no-data-label="활동 로그가 없습니다."
              />
              <q-btn
                dense flat color="primary"
                icon="cloud_download"
                label="로그 다운로드 (Excel)"
                class="q-mt-sm"
                @click="downloadUserLogExcel"
              />
              <div class="detail-item" v-if="selectedUser?.role === 'ADMIN'">
                <strong>📩 로그 이메일 수신:</strong>
                <div class="q-mt-xs">
                  <q-checkbox
                    v-model="receiveLogEmail"
                    label="이메일로 전달 로그 받기"
                    color="primary"
                    @update:model-value="updateReceiveLogEmail"
                  />
                </div>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="닫기" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from 'boot/axios.ts'
import { useUserStore } from 'stores/userStore.js'
import { storeToRefs } from 'pinia'
import { Dialog } from 'quasar'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

const userStore = useUserStore()
const { userInfo } = storeToRefs(userStore)

const adminUsers = ref([])
const proUsers = ref([])
const selectedUser = ref(null)
const dialog = ref(false)
const customDate = ref(null)
const autoExtend = ref(false)
const logs = ref([])
const logSearch = ref({ startDate: null })

const columns = [
  { name: 'name', label: '🧑 이름', field: 'name', align: 'center' },
  { name: 'role', label: '🎯 역할', field: 'role', align: 'center' },
  { name: 'approvedUntil', label: '📆 만료일', field: 'approvedUntil', align: 'center' },
  { name: 'actions', label: '🛠️ 관리', field: 'actions', align: 'center', sortable: false }
]

const logColumns = [
  { name: 'date', label: '📅 날짜', field: 'date', align: 'center' },
  { name: 'time', label: '⏰ 시간', field: 'time', align: 'center' },
  { name: 'name', label: '🧑 이름', field: 'name', align: 'center' },
  { name: 'ip', label: '🌐 접속 IP', field: 'ip', align: 'center' },
  { name: 'uuid', label: '🧾 접속 UUID', field: 'uuid', align: 'center' },
  { name: 'action', label: '✅ 사용한 기능', field: 'action', align: 'center' }
]

// 승인된 유저 목록을 불러오는 함수 이름을 loadApprovedUsers로 변경하여 중복 선언 문제 해결
const loadApprovedUsers = async () => {
  const url = userInfo.value.role === 'DEV'
    ? '/api/v1/admin/admins/approved'
    : '/api/v1/admin/users/pro'
  const res = await api.get(url)
  if (userInfo.value.role === 'DEV') {
    adminUsers.value = res.data.filter(u => u.role === 'ADMIN')
    proUsers.value = res.data.filter(u => u.role === 'PRO')
  } else {
    proUsers.value = res.data
  }
}

const receiveLogEmail = ref(false)

const updateReceiveLogEmail = async (value) => {
  if (!selectedUser.value?.id) return

  const res = await api.put(`/api/v1/users/${selectedUser.value.id}/email-log-setting`, {
    receiveLogEmail: value
  })

  selectedUser.value.receiveLogEmail = value

  Dialog.create({
    title: '✅ 설정 완료',
    message: res.data
  })
}

const onRowClick = async (evt, row) => {
  const res = await api.get(`/api/v1/admin/users/${row.id}/detail`)
  const user = res.data.user
  const usage = res.data.usage

  selectedUser.value = {
    ...user,
    singleSearchLimit: usage.singleSearchLimit,
    singleSearchUsed: usage.singleSearchUsed,
    rankingSearchLimit: usage.rankingSearchLimit,
    rankingSearchUsed: usage.rankingSearchUsed
  }

  customDate.value = null
  autoExtend.value = selectedUser.value.autoExtend ?? false
  logSearch.value = { startDate: null }
  await fetchUserLogs(row.id)
  dialog.value = true
}

const fetchUserLogs = async (userId) => {
  const res = await api.get(`/api/admin/logs/user/${userId}/logs`, { params: { limit: 30 } })
  logs.value = mapLogResponse(res.data)
}

const fetchUserLogsByDate = async () => {
  if (!logSearch.value.startDate || !selectedUser.value?.id) {
    Dialog.create({ title: '⚠️ 날짜 선택 필요', message: '날짜를 선택해주세요.' })
    return
  }

  const res = await api.get(`/api/admin/logs/user/${selectedUser.value.id}/logs`, {
    params: { startDate: logSearch.value.startDate }
  })
  logs.value = mapLogResponse(res.data)
}

const downloadUserLogExcel = async () => {
  const res = await api.get(`/api/admin/logs/user/${selectedUser.value.id}/logs`, { params: { full: true } })
  const fullLogs = mapLogResponse(res.data)

  if (!fullLogs.length) {
    Dialog.create({ title: '❌ 로그 없음', message: '다운로드할 로그가 없습니다.' })
    return
  }

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('사용 로그')

  worksheet.columns = logColumns.map(col => ({
    header: col.label.replace(/^[^\\wㄱ-ㅎㅏ-ㅣ가-힣]+/, ''),
    key: col.field,
    width: 20
  }))

  fullLogs.forEach(log => worksheet.addRow(log))
  worksheet.getRow(1).font = { bold: true }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  saveAs(blob, `user_log_${selectedUser.value?.name || 'user'}.xlsx`)
}

const mapLogResponse = (data) => {
  return data.map(log => {
    const date = new Date(log.searchedAt)
    return {
      date: date.toLocaleDateString('ko-KR'),
      time: date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      name: log.userName || '-',
      ip: log.ipAddress || '-',
      uuid: log.uuid || '-',
      action: log.actionType || '-'
    }
  })
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return dateStr.split('T')[0] || dateStr.split(' ')[0]
}

const selectExtensionDays = (days) => {
  const baseDate = new Date(selectedUser.value?.approvedUntil || new Date())
  baseDate.setDate(baseDate.getDate() + days)
  customDate.value = baseDate.toISOString().split('T')[0]
}

const applyExtension = async () => {
  if (!customDate.value || !selectedUser.value?.id) {
    Dialog.create({ title: '⚠️', message: '날짜를 선택해주세요.' })
    return
  }

  await api.put(`/api/v1/admin/users/extend/${selectedUser.value.id}`, {
    newApprovedUntil: customDate.value,
    autoExtend: autoExtend.value
  })

  selectedUser.value.approvedUntil = customDate.value
  selectedUser.value.autoExtend = autoExtend.value

  Dialog.create({ title: '✅ 연장 완료', message: '승인 기간이 연장되었습니다.' })
  await loadApprovedUsers()
}

const updateAutoExtend = async (value) => {
  await api.put(`/api/v1/admin/users/extend/${selectedUser.value.id}`, {
    newApprovedUntil: selectedUser.value.approvedUntil,
    autoExtend: value
  })

  Dialog.create({
    title: '✅ 자동연장 변경',
    message: value ? '자동 연장이 설정되었습니다.' : '자동 연장이 해제되었습니다.'
  })

  await loadApprovedUsers()
}

const resetUsage = async (type) => {
  await api.post(`/api/search/${selectedUser.value.id}/usage/reset`, { type })
  Dialog.create({ title: '✅ 초기화 완료', message: `${type === 'single' ? '단일 검색' : '랭킹 검색'} 사용량이 초기화되었습니다.` })
  onRowClick(null, selectedUser.value)
}

const updateSearchLimit = async (type) => {
  if (!selectedUser.value?.id) return

  const limit = type === 'single'
    ? selectedUser.value.singleSearchLimit
    : selectedUser.value.rankingSearchLimit

  try {
    await api.put(`/api/v1/admin/users/${selectedUser.value.id}/usage-limit`, {
      type,
      limit
    })
    Dialog.create({ title: '✅ 제한 설정 완료', message: `${type === 'single' ? '단일 검색' : '랭킹 검색'} 제한이 ${limit}회로 설정되었습니다.` })
  } catch (err) {
    console.error(err)
    Dialog.create({ title: '❌ 오류', message: '제한 설정 중 오류가 발생했습니다.' })
  }
}

const expireUser = async (user) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    await api.put(`/api/v1/admin/users/expire/${user.id}`, {
      newApprovedUntil: today,
      autoExtend: false
    })
    Dialog.create({ title: '✅ 만료 완료', message: `${user.name}님의 승인이 만료되었습니다.` })
    await loadApprovedUsers()
  } catch (err) {
    console.error('만료 요청 실패:', err)
    Dialog.create({
      title: '❌ 만료 실패',
      message: '해당 유저의 만료 처리 중 문제가 발생했습니다.'
    })
  }
}



onMounted(() => {
  loadApprovedUsers()
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
  width: 100%;
  padding: 10px;
  font-family: Arial, sans-serif;
  color: #333;
  text-align: left;
  max-width: 1000px;
  margin: auto;
}
.user-approval-wrapper {
  max-width: 1000px;
  margin: 0 auto;
  text-align: left;
  padding: 10px;
}
.q-table {
  margin: auto;
}
.q-table td,
.q-table th {
  word-break: break-word;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  text-align: center;
}
.q-table thead th {
  font-weight: bold;
  background-color: #f0f4f8;
  font-size: 14px;
}
.user-detail-row {
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
  justify-content: start;
  margin-top: 10px;
}
.detail-item {
  min-width: 200px;
  flex: 1;
}
</style>
