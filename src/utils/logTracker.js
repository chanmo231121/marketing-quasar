import { api } from 'boot/axios.js'

export function logTracker() {
  const sendLog = async ({ actionType, keyword = '-', ip = null }) => {
    try {
      const uuid = localStorage.getItem('deviceId') || 'UNKNOWN_DEVICE';

      await api.post('/api/admin/logs/log', {
        uuid,
        keyword,
        ip,
        actionType
      });
    } catch (e) {
      console.warn('❌ 로그 전송 실패:', e);
    }
  }

  return { sendLog }
}
