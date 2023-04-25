export interface CursorLocationSettings {
  [index: string]: number | string | boolean;
  numberCursors: number;
  selectionMode: string;
  displayCharCount: boolean;
  displayPatternOption: string;
  displayPattern: string;
  rangeSeperatorOption: string;
  rangeSeperator: string;
  displayCursorLineCount: boolean;
  cursorSeperatorOption: string;
  cursorSeperator: string;
  displayTotalLines: boolean;
  displayCursorLines: boolean;
  cursorLinePatternOption: string;
  cursorLinePattern: string;
  statusBarPadding: boolean;
  paddingStepOption: string;
  paddingStep: number;
  wordyDisplay: boolean;
  fuzzyAmount: string;
  excludeFrontmatter: boolean;
  frontmatterString: string;
  frontmatterStringCustom: string;
}

export const DEFAULT_SETTINGS: CursorLocationSettings = {
  numberCursors: 1,
  selectionMode: "full",
  displayCharCount: true,
  displayPatternOption: "clt",
  displayPattern: "",
  cursorSeperatorOption: "slash",
  cursorSeperator: "",
  rangeSeperatorOption: "arrow",
  rangeSeperator: "",
  displayCursorLineCount: true,
  displayTotalLines: true,
  displayCursorLines: false,
  cursorLinePatternOption: "square",
  cursorLinePattern: "",
  statusBarPadding: false,
  paddingStepOption: "medium",
  paddingStep: 9,
  wordyDisplay: false,
  fuzzyAmount: "strictpercent",
  excludeFrontmatter: false,
  frontmatterString: "frontmatter",
  frontmatterStringCustom: "",
};


export const MIDDLEPATTERN = /^.*(ln|ch).*?ct.*?(ln|ch).*/i;
export const BEGINPATTERN = /^.*ct.*((ln|ch).*?(ln|ch).*)/i;
export const ENDPATTERN = /(.*(ln|ch).*?(ln|ch)).*?ct.*$/i;
export const FRONTMATTER = /^\s*?---\n+?[\s\S]*?\n---/;

export const MULTCURSORS = "{} cursors";
export const SELECTTEXTDISPLAY = `{} selected`;
export const SELECTLINEDISPLAY = `{} lines`;
export const SELECTMULT = ` ({} / {})`;
export const SELECTSINGLE = ` ({})`;


// preamble, metadata, frontmatter
// optional names, optional include

// top, near top, middle, near bottom, bottom
// 0-19, 20-39, 40-59, 60-79, 80-100
export const LOWRANGEWORDS = new Map([
  [  0, "top"],
  [ 20, "near top"],
  [ 40, "middle"],
  [ 60, "near bottom"],
  [ 80, "bottom"],
  [100, "bottom"],
]);

// top, middle, bottom
// 0-32, 33-65, 66-99(/100)
export const HIGHRANGEWORDS = new Map([
  [  0, "top"],
  [ 33, "middle"],
  [ 66, "bottom"],
  [ 99, "bottom"],
  [100, "bottom"],
]);

// top, %%, bottom
// 0, 1-99, 100
export const HARDPERCENTWORDS = new Map([
  [0, "top"],
  [100, "bottom"],
]);

// fuzzy top, %%, fuzzy bottom
// 0-x, x-y, y-100
// low (10%), high (20%)
export const LOWFUZZYPERCENT = 10;
export const HIGHFUZZYPERCENT = 20;

export const CURSORSEPERATOR = new Map([
  ["slash", "/"],
  ["pipe", "|"],
  ["tilde", "~"],
  ["ampersand", "&"],
]);

export const RANGESEPERATOR = new Map([
  ["arrow", "→"],
  ["dash", "-"],
  ["tilde", "~"],
]);

export const PADDINGSTEP = new Map([
  ["low", 6],
  ["medium", 12],
  ["high", 24],
]);

export const CURSORLINEPATTERN = new Map([
  ["square", "[lc]"],
  ["curly", "{lc}"],
  ["parens", "(lc)"],
  ["pointy", "<lc>"],
]);

export const DISPLAYPATTERN = new Map([
  ["clt", "ch:ln/ct"],
  ["lct", "ln:ch/ct"],
  ["clt2", "ch ln-ct"],
  ["clts", "ch ln ct"],
  ["lcts", "ln ch ct"],
]);