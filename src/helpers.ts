export function format(raw: string, ...args: any[]) {
  for (let arg of args) {
    raw = raw.replace("{}", arg.toString());
  }
  return raw;
}

export function closest(val: number, to: number) {
  return Math.floor(val/to)*to;
}

export function showElem(elem: HTMLElement) {
  elem.removeAttribute("style");
}

export function hideElem(elem: HTMLElement) {
  elem.setAttribute("style", "display:none;");
}
