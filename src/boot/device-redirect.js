export default async ({ router }) => {
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)

  router.beforeEach((to, from, next) => {
    const isOnMobileLayout = to.path.startsWith('/m')
    if (isMobile && !isOnMobileLayout) {
      next({ path: `/m${to.fullPath}` }) // 모바일로 리디렉션
    } else if (!isMobile && isOnMobileLayout) {
      next({ path: to.fullPath.replace(/^\/m/, '') }) // PC로 리디렉션
    } else {
      next()
    }
  })
}
