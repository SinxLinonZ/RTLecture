<script>
export default {
  props: ["uuid", "cellNameMap", "currentStudentExecutions"],
  computed: {
    cellStatus() {
      if (!this.currentStudentExecutions) return [];

      let err = false;
      for (const execution of this.currentStudentExecutions[this.uuid]) {
        if (execution.result == "ok") {
          return ["green"];
        } else {
          err = true;
        }
      }

      return err ? ["red"] : ["grey"];
    },
  },
};
</script>

<template>
  <div class="ui segment inverted" :class="cellStatus">
    <p>{{ cellNameMap[uuid] }}</p>
  </div>
</template>

<style scoped>
.ui.segment {
  cursor: pointer;
  transition: transform 0.5s ease-out 0s;

  user-select: none;
}

.ui.segment:hover {
  transform: translateX(+10px);
}
</style>
