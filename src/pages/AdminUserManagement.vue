<template>
  <q-page class="page-container">
    <!-- 상단 안내 배너 -->
    <div class="content-below-banner">
      <h6><strong>Maglo - 유저 통합 관리</strong></h6>
      <p>유저의 가입 요청 또는 재승인 요청을 승인할 수 있습니다.</p>
    </div>

    <!-- 탭 네비게이션 -->
    <q-tabs
      v-model="activeTab"
      class="tabs-container"
      dense
      align="justify"
      indicator-color="primary"
    >
      <q-tab name="pros" label="👤 프로 유저 관리" />
      <q-tab v-if="isDev" name="admins" label="🛠 관리자 유저 관리" />
    </q-tabs>

    <q-separator />

    <q-tab-panels v-model="activeTab" animated>
      <!-- 프로 유저 관리 -->
      <q-tab-panel name="pros">
        <q-card flat bordered class="card-container">
          <q-card-section>
            <!-- 검색 및 상태 필터 -->
            <div class="row q-gutter-md q-mb-md">
              <q-input
                v-model="searchName"
                label="🔍 이름 검색"
                dense
                debounce="300"
                outlined
                clearable
                class="col"
              />
              <q-select
                v-model="filterStatus"
                :options="statusFilterOptions"
                emit-value
                option-label="label"
                option-value="value"
                :display-value="filterStatus ? statusMap[filterStatus] : ''"
                label="🗂 상태 필터"
                dense
                outlined
                clearable
                class="col"
              />
            </div>

            <q-table
              :rows="sortedPros"
              :columns="columns"
              row-key="id"
              flat
              dense
              hide-bottom
              :pagination="{ rowsPerPage: 30 }"
            >
              <!-- 이름 오른쪽에 상태 DOT -->
              <template v-slot:body-cell-name="props">
                <q-td :props="props">
                  <div class="row items-center q-gutter-xs">
                    <span>{{ props.row.name }}</span>
                    <q-icon
                      name="circle"
                      :color="statusDotColorMap[props.row.status] || 'grey'"
                      size="10px"
                    />
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-email="props">
                <q-td :props="props">{{ props.row.email }}</q-td>
              </template>
              <template v-slot:body-cell-status="props">
                <q-td :props="props">{{ statusMap[props.row.status] || props.row.status }}</q-td>
              </template>
              <template v-slot:body-cell-role="props">
                <q-td :props="props">
                  <q-select
                    v-model="props.row.editableRole"
                    :options="getRoleOptions(props.row)"
                    dense
                    emit-value
                  />
                </q-td>
              </template>
              <template v-slot:body-cell-detail="props">
                <q-td :props="props" class="q-pa-xs">
                  <q-btn
                    flat dense
                    label="상세"
                    color="info"
                    @click.stop="openUserDetail(props.row)"
                  />
                </q-td>
              </template>
              <template v-slot:body-cell-actions="props">
                <q-td :props="props" class="actions-cell">
                  <!-- 승인 -->
                  <q-btn
                    flat round dense icon="check_circle" color="primary"
                    v-if="['PENDING_APPROVAL','PENDING_REAPPROVAL','REJECTED'].includes(props.row.status)"
                    @click="approveUser(props.row.id)"
                  >
                    <q-tooltip>승인</q-tooltip>
                  </q-btn>

                  <!-- 거절 -->
                  <q-btn
                    flat round dense icon="block" color="negative"
                    v-if="props.row.status !== 'NORMAL'"
                    @click="rejectUser(props.row.id)"
                  >
                    <q-tooltip>거절</q-tooltip>
                  </q-btn>
                  <!-- 연장 -->
                  <q-btn
                    flat round dense icon="add_alarm" color="secondary"
                    v-if="props.row.status === 'NORMAL'"
                    @click="extendUserBy7Days(props.row.id)"
                  >
                    <q-tooltip>7일 연장</q-tooltip>
                  </q-btn>

                  <!-- 삭제 -->
                  <q-btn
                    flat round dense icon="delete" color="negative"
                    @click="deleteUser(props.row.id)"
                  >
                    <q-tooltip>삭제</q-tooltip>
                  </q-btn>

                  <!-- 만료 -->
                  <q-btn
                    flat round dense icon="hourglass_empty" color="warning"
                    v-if="props.row.status === 'NORMAL'"
                    @click="expireUser(props.row.id)"
                  >
                    <q-tooltip>만료</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
            </q-table>

            <div class="q-pa-md flex justify-center">
              <q-pagination
                v-model="paginationUsers.page"
                :max="pagesUsers"
                boundary-links
                dense
              />
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- 관리자 유저 관리 -->
      <q-tab-panel v-if="isDev" name="admins">
        <q-card flat bordered class="card-container">
          <q-card-section>
            <!-- 검색 및 상태 필터 -->
            <div class="row q-gutter-md q-mb-md">
              <q-input
                v-model="searchName"
                label="🔍 이름 검색"
                dense
                debounce="300"
                outlined
                clearable
                class="col"
              />
              <q-select
                v-model="filterStatus"
                :options="statusFilterOptions"
                label="🗂 상태 필터"
                dense
                outlined
                clearable
                class="col"
              />
            </div>

            <q-table
              :rows="sortedAdmins"
              :columns="columns"
              row-key="id"
              flat
              dense
              hide-bottom
              :pagination="{ rowsPerPage: 30 }"
            >
              <!-- ① 이름 오른쪽에 상태 DOT -->
              <template v-slot:body-cell-name="props">
                <q-td :props="props">
                  <div class="row items-center q-gutter-xs">
                    <span>{{ props.row.name }}</span>
                    <q-icon
                      name="circle"
                      :color="statusDotColorMap[props.row.status] || 'grey'"
                      size="10px"
                    />
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-email="props">
                <q-td :props="props">{{ props.row.email }}</q-td>
              </template>
              <template v-slot:body-cell-status="props">
                <q-td :props="props">{{ statusMap[props.row.status] || props.row.status }}</q-td>
              </template>
              <template v-slot:body-cell-role="props">
                <q-td :props="props">
                  <q-select
                    v-model="props.row.editableRole"
                    :options="getRoleOptions(props.row)"
                    dense
                    emit-value
                  />
                </q-td>
              </template>
              <template v-slot:body-cell-detail="props">
                <q-td :props="props" class="q-pa-xs">
                  <q-btn
                    flat dense
                    label="상세"
                    color="info"
                    @click.stop="openUserDetail(props.row)"
                  />
                </q-td>
              </template>
              <template v-slot:body-cell-actions="props">
                <q-td :props="props" class="actions-cell">
                  <!-- ✅ 역할이 변경된 경우에만 승인 버튼 표시 -->
                  <q-btn
                    flat round dense icon="check_circle" color="primary"
                    v-if="props.row.editableRole !== props.row.originalRole"
                    @click="approveAdmin(props.row.id)"
                  >
                    <q-tooltip>승인</q-tooltip>
                  </q-btn>

                  <!-- ✅ 삭제 버튼은 항상 표시 -->
                  <q-btn
                    flat round dense icon="delete" color="negative"
                    @click="deleteAdmin(props.row.id)"
                  >
                    <q-tooltip>삭제</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
            </q-table>

            <div class="q-pa-md flex justify-center">
              <q-pagination
                v-model="paginationAdmins.page"
                :max="pagesAdmins"
                boundary-links
                dense
              />
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>
    </q-tab-panels>

    <!-- 상세정보 다이얼로그 -->
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
            <div class="detail-item">
              <strong>상태:</strong> {{ statusMap[selectedUser?.status] || selectedUser?.status || '-' }}
            </div>

            <!-- ✅ 거절 사유 표시 (REJECTED 상태일 때만) -->
            <div
              class="detail-item text-negative"
              v-if="selectedUser?.status === 'REJECTED' && selectedUser?.rejectReason"
            >
              <strong>거절 사유:</strong> {{ selectedUser.rejectReason }}
            </div>
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
                  :disable="!selectedUser?.approvedUntil"
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
                @update:model-value="v => updateFeatureUsage('single', v)"
                label="사용 여부"
              />
              <div>{{ selectedUser.canUseSingleSearch ? '✅ 가능' : '❌ 불가' }}</div>
              <div>
                일일 제한:
                <q-input
                  v-model.number="selectedUser.singleSearchLimit"
                  type="number"
                  dense
                  outlined
                  style="width: 100px"
                  @blur="updateSearchLimit('single')"
                />회
              </div>
              <div>오늘 사용: {{ selectedUser?.singleSearchUsed ?? '-' }}회</div>
              <q-btn dense flat color="negative" label="초기화" size="sm" @click="resetUsage('single')" />
            </div>
            <div class="detail-item">
              <strong>📊 랭킹 검색</strong>
              <q-checkbox
                v-model="selectedUser.canUseRankingSearch"
                @update:model-value="v => updateFeatureUsage('ranking', v)"
                label="사용 여부"
              />
              <div>{{ selectedUser.canUseRankingSearch ? '✅ 가능' : '❌ 불가' }}</div>
              <div>
                일일 제한:
                <q-input
                  v-model.number="selectedUser.rankingSearchLimit"
                  type="number"
                  dense
                  outlined
                  style="width: 100px"
                  @blur="updateSearchLimit('ranking')"
                />회
              </div>
              <div>오늘 사용: {{ selectedUser?.rankingSearchUsed ?? '-' }}회</div>
              <q-btn dense flat color="negative" label="초기화" size="sm" @click="resetUsage('ranking')" />
            </div>

            <div class="detail-item">
              <strong>🛒 쇼핑 검색</strong>
              <q-checkbox
                v-model="selectedUser.canUseShoppingSearch"
                @update:model-value="v => updateFeatureUsage('shopping', v)"
                label="사용 여부"
              />
              <div>{{ selectedUser.canUseShoppingSearch ? '✅ 가능' : '❌ 불가' }}</div>
              <div>
                일일 제한:
                <q-input
                  v-model.number="selectedUser.shoppingSearchLimit"
                  type="number"
                  dense
                  outlined
                  style="width: 100px"
                  @blur="updateSearchLimit('shopping')"
                />회
              </div>
              <div>오늘 사용: {{ selectedUser?.shoppingSearchUsed ?? '-' }}회</div>
              <q-btn dense flat color="negative" label="초기화" size="sm" @click="resetUsage('shopping')" />
            </div>

            <div class="detail-item">
              <strong>📈 트렌드 검색</strong>
              <q-checkbox
                v-model="selectedUser.canUseTrendSearch"
                @update:model-value="v => updateFeatureUsage('trend', v)"
                label="사용 여부"
              />
              <div>{{ selectedUser.canUseTrendSearch ? '✅ 가능' : '❌ 불가' }}</div>

              <div>
                일일 제한:
                <q-input
                  v-model.number="selectedUser.trendSearchLimit"
                  type="number"
                  dense
                  outlined
                  style="width: 100px"
                  @blur="updateSearchLimit('trend')"
                />회
              </div>
              <div>오늘 사용: {{ selectedUser?.trendSearchUsed ?? '-' }}회</div>
              <q-btn dense flat color="negative" label="초기화" size="sm" @click="resetUsage('trend')" />
            </div>


            <div class="detail-item">
              <strong>🔁 연관검색</strong>
              <q-checkbox
                v-model="selectedUser.canUseRelatedSearch"
                @update:model-value="v => updateFeatureUsage('related', v)"
                label="사용 여부"
              />
              <div>{{ selectedUser.canUseRelatedSearch ? '✅ 가능' : '❌ 불가' }}</div>
              <div>일일 제한: 무제한</div>
            </div>

            <div class="detail-item">
              <strong>🧩 키워드 조합기</strong>
              <q-checkbox
                v-model="selectedUser.canUseKeywordMix"
                @update:model-value="v => updateFeatureUsage('mixer', v)"
                label="사용 여부"
              />
              <div>{{ selectedUser.canUseKeywordMix ? '✅ 가능' : '❌ 불가' }}</div>
              <div>일일 제한: 무제한</div>
            </div>
          </div>

          <q-separator class="q-my-md" />

          <!-- 로그 테이블 -->
          <div class="user-detail-row">
            <div class="detail-item" style="width:100%">
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
                flat
                bordered
                dense
                class="q-mt-sm"
                hide-pagination
                :pagination="{ rowsPerPage: 0 }"
                no-data-label="활동 로그가 없습니다."
              />
              <q-btn
                dense flat
                color="primary"
                icon="cloud_download"
                label="로그 다운로드 (Excel)"
                class="q-mt-sm"
                @click="downloadUserLogExcel"
              />
            </div>
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
import { ref, computed, onMounted } from 'vue'
import { useQuasar, Dialog } from 'quasar'
import { api } from 'boot/axios'
import { useUserStore } from 'src/stores/userStore'
import { storeToRefs } from 'pinia'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

const $q = useQuasar()
const userStore = useUserStore()
const { userInfo } = storeToRefs(userStore)
const isDev = computed(() => userInfo.value.role === 'DEV')
const activeTab = ref('pros')


// 검색어, 상태 필터
const searchName = ref('')
const filterStatus = ref(null)

// 상태 매핑 & 필터 옵션
const statusMap = {
  PENDING_ALL:      '승인 대기',
  NORMAL: '정상',
  WITHDRAWAL: '탈퇴',
  PENDING_APPROVAL: '승인 대기',
  REJECTED: '거절됨',
  PENDING_REAPPROVAL: '승인 대기',
  WAITING: '대기중'
}

const statusFilterOptions = [
  { label: '승인 대기', value: 'PENDING_ALL' },
  { label: '정상',       value: 'NORMAL' },
  { label: '거절',       value: 'REJECTED' }
]

// --- 2) 각 value에 매핑될 실제 상태 배열 추가
const statusFilterMap = {
  PENDING_ALL:      ['PENDING_APPROVAL', 'PENDING_REAPPROVAL'],
  NORMAL:           ['NORMAL'],
  REJECTED:         ['REJECTED']
}


// 페이지네이션
const paginationUsers = ref({ page: 1, rowsPerPage: 30 })
const paginationAdmins = ref({ page: 1, rowsPerPage: 30 })

// 역할 옵션
const approvalRoleOptions = [
  { label: 'PRO', value: 'PRO' },
  { label: 'ADMIN', value: 'ADMIN' }
]
const adminApprovalRoleOptions = [
  { label: 'PRO', value: 'PRO' },
  { label: 'ADMIN', value: 'ADMIN' },
  { label: 'DEV', value: 'DEV' }
]
const getRoleOptions = row =>
  row.originalRole === 'ADMIN' ? adminApprovalRoleOptions : approvalRoleOptions

// 컬럼 정의
const columns = [
  { name: 'id', label: '🆔 ID', field: 'id', align: 'left' },
  { name: 'name', label: '🧑 이름', field: 'name', align: 'left' },
  { name: 'email', label: '✉️ 이메일', field: 'email', align: 'left' },
  { name: 'createdAt', label: '📅 가입일', field: 'createdAt', align: 'left' },
  { name: 'approvedUntil', label: '⏳ 만료일', field: 'approvedUntil', align: 'left' },
  { name: 'status', label: '📌 상태', field: 'status', align: 'left' },
  { name: 'detail', label: '🔎', field: 'detail', align: 'center', sortable: false },
  { name: 'role', label: '🎯 역할', field: 'editableRole', align: 'left' },
  { name: 'actions', label: '⚙️', field: 'actions', align: 'center', sortable: false }
]

// 전체 유저
const allUsers = ref([])

// 필터링 (검색 + 상태) — 프로 유저
const filteredPros = computed(() => {
  return allUsers.value
    // 역할이 PRO인 유저만
    .filter(u => u.role === 'PRO')
    // 대기중(가입 전) 상태는 제외
    .filter(u => u.status !== 'WAITING')
    // 이름 검색
    .filter(u => {
      const name = searchName.value.trim().toLowerCase()
      return !name || u.name.toLowerCase().includes(name)
    })
    // 상태 필터
    .filter(u => {
      if (!filterStatus.value) {
        // 아무것도 선택 안 하면 모두 통과
        return true
      }
      // 선택된 필터값에 매핑된 실제 상태 배열 가져오기
      const allowed = statusFilterMap[filterStatus.value] || []
      return allowed.includes(u.status)
    })
})

// 필터링 (검색 + 상태) — 관리자 유저
const filteredAdmins = computed(() => {
  return allUsers.value
    // 역할이 ADMIN인 유저만
    .filter(u => u.role === 'ADMIN')
    // 대기중(가입 전) 상태는 제외
    .filter(u => u.status !== 'WAITING')
    // 이름 검색
    .filter(u => {
      const name = searchName.value.trim().toLowerCase()
      return !name || u.name.toLowerCase().includes(name)
    })
    // 상태 필터
    .filter(u => {
      if (!filterStatus.value) {
        return true
      }
      const allowed = statusFilterMap[filterStatus.value] || []
      return allowed.includes(u.status)
    })
})

// 페이징
const pagesUsers = computed(() =>
  Math.ceil(filteredPros.value.length / paginationUsers.value.rowsPerPage)
)
const pagesAdmins = computed(() =>
  Math.ceil(filteredAdmins.value.length / paginationAdmins.value.rowsPerPage)
)
const paginatedUsers = computed(() =>
  filteredPros.value.slice(
    (paginationUsers.value.page - 1) * paginationUsers.value.rowsPerPage,
    paginationUsers.value.page * paginationUsers.value.rowsPerPage
  )
)
const paginatedAdmins = computed(() =>
  filteredAdmins.value.slice(
    (paginationAdmins.value.page - 1) * paginationAdmins.value.rowsPerPage,
    paginationAdmins.value.page * paginationAdmins.value.rowsPerPage
  )
)

// 정렬 (상태 우선순위)
const statusOrder = ['PENDING_APPROVAL', 'PENDING_REAPPROVAL', 'NORMAL', 'REJECTED', 'WAITING']
const sortedPros = computed(() =>
  paginatedUsers.value.slice().sort((a, b) =>
    statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
  )
)
const sortedAdmins = computed(() =>
  paginatedAdmins.value.slice().sort((a, b) =>
    statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
  )
)
const statusDotColorMap = {
  NORMAL: 'green',
  REJECTED: 'red',
  WAITING: 'black',
  PENDING_APPROVAL: 'amber',
  PENDING_REAPPROVAL: 'amber'
}
// 상세정보 & 로그
const dialog = ref(false)
const selectedUser = ref(null)
const logs = ref([])
const logSearch = ref({ startDate: null })

const logColumns = [
  { name: 'date', label: '📅 날짜', field: 'date', align: 'center' },
  { name: 'time', label: '⏰ 시간', field: 'time', align: 'center' },
  { name: 'name', label: '🧑 이름', field: 'name', align: 'center' },
  { name: 'ip', label: '🌐 접속 IP', field: 'ip', align: 'center' },
  { name: 'uuid', label: '🧾 접속 UUID', field: 'uuid', align: 'center' },
  { name: 'action', label: '✅ 사용한 기능', field: 'action', align: 'center' }
]

// API 호출
async function fetchAllUsers() {
  const res = await api.get('/api/v1/admin/admins/all-users')
  allUsers.value = res.data.map(u => ({
    ...u,
    originalRole: u.role,
    editableRole: u.role
  }))
}

async function extendUserBy7Days(userId) {
  const user = allUsers.value.find(u => u.id === userId)
  if (!user || !user.approvedUntil) return

  const current = new Date(user.approvedUntil)
  current.setDate(current.getDate() + 7)
  const newDate = current.toISOString().split('T')[0]

  await api.put(`/api/v1/admin/users/extend/${userId}`, {
    newApprovedUntil: newDate,
    autoExtend: user.autoExtend ?? false
  })
  await fetchAllUsers()
  Dialog.create({ title: '✅ 연장 완료', message: '만료일이 7일 연장되었습니다.' })
}

// 승인/거절/삭제 (프로)
async function approveUser(userId) {
  const user = allUsers.value.find(u => u.id === userId)
  await api.put(`/api/v1/admin/users/approve/${userId}`, { role: user.editableRole || user.role })
  await fetchAllUsers()
  $q.dialog({ title: '✅ 승인 완료', message: '유저가 승인되었습니다.' })
}
function rejectUser(userId) {
  $q.dialog({
    title: '거절 사유 입력',
    message: '이 사용자를 왜 거절하시나요?',
    prompt: { model: '', type: 'text', isValid: v => v.length > 0 },
    cancel: true
  }).onOk(async reason => {
    await api.put(`/api/v1/admin/users/reject/${userId}`, { reason })
    await fetchAllUsers()
    $q.dialog({ title: '❌ 거절 완료', message: '유저가 거절되었습니다.' })
  })
}
function deleteUser(userId) {
  $q.dialog({
    title: '삭제 확인',
    message: '정말 이 유저를 삭제하시겠습니까?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    await api.delete(`/api/v1/admin/users/${userId}`)
    await fetchAllUsers()
    $q.dialog({ title: '✅ 삭제 완료', message: '유저가 삭제되었습니다.' })
  })
}

// 승인/거절/삭제 (관리자)
async function approveAdmin(userId) {
  const user = allUsers.value.find(u => u.id === userId)
  const newRole = user.editableRole || user.role

  // ✅ ADMIN → PRO 강등 시 만료일 7일 설정
  const payload = { role: newRole }
  if (user.originalRole === 'ADMIN' && newRole === 'PRO') {
    const now = new Date()
    now.setDate(now.getDate() + 7)
    const expireDate = now.toISOString().split('T')[0]
    payload.approvedUntil = expireDate + 'T00:00:00'
    payload.autoExtend = false
  }

  await api.put(`/api/v1/admin/admins/approve/${userId}`, payload)
  await fetchAllUsers()
  $q.dialog({ title: '✅ 승인 완료', message: '관리자 역할이 업데이트되었습니다.' })
}


function deleteAdmin(userId) {
  $q.dialog({
    title: '삭제 확인',
    message: '정말 이 관리자를 삭제하시겠습니까?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    await api.delete(`/api/v1/admin/admins/${userId}`)
    await fetchAllUsers()
    $q.dialog({ title: '✅ 삭제 완료', message: '관리자가 삭제되었습니다.' })
  })
}

// 만료 처리 (Expire)
async function expireUser(userId) {
  await api.put(`/api/v1/admin/users/expire/${userId}`)
  await fetchAllUsers()
  $q.dialog({ title: '✅ 만료 완료', message: '유저 계정이 만료되었습니다.' })
}


// 상세정보 & 로그
function mapLogResponse(data) {
  return data.map(log => {
    const d = new Date(log.searchedAt)
    return {
      date: d.toLocaleDateString('ko-KR'),
      time: d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      name: log.userName || '-',
      ip: log.ipAddress || '-',
      uuid: log.uuid || '-',
      action: log.actionType || '-'
    }
  })
}
async function fetchUserLogs(userId) {
  const res = await api.get(`/api/admin/logs/user/${userId}/logs`, { params: { limit: 30 } })
  logs.value = mapLogResponse(res.data)
}
async function fetchUserLogsByDate() {
  if (!logSearch.value.startDate || !selectedUser.value?.id) {
    Dialog.create({ title: '⚠️ 날짜 선택 필요', message: '날짜를 선택해주세요.' })
    return
  }
  const res = await api.get(`/api/admin/logs/user/${selectedUser.value.id}/logs`, {
    params: { startDate: logSearch.value.startDate }
  })
  logs.value = mapLogResponse(res.data)
}
function resetLogSearch() {
  logSearch.value.startDate = null
  if (selectedUser.value?.id) fetchUserLogs(selectedUser.value.id)
}
async function downloadUserLogExcel() {
  const res = await api.get(`/api/admin/logs/user/${selectedUser.value.id}/logs`, { params: { full: true } })
  const fullLogs = mapLogResponse(res.data)
  if (!fullLogs.length) {
    Dialog.create({ title: '❌ 로그 없음', message: '다운로드할 로그가 없습니다.' })
    return
  }
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('사용 로그')
  worksheet.columns = logColumns.map(col => ({
    header: col.label.replace(/^[^\wㄱ-힣]+/, ''), key: col.field, width: 20
  }))
  fullLogs.forEach(log => worksheet.addRow(log))
  worksheet.getRow(1).font = { bold: true }
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `user_log_${selectedUser.value?.name || 'user'}.xlsx`)
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return dateStr.split('T')[0] || dateStr.split(' ')[0]
}

const customDate = ref(null)
const autoExtend = ref(false)

function selectExtensionDays(days) {
  const base = new Date(selectedUser.value?.approvedUntil || new Date())
  base.setDate(base.getDate() + days)
  customDate.value = base.toISOString().split('T')[0]
}
async function applyExtension() {
  if (selectedUser.value?.status !== 'NORMAL') {
    Dialog.create({ title: '⚠️ 승인 필요', message: '승인된 사용자만 연장이 가능합니다.' })
    return
  }
  if (!customDate.value || !selectedUser.value?.id) {
    Dialog.create({ title: '⚠️', message: '날짜를 선택해주세요.' })
    return
  }
  await api.put(`/api/v1/admin/users/extend/${selectedUser.value.id}`, {
    newApprovedUntil: customDate.value, autoExtend: autoExtend.value
  })
  selectedUser.value.approvedUntil = customDate.value
  selectedUser.value.autoExtend = autoExtend.value
  Dialog.create({ title: '✅ 연장 완료', message: '승인 기간이 연장되었습니다.' })
}

async function updateAutoExtend(value) {
  await api.put(`/api/v1/admin/users/extend/${selectedUser.value.id}`, {
    newApprovedUntil: selectedUser.value.approvedUntil, autoExtend: value
  })
  Dialog.create({
    title: '✅ 자동연장 변경',
    message: value ? '자동 연장이 설정되었습니다.' : '자동 연장이 해제되었습니다.'
  })
}
async function resetUsage(type) {
  await api.post(`/api/search/${selectedUser.value.id}/usage/reset`, { type })
  Dialog.create({
    title: '✅ 초기화 완료',
    message: `${type === 'single' ? '단일 검색' : '랭킹 검색'} 사용량이 초기화되었습니다.`
  })
  openUserDetail(selectedUser.value)
}

async function updateSearchLimit(type) {
  if (!selectedUser.value?.id) return
  let limit = 0

  if (type === 'single') {
    limit = selectedUser.value.singleSearchLimit
  } else if (type === 'ranking') {
    limit = selectedUser.value.rankingSearchLimit
  } else if (type === 'shopping') {
    limit = selectedUser.value.shoppingSearchLimit
  } else if (type === 'trend') {
    limit = selectedUser.value.trendSearchLimit // ✅ 트렌드 추가
  }

  try {
    await api.put(`/api/v1/admin/users/${selectedUser.value.id}/usage-limit`, { type, limit })
    Dialog.create({
      title: '✅ 제한 설정 완료',
      message: `${{
        single: '단일 검색',
        ranking: '랭킹 검색',
        shopping: '쇼핑 검색',
        trend: '트렌드 검색'
      }[type]} 제한이 ${limit}회로 설정되었습니다.`
    })
  } catch {
    Dialog.create({ title: '❌ 오류', message: '제한 설정 중 오류가 발생했습니다.' })
  }
}

async function openUserDetail(row) {
  const res = await api.get(`/api/v1/admin/users/${row.id}/detail`)
  const user = res.data.user
  const usage = res.data.usage

  selectedUser.value = {
    ...user,
    singleSearchLimit: usage.singleSearchLimit,
    singleSearchUsed: usage.singleSearchUsed,
    rankingSearchLimit: usage.rankingSearchLimit,
    rankingSearchUsed: usage.rankingSearchUsed,
    shoppingSearchLimit: usage.shoppingSearchLimit,    // ✅ 쇼핑 추가
    shoppingSearchUsed: usage.shoppingSearchUsed,      // ✅ 쇼핑 추가
    canUseShoppingSearch: usage.canUseShoppingSearch,
    canUseTrendSearch: usage.canUseTrendSearch,
    trendSearchLimit: usage.trendSearchLimit,
    trendSearchUsed: usage.trendSearchUsed, // ✅ 쇼핑 사용 여부 추가
  }

  customDate.value = null
  autoExtend.value = selectedUser.value.autoExtend ?? false
  logSearch.value = { startDate: null }

  await fetchUserLogs(row.id)
  dialog.value = true
}

async function updateFeatureUsage(feature, enabled) {
  try {
    await api.put(`/api/v1/admin/users/${selectedUser.value.id}/feature-usage`, {
      feature,
      enabled
    })
    Dialog.create({
      title: '✅ 설정 완료',
      message: `${{
        single: '단일 검색',
        ranking: '랭킹 검색',
        shopping: '쇼핑 검색',
        trend: '트렌드 검색',
        related: '연관 검색',
        mixer: '키워드 조합기'
      }[feature]} 사용 여부가 저장되었습니다.`
    })
  } catch (err) {
    console.error('기능 설정 실패:', err)
    Dialog.create({
      title: '❌ 저장 실패',
      message: '기능 설정 중 오류가 발생했습니다.'
    })
  }
}


onMounted(fetchAllUsers)
</script>

<style scoped>
.page-container {
  padding-top: 120px;
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 120px;
}

.content-below-banner {
  width: 100%;
  background: #fff;
  padding: 12px 24px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.tabs-container {
  margin-top: 0;
}

.card-container { margin: 16px 0; }
.actions-cell > .q-btn { margin: 0 4px; }
.q-table tr:hover { background-color: #f5f7fa; }

.user-detail-row {
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
  margin-top: 10px;
}

.detail-item { min-width: 200px; flex: 1; }
</style>
