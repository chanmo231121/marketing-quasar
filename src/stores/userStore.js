import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    isLoggedIn: false,
    accessToken: '',
    userInfo: {
      id: '',
      name: '',
      email: '',
      role: '',
      status: '',         // ✅ 상태 추가
      approvedUntil: '',  // ✅ 만료일 추가
      deviceId: ''        // ✅ 디바이스 ID 추가
    }
  }),
  actions: {
    login(token, userData) {
      this.accessToken = token
      this.userInfo = userData
      this.isLoggedIn = true
      localStorage.setItem('accessToken', token)
      localStorage.setItem('userInfo', JSON.stringify(userData))
    },
    logout() {
      this.accessToken = ''
      this.userInfo = {
        id: '',
        name: '',
        email: '',
        role: '',
        status: '',
        approvedUntil: '',
        deviceId: ''
      }
      this.isLoggedIn = false
      localStorage.removeItem('accessToken')
      localStorage.removeItem('userInfo')
    },
    initialize() {
      const token = localStorage.getItem('accessToken')
      const userInfoStr = localStorage.getItem('userInfo')

      this.isLoggedIn = !!token
      this.accessToken = token || ''

      if (userInfoStr) {
        this.userInfo = JSON.parse(userInfoStr)
      }
    },
    setUserInfo(userData) {
      this.userInfo = userData
      localStorage.setItem('userInfo', JSON.stringify(userData)) // ✅ 이거 없으면 새로고침시 날아감
    }
  }
})
