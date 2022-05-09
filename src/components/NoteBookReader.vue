<template>
  <div
    @drop.prevent="getFile"
    @dragover.prevent
    @dragenter="
      (event) => (event.target.style.background = 'rgba(146, 146, 146, 0.4)')
    "
    @dragleave="(event) => (event.target.style.background = '')"
  >
    {{ displayMsg }}
  </div>
</template>

<script>
export default {
  props: ["displayMsg"],

  methods: {
    getFile(ev) {
      ev.target.style.background = "";
      let file = ev.dataTransfer.files[0];

      const self = this;
      const reader = new FileReader();
      reader.onload = function (event) {
        self.ParseNotebook(file.name, event.target.result);
      };
      reader.readAsText(file);
    },

    ParseNotebook(fileName, string) {
      let notebook;
      try {
        notebook = JSON.parse(string);
      } catch (e) {
        this.$emit("notebookLoaded", null, null, false);
        return;
      }

      this.$emit("notebookLoaded", notebook, fileName, true);
      return;
    },
  },
};
</script>

<style scoped>
div {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  text-align: center;
  font-size: 1.6em;
  place-self: center;
  padding: 0 2em;

  transition: all 0.3s ease-in-out;
  user-select: none;
}
</style>
