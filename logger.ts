export class Logger {
  startTime: number;

  constructor(protected prefix: string) {
    this.startTime = process.uptime() * 1000;
  }

  get diff() {
    const dur = (Date.now() - this.startTime) / 1000;
    this.startTime = Date.now();
    return dur;
  }

  get dur() {
    const dur = process.uptime();
    let hh = (dur / 60 / 60).toFixed(0).padStart(2, "0");
    let mm = (dur / 60).toFixed(0).padStart(2, "0");
    let ss = (dur % 60).toFixed(0).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  log(...args: any[]) {
    console.log(`${this.dur}, [${this.prefix}]`, ...args);
  }
  table(...args: any[]) {
    console.log(`${this.dur}, [${this.prefix}]`);
    console.table(...args);
  }
}
