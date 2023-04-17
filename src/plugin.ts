import { PluginValue, EditorView, ViewPlugin } from "@codemirror/view";
// import { Text } from "@codemirror/state";

import type CursorLocation from "src/main";
// import type { CursorLocationSettings } from "src/settings";
import { generateSelections, Selections, CursorData } from "src/selections";
import * as c from "src/constants";


function closest(val: number, to: number) {
  return Math.floor(val/to)*to;
}

function format(raw: string, ...args: any[]) {
  for (let arg of args) {
    raw = raw.replace("{}", arg.toString());
  }
  return raw;
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

    const settings = this.plugin.settings;
    const state = this.view.state;
    const docLines = state.doc.lines;
    let display: string;

    let selections: Selections = generateSelections(state.doc, state.selection.ranges);
    let cursors = selections.cursors;

    if (settings.wordyDisplay) {
      const result = state.doc.toString().match(c.FRONTMATTER);
      // console.log(result);
      if (result) {
        const fLine = state.doc.lineAt(result[0].length).number - 1;
        if (cursors.length == 1) {
          const line = cursors[0].headLine - 1;
          const full = Math.round(((line/(docLines-1))+Number.EPSILON)*100);
          const front = Math.round((((line-fLine)/(docLines-fLine-1))+Number.EPSILON)*100);
          let fullWord = "";
          let frontWord = "";
          if (0 > front) {
            frontWord = "frontmatter";
          } else if (front == 0) {
            frontWord = "top"
          } else if (front == 100) {
            frontWord = "bottom"
          } else {
            frontWord = "body"
          }
          if (full == 0) {
            fullWord = "top"
          } else if (full == 100) {
            fullWord = "bottom"
          } else {
            fullWord = "body"
          }
          display = `${full}% (${front}%) | ${fullWord} (${frontWord})`;
        } else if (cursors.length <= settings.numberCursors) {
          let cursorStrings: string[] = [];
          cursors.forEach((cursor) => {
            const line = cursor.headLine - 1;
            const full = Math.round(((line/(docLines-1))+Number.EPSILON)*100);
            const front = Math.round((((line-fLine)/(docLines-fLine-1))+Number.EPSILON)*100);
            cursorStrings.push(`${full}% (${front}%)`)
          });
          display = cursorStrings.join(settings.cursorSeperator);
        } else {
          display = format(c.MULTCURSORS, cursors.length);
        }
      }
    } else {
      if (cursors && settings.numberCursors) {
        if (cursors.length == 1) {
          display = this.cursorDisplay(cursors[0]);
        } else if (cursors.length <= settings.numberCursors) {
          let cursorStrings: string[] = [];
          cursors.forEach((value) => {
            cursorStrings.push(this.cursorDisplay(value, true, true));
          });
          display = cursorStrings.join(settings.cursorSeperator);
          if (/ct/.test(settings.displayPattern)) {
            display += settings.cursorSeperator + docLines;
          }
        } else {
          display = format(c.MULTCURSORS, cursors.length);
        }
        if (selections.chars != 0) {
          display += this.totalDisplay(selections.chars, selections.lines);
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
      }
    }
    this.plugin.cursorStatusBar.setText(display);
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
      textDisplay = format(c.SELECTTEXTDISPLAY, textCount);
    }
    if (settings.displayTotalLines) {
      lineDisplay = format(c.SELECTLINEDISPLAY, lineCount);
    }

    if (settings.displayCharCount && settings.displayTotalLines) {
      totalsDisplay = format(c.SELECTMULT, textDisplay, lineDisplay);
    } else if (settings.displayCharCount) {
      totalsDisplay = format(c.SELECTSINGLE, textDisplay);
    } else if (settings.displayTotalLines) {
      totalsDisplay = format(c.SELECTSINGLE, lineDisplay);
    }

    return totalsDisplay;
  }
}

export const editorPlugin = ViewPlugin.fromClass(EditorPlugin);
