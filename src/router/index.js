import { createWebHistory, createRouter } from "vue-router";

import RTLecture from "@/views/RTLecture.vue";
import LectureCreator from "@/views/LectureCreator.vue";

const routes = [
  { path: "/", component: RTLecture },
  { path: "/creator", component: LectureCreator },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
