<script>
// import axios from "axios";
import "splitpanes/dist/splitpanes.css";
import { Splitpanes, Pane } from "splitpanes";
import "highlight.js/styles/monokai.css";
import Markdown from "vue3-markdown-it";
import { v4 } from "uuid";
import md5 from "md5";
import NoteBookReader from "@/components/NoteBookReader.vue";

export default {
  components: {
    Splitpanes,
    Pane,
    Markdown,
    NoteBookReader,
  },

  computed: {
    validTargetCells() {
      if (!this.notebook) return false;

      const targetCells = this.notebook.cells.filter((cell) => {
        return cell.cell_type == "code" && cell.metadata.targetCell == true;
      });

      for (const cell of targetCells) {
        if (cell.metadata.displayName == "") return false;
        if (cell.metadata.judge.type == "") return false;

        // No matching/callback data
        if (
          cell.metadata.judge.type == "fullMatch" ||
          cell.metadata.judge.type == "callback"
        ) {
          if (cell.metadata.judge.data == "") return false;
        }
      }

      return true;
    },
  },

  data() {
    return {
      notebook: null,
      displayMsg: "ここにNotebookをドロップ",

      // Auto naming
      cellNameInitial: "",
    };
  },

  methods: {
    GenerateNotebook() {
      let cellNameMap = {};

      for (let cell of this.notebook.cells) {
        if (cell.cell_type != "code" || !cell.metadata.targetCell) continue;

        let uuid = v4();
        cell.metadata.tags = [uuid];
        cellNameMap[uuid] = cell.metadata.displayName;

        // clear all cell status
        cell.execution_count = null;
        cell.outputs = [];
      }

      this.notebook.metadata.cellNameMap = cellNameMap;

      // sign the notebook
      delete this.notebook.metadata.lectureSignature;
      this.notebook.metadata.lectureSignature = md5(
        JSON.stringify(this.notebook)
      );

      // save the notebook
      let element = document.createElement("a");
      element.setAttribute(
        "href",
        "data:text/plain;charset=utf-8," +
          encodeURIComponent(JSON.stringify(this.notebook))
      );
      element.setAttribute("download", this.displayMsg);
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    },

    InitNotebook(notebook, fileName, success) {
      this.displayMsg = "";
      this.notebook = null;
      if (!success) {
        this.displayMsg = "ipynbファイルが不正です";
        return;
      }

      // Init notebook metadata
      if (!notebook.metadata) notebook.metadata = {};
      if (!notebook.metadata.lectureName) notebook.metadata.lectureName = "";
      if (!notebook.metadata.lecturerName) notebook.metadata.lecturerName = "";

      // Init code cells
      for (let cell of notebook.cells) {
        if (cell.cell_type != "code") continue;

        if (!cell.metadata) cell.metadata = {};
        if (typeof cell.metadata.targetCell != "boolean")
          cell.metadata.targetCell = true;
        if (!cell.metadata.tags) cell.metadata.tags = [];
        if (!cell.metadata.displayName) cell.metadata.displayName = "";
        if (!cell.metadata.judge) cell.metadata.judge = {};
        if (!cell.metadata.judge.type) cell.metadata.judge.type = "";
        if (!cell.metadata.judge.data) cell.metadata.judge.data = "";
      }

      this.notebook = notebook;
      this.displayMsg = fileName;
    },

    /**
     * Features
     */
    AutoNaming() {
      let targetCells = this.notebook.cells.filter((cell) => {
        return cell.cell_type == "code" && cell.metadata.targetCell == true;
      });

      let i = 1;
      for (let cell of targetCells) {
        cell.metadata.displayName = this.cellNameInitial + i;
        i++;
      }
    },

    SetAllJudgeTo(e) {
      const targetValue = e.target.value;

      let targetCells = this.notebook.cells.filter((cell) => {
        return cell.cell_type == "code" && cell.metadata.targetCell == true;
      });
      for (let cell of targetCells) {
        cell.metadata.judge.type = targetValue;
      }

      // reset global setter value
      e.target.value = "";
    },

    EnableTargetAll() {
      let targetCells = this.notebook.cells.filter((cell) => {
        return cell.cell_type == "code";
      });
      for (let cell of targetCells) {
        cell.metadata.targetCell = true;
      }
    },
    DisableTargetAll() {
      let targetCells = this.notebook.cells.filter((cell) => {
        return cell.cell_type == "code";
      });
      for (let cell of targetCells) {
        cell.metadata.targetCell = false;
      }
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
            :displayMsg="displayMsg"
            @notebook-loaded="InitNotebook"
          />
        </pane>
        <pane size="90">
          <div
            v-if="notebook"
            style="height: 100%; overflow: scroll; padding: 1em"
          >
            <h3>教材設定</h3>

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
                      !notebook.metadata.lecturerName ||
                      validTargetCells == 0,
                  }"
                  type="submit"
                  @click="GenerateNotebook"
                >
                  保存
                </button>
              </div>

              <!-- 
              --- Feature area
              -->
              <hr />
              <h3>一括設定</h3>

              <!-- One-click set judge -->
              <div class="field">
                <label>対象セル設定</label>
              </div>
              <div class="inline field">
                <button class="ui button positive" @click="EnableTargetAll">
                  全部ON
                </button>
                <button class="ui button negative" @click="DisableTargetAll">
                  全部OFF
                </button>
              </div>

              <!-- Auto naming -->
              <div class="field">
                <label>自動セル名付け</label>
                <input
                  type="text"
                  placeholder="セル名イニシャル"
                  v-model="cellNameInitial"
                />
              </div>
              <div class="field" style="text-align: right">
                <button class="ui button secondary" @click="AutoNaming">
                  付ける
                </button>
              </div>

              <!-- One-click set judge -->
              <div class="field">
                <label>判断方法設定</label>
                <select @change="SetAllJudgeTo">
                  <option selected disabled value="">
                    -- 判断方法を選択 --
                  </option>
                  <option value="execResult">実行成功</option>
                  <option value="fullMatch">完全マッチング</option>
                  <option value="callback">カスタマイズ関数</option>
                </select>
              </div>

              <!-- 
              --- Medatada
              -->
              <hr />
              <h3>教材情報</h3>
              <div class="field">
                <label>シグネチャー</label>
                <input
                  class="transparent"
                  type="text"
                  style="padding-top: 0"
                  readonly
                  placeholder="シグネチャー"
                  v-model="notebook.metadata.lectureSignature"
                />
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
                v-show="
                  cell.metadata.judge.type == 'callback' ||
                  cell.metadata.judge.type == 'fullMatch'
                "
              >
                <textarea
                  v-model="cell.metadata.judge.data"
                  :placeholder="
                    cell.metadata.judge.type == 'callback'
                      ? 'カスタマイズ関数'
                      : 'マッチング文字列'
                  "
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
