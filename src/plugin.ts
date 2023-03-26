import { PluginValue, EditorView, ViewPlugin } from "@codemirror/view";
import { Text, SelectionRange, Line } from "@codemirror/state";
import type CursorLocation from "src/main";

const MIDDLEPATTERN = /^.*(ln|ch).*?ct.*?(ln|ch).*/i;
const BEGINPATTERN = /^.*ct.*((ln|ch).*?(ln|ch).*)/i;
const ENDPATTERN = /(.*(ln|ch).*?(ln|ch)).*?ct.*$/i;

const MULTCURSORS = "{} cursors";
const SELECTTEXTDISPLAY = `{} selected`;
const SELECTLINEDISPLAY = `{} lines`;
const SELECTMULT = ` ({} / {})`;
const SELECTSINGLE = ` ({})`;

function format(raw: string, ...args: any[]) {
  for (let arg of args) {
    raw = raw.replace("{}", arg.toString());
  }
  return raw;
}

class CursorData {
  docLineCount: number;
  docCharCount: number;
  anchorLine: number;
  anchorChar: number;
  headLine: number;
  headChar: number;
  highlightedChars: number;
  highlightedLines: number;

  constructor(range: SelectionRange, doc: Text) {
    this.docLineCount = doc.lines;
    this.docCharCount = doc.length;

    const aLine = doc.lineAt(range.anchor);
    this.anchorLine = aLine.number;
    this.anchorChar = range.anchor - aLine.from;

    const hLine = doc.lineAt(range.head);
    this.headLine = hLine.number;
    this.headChar = range.head - hLine.from;

    this.highlightedChars = range.to - range.from;
    this.highlightedLines = Math.abs(this.anchorLine - this.headLine) + 1;
  }

  private partialString(
    value: string,
    skipTotal: boolean = false,
  ): string {
    if (!skipTotal || MIDDLEPATTERN.test(value)) {
      value = value.replace("ct", this.docLineCount.toString());
    } else if (BEGINPATTERN.test(value)) {
      value = value.replace(BEGINPATTERN, "$1");
    } else if (ENDPATTERN.test(value)) {
      value = value.replace(ENDPATTERN, "$1");
    }
    return value;
  }

  public anchorString(
    value: string,
    skipTotal: boolean = false,
    genMax: boolean = false,
    genMin: boolean = false,
  ): string {
    const ch = genMax ? this.docCharCount : (genMin ? 1 : this.anchorChar);
    const ln = genMax ? this.docLineCount : (genMin ? 1 : this.anchorLine);
    return this.partialString(value, skipTotal)
      .replace("ch", ch.toString())
      .replace("ln", ln.toString());
  }

  public headString(
    value: string,
    skipTotal: boolean = false,
    genMax: boolean = false,
    genMin: boolean = false,
  ): string {
    const ch = genMax ? this.docCharCount : this.headChar;
    const ln = genMax ? this.docLineCount : this.headLine;
    return this.partialString(value, skipTotal)
      .replace("ch", ch.toString())
      .replace("ln", ln.toString());
  }
}

class EditorPlugin implements PluginValue {
  private hasPlugin: boolean;
  private view: EditorView;
  private plugin: CursorLocation;
  private canvas: HTMLElement;

  constructor(view: EditorView) {
    this.view = view;
    this.hasPlugin = false;
  }

  private calculateWidth(display: string): any {
    const statusBar = this.plugin.cursorStatusBar;
    if (!this.canvas) {
      this.canvas = statusBar.createEl("canvas");
    }

    const fontWeight = statusBar.getCssPropertyValue("font-weight") || "normal";
    const fontSize = statusBar.getCssPropertyValue("font-size") || "12pt";
    const fontFamily = statusBar.getCssPropertyValue("font-family") || "ui-sans-serif";
    const font = `${fontWeight} ${fontSize} ${fontFamily}`;

    const pad = parseInt(statusBar.getCssPropertyValue("padding-right").replace("px", ""));

    // @ts-ignore
    const context = this.canvas.getContext("2d");
    context.font = font;

    const metrics = context.measureText(display);
    console.log(metrics.width, display);
    return metrics.width + pad + pad;;
  }

  update(): void {
    if (!this.hasPlugin || !this.plugin.showUpdates) return;

    const state = this.view.state;
    const docChars = state.doc.length;
    const docLines = state.doc.lines;

    let totalSelect: number = 0;
    let totalLine: number = 0;
    let selections: CursorData[] = [];
    state.selection.ranges.forEach((range) => {
      const cur = new CursorData(range, state.doc);
      totalSelect += cur.highlightedChars;
      totalLine += cur.highlightedLines;
      selections.push(cur);
    });

    const settings = this.plugin.settings;
    if (selections && settings.numberCursors) {
      let display: string;
      // let maxDisplay: string;
      // let minDisplay: string;
      if (selections.length == 1) {
        display = this.cursorDisplay(selections[0]);
        // maxDisplay = this.cursorDisplay(selections[0], false, false, true);
        // minDisplay = this.cursorDisplay(selections[0], false, false, false, true);
      } else if (selections.length <= settings.numberCursors) {
        let cursorStrings: string[] = [];
        // let maxCursorStrings: string[] = [];
        // let minCursorStrings: string[] = [];
        selections.forEach((value) => {
          cursorStrings.push(this.cursorDisplay(value, true, true));
          // maxCursorStrings.push(this.cursorDisplay(value, true, true, true));
          // minCursorStrings.push(this.cursorDisplay(value, true, true, false, true));
        });
        display = cursorStrings.join(settings.cursorSeperator);
        // maxDisplay = maxCursorStrings.join(settings.cursorSeperator);
        // minDisplay = minCursorStrings.join(settings.cursorSeperator);
        if (/ct/.test(settings.displayPattern)) {
          display += settings.cursorSeperator + docLines;
          // maxDisplay += settings.cursorSeperator + docLines;
          // minDisplay += settings.cursorSeperator + 1;
        }
      } else {
        display = format(MULTCURSORS, selections.length);
        // maxDisplay = display;
        // minDisplay = display;
      }
      if (totalSelect != 0) {
        display += this.totalDisplay(totalSelect, totalLine);
        // maxDisplay += this.totalDisplay(docChars, docLines);
        // minDisplay += this.totalDisplay(1, 1);
      }

      // const maxWidth = this.calculateWidth(display);
      // const minWidth = this.calculateWidth(minDisplay);
      // const width = (maxWidth+minWidth)/2
      // this.plugin.cursorStatusBar.setAttribute("style", `width:${maxWidth}px;`);
      // this.plugin.cursorStatusBar.setAttribute("style", `width:${width}px;`);
      this.plugin.cursorStatusBar.setText(display);
    }
  }

  addPlugin(plugin: CursorLocation) {
    this.plugin = plugin;
    this.hasPlugin = true;
    this.update();
  }

  destroy() {}

  private cursorDisplay(
    selection: CursorData,
    displayLines: boolean = false,
    skipTotal: boolean = false,
    genMax: boolean = false,
    genMin: boolean = false,
  ): string {
    let value: string;
    const settings = this.plugin.settings;
    if (settings.selectionMode == "begin") {
      value = selection.anchorString(settings.displayPattern, skipTotal, genMax, genMin);
    } else if (settings.selectionMode == "end") {
      value = selection.headString(settings.displayPattern, skipTotal, genMax, genMin);
    } else if (selection.highlightedChars == 0) {
      value = selection.headString(settings.displayPattern, skipTotal, genMax, genMin);
    } else {
      value =
        selection.anchorString(settings.displayPattern, true, genMax, genMin) +
        settings.rangeSeperator +
        selection.headString(settings.displayPattern, skipTotal, genMax, genMin);
    }
    if (displayLines && settings.displayCursorLines) {
      let numberLines = Math.abs(selection.anchorLine - selection.headLine) + 1;
      let cursorLinePattern = settings.cursorLinePattern;
      value += ` ${cursorLinePattern.replace("lc", numberLines.toString())}`;
    }
    return value;
  }

  private totalDisplay(
    textCount: number,
    lineCount: number,
  ): string {
    const settings = this.plugin.settings;

    let totalsDisplay: string = "";
    let textDisplay: string;
    let lineDisplay: string;
    if (settings.displayCharCount) {
      textDisplay = format(SELECTTEXTDISPLAY, textCount);
    }
    if (settings.displayTotalLines) {
      lineDisplay = format(SELECTLINEDISPLAY, lineCount);
    }

    if (settings.displayCharCount && settings.displayTotalLines) {
      totalsDisplay = format(SELECTMULT, textDisplay, lineDisplay);
    } else if (settings.displayCharCount) {
      totalsDisplay = format(SELECTSINGLE, textDisplay);
    } else if (settings.displayTotalLines) {
      totalsDisplay = format(SELECTSINGLE, lineDisplay);
    }

    return totalsDisplay;
  }
}

export const editorPlugin = ViewPlugin.fromClass(EditorPlugin);
