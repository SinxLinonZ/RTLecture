<script>
import axios from "axios";
import "splitpanes/dist/splitpanes.css";
import { Splitpanes, Pane } from "splitpanes";
import "xterm/css/xterm.css";

import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { BarChart, ScatterChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
} from "echarts/components";
import { THEME_KEY } from "vue-echarts";

use([
  CanvasRenderer,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  BarChart,
  ScatterChart,
  LineChart,
]);

import NoteBookReader from "@/components/NoteBookReader.vue";
import StudentButton from "@/components/StudentButton.vue";
import CellButton from "@/components/CellButton.vue";
import CellExecution from "@/components/CellExecution.vue";

import PersonalProgressChart from "@/components/charts/PersonalProgressChart.vue";
import ErrorChart from "@/components/charts/ErrorChart.vue";
import TotalProgressChart from "@/components/charts/TotalProgressChart.vue";

export default {
  components: {
    Splitpanes,
    Pane,
    NoteBookReader,
    StudentButton,
    CellButton,
    CellExecution,

    PersonalProgressChart,
    ErrorChart,
    TotalProgressChart,
  },

  provide: {
    // [THEME_KEY]: "dark",
    [THEME_KEY]: null,
  },

  computed: {
    cellNameList() {
      let cellNameList = [];
      // Getting all cell names
      for (const uuid in this.cellNameMap) {
        cellNameList.push(this.cellNameMap[uuid]);
      }
      cellNameList.sort((a, b) => {
        return a.displayId > b.displayId ? 1 : -1;
      });
      return cellNameList;
    },
  },

  data() {
    return {
      APIEndpoint: {
        ws: `ws://${window.location.hostname}:3000/`,
        host: `http://${window.location.hostname}:3000/`,
        executions: "api/executions",
      },

      ajaxPending: false,
      displayMsg: "ipynbをここにドラッグ",

      fileName: "",
      notebook: null,
      uuidList: [],
      cellNameMap: null,
      students: {},

      ws: null,

      // Status management
      selectedStudentName: null,
      selectedStudentExecutions: null,
      selectedCellName: null,
      selectedCellExecutions: [],

      // for chart switch
      chart_cell_error_ErrSummary: false,

      debugMode: false,
    };
  },

  mounted() {
    // eslint-disable-next-line no-undef
    $(".menu .item").tab();
  },

  methods: {
    TotalProgressDotClicked(e) {
      const data = e.data[4];

      this.selectedStudentName = data.username;
      this.selectedCellName = this.cellNameMap[data.cellUuid].displayName;
      this.selectedStudentExecutions = this.students[data.username].executions;
      this.selectedCellExecutions =
        this.selectedStudentExecutions[data.cellUuid];

      // Switch to execution tab & Scroll into view
      this.$nextTick(() => {
        const titleElement = document.getElementById(`${data._id}_title`);
        titleElement.style.backgroundColor = "rgb(255, 239, 66)";

        this.$refs["tab-singleStudent"].click();
        setTimeout(() => {
          document.getElementById(`${data._id}_code`).scrollIntoView({
            behavior: "auto",
            block: "center",
            inline: "center",
          });
        }, 100);

        setTimeout(() => {
          titleElement.style.backgroundColor = "";
        }, 1000);
      });
    },

    InitStudent(username) {
      this.students[username] = {
        __lastExecution: null,
        executions: {},
      };
      for (const uuid of this.uuidList) {
        this.students[username]["executions"][uuid] = [];
      }
    },

    ParseNotebookCells(notebook, fileName, success) {
      this.notebook = notebook;
      this.fileName = fileName;
      this.displayMsg = "";

      if (!success) {
        this.displayMsg = "ipynbファイルが不正です";
        return;
      }

      /**
       ** cell checks
       */
      let flag_noUuids = true;
      let flag_noCodeCell = true;

      // no cell
      if (!notebook.cells || notebook.cells.length == 0) {
        this.displayMsg = "ipynbファイルにはコードセルがありません";
        return;
      }

      // no code cells or no uuids
      for (let i = 0; i < notebook.cells.length; i++) {
        const cell = notebook.cells[i];
        if (cell.cell_type == "code") {
          flag_noCodeCell = false;
        }
        if (cell.metadata?.RTL?.uuid) {
          flag_noUuids = false;
        }
      }
      if (flag_noCodeCell) {
        this.displayMsg = "ipynbファイルにはコードセルがありません";
        return;
      }
      if (flag_noUuids) {
        this.displayMsg = "ipynbファイルには対象セルがありません";
        return;
      }

      /**
       ** Cache all cell uuids
       */
      this.uuidList = [];
      for (let i = 0; i < notebook.cells.length; i++) {
        const cell = notebook.cells[i];

        if (cell.cell_type == "code" && cell.metadata.RTL.uuid) {
          this.uuidList.push(cell.metadata.RTL.uuid);
        }
      }

      this.cellNameMap = notebook.metadata.RTL.cellNameMap;
      this.displayMsg = notebook.metadata.RTL.lectureName || fileName;

      this.GetExecutionData(this.uuidList);
    },

    GetExecutionData(uuidList) {
      if (this.debugMode) {
        this.RegisterSubscription();
        return;
      }

      this.ajaxPending = true;

      this.students = {};
      this.selectedStudentExecutions = null;
      this.selectedStudentName = null;
      this.selectedCellExecutions = [];
      this.selectedCellName = null;

      axios
        .post(this.APIEndpoint.host + this.APIEndpoint.executions, {
          uuidList: uuidList,
        })
        .then((response) => {
          const data = response.data;

          // Initialize all students data
          for (const uuid in data) {
            const executions = data[uuid];
            for (const execution of executions) {
              // Init student if not exist
              if (!this.students[execution.username]) {
                this.InitStudent(execution.username);
              }

              this.students[execution.username]["executions"][uuid].push(
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

      if (this.debugMode) {
        this.ws = new WebSocket(`ws://${window.location.hostname}:4000/`);
      } else {
        this.ws = new WebSocket(this.APIEndpoint.ws);
      }
      const self = this;
      self.ws.onopen = function () {
        self.ws.send(
          JSON.stringify({
            type: "subscribe",
            data: {
              uuidList: self.uuidList,
            },
          })
        );
      };

      self.ws.onmessage = function (event) {
        let msg = JSON.parse(event.data);

        // Init student if not exist
        if (!self.students[msg.username]) {
          self.InitStudent(msg.username);
        }

        // Add execution to student
        self.students[msg.username]["executions"][msg.uuid].push(msg);
        self.students[msg.username].__lastExecution = msg;
      };
    },
  },
};
</script>

<template>
  <!-- 
  ---- Debug Mode
   -->
  <div
    class="ui segment"
    style="position: absolute; right: 10px; bottom: 10px; z-index: 100"
  >
    <div class="inline field">
      <div class="ui checkbox">
        <input type="checkbox" tabindex="0" v-model="debugMode" />
        <label>Debug Mode</label>
      </div>
    </div>
  </div>

  <!--
  ---- Main
  -->
  <main>
    <splitpanes class="default-theme" style="height: 100vh">
      <!--
      ---- Left
      -->
      <pane size="25">
        <splitpanes horizontal class="default-theme">
          <!--
          ---- Left top: Notebook loader
          -->
          <pane size="10">
            <!-- Double click to refresh current notebook -->
            <!-- 
              @notebook-loaded: notebook, filename, success
             -->
            <NoteBookReader
              :displayMsg="displayMsg"
              @notebook-loaded="ParseNotebookCells"
              @dblclick="
                if (this.notebook != null && this.uuidList.length > 0)
                  ParseNotebookCells(this.notebook, this.filename, true);
              "
            />
          </pane>
          <!--
          ---- Left bottom: list
          -->
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
                  :uuidList="uuidList"
                  :lastExecution="students[student].__lastExecution"
                  @click="
                    selectedStudentExecutions = students[student].executions;
                    selectedStudentName = student;
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
                  v-else-if="selectedStudentExecutions"
                  class="ui basic segments"
                >
                  <CellButton
                    v-for="uuid of uuidList"
                    :cellNameMap="cellNameMap"
                    :uuid="uuid"
                    :key="uuid"
                    :selectedStudentExecutions="selectedStudentExecutions"
                    @click="
                      selectedCellExecutions = selectedStudentExecutions[uuid];
                      selectedCellName = cellNameMap[uuid].displayName;
                    "
                  />
                </div>
              </pane>
            </splitpanes>
          </pane>
        </splitpanes>
      </pane>

      <!-- Right -->
      <pane size="75" style="overflow: hidden">
        <div
          class="ui pointing secondary menu"
          style="
            position: fixed;
            width: 100%;
            z-index: 10;
            background-color: #f2f2f2;
          "
        >
          <!-- Tabs -->
          <a
            class="item active"
            ref="tab-singleStudent"
            data-tab="singleStudent"
          >
            Current student ( {{ selectedStudentName }} -
            {{ selectedCellName }} )
          </a>
          <a class="item" data-tab="chart_personal_progress">
            <i class="chart line icon"></i>Personal Progress
          </a>
          <a class="item" data-tab="chart_cell_error">
            <i class="chart line icon"></i>Cell - Error
          </a>
          <a class="item" data-tab="chart_total_progress">
            <i class="chart line icon"></i>Cell - Total Progress Sumamry
          </a>
        </div>

        <!-- User executions -->
        <div
          class="ui active tab"
          ref="tab-singleStudent-view"
          data-tab="singleStudent"
          style="height: 100%; padding-top: 3.5em; overflow: scroll"
        >
          <template v-if="selectedCellExecutions.length > 0">
            <CellExecution
              v-for="execution of selectedCellExecutions.slice().reverse()"
              :key="execution._id"
              :execution="execution"
            />
          </template>
          <h1 v-else style="text-align: center; padding-top: 1em">
            No cell selected or no execution record
          </h1>
        </div>

        <!-- Personal Progress -->
        <div
          class="ui tab"
          data-tab="chart_personal_progress"
          style="height: 93%; padding-top: 3.5em; overflow: scroll"
        >
          <personal-progress-chart
            :selectedStudentExecutions="selectedStudentExecutions"
            :cellNameMap="cellNameMap"
            :cellNameList="cellNameList"
          />
        </div>

        <!-- Cell-error chart -->
        <div
          class="ui tab"
          data-tab="chart_cell_error"
          style="height: 93%; padding-top: 3.5em; overflow: scroll"
        >
          <error-chart
            :cellNameMap="cellNameMap"
            :students="students"
            :chart_cell_error_ErrSummary="chart_cell_error_ErrSummary"
          />

          <button
            style="position: absolute; right: 10px; top: 4em; z-index: 10"
            class="ui button"
            :class="{
              positive: chart_cell_error_ErrSummary,
            }"
            @click="chart_cell_error_ErrSummary = !chart_cell_error_ErrSummary"
          >
            エラー合計表示
          </button>
        </div>

        <!-- Total progress chart -->
        <div
          class="ui tab"
          data-tab="chart_total_progress"
          style="height: 93%; padding-top: 3.5em; overflow: scroll"
        >
          <total-progress-chart
            :cellNameMap="cellNameMap"
            :students="students"
            @total-progress-dot-clicked="TotalProgressDotClicked"
          />
        </div>
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
