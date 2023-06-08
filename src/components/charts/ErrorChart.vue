<script>
import VChart from "vue-echarts";

export default {
  components: {
    VChart,
  },

  props: ["cellNameMap", "students", "chart_cell_error_ErrSummary"],
  computed: {
    chartOptions() {
      let cellNameList = [];
      let executionList = [];
      let errorList = [];

      // Getting all cell names
      for (const uuid in this.cellNameMap) {
        cellNameList.push(this.cellNameMap[uuid]);
      }
      cellNameList.sort((a, b) => {
        return a.displayId > b.displayId ? 1 : -1;
      });
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

      /*
       * Loop all executions
       *   - Init errorCellCountMap
       */
      for (const execution of executionList) {
        // cell_error
        let errName = execution.errName;
        let uuid = execution.uuid;
        if (execution.result == "error") {
          if (!errorCellCountMap[errName]) errorCellCountMap[errName] = {};
          if (!errorCellCountMap[errName][this.cellNameMap[uuid].displayName])
            errorCellCountMap[errName][this.cellNameMap[uuid].displayName] = 0;
          errorCellCountMap[errName][this.cellNameMap[uuid].displayName]++;
        } else {
          if (!errorCellCountMap["ok"]) errorCellCountMap["ok"] = {};
          if (!errorCellCountMap["ok"][this.cellNameMap[uuid].displayName])
            errorCellCountMap["ok"][this.cellNameMap[uuid].displayName] = 0;
          errorCellCountMap["ok"][this.cellNameMap[uuid].displayName]++;
        }
        // end of cell_error
      }

      // cell_error
      if (!this.chart_cell_error_ErrSummary) {
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
            data: cellNameList.map((cell) => cell.displayName),
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

          for (const cell of cellNameList) {
            if (errName == undefined) continue;
            if (errorCellCountMap[errName] == undefined) continue;
            if (errorCellCountMap[errName][cell.displayName]) {
              cell_error_series.data.push(
                errorCellCountMap[errName][cell.displayName]
              );
            } else {
              cell_error_series.data.push(0);
            }
          }
          option.cell_error.series.push(cell_error_series);
        }
      } else {
        option.cell_error = {
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
            data: [],
          },
          series: [
            {
              data: [],
              type: "bar",
              label: {
                show: true,
                fontSize: 24,
              },
            },
          ],
          animationDuration: 400,
          animationDurationUpdate: 100,
        };

        for (const errName of errorList) {
          option.cell_error.yAxis.data.push(errName);
          let sum = 0;
          for (const cell of cellNameList) {
            if (errorCellCountMap[errName][cell.displayName]) {
              sum += errorCellCountMap[errName][cell.displayName];
            }
          }
          option.cell_error.series[0].data.push({
            value: sum,
            name: errName,
            itemStyle: {
              color: errName == "ok" ? "#91cc75" : "#ee6666",
            },
          });
        }
      }

      return option;
    },
  },
};
</script>

<template>
  <v-chart
    class="chart"
    :option="chartOptions.cell_error"
    :update-options="{
      notMerge: true,
    }"
    style="height: 100%; width: 100%"
    autoresize
  />
</template>

<style scoped>
.ui.segment {
  cursor: pointer;
  transition: transform 0.5s ease-out 0s;

  user-select: none;
}

.ui.segment:hover {
  transform: translateX(+10px);
}
</style>
