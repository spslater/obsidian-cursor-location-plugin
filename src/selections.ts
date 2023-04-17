import { Text, SelectionRange } from "@codemirror/state";
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

  private percent(curLine: number) {
    let total = (this.docLineCount-1);
    if (this.frontmatter === null) {
      return Math.round(((curLine/total)+Number.EPSILON)*100);
    }
    const line = (curLine-this.frontmatter-1);
    total -= this.frontmatter;
    console.log(line, total, this.frontmatter);
    return Math.round(((line/total)+Number.EPSILON)*100);
  }

  public headPercent(): number {
    return this.percent(this.headLine);
  }

  public anchorPercent(): number {
    return this.percent(this.anchorLine);
  }
}
