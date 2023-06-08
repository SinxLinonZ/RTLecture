<script>
import VChart from "vue-echarts";

export default {
  components: {
    VChart,
  },

  props: ["cellNameMap", "students"],
  methods: {
    TotalProgressDotClicked(e) {
      this.$emit("totalProgressDotClicked", e);
    },
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
      let executionTotalSummary = {};
      let executionTotalSummarySeries = {};

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
          data: cellNameList.map((cell) => cell.displayName),
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
            return data[2] * 15;
          },
          emphasis: {
            focus: "none",
            scale: 1.4,
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
            color:
              errName == "ok" ? "rgba(0, 158, 0, 0.5)" : "rgba(158, 0, 0, 0.5)",
          },
        };
        executionTotalSummarySeries[errName] = total_progress_series;
      }

      for (const execution of executionList) {
        let errName = execution.result == "ok" ? "ok" : execution.errName;
        let data = [
          execution.date,
          this.cellNameMap[execution.uuid].displayName,
          1,
          execution.username +
            "\n" +
            execution.errName +
            "\n" +
            execution.errValue,
          {
            _id: execution._id,
            username: execution.username,
            cellUuid: execution.uuid,
          },
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
  },
};
</script>

<template>
  <v-chart
    class="chart"
    :option="chartOptions.total_progress"
    style="height: 100%; width: 100%"
    autoresize
    @click="TotalProgressDotClicked"
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
