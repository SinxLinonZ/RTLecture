<script>
export default {
  props: ["username", "executions", "uuidList", "lastExecution"],

  computed: {
    progress() {
      let success = 0;
      // Get success & failed cells
      for (const uuid in this.executions) {
        let cellExecutions = this.executions[uuid];
        let succeedCount = cellExecutions.filter(
          (e) => e.result == "ok"
        ).length;
        if (succeedCount > 0) success++;
      }

      return Math.floor((success / this.uuidList.length) * 100);
    },

    currentPosition() {
      if (this.lastExecution) {
        return Math.floor(
          ((this.uuidList.indexOf(this.lastExecution.uuid) + 1) /
            this.uuidList.length) *
            100
        );
      } else {
        return 0;
      }
    },
  },
};
</script>

<template>
  <div
    :style="{
      backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0) ${currentPosition}%, #ff1df8 ${currentPosition}%, rgba(0,0,0,0) ${
        currentPosition + 2
      }%),
      linear-gradient(90deg, #00dd00 ${progress}%, white ${progress}%)`,
    }"
  >
    {{ username }}
  </div>
</template>

<style scoped>
div {
  height: 80%;
  width: 90%;
  padding: 0 5px;
  overflow: hidden;
  cursor: pointer;

  font-weight: bold;

  user-select: none;
}

div:hover {
  border: black 1px solid;
  border-radius: 5px;
}
</style>
