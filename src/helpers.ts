export function format(raw: string, ...args: any[]) {
  for (let arg of args) {
    raw = raw.replace("{}", arg.toString());
  }
  return raw;
}

export function closest(val: number, to: number) {
  return Math.floor(val/to)*to;
}