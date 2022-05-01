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
        host: "http://localhost:3000/",
        executions: "api/executions",
      },

      ajaxPending: false,

      notebook: null,
      cellTags: [],
      cellTagsInitial: [],
      students: {},
      currentStudentExecutions: null,
      currentCell: [],
      ws: null,
    };
  },

  methods: {
    GetExecutionData(notebook, cellTags) {
      this.notebook = notebook;
      this.cellTags = cellTags;

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
                this.students[execution.username] = {
                  __lastExecution: null,
                  executions: {},
                };
                for (const tagInitial of this.cellTagsInitial) {
                  this.students[execution.username]["executions"][tagInitial] =
                    [];
                }
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

      // this.ws = new WebSocket(`ws://${location.host}/`);
      this.ws = new WebSocket(`ws://localhost:3000/`);
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
          self.students[data.username] = {};
          for (const tagInitial of self.cellTagsInitial) {
            self.students[data.username][tagInitial] = [];
          }
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
              @notebook-loaded="GetExecutionData"
              @dblclick="
                if (this.notebook != null && this.cellTags.length > 0)
                  GetExecutionData(this.notebook, this.cellTags);
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

<style>
/*
@import "./assets/base.css";
*/

/* Scroll bar */
/* width */
::-webkit-scrollbar {
  width: 5px !important;
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
