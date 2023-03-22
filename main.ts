import {
  App,
  Plugin,
  PluginSettingTab,
  Setting,
  ValueComponent,
  WorkspaceLeaf,
} from "obsidian";
import {
  ViewUpdate,
  PluginValue,
  EditorView,
  ViewPlugin,
} from "@codemirror/view";
import {
  Text,
  SelectionRange,
} from "@codemirror/state";

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

const MIDDLEPATTERN = /^.*(ln|ch).*?ct.*?(ln|ch).*/i;
const BEGINPATTERN = /^.*ct.*((ln|ch).*?(ln|ch).*)/i;
const ENDPATTERN = /(.*(ln|ch).*?(ln|ch)).*?ct.*$/i;

class CursorData {
  aLn: number;
  aCh: number;
  hLn: number;
  hCh: number;
  lct: number;
  tot: number;
  tln: number;

  constructor(range: SelectionRange, doc: Text) {
    this.lct = doc.lines;

    const aLine = doc.lineAt(range.from);
    this.aLn = aLine.number;
    this.aCh = range.from - aLine.from;

    const hLine = doc.lineAt(range.head);
    this.hLn = hLine.number;
    this.hCh = range.head - hLine.from;

    this.tot = range.to-range.from;
    this.tln = Math.abs(this.aLn - this.hLn) + 1;
  }

  private partialString(
    value: string,
    skipTotal: boolean = false
  ): string {
    if (!skipTotal || MIDDLEPATTERN.test(value)) {
      value = value.replace("ct", this.lct.toString());
    } else if (BEGINPATTERN.test(value)) {
      value = value.replace(BEGINPATTERN, "$1");
    } else if (ENDPATTERN.test(value)) {
      value = value.replace(ENDPATTERN, "$1");
    }
    return value;
  }

  public anchorString(
    value: string,
    skipTotal: boolean = false
  ): string {
    return this.partialString(value, skipTotal)
      .replace("ch", this.aCh.toString())
      .replace("ln", this.aLn.toString());
  }

  public headString(
    value: string,
    skipTotal: boolean = false
  ): string {
    return this.partialString(value, skipTotal)
      .replace("ch", this.hCh.toString())
      .replace("ln", this.hLn.toString());
  }
}

class EditorPlugin implements PluginValue {
  private hasPlugin: boolean;
  private view: EditorView;
  private showUpdates: boolean;
  private plugin: CursorLocation;

  constructor(view: EditorView) {
    this.view = view;
    this.hasPlugin = false;
  }

  update(update: ViewUpdate): void {
    if (!this.hasPlugin) return;
    const tr = update.transactions[0];
    if (!tr) return;

    let totalSelect: number = 0;
    let totalLine: number = 0;
    let selections: CursorData[] = [];
    this.view.state.selection.ranges.forEach(range => {
      const cur = new CursorData(range, this.view.state.doc)
      totalSelect += cur.tot;
      totalLine += cur.tln;
      selections.push(cur);
    });

    const settings = this.plugin.settings;
    const status = this.plugin.cursorStatusBar;
    status.setText("");

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
          display += settings.cursorSeperator + this.view.state.doc.lines;
        }
      } else {
        display = `${selections.length} cursors`;
      }
      if (totalSelect != 0) {
        display += this.totalDisplay(totalSelect, totalLine);
      }
      status.setText(display);
    }
  }

  addPlugin(plugin: CursorLocation) {
    this.plugin = plugin;
    this.hasPlugin = true;
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
    } else if (selection.tot == 0) {
      value = selection.headString(settings.displayPattern, skipTotal);
    } else {
      value =
        selection.anchorString(settings.displayPattern, true) +
        settings.rangeSeperator +
        selection.headString(settings.displayPattern, skipTotal);
    }
    if (displayLines && settings.displayCursorLines) {
      let numberLines = Math.abs(selection.aLn - selection.hLn) + 1;
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

const editorPlugin = ViewPlugin.fromClass(EditorPlugin);

export default class CursorLocation extends Plugin {
  public cursorStatusBar: HTMLElement;
  settings: CursorLocationSettings;

  async onload() {
    console.log("loading Cursor Location plugin");
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new CursorLocationSettingTab(this.app, this));

    this.cursorStatusBar = this.addStatusBarItem();
    this.cursorStatusBar.setText("Cursor Location");

    this.registerEditorExtension(editorPlugin);

    this.app.workspace.onLayoutReady(() => {
      this.giveEditorPlugin(this.app.workspace.getMostRecentLeaf());
    });

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", async (leaf: WorkspaceLeaf) => {
        this.giveEditorPlugin(leaf); 
      })
    );
  }

  async onunload(): Promise<void> {
    console.log("unloading Cursor Location plugin");
    this.cursorStatusBar = null;
  }

  giveEditorPlugin(leaf: WorkspaceLeaf): void {
    // @ts-expect-error
    const editor = leaf?.view?.editor;
    if (editor) {
      const editorView = editor.cm as EditorView;
      const editorPlug = editorView.plugin(editorPlugin);
      editorPlug.addPlugin(this);
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
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
