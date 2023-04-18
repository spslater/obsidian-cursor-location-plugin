import { App, PluginSettingTab, Setting, ValueComponent } from "obsidian";
import type CursorLocation from "src/main";

export interface CursorLocationSettings {
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
  statusBarPadding: boolean;
  paddingStep: number;
  wordyDisplay: boolean;
  fuzzyAmount: string;
  includeFrontmatter: boolean;
  frontmatterString: string;
}

export const DEFAULT_SETTINGS: CursorLocationSettings = {
  numberCursors: 1,
  selectionMode: "full",
  displayCharCount: true,
  displayPattern: "ch:ln/ct",
  cursorSeperator: " / ",
  rangeSeperator: "->",
  displayTotalLines: true,
  displayCursorLines: false,
  cursorLinePattern: "[lc]",
  statusBarPadding: false,
  paddingStep: 9,
  wordyDisplay: true,
  fuzzyAmount: "verywordy",
  includeFrontmatter: false,
  frontmatterString: "frontmatter",
};

export class CursorLocationSettingTab extends PluginSettingTab {
  plugin: CursorLocation;

  constructor(app: App, plugin: CursorLocation) {
    super(app, plugin);
    this.plugin = plugin;
  }

  private resetComponent(elem: Setting, setting: string) {
    const value = DEFAULT_SETTINGS[setting];
    console.log(`resetting ${setting}: ${value}`);
    let component = elem.components[0] as ValueComponent<any>;
    component.setValue(value?.toString());
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
              cursorWarningSection.setText("");
              this.plugin.settings.numberCursors = parsedValue;
              await this.plugin.saveSettings();
            } else {
              console.log(
                "unable to update numberCursors, ",
                `unable to parse new value into integer: ${value}`
              );
              cursorWarningSection.setText(
                `"${value}" is not a number, unable to save.`
              );
            }
          })
      );
    let cursorWarningSection = cursorEl.createEl("p", {
      text: "",
      attr: { style: "color:red" },
    });
    new Setting(cursorEl)
      .setName(`Reset to default value of '${DEFAULT_SETTINGS.numberCursors}'`)
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          this.resetComponent(numberCursors, "numberCursors");
          cursorWarningSection.setText("");
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
          .setValue(
            this.plugin.settings.selectionMode || DEFAULT_SETTINGS.selectionMode
          )
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
      .setName(
        `Reset to default value of '${DEFAULT_SETTINGS.displayCharCount}'`
      )
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          this.resetComponent(displayCharCount, "displayCharCount");
          await this.plugin.saveSettings();
        })
      );

    let displayTotalLineCountEl = containerEl.createDiv();
    displayTotalLineCountEl.createEl("h3", {
      text: "Display Total Line Count",
    });
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
      .setName(
        `Reset to default value of '${DEFAULT_SETTINGS.displayTotalLines}'`
      )
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
        text
          .setValue(this.plugin.settings.displayPattern)
          .onChange(async (value) => {
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
        text
          .setValue(this.plugin.settings.cursorSeperator)
          .onChange(async (value) => {
            console.log(`changing cursorSeperator: ${value}`);
            this.plugin.settings.cursorSeperator = value;
            await this.plugin.saveSettings();
          });
      });
    new Setting(cursorSeperatorEl)
      .setName(
        `Reset to default value of '${DEFAULT_SETTINGS.cursorSeperator}'`
      )
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
        text
          .setValue(this.plugin.settings.rangeSeperator)
          .onChange(async (value) => {
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
    displayCursorLineCountEl.createEl("h3", {
      text: "Display Cursor Line Count",
    });
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
      .setName(
        `Reset to default value of '${DEFAULT_SETTINGS.displayCursorLines}'`
      )
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
        text
          .setValue(this.plugin.settings.cursorLinePattern)
          .onChange(async (value) => {
            console.log(`changing cursorLinePattern: ${value}`);
            this.plugin.settings.cursorLinePattern = value.trim();
            await this.plugin.saveSettings();
          });
      });
    new Setting(cursorLinePatternEl)
      .setName(
        `Reset to default value of '${DEFAULT_SETTINGS.cursorLinePattern}'`
      )
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          this.resetComponent(cursorLinePattern, "cursorLinePattern");
          await this.plugin.saveSettings();
        })
      );

    let statusBarPaddingEl = containerEl.createDiv();
    statusBarPaddingEl.createEl("h3", { text: "Pad Status Bar" });
    let statusBarPadding = new Setting(statusBarPaddingEl)
      .setName("Add padding to lessen the amount the status bar shifts")
      .addToggle((cb) =>
        cb
          .setValue(
            this.plugin.settings.statusBarPadding != null
              ? this.plugin.settings.statusBarPadding
              : DEFAULT_SETTINGS.statusBarPadding
          )
          .onChange(async (value) => {
            if (this.plugin.settings.statusBarPadding != value) {
              console.log(`changing statusBarPadding: ${value}`);
            }
            this.plugin.settings.statusBarPadding = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(statusBarPaddingEl)
      .setName(
        `Reset to default value of '${DEFAULT_SETTINGS.statusBarPadding}'`
      )
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          this.resetComponent(statusBarPadding, "statusBarPadding");
          await this.plugin.saveSettings();
        })
      );

    let paddingStepEl = containerEl.createDiv();
    paddingStepEl.createEl("h3", { text: "# of Cursors" });
    let paddingStep = new Setting(paddingStepEl)
      .setName(
        'Width the status bar rounds to to prevent rapid changing.'
      )
      .addText((text) =>
        text
          .setValue(this.plugin.settings?.paddingStep?.toString())
          .onChange(async (value) => {
            let parsedValue = parseInt(value);
            if (!isNaN(parsedValue)) {
              console.log(`updating paddingStep: ${parsedValue}`);
              paddingStepWarningSection.setText("");
              this.plugin.settings.paddingStep = parsedValue;
              await this.plugin.saveSettings();
            } else {
              console.log(
                "unable to update paddingStep, ",
                `unable to parse new value into integer: ${value}`
              );
              paddingStepWarningSection.setText(
                `"${value}" is not a number, unable to save.`
              );
            }
          })
      );
    let paddingStepWarningSection = paddingStepEl.createEl("p", {
      text: "",
      attr: { style: "color:red" },
    });
    new Setting(paddingStepEl)
      .setName(`Reset to default value of '${DEFAULT_SETTINGS.paddingStep}'`)
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          this.resetComponent(paddingStep, "paddingStep");
          paddingStepWarningSection.setText("");
          await this.plugin.saveSettings();
        })
      );

    let wordyDisplayEl = containerEl.createDiv();
    wordyDisplayEl.createEl("h3", { text: "Display as Percent" });
    let wordyDisplay = new Setting(wordyDisplayEl)
      .setName("Display percent thru the document instead of line number")
      .addToggle((cb) =>
        cb
          .setValue(
            this.plugin.settings.wordyDisplay != null
              ? this.plugin.settings.wordyDisplay
              : DEFAULT_SETTINGS.wordyDisplay
          )
          .onChange(async (value) => {
            if (this.plugin.settings.wordyDisplay != value) {
              console.log(`changing wordyDisplay: ${value}`);
            }
            this.plugin.settings.wordyDisplay = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(wordyDisplayEl)
      .setName(
        `Reset to default value of '${DEFAULT_SETTINGS.wordyDisplay}'`
      )
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          this.resetComponent(wordyDisplay, "wordyDisplay");
          await this.plugin.saveSettings();
        })
      );

    let fuzzyAmountEl = containerEl.createDiv();
    fuzzyAmountEl.createEl("h3", { text: "Selecion Mode" });
    let fuzzyAmount = new Setting(fuzzyAmountEl)
      .setName(
        "When showing percents, include "
      )
      .addDropdown((cb) =>
        cb
          .addOption("verywordy", "Very Wordy")
          .addOption("littewordy", "Little Wordy")
          .addOption("strictpercent", "Strict Percentages")
          .addOption("lowfuzzypercent", "Low Fuzzy Percentages")
          .addOption("highfuzzypercent", "High Fuzzy Percentages")
          .addOption("onlypercent", "Only Percentages")
          .setValue(
            this.plugin.settings.fuzzyAmount || DEFAULT_SETTINGS.fuzzyAmount
          )
          .onChange(async (value) => {
            console.log(`changing fuzzyAmount: ${value}`);
            this.plugin.settings.fuzzyAmount = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(fuzzyAmountEl)
      .setName("Reset to default value of 'Very Wordy'")
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          this.resetComponent(fuzzyAmount, "fuzzyAmount");
          await this.plugin.saveSettings();
        })
      );

    let includeFrontmatterEl = containerEl.createDiv();
    includeFrontmatterEl.createEl("h3", { text: "Display as Percent" });
    let includeFrontmatter = new Setting(includeFrontmatterEl)
      .setName("Include the frontmatter as part of the document percentage")
      .addToggle((cb) =>
        cb
          .setValue(
            this.plugin.settings.includeFrontmatter != null
              ? this.plugin.settings.includeFrontmatter
              : DEFAULT_SETTINGS.includeFrontmatter
          )
          .onChange(async (value) => {
            if (this.plugin.settings.includeFrontmatter != value) {
              console.log(`changing includeFrontmatter: ${value}`);
            }
            this.plugin.settings.includeFrontmatter = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(includeFrontmatterEl)
      .setName(
        `Reset to default value of '${DEFAULT_SETTINGS.includeFrontmatter}'`
      )
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          this.resetComponent(includeFrontmatter, "includeFrontmatter");
          await this.plugin.saveSettings();
        })
      );

    let frontmatterStringEl = containerEl.createDiv();
    frontmatterStringEl.createEl("h3", { text: "Frontmatter Phrase" });
    let frontmatterString = new Setting(frontmatterStringEl)
      .setName("What to call the frontmatter when cursor is inside it")
      .addDropdown((cb) =>
        cb
          .addOption("frontmatter", "frontmatter")
          .addOption("metadata", "metadata")
          .addOption("preamble", "preamble")
          .setValue(
            this.plugin.settings.frontmatterString || DEFAULT_SETTINGS.frontmatterString
          )
          .onChange(async (value) => {
            console.log(`changing frontmatterString: ${value}`);
            this.plugin.settings.frontmatterString = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(frontmatterStringEl)
      .setName("Reset to default value of 'frontmatter'")
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          this.resetComponent(frontmatterString, "frontmatterString");
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
      { elem: statusBarPadding, setting: "statusBarPadding" },
      { elem: paddingStep, setting: "paddingStep" },
      { elem: wordyDisplay, setting: "wordyDisplay" },
      { elem: fuzzyAmount, setting: "fuzzyAmount" },
      { elem: includeFrontmatter, setting: "includeFrontmatter" },
      { elem: frontmatterString, setting: "frontmatterString" },
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
          cursorWarningSection.setText("");
          await this.plugin.saveSettings();
        })
      );
  }
}
