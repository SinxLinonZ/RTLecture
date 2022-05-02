<script>
import axios from "axios";
import "splitpanes/dist/splitpanes.css";
import { Splitpanes, Pane } from "splitpanes";
import "xterm/css/xterm.css";

import NoteBookReader from "@/components/NoteBookReader.vue";
import StudentButton from "@/components/StudentButton.vue";
import CellButton from "@/components/CellButton.vue";
import CellExecution from "@/components/CellExecution.vue";

export default {
  components: {
    Splitpanes,
    Pane,
    NoteBookReader,
    StudentButton,
    CellButton,
    CellExecution,
  },

  data() {
    return {
      APIEndpoint: {
        ws: "ws://localhost:3000/",
        host: "http://localhost:3000/",
        executions: "api/executions",
      },

      ajaxPending: false,
      displayMsg: "",

      fileName: "",
      notebook: null,
      cellNameMap: null,
      cellTags: [],
      cellTagsInitial: [],
      students: {},
      currentStudentExecutions: null,
      currentCell: [],
      ws: null,
    };
  },

  methods: {
    InitStudent(username) {
      this.students[username] = {
        __lastExecution: null,
        executions: {},
      };
      for (const tagInitial of this.cellTagsInitial) {
        this.students[username]["executions"][tagInitial] = [];
      }
    },

    ParseNotebookCells(notebook, fileName, success) {
      this.notebook = notebook;
      this.fileName = fileName;
      this.displayMsg = "";

      if (!success) return;

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

      this.cellTags = cellTags;
      this.notebookName = notebook.metadata.lectureName || fileName;
      // TODO: fetch from server if no cell name map in current notebook
      this.cellNameMap = notebook.metadata.cellNameMap;

      this.displayMsg = this.notebookName;

      this.GetExecutionData(this.cellTags);
    },

    GetExecutionData(cellTags) {
      this.ajaxPending = true;

      this.cellTagsInitial = [];
      this.students = {};
      this.currentStudentExecutions = null;
      this.currentCell = [];

      axios
        .post(this.APIEndpoint.host + this.APIEndpoint.executions, {
          tags: cellTags,
        })
        .then((response) => {
          const data = response.data;

          // Cache tag initial list
          for (const cellTag in data) {
            this.cellTagsInitial.push(cellTag);
          }

          // Initialize all students data
          for (const cellTag in data) {
            const executions = data[cellTag];
            for (const execution of executions) {
              // Init student if not exist
              if (!this.students[execution.username]) {
                this.InitStudent(execution.username);
              }

              this.students[execution.username]["executions"][cellTag].push(
                execution
              );
            }
          }

          this.ajaxPending = false;

          this.RegisterSubscription();
        })
        .catch((error) => {
          console.log(error);
        });
    },

    RegisterSubscription() {
      if (this.ws) {
        this.ws.close();
      }

      this.ws = new WebSocket(this.APIEndpoint.ws);
      const self = this;
      self.ws.onopen = function () {
        self.ws.send(
          JSON.stringify({
            type: "subscribe",
            data: {
              cellTagsInitial: self.cellTagsInitial,
            },
          })
        );
      };

      self.ws.onmessage = function (event) {
        let data = JSON.parse(event.data);

        // Init student if not exist
        if (!self.students[data.username]) {
          self.InitStudent(data.username);
        }

        // Add execution to student
        self.students[data.username]["executions"][data.tags[0]].push(data);
        self.students[data.username].__lastExecution = data;
      };
    },
  },
};
</script>

<template>
  <main>
    <splitpanes class="default-theme" style="height: 100vh">
      <!-- Left -->
      <pane size="25">
        <splitpanes horizontal class="default-theme">
          <!-- Header -->
          <pane size="10">
            <!-- 
            ---- Double click to refresh current notebook 
            -->
            <NoteBookReader
              :p_displayMsg="displayMsg"
              @notebook-loaded="ParseNotebookCells"
              @dblclick="
                if (this.notebook != null && this.cellTags.length > 0)
                  ParseNotebookCells(this.notebook, this.filename, true);
              "
            />
          </pane>
          <!-- List -->
          <pane size="90">
            <splitpanes class="default-theme">
              <!-- Student list -->
              <pane
                size="50"
                style="
                  overflow-x: hidden;
                  overflow-y: scroll;
                  grid-template-columns: 1fr;
                  grid-template-rows: 30px;
                  grid-auto-rows: minmax(30px, 30px);

                  align-items: center;
                  justify-items: center;
                "
                :style="{
                  display: ajaxPending ? 'block' : 'grid',
                }"
              >
                <!-- Pending loader -->
                <div
                  v-if="ajaxPending"
                  class="ui double loading form"
                  style="
                    height: 100%;
                    width: 100%;
                    grid-column-start: 1;
                    grid-column-end: -1;
                    grid-row-start: 1;
                    grid-row-end: -1;
                  "
                ></div>

                <StudentButton
                  v-else
                  v-for="(property, student) in students"
                  :username="student"
                  :executions="property.executions"
                  :key="student"
                  :cellTagsInitial="cellTagsInitial"
                  :lastExecution="students[student].__lastExecution"
                  @click="
                    currentStudentExecutions = students[student].executions
                  "
                />
              </pane>

              <!-- Cell list -->
              <pane size="50" style="overflow-x: hidden; overflow-y: scroll">
                <!-- Pending loader -->
                <div
                  v-if="ajaxPending"
                  class="ui double loading form"
                  style="
                    height: 100%;
                    width: 100%;
                    grid-column-start: 1;
                    grid-column-end: -1;
                  "
                ></div>

                <div
                  v-else-if="currentStudentExecutions"
                  class="ui basic segments"
                >
                  <CellButton
                    v-for="cellTag of cellTagsInitial"
                    :cellNameMap="cellNameMap"
                    :cellTag="cellTag"
                    :key="cellTag"
                    :currentStudentExecutions="currentStudentExecutions"
                    @click="currentCell = currentStudentExecutions[cellTag]"
                  />
                </div>
              </pane>
            </splitpanes>
          </pane>
        </splitpanes>
      </pane>

      <!-- Right -->
      <pane size="75" style="overflow: scroll">
        <template v-if="currentCell.length > 0">
          <CellExecution
            v-for="execution of currentCell.slice().reverse()"
            :key="execution._id"
            :execution="execution"
          />
        </template>
        <h1 v-else style="text-align: center">
          No cell selected or no execution record
        </h1>
      </pane>
    </splitpanes>
  </main>
</template>

<style scoped>
/*
@import "./assets/base.css";
*/

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
