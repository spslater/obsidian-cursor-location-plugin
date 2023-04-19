import { Text, SelectionRange } from "@codemirror/state";
import type { CursorLocationSettings } from "src/settings";
import { format, closest } from "src/helpers";
import * as c from "src/constants";

export function generateSelections(
  doc: Text,
  ranges: readonly SelectionRange[],
  frontmatter: number = null,
): Selections {
  let selections: Selections = new Selections();
  ranges.forEach((range) => {
    selections.addCursor(new CursorData(range, doc, frontmatter));
  });
  return selections;
}

export class Selections {
  lines: number;
  chars: number;
  cursors: CursorData[];

  constructor() {
    this.lines = 0
    this.chars = 0
    this.cursors = [];
  }

  public addCursor(cursor: CursorData) {
    this.chars += cursor.highlightedChars;
    this.lines += cursor.highlightedLines;
    this.cursors.push(cursor);
  }

  public totalDisplay(settings: CursorLocationSettings): string {
    let totalsDisplay: string = "";
    let textDisplay: string;
    let lineDisplay: string;
    if (settings.displayCharCount) {
      textDisplay = format(c.SELECTTEXTDISPLAY, this.chars);
    }
    if (settings.displayTotalLines) {
      lineDisplay = format(c.SELECTLINEDISPLAY, this.lines);
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

export class CursorData {
  docLineCount: number;
  docCharCount: number;
  anchorLine: number;
  anchorChar: number;
  headLine: number;
  headChar: number;
  highlightedChars: number;
  highlightedLines: number;
  frontmatter: number;

  constructor(range: SelectionRange, doc: Text, frontmatter: number) {
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

    this.frontmatter = frontmatter;
  }

  private partialString(
    value: string,
    skipTotal: boolean = false,
  ): string {
    if (!skipTotal || c.MIDDLEPATTERN.test(value)) {
      value = value.replace("ct", this.docLineCount.toString());
    } else if (c.BEGINPATTERN.test(value)) {
      value = value.replace(c.BEGINPATTERN, "$1");
    } else if (c.ENDPATTERN.test(value)) {
      value = value.replace(c.ENDPATTERN, "$1");
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

  private percent(line: number) {
    let total = (this.docLineCount-1);
    line -= 1;
    if (this.frontmatter === null) {
      const res = Math.round(((line/total)+Number.EPSILON)*100);
      console.log(line, total, res)
      return res
    }
    line -= this.frontmatter;
    total -= this.frontmatter;
    const res = Math.round(((line/total)+Number.EPSILON)*100);
    console.log(line, total, res)
    return res
  }

  private wordyString(
    curLine: number,
    fuzzyAmount: string,
    frontmatterString: string,
  ): string {
    if (this.frontmatter != null && this.frontmatter >= curLine) {
      return frontmatterString;
    }
    const pct = this.percent(curLine);
    switch (fuzzyAmount) {
      case "verywordy":
        return c.LOWRANGEWORDS.get(closest(pct, 20));
      case "littewordy":
        return c.HIGHRANGEWORDS.get(closest(pct, 33));
      case "strictpercent":
        if (pct == 0 || pct == 100) {
          return c.HARDPERCENTWORDS.get(pct);
        }
        return `${pct}%`
      case "lowfuzzypercent":
        if (pct <= 10) return "top"
        if (pct >= 90) return "bottom"
        return `${pct}%`
      case "highfuzzypercent":
        if (pct <= 20) return "top"
        if (pct >= 80) return "bottom"
        return `${pct}%`
      case "onlypercent":
        return `${pct}%`
    }
    return ""
  }

  public headWordy(fuzzyAmount: string, frontmatterString: string): string {
    return this.wordyString(this.headLine, fuzzyAmount, frontmatterString)
  }

  public anchorWordy(fuzzyAmount: string, frontmatterString: string): string {
    return this.wordyString(this.anchorLine, fuzzyAmount, frontmatterString)
  }
}
