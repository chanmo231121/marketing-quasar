<template>
  <div id="app">
    <!-- 배너 수정 영역 -->
    <div class="content-below-banner">
      <div v-if="isEditing">
        <input
          v-model="bannerTitle"
          class="banner-input"
          placeholder="배너 제목"
        />
        <textarea
          v-model="bannerContent"
          class="banner-textarea"
          rows="3"
          placeholder="배너 내용을 입력하세요 (줄바꿈 가능)"
        />
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
            v-if="userInfo.role === 'DEV' || userInfo.role === 'ADMIN'"
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

    <!-- 공지사항 본문 -->
    <header class="main-container">
      <q-card class="q-pa-md" style="max-width: 1000px; margin: 0 auto;">
        <q-list bordered separator>
          <q-expansion-item
            v-for="notice in paginatedNotices"
            :key="notice.id"
            expand-icon="mdi-chevron-down"
            expanded-icon="mdi-chevron-up"
            class="notice-item"
            expand-icon-class="text-primary q-mr-sm"
          >
            <template v-slot:header>
              <q-item-section avatar v-if="!notice.isPinned">
                <q-badge color="indigo" class="q-pa-sm">
                  {{ paginatedNotices.filter(n => !n.isPinned).findIndex(n => n.id === notice.id) + 1 }}
                </q-badge>
              </q-item-section>
              <q-item-section class="text-left">
                <q-item-label class="text-weight-medium">
                  {{ notice.isPinned ? '📌 ' + notice.title : notice.title }}
                </q-item-label>
                <q-item-label caption class="q-mt-xs">👤 {{ notice.name }}</q-item-label>
              </q-item-section>
              <q-item-section side class="items-center">
                <span class="notice-date">🗓️ {{ notice.date }}</span>
              </q-item-section>
              <q-item-section v-if="userInfo.role === 'DEV' || userInfo.role === 'ADMIN'" side>
                <div class="row no-wrap items-center q-gutter-x-sm">
                  <q-btn flat dense icon="edit" @click.stop="openEditDialog(notice)" />
                  <q-btn flat dense icon="delete" color="negative" @click.stop="deleteNotice(notice.id)" />
                </div>
              </q-item-section>
            </template>
            <q-card class="q-pa-sm notice-content">
              <p>📢 {{ notice.content }}</p>
            </q-card>
          </q-expansion-item>
        </q-list>

        <div class="row q-mt-md items-center justify-between">
          <div class="col-auto q-mx-auto">
            <q-pagination
              v-model="pagination.page"
              :max="maxPages"
              max-pages="7"
              boundary-numbers
              direction-links
              color="primary"
            />
          </div>
          <div class="col-auto" v-if="userInfo.role === 'DEV' || userInfo.role === 'ADMIN'">
            <q-btn icon="edit" label="글쓰기" color="primary" @click="dialogVisible = true" />
          </div>
        </div>
      </q-card>

      <!-- 글쓰기 다이얼로그 -->
      <q-dialog v-model="dialogVisible" persistent>
        <q-card style="min-width: 900px; max-width: 1100px;">
          <q-card-section class="q-pa-lg">
            <div class="text-h6 q-mb-md">📝 공지사항 작성</div>
            <q-input v-model="newTitle" label="제목" class="q-mb-md" />
            <q-input
              v-model="newContent"
              label="내용을 입력해주세요"
              type="textarea"
              autogrow
              class="q-mb-md"
              :style="{ minHeight: '200px' }"
            />
            <q-checkbox v-model="newPinned" label="📌 상단 고정" class="q-mt-sm" />
          </q-card-section>
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="❌ 닫기 (ESC)" @click="dialogVisible = false" />
            <q-btn flat label="✅ 저장" color="primary" @click="addNotice" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- 수정 다이얼로그 -->
      <q-dialog v-model="editDialogVisible" persistent>
        <q-card style="min-width: 900px; max-width: 1100px;">
          <q-card-section class="q-pa-lg">
            <div class="text-h6 q-mb-md">✏️ 공지사항 수정</div>
            <q-input v-model="editTitle" label="제목" class="q-mb-md" />
            <q-input
              v-model="editContent"
              label="내용을 수정하세요"
              type="textarea"
              autogrow
              class="q-mb-md"
              :style="{ minHeight: '200px' }"
            />
            <q-checkbox v-model="editPinned" label="📌 상단 고정" class="q-mt-sm" />
          </q-card-section>
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="닫기" @click="editDialogVisible = false" />
            <q-btn flat label="수정 완료" color="primary" @click="updateNotice" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </header>
  </div>
</template>

<script>
import { ref, computed, getCurrentInstance, onMounted } from 'vue'
import { api } from 'boot/axios.js'
import { useUserStore } from 'stores/userStore'
import { storeToRefs } from 'pinia'

export default {
  setup() {
    // 배너 수정 상태
    const bannerTitle = ref('Maglo - 공지사항')
    const bannerContent = ref('서비스와 관련된 주요 공지사항을 확인할 수 있는 공간입니다.')
    const isEditing = ref(false)

    const userStore = useUserStore()
    const { userInfo } = storeToRefs(userStore)
    const { proxy } = getCurrentInstance()
    const showDialog = msg => proxy.$q.dialog({ title: '알림 📢', message: msg, ok: '확인' })

    const fetchBanner = async () => {
      try {
        const res = await api.get('/api/v1/banner', { params: { page: 'notice' } })
        bannerTitle.value = res.data.title
        bannerContent.value = res.data.description1
      } catch { /* empty */ }
    }
    const saveBanner = async () => {
      try {
        await api.put(
          '/api/v1/banner/update',
          { title: bannerTitle.value, description1: bannerContent.value, description2: '' },
          { params: { page: 'notice' } }
        )
        isEditing.value = false
        showDialog('✅ 배너가 저장되었습니다.')
      } catch {
        showDialog('❌ 배너 저장 실패')
      }
    }
    const startEdit = () => (isEditing.value = true)
    const cancelEdit = () => { isEditing.value = false; fetchBanner() }
    onMounted(fetchBanner)

    // 공지사항 상태
    const notices = ref([])
    const pagination = ref({ page: 1, rowsPerPage: 15 })
    const dialogVisible = ref(false)
    const editDialogVisible = ref(false)
    const newTitle = ref('')
    const newContent = ref('')
    const newPinned = ref(false)
    const editId = ref(null)
    const editTitle = ref('')
    const editContent = ref('')
    const editPinned = ref(false)

    const fetchNotices = async () => {
      try {
        const res = await api.get('/api/v1/boards/all-boards')
        const sorted = res.data.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1
          if (!a.isPinned && b.isPinned) return 1
          return new Date(b.createdAt) - new Date(a.createdAt)
        })
        notices.value = sorted.map(notice => {
          const d = new Date(notice.createdAt)
          const days = ['일','월','화','수','목','금','토']
          return {
            ...notice,
            date: `${d.toLocaleDateString('ko-KR')} (${days[d.getDay()]}) ${d.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}`
          }
        })
      } catch (e) {
        showDialog(e.response?.data?.message || '❌ 공지사항 조회 실패.')
      }
    }

    const addNotice = async () => {
      if (!newTitle.value || !newContent.value) return showDialog('제목과 내용을 입력해주세요.')
      try {
        await api.post('/api/v1/boards/create', { title: newTitle.value, content: newContent.value, isPinned: newPinned.value })
        dialogVisible.value = false
        newTitle.value = ''
        newContent.value = ''
        newPinned.value = false
        await fetchNotices()
        showDialog('✅ 공지사항이 추가되었습니다.')
      } catch {
        showDialog('❌ 저장 실패')
      }
    }

    const openEditDialog = notice => {
      editId.value = notice.id
      editTitle.value = notice.title
      editContent.value = notice.content
      editPinned.value = notice.isPinned
      editDialogVisible.value = true
    }

    const updateNotice = async () => {
      if (!editTitle.value || !editContent.value) return showDialog('제목과 내용을 모두 입력해주세요.')
      try {
        await api.put(`/api/v1/boards/${editId.value}`, { title: editTitle.value, content: editContent.value, isPinned: editPinned.value })
        editDialogVisible.value = false
        await fetchNotices()
        showDialog('🔄 공지사항이 수정되었습니다.')
      } catch {
        showDialog('❌ 수정 실패')
      }
    }

    const deleteNotice = async id => {
      proxy.$q.dialog({ title: '🗑️ 삭제 확인', message: '⚠️ 이 공지사항을 삭제하시겠습니까?', cancel: true, ok: '삭제' })
        .onOk(async () => {
          await api.delete(`/api/v1/boards/${id}`)
          await fetchNotices()
          showDialog('🗑️ 공지사항이 삭제되었습니다.')
        })
    }

    const maxPages = computed(() => Math.ceil(notices.value.length / pagination.value.rowsPerPage))
    const paginatedNotices = computed(() => {
      const start = (pagination.value.page - 1) * pagination.value.rowsPerPage
      return notices.value.slice(start, start + pagination.value.rowsPerPage)
    })

    // 초기 데이터 로드
    fetchNotices()

    return {
      bannerTitle, bannerContent, isEditing, startEdit, cancelEdit, saveBanner,
      notices, pagination, dialogVisible, editDialogVisible,
      newTitle, newContent, newPinned, editId, editTitle, editContent, editPinned,
      paginatedNotices, maxPages, openEditDialog, addNotice, updateNotice, deleteNotice,
      userInfo
    }
  }
}
</script>

<style scoped>
/* 배너 스타일 */
.content-below-banner {
  position: relative;
  top: 200px;
  left: 0;
  width: 100%;
  padding: 10px;
  background: #fff;
  max-width: 1000px;
  margin: 0 auto;
  text-align: left;
  font-family: Arial, sans-serif;
  color: #333;
  z-index: 10;
}
.banner-input, .banner-textarea { width: 100%; padding: 8px; margin-bottom: 6px; border: 1px solid #ccc; border-radius:4px }
.edit-actions { margin-top:6px }
.save-btn { background:#4CAF50;color:#fff;padding:6px 12px;border:none;border-radius:4px;cursor:pointer;margin-right:6px }
.cancel-btn { background:#ccc;color:#333;padding:6px 12px;border:none;border-radius:4px;cursor:pointer }
.inline-edit-btn { position: relative; z-index:11; cursor:pointer }
.banner-paragraph { white-space: pre-wrap }

/* 공지사항 스타일 */
#app { font-family:Avenir,Helvetica,Arial,sans-serif; color:#2c3e50; text-align:center }
* { font-family:'Nanum Gothic',sans-serif }
.main-container { width:69.6%; margin:250px auto 200px; text-align:center; padding-bottom:120px }
.notice-item { cursor:pointer; transition:background .2s }
.notice-item:hover { background:#f5f5f5 }
.notice-date { font-size:13px; color:#777; margin-right:10px }
.notice-content { padding:50px; text-align:left; background:#fafafa; border-left:3px solid #1976d2; border-radius:4px }
.notice-content p { margin:0; line-height:1.6; white-space: pre-wrap }
</style>
