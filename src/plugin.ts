import { PluginValue, EditorView, ViewPlugin } from "@codemirror/view";
import { Text } from "@codemirror/state";

import type CursorLocation from "src/main";
import type { CursorLocationSettings } from "src/constants";
import { generateSelections, Selections, CursorData } from "src/selections";
import { format } from "src/helpers";
import * as c from "src/constants";


function frontmatter(doc: Text, settings: CursorLocationSettings): number {
  if (!settings.wordyDisplay || !settings.excludeFrontmatter) return null;
  const result: RegExpMatchArray = doc.toString().match(c.FRONTMATTER);
  return result ? doc.lineAt(result[0].length).number : null;
}

function getCursorSeparator(settings: CursorLocationSettings): string {
  let separator = settings.cursorSeparatorOption == "custom"
    ? settings.cursorSeparator
    : c.CURSORSEPERATOR.get(settings.cursorSeparatorOption);
  separator.trim()
  return ` ${separator} `
}

function getRangeSeparator(settings: CursorLocationSettings): string {
  return settings.rangeSeparatorOption == "custom"
    ? settings.rangeSeparator
    : c.RANGESEPERATOR.get(settings.rangeSeparatorOption);
}

function getDisplayPattern(settings: CursorLocationSettings): string {
  return settings.displayPatternOption == "custom"
    ? settings.displayPattern
    : c.DISPLAYPATTERN.get(settings.displayPatternOption);
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
        display = this.wordyDisplay(cursors[0]);
      } else if (cursors.length <= settings.numberCursors) {
        let cursorStrings: string[] = [];
        cursors.forEach((cursor) => {
          cursorStrings.push(this.wordyDisplay(cursor, true))
        });
        const separator = getCursorSeparator(settings);
        display = cursorStrings.join(separator);
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
          const separator: string = getCursorSeparator(settings);
          display = cursorStrings.join(separator);
          if (/ct/.test(getDisplayPattern(settings))) {
            display += separator + docLines;
          }
        } else {
          display = format(c.MULTCURSORS, cursors.length);
        }
        if (selections.chars != 0) {
          display += selections.totalDisplay(settings);
        }

        if (settings.statusBarPadding) {
          const step = settings.paddingStepOption == "custom"
            ? settings.paddingStep
            : c.PADDINGSTEP.get(settings.paddingStepOption);
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
    const displayPattern = getDisplayPattern(settings);
    if (settings.selectionMode == "begin") {
      value = selection.anchorString(displayPattern, skipTotal);
    } else if (settings.selectionMode == "end") {
      value = selection.headString(displayPattern, skipTotal);
    } else if (selection.highlightedChars == 0) {
      value = selection.headString(displayPattern, skipTotal);
    } else {
      value =
        selection.anchorString(displayPattern, true) +
        getRangeSeparator(settings) +
        selection.headString(displayPattern, skipTotal);
    }
    if (displayLines && settings.displayCursorLines) {
      let numberLines = Math.abs(selection.anchorLine - selection.headLine) + 1;
      let cursorLinePattern = settings.cursorLinePattern;
      value += ` ${cursorLinePattern.replace("lc", numberLines.toString())}`;
    }
    return value;
  }


  private wordyDisplay(cursor: CursorData, displayLines: boolean = false): string {
    let value: string;
    const settings = this.plugin.settings;
    const frontmatterString = settings.frontmatterString == "custom" ?
      settings.frontmatterStringCustom :
      settings.frontmatterString;

    if (settings.selectionMode == "begin") {
      value = cursor.anchorWordy(settings.fuzzyAmount, frontmatterString);
    } else if (settings.selectionMode == "end") {
      value = cursor.headWordy(settings.fuzzyAmount, frontmatterString);
    } else if (cursor.highlightedChars == 0) {
      value = cursor.headWordy(settings.fuzzyAmount, frontmatterString);
    } else {
      value =
        cursor.anchorWordy(settings.fuzzyAmount, frontmatterString) +
        getRangeSeparator(settings) +
        cursor.headWordy(settings.fuzzyAmount, frontmatterString);
    }
    if (displayLines && settings.displayCursorLines) {
      let numberLines = Math.abs(cursor.anchorLine - cursor.headLine) + 1;
      let cursorLinePattern = settings.cursorLinePattern;
      value += ` ${cursorLinePattern.replace("lc", numberLines.toString())}`;
    }
    return value;
  }

}

export const editorPlugin = ViewPlugin.fromClass(EditorPlugin);
