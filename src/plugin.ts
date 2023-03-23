import { PluginValue, EditorView, ViewPlugin } from "@codemirror/view";
import { Text, SelectionRange, Line } from "@codemirror/state";
import type CursorLocation from "src/main";

const MIDDLEPATTERN = /^.*(ln|ch).*?ct.*?(ln|ch).*/i;
const BEGINPATTERN = /^.*ct.*((ln|ch).*?(ln|ch).*)/i;
const ENDPATTERN = /(.*(ln|ch).*?(ln|ch)).*?ct.*$/i;

class CursorData {
  docLineCount: number;
  anchorLine: number;
  anchorChar: number;
  headLine: number;
  headChar: number;
  highlightedChars: number;
  highlightedLines: number;

  constructor(range: SelectionRange, doc: Text) {
    this.docLineCount = doc.lines;

    const aLine = doc.lineAt(range.anchor);
    this.anchorLine = aLine.number;
    this.anchorChar = range.anchor - aLine.from;

    const hLine = doc.lineAt(range.head);
    this.headLine = hLine.number;
    this.headChar = range.head - hLine.from;

    this.highlightedChars = range.to - range.from;
    this.highlightedLines = Math.abs(this.anchorLine - this.headLine) + 1;
  }

  private partialString(value: string, skipTotal: boolean = false): string {
    if (!skipTotal || MIDDLEPATTERN.test(value)) {
      value = value.replace("ct", this.docLineCount.toString());
    } else if (BEGINPATTERN.test(value)) {
      value = value.replace(BEGINPATTERN, "$1");
    } else if (ENDPATTERN.test(value)) {
      value = value.replace(ENDPATTERN, "$1");
    }
    return value;
  }

  public anchorString(value: string, skipTotal: boolean = false): string {
    return this.partialString(value, skipTotal)
      .replace("ch", this.anchorChar.toString())
      .replace("ln", this.anchorLine.toString());
  }

  public headString(value: string, skipTotal: boolean = false): string {
    return this.partialString(value, skipTotal)
      .replace("ch", this.headChar.toString())
      .replace("ln", this.headLine.toString());
  }
}

class EditorPlugin implements PluginValue {
  private hasPlugin: boolean;
  private view: EditorView;
  private plugin: CursorLocation;

  constructor(view: EditorView) {
    this.view = view;
    this.hasPlugin = false;
  }

  update(): void {
    if (!this.hasPlugin || !this.plugin.showUpdates) return;

    const state = this.view.state;
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
          display += settings.cursorSeperator + state.doc.lines;
        }
      } else {
        display = `${selections.length} cursors`;
      }
      if (totalSelect != 0) {
        display += this.totalDisplay(totalSelect, totalLine);
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
    skipTotal: boolean = false
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

  private totalDisplay(textCount: number, lineCount: number): string {
    const settings = this.plugin.settings;

    let totalsDisplay: string = "";
    let textDisplay: string;
    let lineDisplay: string;
    if (settings.displayCharCount) {
      textDisplay = `${textCount} selected`;
    }
    if (settings.displayTotalLines) {
      lineDisplay = `${lineCount} lines`;
    }

    if (settings.displayCharCount && settings.displayTotalLines) {
      totalsDisplay = ` (${textDisplay} / ${lineDisplay})`;
    } else if (settings.displayCharCount) {
      totalsDisplay = ` (${textDisplay})`;
    } else if (settings.displayTotalLines) {
      totalsDisplay = ` (${lineDisplay})`;
    }

    return totalsDisplay;
  }
}

export const editorPlugin = ViewPlugin.fromClass(EditorPlugin);
