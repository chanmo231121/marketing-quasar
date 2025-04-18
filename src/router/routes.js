// src/router/routes.js

const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/KeywordSearch.vue') },
      { path: 'page1', component: () => import('pages/KeywordSearch.vue') },
      { path: 'page2', component: () => import('pages/Keyword2Search.vue') },
      { path: 'page3', component: () => import('pages/keywordMix.vue') },
      { path: 'page4', component: () => import('pages/keywordRanking.vue') },
      { path: 'page5', component: () => import('pages/keyword3Search.vue') },
      { path: 'notices', component: () => import('pages/NoticesPage.vue') },
      { path: 'login', component: () => import('pages/LoginPage.vue') },
      { path: 'signup', component: () => import('pages/SignupPage.vue') },
      { path: 'profile', component: () => import('pages/ProfileEditPage.vue') },
      { path: 'admin/test', component: () => import('pages/AdminUserManagement.vue') }
    ]
  },
  {
    path: '/m',
    component: () => import('layouts/MobileMainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/KeywordSearch.vue') },
      { path: 'page1', component: () => import('pages/KeywordSearch.vue') },
      { path: 'page2', component: () => import('pages/Keyword2Search.vue') },
      { path: 'page3', component: () => import('pages/keywordMix.vue') },
      { path: 'page4', component: () => import('pages/keywordRanking.vue') },
      { path: 'notices', component: () => import('pages/NoticesPage.vue') }
    ]
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
