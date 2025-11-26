import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import AssetGenerationView from "../views/AssetGenerationView.vue";
import AssetPreviewView from "../views/AssetPreviewView.vue";
import AssetRemovalView from "../views/AssetRemovalView.vue";
import LoginView from "../views/LoginView.vue";
import WelcomeView from "../views/WelcomeView.vue";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: LoginView,
  },
  {
    path: "/help",
    name: "Help",
    component: () => import("../views/HelpView.vue"),
  },
  {
    path: "/",
    name: "Welcome",
    component: WelcomeView,
    meta: { requiresAuth: true },
  },
  {
    path: "/asset-removal",
    name: "AssetRemoval",
    component: AssetRemovalView,
    meta: { requiresAuth: true },
  },
  {
    path: "/asset-generation",
    name: "AssetGeneration",
    component: AssetGenerationView,
    meta: { requiresAuth: true },
  },
  {
    path: "/asset-preview",
    name: "AssetPreview",
    component: AssetPreviewView,
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const isAuthenticated = authStore.isAuthenticated;

  if (
    to.matched.some((record) => record.meta.requiresAuth) &&
    !isAuthenticated
  ) {
    if (authStore.accessToken) {
      authStore.logout();
    }
    next("/login");
  } else if (to.name === "Login" && isAuthenticated) {
    next("/");
  } else {
    next();
  }
});

export default router;
