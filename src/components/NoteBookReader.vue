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
  data() {
    return {
      displayMsg: "ipynbをここにドラッグ",
      notebookName: "",
    };
  },

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
        this.displayMsg = "ipynbファイルが不正です";
        return;
      }

      /**
       ** cell checks
       */
      let flag_noTags = true;
      let flag_noCodeCell = true;

      // no cell
      if (!notebook.cells || notebook.cells.length == 0) {
        this.displayMsg = "ipynbファイルにはコードセルがありません";
        return;
      }

      // no code cell or no tags
      for (let i = 0; i < notebook.cells.length; i++) {
        const cell = notebook.cells[i];
        if (cell.cell_type == "code") {
          flag_noCodeCell = false;
        }
        if (cell.metadata.tags && cell.metadata.tags.length > 0) {
          flag_noTags = false;
        }
      }
      if (flag_noCodeCell) {
        this.displayMsg = "ipynbファイルにはコードセルがありません";
        return;
      }
      if (flag_noTags) {
        this.displayMsg = "ipynbファイルにはタグがありません";
        return;
      }

      // Cache all cell tags
      let cellTags = [];
      for (let i = 0; i < notebook.cells.length; i++) {
        const cell = notebook.cells[i];

        if (
          cell.cell_type == "code" &&
          cell.metadata.tags &&
          cell.metadata.tags.length > 0
        ) {
          cellTags.push(cell.metadata.tags);
        }
      }

      this.notebookName = notebook.metadata.lectureName || fileName;
      this.displayMsg = this.notebookName;
      this.$emit("notebookLoaded", notebook, cellTags);
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
