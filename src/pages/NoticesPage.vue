<template>
  <div id="app">
    <div class="content-below-banner">
      <h6><strong>Maglo - 공지사항</strong></h6>
      <p>서비스와 관련된 주요 공지사항을 확인할 수 있는 공간입니다.</p>
    </div>
    <header class="main-container">
      <q-card class="q-pa-md" style="max-width: 1000px; margin: 0 auto;">
        <q-list bordered separator>
          <q-expansion-item
            v-for="(notice) in paginatedNotices"
            :key="notice.id"
            expand-icon="mdi-chevron-down"
            expanded-icon="mdi-chevron-up"
            class="notice-item"
            expand-icon-class="text-primary q-mr-sm"
          >
            <template v-slot:header>
              <!-- ✅ 고정글 아닌 경우에만 번호 표시 -->
              <q-item-section avatar v-if="!notice.isPinned">
                <q-badge color="indigo" class="q-pa-sm">
                  {{
                    paginatedNotices
                      .filter(n => !n.isPinned)
                      .findIndex(n => n.id === notice.id) + 1
                  }}
                </q-badge>
              </q-item-section>

              <q-item-section class="text-left">
                <q-item-label class="text-weight-medium">
                  {{ notice.isPinned ? '📌' + notice.title : notice.title }}
                </q-item-label>
                <q-item-label caption class="q-mt-xs">👤 {{ notice.name }}</q-item-label>
              </q-item-section>
              <q-item-section side class="items-center">
                <span class="notice-date">🗓️ {{ notice.date }}</span>
              </q-item-section>
              <q-item-section
                v-if="userInfo.role === 'DEV' || userInfo.role === 'ADMIN'"
                side
              >
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
            <q-btn
              icon="edit"
              label="글쓰기"
              color="primary"
              @click="dialogVisible = true"
            />
          </div>
        </div>
      </q-card>

      <!-- 글쓰기 다이얼로그 -->
      <q-dialog v-model="dialogVisible" persistent>
        <q-card style="min-width: 900px; max-width: 1100px;">
          <!-- 글쓰기 다이얼로그에 체크박스 추가 -->
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
            <q-checkbox
              v-model="newPinned"
              label="📌 상단 고정"
              class="q-mt-sm"
            />
          </q-card-section>
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="❌ 닫기 (ESC)" @click="dialogVisible = false" />
            <q-btn flat label="✅ 저장" color="primary" @click="addNotice" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- 공지사항 수정 다이얼로그 -->
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
            <q-checkbox
              v-model="editPinned"
              label="📌 상단 고정"
              class="q-mt-sm"
            />
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
import { ref, computed, getCurrentInstance } from 'vue'
import { api } from 'boot/axios.js'
import { useUserStore } from 'stores/userStore'

export default {
  setup() {
    const notices = ref([])
    const pagination = ref({ page: 1, rowsPerPage: 15 })
    const dialogVisible = ref(false)
    const editDialogVisible = ref(false)
    const newTitle = ref('')
    const newContent = ref('')
    const editId = ref(null)
    const editTitle = ref('')
    const editContent = ref('')
    const userStore = useUserStore()
    const userInfo = userStore.userInfo
    const { proxy } = getCurrentInstance()
    const newPinned = ref(false)
    const editPinned = ref(false)

    const showDialog = (msg) => {
      proxy.$q.dialog({ title: '알림 📢', message: msg, ok: '확인' })
    }

    const fetchNotices = async () => {
      try {
        const res = await api.get('/api/v1/boards/all-boards')
        const sorted = res.data
          .sort((a, b) => {
            // 1. isPinned 먼저 정렬, 2. 날짜순 정렬
            if (a.isPinned && !b.isPinned) return -1
            if (!a.isPinned && b.isPinned) return 1
            return new Date(b.createdAt) - new Date(a.createdAt)
          })
        notices.value = sorted.map(notice => {
          const dateObj = new Date(notice.createdAt)
          const dayNames = ['일', '월', '화', '수', '목', '금', '토']
          const dateStr = dateObj.toLocaleDateString('ko-KR')
          const timeStr = dateObj.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
          })
          const day = dayNames[dateObj.getDay()]
          return {
            ...notice,
            date: `${dateStr} (${day}) ${timeStr}`
          }
        })
      } catch (err) {
        showDialog(err.response?.data?.message || '❌ 공지사항 조회 실패.')
      }
    }

    const addNotice = async () => {
      if (!newTitle.value || !newContent.value) return showDialog('제목과 내용을 입력해주세요.')
      try {
        await api.post('/api/v1/boards/create', {
          title: newTitle.value,
          content: newContent.value,
          isPinned: newPinned.value // 🆕 추가된 부분
        })
        dialogVisible.value = false
        newTitle.value = ''
        newContent.value = ''
        newPinned.value = false // 초기화
        await fetchNotices()
        showDialog('✅ 공지사항이 추가되었습니다.')
      } catch (err) {
        showDialog(err.response?.data?.message || '❌ 저장 실패')
      }
    }

    const openEditDialog = (notice) => {
      editId.value = notice.id
      editTitle.value = notice.title
      editContent.value = notice.content
      editPinned.value = notice.isPinned // ✅ 기존 고정 상태 반영
      editDialogVisible.value = true
    }

    const updateNotice = async () => {
      if (!editTitle.value || !editContent.value) return showDialog('제목과 내용을 모두 입력해주세요.')
      try {
        await api.put(`/api/v1/boards/${editId.value}`, {
          title: editTitle.value,
          content: editContent.value,
          isPinned: editPinned.value // ✅ 고정 여부도 함께 전송

        })
        editDialogVisible.value = false
        await fetchNotices()
        showDialog('🔄 공지사항이 수정되었습니다.')
      } catch (err) {
        showDialog(err.response?.data?.message || '❌ 수정 실패')
      }
    }

    const deleteNotice = async (id) => {
      try {
        proxy.$q.dialog({
          title: '🗑️ 삭제 확인',
          message: '⚠️ 이 공지사항을 삭제하시겠습니까?',
          cancel: true,
          ok: '삭제'
        }).onOk(async () => {
          await api.delete(`/api/v1/boards/${id}`)
          await fetchNotices()
          showDialog('🗑️ 공지사항이 삭제되었습니다.')
        })
      } catch (err) {
        console.error('공지사항 삭제 중 오류 발생:', err)
        showDialog('❌ 삭제 중 오류가 발생했습니다.')
      }
    }
    const maxPages = computed(() =>
      Math.ceil(notices.value.length / pagination.value.rowsPerPage)
    )

    const paginatedNotices = computed(() => {
      const start = (pagination.value.page - 1) * pagination.value.rowsPerPage
      return notices.value.slice(start, start + pagination.value.rowsPerPage)
    })

    fetchNotices()

    return {
      notices,
      dialogVisible,
      editDialogVisible,
      newTitle,
      newContent,
      editId,
      editTitle,
      editContent,
      pagination,
      maxPages,
      paginatedNotices,
      showDialog,
      addNotice,
      updateNotice,
      openEditDialog,
      deleteNotice,
      userInfo,
      newPinned,
      editPinned
    }
  }
}
</script>


<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  color: #2c3e50;
  text-align: center;
}
* {
  font-family: 'Nanum Gothic', sans-serif;
}
.main-container {
  width: 69.6%;
  margin: 250px auto 200px auto;
  text-align: center;
  padding-bottom: 120px; /* ✅ 여유 공간 추가 */

}
.content-below-banner {
  position: relative;
  top: 200px;
  max-width: 1000px;
  margin: 0 auto;
  padding: 10px;
  text-align: left;
}
.notice-item {
  cursor: pointer;
  transition: background 0.2s ease;
}
.notice-item:hover {
  background-color: #f5f5f5;
}
.notice-date {
  font-size: 13px;
  color: #777;
  margin-right: 10px;
}
.notice-content {
  padding: 50px;
  text-align: left;
  background-color: #fafafa;
  border-left: 3px solid #1976d2;
  border-radius: 4px;
}
.notice-content p {
  margin: 0;
  line-height: 1.6;
  white-space: pre-wrap;
}
.notice-number {
  font-weight: bold;
  font-size: 14px;
  color: white;
  background-color: #1976d2;
  padding: 6px 10px;
  border-radius: 20px;
  display: inline-block;
}
</style>
