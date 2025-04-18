import { boot } from 'quasar/wrappers'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true // ✅ 쿠키 전송 활성화
})

let isRefreshing = false
let subscribers: ((token: string) => void)[] = []

function onRefreshed(newAccessToken: string) {
  subscribers.forEach(callback => callback(newAccessToken))
  subscribers = []
}

function addSubscriber(callback: (token: string) => void) {
  subscribers.push(callback)
}

// ✅ 요청 시 accessToken 자동 첨부
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')

  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
  const userId = userInfo?.id
  const deviceId = userId ? localStorage.getItem(`deviceId_${userId}`) : null

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (deviceId) {
    config.headers['X-Device-Id'] = deviceId
  }

  return config
}, error => Promise.reject(error))

// ✅ 응답 인터셉터 - accessToken 만료 시 자동 재발급
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      console.log('🔄 Access Token 만료, refresh 시도...')

      if (isRefreshing) {
        return new Promise(resolve => {
          addSubscriber((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            resolve(api(originalRequest))
          })
        })
      }

      isRefreshing = true

      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/api/v1/refresh`,
          null,
          { withCredentials: true } // ✅ 쿠키 자동 포함
        )

        const newToken = res.headers['x-new-access-token']?.split(',')[0]?.trim()
        if (newToken) {
          console.log('🎫 새 AccessToken 발급:', newToken)
          localStorage.setItem('accessToken', newToken)
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          onRefreshed(newToken)
          return api(originalRequest)
        }

        return Promise.reject(error)
      } catch (e) {
        return Promise.reject(e)
      } finally {
        isRefreshing = false
      }
    }
    document.cookie

    return Promise.reject(error)
  }
)

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { axios, api }
