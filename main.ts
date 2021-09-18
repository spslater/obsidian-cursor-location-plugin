import {
  App,
  Editor,
  EditorPosition,
  EditorSelection,
  MarkdownView,
  Plugin,
  PluginSettingTab,
  Setting,
  ValueComponent,
} from "obsidian";
import * as CodeMirror from "codemirror";

interface CursorLocationSettings {
  [index: string]: number | string | boolean;
  numberCursors: number;
  selectionMode: string;
  displayCharCount: boolean;
  displayPattern: string;
  rangeSeperator: string;
  cursorSeperator: string;
  displayTotalLines: boolean;
  displayCursorLines: boolean;
  cursorLinePattern: string;
}

const DEFAULT_SETTINGS: CursorLocationSettings = {
  numberCursors: 1,
  selectionMode: "full",
  displayCharCount: true,
  displayPattern: "ch:ln/ct",
  cursorSeperator: " / ",
  rangeSeperator: "->",
  displayTotalLines: true,
  displayCursorLines: false,
  cursorLinePattern: "[lc]",
};

export default class CursorLocation extends Plugin {
  private cursorStatusBar: HTMLElement;
  settings: CursorLocationSettings;

  async onload() {
    console.log("loading Cursor Location plugin");

    this.registerCodeMirror((cm: CodeMirror.Editor) => {
      cm.on("cursorActivity", this.updateCursor);
    });
    this.registerEvent(this.app.workspace.on("active-leaf-change", this.updateCursor));

    await this.loadSettings();
    this.addSettingTab(new CursorLocationSettingTab(this.app, this));

    this.updateCursor();
  }

  onunload() {
    console.log("unloading Cursor Location plugin");
    this.app.workspace.iterateCodeMirrors((cm: CodeMirror.Editor) => {
      cm.off("cursorActivity", this.updateCursor);
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private getEditor(): Editor {
    return this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
  }

  private cursorString(
    cursor: EditorPosition,
    totalCount: number,
    skipTotal: boolean = false
  ): string {
    let value = this.settings.displayPattern;
    let middlePattern = /^.*(ln|ch).*?ct.*?(ln|ch).*/i;
    let beginPattern = /^.*ct.*((ln|ch).*?(ln|ch).*)/i;
    let endPattern = /(.*(ln|ch).*?(ln|ch)).*?ct.*$/i;

    if (!skipTotal || middlePattern.test(value)) {
      value = value.replace("ct", totalCount.toString());
    } else if (beginPattern.test(value)) {
      value = value.replace(beginPattern, "$1");
    } else if (endPattern.test(value)) {
      value = value.replace(endPattern, "$1");
    }

    value = value
      .replace("ch", cursor.ch.toString())
      .replace("ln", (cursor.line + 1).toString());

    return value;
  }

  private cursorDisplay(
    selection: EditorSelection,
    totalCount: number,
    displayLines: boolean = false,
    skipTotal: boolean = false
  ): string {
    let value: string;
    if (this.settings.selectionMode == "begin") {
      value = this.cursorString(selection.anchor, totalCount, skipTotal);
    } else if (this.settings.selectionMode == "end") {
      value = this.cursorString(selection.head, totalCount, skipTotal);
    } else if (
      selection.anchor.ch == selection.head.ch &&
      selection.anchor.line == selection.head.line
    ) {
      value = this.cursorString(selection.head, totalCount, skipTotal);
    } else {
      value =
        this.cursorString(selection.anchor, totalCount, true) +
        this.settings.rangeSeperator +
        this.cursorString(selection.head, totalCount, skipTotal);
    }
    if (displayLines && this.settings.displayCursorLines) {
      let numberLines = Math.abs(selection.anchor.line - selection.head.line) + 1;
      let cursorLinePattern = this.settings.cursorLinePattern;
      value += ` ${cursorLinePattern.replace("lc", numberLines.toString())}`;
    }
    return value;
  }

  private totalDisplay(
    editor: CodeMirror.Editor | Editor,
    selections: EditorSelection[]
  ): string {
    let totalsDisplay: string = "";
    let textDisplay: string;
    let lineDisplay: string;
    if (this.settings.displayCharCount) {
      let textSelection = editor.getSelection();
      let textCount = textSelection.length - selections.length + 1;
      textDisplay = `${textCount} selected`;
    }
    if (this.settings.displayTotalLines) {
      let lineCount = 0;
      selections.forEach((selection) => {
        lineCount += Math.abs(selection.anchor.line - selection.head.line) + 1;
      });
      lineDisplay = `${lineCount} lines`;
    }

    if (this.settings.displayCharCount && this.settings.displayTotalLines) {
      totalsDisplay = ` (${textDisplay} / ${lineDisplay})`;
    } else if (this.settings.displayCharCount) {
      totalsDisplay = ` (${textDisplay})`;
    } else if (this.settings.displayTotalLines) {
      totalsDisplay = ` (${lineDisplay})`;
    }

    return totalsDisplay;
  }

  private updateCursor = (): void => {
    let editor = this.getEditor();
    if (editor) {
      if (!this.cursorStatusBar) {
        this.cursorStatusBar = this.addStatusBarItem();
      }
      let selections: EditorSelection[] = editor.listSelections();
      let lineCount = editor.lineCount();
      if (selections && this.settings.numberCursors) {
        let display: string;
        if (selections.length == 1) {
          display = this.cursorDisplay(selections[0], lineCount);
        } else if (selections.length <= this.settings.numberCursors) {
          let cursorStrings: string[] = [];
          selections.forEach((value) => {
            cursorStrings.push(this.cursorDisplay(value, lineCount, true, true));
          });
          display = cursorStrings.join(this.settings.cursorSeperator);
          if (/ct/.test(this.settings.displayPattern)) {
            display += this.settings.cursorSeperator + lineCount;
          }
        } else {
          display = `${selections.length} cursors`;
        }
        if (editor.somethingSelected()) {
          display += this.totalDisplay(editor, selections);
        }
        this.cursorStatusBar.setText(display);
      }
    }
  };
}

class CursorLocationSettingTab extends PluginSettingTab {
  plugin: CursorLocation;

  constructor(app: App, plugin: CursorLocation) {
    super(app, plugin);
    this.plugin = plugin;
  }

  private resetComponent(elem: Setting, setting: string) {
    const value = DEFAULT_SETTINGS[setting];
    console.log(`resetting ${setting}: ${value}`);
    let component = elem.components[0] as ValueComponent<any>;
    component.setValue(value);
    this.plugin.settings[setting] = value;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();
    containerEl.createDiv().createEl("h2", { text: "Cursor Information" });

    let cursorEl = containerEl.createDiv();
    cursorEl.createEl("h3", { text: "# of Cursors" });
    let numberCursors = new Setting(cursorEl)
      .setName(
        'Number of cursor positions that will display \
          in the status bar before switching to "N cursors".'
      )
      .addText((text) =>
        text
          .setValue(this.plugin.settings?.numberCursors?.toString())
          .onChange(async (value) => {
            let parsedValue = parseInt(value);
            if (!isNaN(parsedValue)) {
              console.log(`updating numberCursors: ${parsedValue}`);
              warningSection.setText("");
              this.plugin.settings.numberCursors = parsedValue;
              await this.plugin.saveSettings();
            } else {
              console.log(
                "unable to update numberCursors, ",
                `unable to parse new value into integer: ${value}`
              );
              warningSection.setText(`"${value}" is not a number, unable to save.`);
            }
          })
      );
    let warningSection = cursorEl.createEl("p", {
      text: "",
      attr: { style: "color:red" },
    });
    new Setting(cursorEl)
      .setName(`Reset to default value of '${DEFAULT_SETTINGS.numberCursors}'`)
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          this.resetComponent(numberCursors, "numberCursors");
          warningSection.setText("");
          await this.plugin.saveSettings();
        })
      );

    let selectionEl = containerEl.createDiv();
    selectionEl.createEl("h3", { text: "Selecion Mode" });
    let selectionMode = new Setting(selectionEl)
      .setName(
        "Display just the beginning, just the end, or the full range of a selection."
      )
      .addDropdown((cb) =>
        cb
          .addOption("begin", "Beginning")
          .addOption("end", "End")
          .addOption("full", "Full Selection")
          .setValue(this.plugin.settings.selectionMode || DEFAULT_SETTINGS.selectionMode)
          .onChange(async (value) => {
            console.log(`changing selectionMode: ${value}`);
            this.plugin.settings.selectionMode = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(selectionEl)
      .setName("Reset to default value of 'Full Selection'")
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          this.resetComponent(selectionMode, "selectionMode");
          await this.plugin.saveSettings();
        })
      );

    let displayCharCountEl = containerEl.createDiv();
    displayCharCountEl.createEl("h3", { text: "Display Character Count" });
    let displayCharCount = new Setting(displayCharCountEl)
      .setName("Display the total number of characters selected.")
      .addToggle((cb) =>
        cb
          .setValue(
            this.plugin.settings.displayCharCount != null
              ? this.plugin.settings.displayCharCount
              : DEFAULT_SETTINGS.displayCharCount
          )
          .onChange(async (value) => {
            if (this.plugin.settings.displayCharCount != value) {
              console.log(`changing displayCharCount: ${value}`);
            }
            this.plugin.settings.displayCharCount = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(displayCharCountEl)
      .setName(`Reset to default value of '${DEFAULT_SETTINGS.displayCharCount}'`)
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          this.resetComponent(displayCharCount, "displayCharCount");
          await this.plugin.saveSettings();
        })
      );

    let displayTotalLineCountEl = containerEl.createDiv();
    displayTotalLineCountEl.createEl("h3", { text: "Display Total Line Count" });
    let displayTotalLineCount = new Setting(displayTotalLineCountEl)
      .setName("Display the total number of lines selected.")
      .addToggle((cb) =>
        cb
          .setValue(
            this.plugin.settings.displayTotalLines != null
              ? this.plugin.settings.displayTotalLines
              : DEFAULT_SETTINGS.displayTotalLines
          )
          .onChange(async (value) => {
            if (this.plugin.settings.displayTotalLines != value) {
              console.log(`changing displayTotalLines: ${value}`);
            }
            this.plugin.settings.displayTotalLines = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(displayTotalLineCountEl)
      .setName(`Reset to default value of '${DEFAULT_SETTINGS.displayTotalLines}'`)
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          this.resetComponent(displayTotalLineCount, "displayTotalLines");
          await this.plugin.saveSettings();
        })
      );

    let displayPatternEl = containerEl.createDiv();
    displayPatternEl.createEl("h3", { text: "Individual Cursor Pattern" });
    let displayPattern = new Setting(displayPatternEl)
      .setName(
        "Pattern to display location information for each cursor, \
          `ch` is the column the cursor is at in the current line, \
          `ln` is the current line number, \
          `ct` is the total line numbers in the file (count). \
          If `ct` is the first or last of the three values, \
          it will be removed when displaying a range."
      )
      .addText((text) => {
        text.setValue(this.plugin.settings.displayPattern).onChange(async (value) => {
          console.log(`changing displayPattern: ${value}`);
          this.plugin.settings.displayPattern = value.trim();
          await this.plugin.saveSettings();
        });
      });
    new Setting(displayPatternEl)
      .setName(`Reset to default value of '${DEFAULT_SETTINGS.displayPattern}'`)
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          this.resetComponent(displayPattern, "displayPattern");
          await this.plugin.saveSettings();
        })
      );

    let cursorSeperatorEl = containerEl.createDiv();
    cursorSeperatorEl.createEl("h3", { text: "Cursor Seperator" });
    let cursorSeperator = new Setting(cursorSeperatorEl)
      .setName(
        "String to seperate multiple curor locations when \
          `# of Cursors` is greater than 1. Consecutive whitespace \
          is squashed to 1 space (per HTML rules)."
      )
      .addText((text) => {
        text.setValue(this.plugin.settings.cursorSeperator).onChange(async (value) => {
          console.log(`changing cursorSeperator: ${value}`);
          this.plugin.settings.cursorSeperator = value;
          await this.plugin.saveSettings();
        });
      });
    new Setting(cursorSeperatorEl)
      .setName(`Reset to default value of '${DEFAULT_SETTINGS.cursorSeperator}'`)
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          this.resetComponent(cursorSeperator, "cursorSeperator");
          await this.plugin.saveSettings();
        })
      );

    let rangeSeperatorEl = containerEl.createDiv();
    rangeSeperatorEl.createEl("h3", { text: "Range Seperator" });
    let rangeSeperator = new Setting(rangeSeperatorEl)
      .setName(
        "String to seperate the beginning and end of a selection \
          when `Selection Mode` is set to `Full Selection`. \
          Consecutive whitespace is squashed to 1 space (per HTML rules)"
      )
      .addText((text) => {
        text.setValue(this.plugin.settings.rangeSeperator).onChange(async (value) => {
          console.log(`changing rangeSeperator: ${value}`);
          this.plugin.settings.rangeSeperator = value;
          await this.plugin.saveSettings();
        });
      });
    new Setting(rangeSeperatorEl)
      .setName(`Reset to default value of '${DEFAULT_SETTINGS.rangeSeperator}'`)
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          this.resetComponent(rangeSeperator, "rangeSeperator");
          await this.plugin.saveSettings();
        })
      );

    let displayCursorLineCountEl = containerEl.createDiv();
    displayCursorLineCountEl.createEl("h3", { text: "Display Cursor Line Count" });
    let displayCursorLineCount = new Setting(displayCursorLineCountEl)
      .setName("Display the number of lines selected by each cursor.")
      .addToggle((cb) =>
        cb
          .setValue(
            this.plugin.settings.displayCursorLines != null
              ? this.plugin.settings.displayCursorLines
              : DEFAULT_SETTINGS.displayCursorLines
          )
          .onChange(async (value) => {
            if (this.plugin.settings.displayCursorLines != value) {
              console.log(`changing displayCursorLines: ${value}`);
            }
            this.plugin.settings.displayCursorLines = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(displayCursorLineCountEl)
      .setName(`Reset to default value of '${DEFAULT_SETTINGS.displayCursorLines}'`)
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          this.resetComponent(displayCursorLineCount, "displayCursorLines");
          await this.plugin.saveSettings();
        })
      );

    let cursorLinePatternEl = containerEl.createDiv();
    cursorLinePatternEl.createEl("h3", { text: "Cursor Line Pattern" });
    let cursorLinePattern = new Setting(cursorLinePatternEl)
      .setName(
        "Pattern to display number of highlighted lines for each cursor. \
          `lc` is the line count and will not be displayed if only one line \
          is selected or 'Display Cursor Line Count' setting is `false`. \
          Leading and trailing whitespace is trimmed."
      )
      .addText((text) => {
        text.setValue(this.plugin.settings.cursorLinePattern).onChange(async (value) => {
          console.log(`changing cursorLinePattern: ${value}`);
          this.plugin.settings.cursorLinePattern = value.trim();
          await this.plugin.saveSettings();
        });
      });
    new Setting(cursorLinePatternEl)
      .setName(`Reset to default value of '${DEFAULT_SETTINGS.cursorLinePattern}'`)
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          this.resetComponent(cursorLinePattern, "cursorLinePattern");
          await this.plugin.saveSettings();
        })
      );

    containerEl.createDiv().createEl("h2", { text: "Reset All Settings" });
    const cursorLocationSettings = [
      { elem: numberCursors, setting: "numberCursors" },
      { elem: selectionMode, setting: "selectionMode" },
      { elem: displayCharCount, setting: "displayCharCount" },
      { elem: displayTotalLineCount, setting: "displayTotalLines" },
      { elem: displayPattern, setting: "displayPattern" },
      { elem: cursorSeperator, setting: "cursorSeperator" },
      { elem: rangeSeperator, setting: "rangeSeperator" },
      { elem: displayCursorLineCount, setting: "displayCursorLines" },
      { elem: cursorLinePattern, setting: "cursorLinePattern" },
    ];

    let resetAllEl = containerEl.createDiv();
    new Setting(resetAllEl)
      .setName("Reset all settings to default values.")
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          console.log("resetting all values to their defaults");
          cursorLocationSettings.forEach((setting) => {
            this.resetComponent(setting.elem, setting.setting);
          });
          warningSection.setText("");
          await this.plugin.saveSettings();
        })
      );
  }
}
