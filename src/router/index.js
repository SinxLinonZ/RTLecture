import { createWebHistory, createRouter } from "vue-router";

import RTLecture from "@/views/RTLecture.vue";
import LectureCreator from "@/views/LectureCreator.vue";

const routes = [
  {
    path: "/",
    component: RTLecture,
    name: "rt-lecture",
    meta: { title: "RTLecture" },
  },
  {
    path: "/creator",
    component: LectureCreator,
    name: "LectureCreator",
    meta: { title: "Lecture Creator" },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Set route title
router.beforeEach((to, from, next) => {
  document.title = to.meta.title;
  next();
});

export default router;
