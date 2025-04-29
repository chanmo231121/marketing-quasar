const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/KeywordSearch.vue') },
      { path: 'single-search', component: () => import('pages/KeywordSearch.vue') },
      { path: 'related-search', component: () => import('pages/Keyword2Search.vue') },
      { path: 'keyword-mix', component: () => import('pages/KeywordMix.vue') },
      { path: 'ranking-search', component: () => import('pages/KeywordRanking.vue') },
      { path: 'page5', component: () => import('pages/Keyword3Search.vue') }, // 아직 테스트 중
      { path: 'notices', component: () => import('pages/NoticesPage.vue') },
      { path: 'login', component: () => import('pages/LoginPage.vue') },
      { path: 'signup', component: () => import('pages/SignupPage.vue') },
      { path: 'profile', component: () => import('pages/ProfileEditPage.vue') },
      { path: 'admin/test', component: () => import('pages/AdminUserManagement.vue') },
      { path: 'shopping-ranking',  component: () => import('pages/ShoppingRankingPage.vue')
      }
    ]
  },

  {
    path: '/m',
    component: () => import('layouts/MobileMainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/KeywordSearch.vue') },
      { path: 'single-search', component: () => import('pages/KeywordSearch.vue') },
      { path: 'related-search', component: () => import('pages/Keyword2Search.vue') },
      { path: 'keyword-mix', component: () => import('pages/KeywordMix.vue') },
      { path: 'ranking-search', component: () => import('pages/KeywordRanking.vue') },
      { path: 'notices', component: () => import('pages/NoticesPage.vue') }
    ]
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
