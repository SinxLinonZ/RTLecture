import { createWebHashHistory, createRouter } from "vue-router";

import RTLecture from "@/views/RTLecture.vue";

const routes = [{ path: "/", component: RTLecture }];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
