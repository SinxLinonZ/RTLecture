<script>
// import axios from "axios";
import "splitpanes/dist/splitpanes.css";
import { Splitpanes, Pane } from "splitpanes";
import "highlight.js/styles/monokai.css";
import Markdown from "vue3-markdown-it";
import NoteBookReader from "@/components/NoteBookReader.vue";

export default {
  components: {
    Splitpanes,
    Pane,
    Markdown,
    NoteBookReader,
  },

  data() {
    return {
      notebook: null,
      displayMsg: "ここにNotebookをドロップ",
    };
  },

  methods: {
    InitNotebook(notebook, fileName) {
      // Init notebook metadata
      if (!notebook.metadata) notebook.metadata = {};
      if (!notebook.metadata.lectureName) notebook.metadata.lectureName = "";
      if (!notebook.metadata.lecturerName) notebook.metadata.lecturerName = "";

      // Init code cells
      for (let cell of notebook.cells) {
        if (cell.cell_type != "code") continue;

        if (!cell.metadata) cell.metadata = {};
        if (!cell.metadata.targetCell) cell.metadata.targetCell = false;
        if (!cell.metadata.tags) cell.metadata.tags = [];
        if (!cell.metadata.displayName) cell.metadata.displayName = "";
        if (!cell.metadata.judge) cell.metadata.judge = {};
        if (!cell.metadata.judge.type) cell.metadata.judge.type = "";
        if (!cell.metadata.judge.data) cell.metadata.judge.data = "";
      }

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
            @notebook-loaded="InitNotebook"
          />
        </pane>
        <pane size="90">
          <div
            v-if="notebook"
            style="height: 100%; overflow: scroll; padding: 1em"
          >
            <div class="ui form">
              <div class="field">
                <label>授業名</label>
                <input
                  type="text"
                  placeholder="授業名"
                  v-model="notebook.metadata.lectureName"
                />
              </div>
              <div class="field">
                <label>講師名</label>
                <input
                  type="text"
                  placeholder="講師名"
                  v-model="notebook.metadata.lecturerName"
                />
              </div>
              <div class="field" style="text-align: right">
                <button
                  class="ui button primary"
                  :class="{
                    disabled:
                      !notebook.metadata.lectureName ||
                      !notebook.metadata.lecturerName,
                  }"
                  type="submit"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </pane>
      </splitpanes>
    </pane>

    <pane size="80">
      <div
        v-if="notebook"
        style="
          height: 100%;
          overflow: scroll;
          padding: 1em;
          display: grid;
          grid-template-columns: auto 1fr 2fr;
          grid-template-rows: auto;
          column-gap: 1em;
        "
      >
        <template v-for="cell in notebook.cells" :key="cell">
          <!-- Checkbox -->
          <div style="place-self: center">
            <div v-if="cell.cell_type == 'code'" class="ui slider checkbox">
              <input type="checkbox" v-model="cell.metadata.targetCell" />
              <label>対象セル</label>
            </div>
          </div>

          <Markdown
            v-if="cell.cell_type == 'markdown'"
            :source="cell.source.join('')"
          />
          <pre class="codeCell" v-else-if="cell.cell_type == 'code'">{{
            cell.source.join("")
          }}</pre>
          <pre v-else>{{ cell.source.join("") }}</pre>

          <div
            class="ui form"
            style="
              border-left: 1px black solid;
              padding-left: 1em;
              display: flex;
              align-items: center;
            "
          >
            <div
              v-if="cell.cell_type == 'code'"
              class="fields"
              style="margin: 0; width: 100%"
              :class="{ disabled: !cell.metadata.targetCell }"
            >
              <div class="six wide field">
                <input
                  type="text"
                  placeholder="セル名"
                  v-model="cell.metadata.displayName"
                />
              </div>
              <div class="four wide field">
                <select v-model="cell.metadata.judge.type">
                  <option disabled value="">判断方法</option>
                  <option value="execResult">実行成功</option>
                  <option value="fullMatch">完全マッチング</option>
                  <option value="callback">カスタマイズ関数</option>
                </select>
              </div>
              <div
                class="six wide field"
                v-show="cell.metadata.judge.type == 'callback'"
              >
                <textarea
                  v-model="cell.metadata.judge.data"
                  placeholder="カスタマイズ関数"
                  rows="1"
                />
              </div>
            </div>
          </div>
        </template>
      </div>
    </pane>
  </splitpanes>
</template>

<style scoped>
code {
  background: #f8f8f8;
}

pre.codeCell {
  border: 1px solid #ccc;
  padding: 1em;
  background: white;
  height: fit-content;
  margin: auto 0;
}

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
