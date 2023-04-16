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
  ): string {
    return this.partialString(value, skipTotal)
      .replace("ch", this.anchorChar.toString())
      .replace("ln", this.anchorLine.toString());
  }

  public headString(
    value: string,
    skipTotal: boolean = false,
  ): string {
    return this.partialString(value, skipTotal)
      .replace("ch", this.headChar.toString())
      .replace("ln", this.headLine.toString());
  }
}

class EditorPlugin implements PluginValue {
  private hasPlugin: boolean;
  private view: EditorView;
  private plugin: CursorLocation;
  private canvasContext: any; // idk what type this should actually be

  constructor(view: EditorView) {
    this.view = view;
    this.hasPlugin = false;
  }

  private calculateWidth(display: string, updateFont: boolean = true): number {
    const statusBar = this.plugin.cursorStatusBar;
    if (!this.canvasContext) {
      const canvas: HTMLElement = statusBar.createEl("canvas");
    // @ts-ignore
      this.canvasContext = canvas.getContext("2d");
    }

    if (updateFont) {
      const fontWeight = statusBar.getCssPropertyValue("font-weight") || "normal";
      const fontSize = statusBar.getCssPropertyValue("font-size") || "12pt";
      const fontFamily = statusBar.getCssPropertyValue("font-family") || "ui-sans-serif";
      const font = `${fontWeight} ${fontSize} ${fontFamily}`;
      this.canvasContext.font = font;
    }

    const metrics = this.canvasContext.measureText(display);
    const pad = parseInt(statusBar.getCssPropertyValue("padding-right").replace("px", ""));

    const width = Math.floor(metrics.width + pad + pad);
    return width;
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
      if (selections.length == 1) {
        display = this.cursorDisplay(selections[0]);
      } else if (selections.length <= settings.numberCursors) {
        let cursorStrings: string[] = [];
        selections.forEach((value) => {
          cursorStrings.push(this.cursorDisplay(value, true, true));
        });
        display = cursorStrings.join(settings.cursorSeperator);
        if (/ct/.test(settings.displayPattern)) {
          display += settings.cursorSeperator + docLines;
        }
      } else {
        display = format(MULTCURSORS, selections.length);
      }
      if (totalSelect != 0) {
        display += this.totalDisplay(totalSelect, totalLine);
      }

      if (settings.statusBarPadding) {
        const step = settings.paddingStep;
        const width = this.calculateWidth(display);
        let padWidth: number = Math.ceil(width/step)*step;
        if (width == padWidth) padWidth += Math.ceil(step/3);
        this.plugin.cursorStatusBar.setAttribute(
          "style",
          `justify-content:right;width:${padWidth}px;`
        );
      } else {
        this.plugin.cursorStatusBar.removeAttribute("style");
      }
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
  ): string {
    let value: string;
    const settings = this.plugin.settings;
    if (settings.selectionMode == "begin") {
      value = selection.anchorString(settings.displayPattern, skipTotal);
    } else if (settings.selectionMode == "end") {
      value = selection.headString(settings.displayPattern, skipTotal);
    } else if (selection.highlightedChars == 0) {
      value = selection.headString(settings.displayPattern, skipTotal);
    } else {
      value =
        selection.anchorString(settings.displayPattern, true) +
        settings.rangeSeperator +
        selection.headString(settings.displayPattern, skipTotal);
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
