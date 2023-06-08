<script>
import VChart from "vue-echarts";

export default {
  components: {
    VChart,
  },

  props: ["selectedStudentExecutions", "cellNameMap", "cellNameList"],
  computed: {
    personalProgressChartOption() {
      let executions = [];
      for (const cellUuid in this.selectedStudentExecutions) {
        let cellExecutions = this.selectedStudentExecutions[cellUuid];

        for (const execution of cellExecutions) {
          executions.push([
            execution.date,
            this.cellNameMap[execution.uuid].displayName,
            execution.result,
          ]);
        }
      }

      executions.sort(function (x, y) {
        return new Date(x[0]).getTime() - new Date(y[0]).getTime();
      });

      let option = {
        dataZoom: [
          {
            type: "slider",
          },
        ],
        grid: [
          {
            left: "12%",
          },
          {
            right: "90%",
          },
        ],
        xAxis: [
          {
            type: "time",
            gridIndex: 0,
          },
          {
            type: "category",
            data: ["status"],
            gridIndex: 1,
            show: false,
          },
        ],
        yAxis: [
          {
            type: "category",
            data: this.cellNameList.map((cell) => cell.displayName),
            gridIndex: 0,
          },
          {
            type: "category",
            data: this.cellNameList.map((cell) => cell.displayName),
            gridIndex: 1,
            show: false,
          },
        ],
        series: [
          {
            xAxisIndex: 0,
            yAxisIndex: 0,
            data: executions,
            type: "line",
            // smooth: true,
            step: "start",
            symbolSize: 12,
            itemStyle: {
              color: function name(params) {
                return params.data[2] == "ok" ? "#91cc75" : "#ee6666";
              },
            },
          },
          {
            xAxisIndex: 1,
            yAxisIndex: 1,
            type: "scatter",
            data: (() => {
              let data = [];
              for (const cell of this.cellNameList) {
                let okCount = executions.filter(
                  (execution) =>
                    execution[1] == cell.displayName && execution[2] == "ok"
                ).length;
                let errCount = executions.filter(
                  (execution) =>
                    execution[1] == cell.displayName && execution[2] != "ok"
                ).length;

                if (okCount + errCount == 0) {
                  continue;
                }
                let success = okCount > 0 ? "ok" : "err";
                data.push(["status", cell.displayName, success]);
              }
              return data;
            })(),
            itemStyle: {
              color: function name(params) {
                return params.data[2] == "ok" ? "#0c0" : "#f00";
              },
            },
          },
        ],
        animationDuration: 400,
        animationDurationUpdate: 400,
      };

      return option;
    },
  },
};
</script>

<template>
  <v-chart
    class="chart"
    :option="personalProgressChartOption"
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
