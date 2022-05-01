import { createWebHistory, createRouter } from "vue-router";

import RTLecture from "../RTLecture.vue";

const routes = [{ path: "/", component: RTLecture }];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
