<script>
// import axios from "axios";
import "splitpanes/dist/splitpanes.css";
import { Splitpanes, Pane } from "splitpanes";
import NoteBookReader from "@/components/NoteBookReader.vue";

export default {
  components: {
    Splitpanes,
    Pane,
    NoteBookReader,
  },

  data() {
    return {
      displayMsg: "ここにNotebookをドロップ",
      notebook: null,
    };
  },

  methods: {
    ReadNotebook(notebook, fileName) {
      this.notebook = notebook;
      this.displayMsg = fileName;
    },
  },
};
</script>

<template>
  <splitpanes class="default-theme" style="height: 100vh">
    <pane size="20">
      <splitpanes horizontal class="default-theme">
        <pane size="10">
          <NoteBookReader
            :p_displayMsg="displayMsg"
            @notebook-loaded="ReadNotebook"
          />
        </pane>
        <pane size="90">
          <div style="height: 100%; overflow: scroll" v-if="notebook">
            <div v-for="cell in notebook.cells" :key="cell">
              <pre>{{ cell }}</pre>
              <hr />
              <br />
            </div>
          </div>
        </pane>
      </splitpanes>
    </pane>

    <pane size="80">
      <!-- <div style="height: 100%; overflow: scroll">
        <div v-for="cell in notebook.cells" :key="cell">
          <pre>{{ cell }}</pre>
          <hr />
          <br />
        </div>
      </div> -->
    </pane>
  </splitpanes>
</template>

<style scoped>
/* Scroll bar */
/* width */
::-webkit-scrollbar {
  width: 5px !important;
  height: 5px !important;
}

/* Track */
::-webkit-scrollbar-track {
  background: #f1f1f1 !important;
}

/* Handle */
::-webkit-scrollbar-thumb {
  background: rgb(213, 191, 113) !important;
  border-radius: 2.5px;
}

/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
  background: rgb(255, 200, 0) !important;
  border-radius: 2.5px;
}
</style>
