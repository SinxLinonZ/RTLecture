<script>
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

export default {
  props: ["execution"],

  data() {
    return {
      image: false,
    };
  },

  mounted() {
    const fitAddon = new FitAddon();

    let term = new Terminal({ convertEol: true });
    term.loadAddon(fitAddon);
    term.open(document.getElementById(`${this.execution._id}_code`));
    fitAddon.fit();
    term.write(this.execution.code);

    // Render output
    // execution failed
    if (this.execution.result != "ok") {
      term = new Terminal({ convertEol: true });
      term.loadAddon(fitAddon);
      term.open(document.getElementById(`${this.execution._id}_output`));
      fitAddon.fit();
      term.write(
        this.execution.errName + "\n" + this.execution.errValue + "\n\n"
      );
      for (const errLine of this.execution.STDtraceback) {
        term.write(errLine);
      }
    }
    // execution success & has stdout
    else {
      if (this.execution.output.stdout.length > 0) {
        term = new Terminal({ convertEol: true });
        term.loadAddon(fitAddon);
        term.open(document.getElementById(`${this.execution._id}_output`));
        fitAddon.fit();
        for (const outLine of this.execution.output.stdout) {
          term.write(outLine);
        }
      }
    }

    // render image if has
    if (this.execution.output["image/png"].length > 0) {
      this.image = `data:image/png;base64, ${this.execution.output["image/png"][0].base64}`;
    }
  },
};
</script>

<template>
  <hr />
  <h1
    style="padding-left: 0.5em; margin-top: 0.5em"
    :style="{
      borderLeft:
        this.execution.result == 'ok' ? 'solid 5px green' : 'solid 5px red',
    }"
  >
    {{ execution.result }}
  </h1>
  <div
    style="
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: auto;
      column-gap: 1em;
    "
  >
    <div :id="execution._id + '_code'"></div>
    <div :id="execution._id + '_output'">
      <img v-if="image" :src="image" />
    </div>
  </div>
</template>

<style scoped></style>
