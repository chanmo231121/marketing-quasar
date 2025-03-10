const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      // 기본 경로에 KeywordSearch.vue가 표시되도록 변경
      { path: '', component: () => import('pages/KeywordSearch.vue') },
      // 필요하다면 /page1도 동일하게 KeywordSearch.vue로 지정하거나 삭제
      { path: 'page1', component: () => import('pages/KeywordSearch.vue') },
      { path: 'page2', component: () => import('pages/Keyword2Search.vue') },
      { path: 'page3', component: () => import('pages/keywordMix.vue') },
      { path: 'page4', component: () => import('pages/keywordRanking.vue') }
    ]
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
