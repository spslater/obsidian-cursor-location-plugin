import { PluginValue, EditorView, ViewPlugin } from "@codemirror/view";
import { Text } from "@codemirror/state";

import type CursorLocation from "src/main";
import type { CursorLocationSettings } from "src/settings";
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

function frontmatter(doc: Text, settings: CursorLocationSettings): number {
  if (!settings.wordyDisplay) return null;
  const result: RegExpMatchArray = doc.toString().match(c.FRONTMATTER);
  return result ? doc.lineAt(result[0].length).number : null;
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

    const fmLine = frontmatter(state.doc, settings);
    let selections: Selections = generateSelections(state.doc, state.selection.ranges, fmLine);
    let cursors = selections.cursors;

    if (settings.wordyDisplay) {
      if (cursors.length == 1) {
        const cursor = cursors[0];
        const anchPct = cursor.anchorPercent();
        const headPct = cursor.headPercent();
        let anchWord: string;
        let headWord: string;
        if (fmLine >= cursor.anchorLine) {
          anchWord = "frontmatter";
        } else if (headPct == 0) {
          anchWord = "top"
        } else if (anchPct == 100) {
          anchWord = "bottom"
        } else {
          anchWord = "body"
        }
        if (fmLine >= cursor.headLine) {
          headWord = "frontmatter";
        } else if (headPct == 0) {
          headWord = "top"
        } else if (headPct == 100) {
          headWord = "bottom"
        } else {
          headWord = "body"
        }
        display = `${anchPct}% (${headPct}%) | ${anchWord} (${headWord})`;
      } else if (cursors.length <= settings.numberCursors) {
        let cursorStrings: string[] = [];
        cursors.forEach((cursor) => {
          const headPct = cursor.headPercent();
          const anchPct = cursor.anchorPercent();
          cursorStrings.push(`${headPct}% (${anchPct}%)`)
        });
        display = cursorStrings.join(settings.cursorSeperator);
      } else {
        display = format(c.MULTCURSORS, cursors.length);
      }
    } else {
      if (cursors && settings.numberCursors) {
        if (cursors.length == 1) {
          display = this.rowColDisplay(cursors[0]);
        } else if (cursors.length <= settings.numberCursors) {
          let cursorStrings: string[] = [];
          cursors.forEach((value) => {
            cursorStrings.push(this.rowColDisplay(value, true, true));
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

  private rowColDisplay(
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
