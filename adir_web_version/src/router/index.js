import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import CustomInputView from "../views/CustomInputView.vue";
import DemandGenView from "../views/DemandGenView.vue";
import LoginView from "../views/LoginView.vue";
import PMaxView from "../views/PMaxView.vue";
import WelcomeView from "../views/WelcomeView.vue";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: LoginView,
  },
  {
    path: "/",
    name: "Welcome",
    component: WelcomeView,
    meta: { requiresAuth: true },
  },
  {
    path: "/pmax",
    name: "PMax",
    component: PMaxView,
    meta: { requiresAuth: true },
  },
  {
    path: "/demand-gen",
    name: "DemandGen",
    component: DemandGenView,
    meta: { requiresAuth: true },
  },
  {
    path: "/custom-input",
    name: "CustomInput",
    component: CustomInputView,
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
