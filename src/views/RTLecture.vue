<script>
import axios from "axios";
import "splitpanes/dist/splitpanes.css";
import { Splitpanes, Pane } from "splitpanes";
import "xterm/css/xterm.css";

import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { BarChart, ScatterChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
} from "echarts/components";
import VChart, { THEME_KEY } from "vue-echarts";

use([
  CanvasRenderer,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  BarChart,
  ScatterChart,
]);

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
    VChart,
  },

  provide: {
    [THEME_KEY]: "dark",
  },

  computed: {
    chartOptions() {
      let cellNameList = [];
      let executionList = [];
      let errorList = [];

      // Getting all cell names
      for (const uuid in this.cellNameMap) {
        cellNameList.push(this.cellNameMap[uuid]);
      }
      cellNameList.reverse();

      // Getting all executions
      for (const studentName in this.students) {
        let student = this.students[studentName];
        for (const uuid in student.executions) {
          for (const execution of student.executions[uuid]) {
            executionList.push(execution);

            // Getting all errors
            if (execution.result == "ok") {
              if (errorList.indexOf("ok") == -1) {
                errorList.push("ok");
              }
            } else {
              if (errorList.indexOf(execution.errName) == -1) {
                errorList.push(execution.errName);
              }
            }
          }
        }
      }

      let option = {};
      let errorCellCountMap = {};
      let executionTotalSummary = {};
      let executionTotalSummarySeries = {};

      /*
       * Loop all executions
       */
      for (const execution of executionList) {
        // cell_error
        let errName = execution.errName;
        let uuid = execution.uuid;
        if (execution.result == "error") {
          if (!errorCellCountMap[errName]) errorCellCountMap[errName] = {};
          if (!errorCellCountMap[errName][this.cellNameMap[uuid]])
            errorCellCountMap[errName][this.cellNameMap[uuid]] = 0;
          errorCellCountMap[errName][this.cellNameMap[uuid]]++;
        } else {
          if (!errorCellCountMap["ok"]) errorCellCountMap["ok"] = {};
          if (!errorCellCountMap["ok"][this.cellNameMap[uuid]])
            errorCellCountMap["ok"][this.cellNameMap[uuid]] = 0;
          errorCellCountMap["ok"][this.cellNameMap[uuid]]++;
        }
        // end of cell_error
      }

      // total_progress
      // end of total_progress

      // cell_error
      option.cell_error = {
        tooltip: {
          trigger: "axis",
          axisPointer: {
            type: "shadow",
          },
        },
        legend: {},
        grid: {
          left: "3%",
          right: "4%",
          bottom: "3%",
          containLabel: true,
        },
        xAxis: {
          type: "value",
        },
        yAxis: {
          type: "category",
          data: cellNameList,
        },
        series: [],
        animationDuration: 400,
        animationDurationUpdate: 100,
      };
      for (const errName of errorList) {
        let cell_error_series = {
          name: errName,
          type: "bar",
          stack: "total",
          label: {
            show: true,
          },
          emphasis: {
            focus: "series",
          },
          data: [],
        };

        for (const cellName of cellNameList) {
          if (errorCellCountMap[errName][cellName]) {
            cell_error_series.data.push(errorCellCountMap[errName][cellName]);
          } else {
            cell_error_series.data.push(0);
          }
        }
        option.cell_error.series.push(cell_error_series);
      }

      // total_progress
      option.total_progress = {
        title: {
          text: "Total progress summary",
          left: "5%",
          top: "3%",
        },
        legend: {
          right: "10%",
          top: "3%",
          data: [],
        },
        grid: {
          left: "8%",
          top: "10%",
        },
        xAxis: {
          type: "time",
        },
        yAxis: {
          type: "category",
          data: cellNameList,
          splitLine: {
            show: true,
          },
        },
        series: [],
        color: [],
        dataZoom: [
          {
            type: "slider",
          },
        ],
        animationDuration: 400,
        animationDurationUpdate: 100,
      };

      for (const errName of errorList) {
        option.total_progress.legend.data.push(errName);
        executionTotalSummary[errName] = [];

        let total_progress_series = {
          name: errName,
          data: [],
          type: "scatter",
          symbolSize: function (data) {
            // return Math.sqrt(data[2]) / 5e2;
            return data[2] * 15;
          },
          emphasis: {
            focus: "series",
            label: {
              show: true,
              formatter: function (param) {
                return param.data[3];
              },
              position: "top",
            },
          },
          itemStyle: {
            shadowBlur: 10,
            shadowColor: "rgba(25, 100, 150, 0.5)",
            shadowOffsetY: 5,
            color: errName == "ok" ? "rgba(0, 158, 0, 0.5)" : undefined,
          },
        };
        executionTotalSummarySeries[errName] = total_progress_series;
      }

      for (const execution of executionList) {
        let errName = execution.result == "ok" ? "ok" : execution.errName;
        let data = [
          execution.date,
          this.cellNameMap[execution.uuid],
          1,
          execution.username +
            "\n" +
            execution.errName +
            "\n" +
            execution.errValue,
          errName,
        ];
        executionTotalSummary[errName].push(data);
      }

      for (const errName in executionTotalSummary) {
        executionTotalSummarySeries[errName].data =
          executionTotalSummary[errName];
      }
      option.total_progress.series = Object.values(executionTotalSummarySeries);

      return option;
    },

    ErrorCountMap() {
      let errorCountMap = {};

      for (const studentName in this.students) {
        const student = this.students[studentName];
        for (const uuid in student.executions) {
          const executions = student.executions[uuid];
          for (const execution of executions) {
            if (execution.result == "error") {
              if (!errorCountMap[uuid]) errorCountMap[uuid] = 0;
              errorCountMap[uuid]++;
            }
          }
        }
      }
      return errorCountMap;
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
      currentStudentName: null,
      currentStudentExecutions: null,
      currentCellName: null,
      currentCell: [],
    };
  },

  mounted() {
    // eslint-disable-next-line no-undef
    $(".menu .item").tab();
  },

  methods: {
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
        if (cell.metadata.RTL_UUID) {
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

      // Cache all cell uuids
      this.uuidList = [];
      for (let i = 0; i < notebook.cells.length; i++) {
        const cell = notebook.cells[i];

        if (cell.cell_type == "code" && cell.metadata.RTL_UUID) {
          this.uuidList.push(cell.metadata.RTL_UUID);
        }
      }

      // TODO: fetch from server if no cell name map in current notebook
      this.cellNameMap = notebook.metadata.cellNameMap;
      this.displayMsg = notebook.metadata.lectureName || fileName;

      this.GetExecutionData(this.uuidList);
    },

    GetExecutionData(uuidList) {
      // this.RegisterSubscription();
      // return;

      this.ajaxPending = true;

      this.students = {};
      this.currentStudentExecutions = null;
      this.currentStudentName = null;
      this.currentCell = [];
      this.currentCellName = null;

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

      this.ws = new WebSocket(this.APIEndpoint.ws);
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
              :displayMsg="displayMsg"
              @notebook-loaded="ParseNotebookCells"
              @dblclick="
                if (this.notebook != null && this.uuidList.length > 0)
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
                  :uuidList="uuidList"
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
                    v-for="uuid of uuidList"
                    :cellNameMap="cellNameMap"
                    :uuid="uuid"
                    :key="uuid"
                    :currentStudentExecutions="currentStudentExecutions"
                    @click="
                      currentCell = currentStudentExecutions[uuid];
                      currentCellName = cellNameMap[uuid];
                      currentStudentName = currentCell[0].username;
                    "
                  />
                </div>
              </pane>
            </splitpanes>
          </pane>
        </splitpanes>
      </pane>

      <!-- Right -->
      <pane size="75" style="overflow: scroll">
        <div class="ui pointing secondary menu">
          <a class="item active" data-tab="singleStudent">
            Current student ( {{ currentStudentName }} - {{ currentCellName }} )
          </a>
          <a class="item" data-tab="chart_cell_error">Cell - Error Chart</a>
          <a class="item" data-tab="chart_total_progress">
            Cell - Total Progress Chart
          </a>
        </div>

        <div class="ui active tab" data-tab="singleStudent">
          <template v-if="currentCell.length > 0">
            <CellExecution
              v-for="execution of currentCell.slice().reverse()"
              :key="execution._id"
              :execution="execution"
            />
          </template>
          <h1 v-else style="text-align: center; padding-top: 1em">
            No cell selected or no execution record
          </h1>
        </div>

        <div class="ui tab" data-tab="chart_cell_error">
          <v-chart
            class="chart"
            :option="chartOptions.cell_error"
            style="height: 800px; width: 1200px"
          />
        </div>
        <div class="ui tab" data-tab="chart_total_progress">
          <v-chart
            class="chart"
            :option="chartOptions.total_progress"
            style="height: 800px; width: 1200px"
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
