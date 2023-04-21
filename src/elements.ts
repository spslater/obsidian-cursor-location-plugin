import { Setting, ValueComponent } from "obsidian";
import type CursorLocation from "src/main";
import { DEFAULT_SETTINGS } from "src/constants";

export class SettingElement {
  name: string
  element: HTMLElement
  setting: Setting
  warning: HTMLElement
  override: string
  plugin: CursorLocation

  constructor(
    container: HTMLElement,
    title: string,
    plugin: CursorLocation,
    name: string,
    override: string = null
  ) {
    this.name = name
    this.plugin = plugin
    this.override = override

    this.element = container.createDiv();
    this.element.createEl("h3", { text: title });
  }

  public resetComponent() {
    const value = DEFAULT_SETTINGS[this.name];
    console.log(`resetting ${this.name}: ${value}`);
    let component = this.setting.components[0] as ValueComponent<any>;
    component.setValue(value?.toString());
    this.plugin.settings[this.name] = value;
    if (this.warning != null) this.warning.setText("");
  }

  public resetSetting() {
    let value = this.override ? this.override : DEFAULT_SETTINGS[this.name];
    new Setting(this.element)
      .setName(`Reset to default value of '${value}'`)
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          this.resetComponent();
          await this.plugin.saveSettings();
        })
      );
  }

  public createWarning(): HTMLElement {
    return this.element.createEl("p",{text:"",attr:{style:"color:red"}});
  }

  public basicOnChange() {
    return async (value: any) => {
      if (this.plugin.settings[this.name] != value) {
        console.log(`changing ${this.name}: ${value}`);
      }
      if (typeof DEFAULT_SETTINGS[this.name] === "boolean") {
        this.plugin.settings[this.name] = value;
      } else {
        this.plugin.settings[this.name] = value?.trim();
      }
      await this.plugin.saveSettings();
    }
  }

  public numberOnChange() {
    return async (value: any) => {
      let parsedValue = parseInt(value);
      if (!isNaN(parsedValue)) {
        if (this.plugin.settings[this.name] != value) {
          console.log(`changing ${this.name}: ${value}`);
        }
        this.warning.setText("");
        this.plugin.settings[this.name] = parsedValue;
        await this.plugin.saveSettings();
      } else {
        console.log(
          `unable to update ${this.name}, `,
          `unable to parse new value into integer: ${value}`
        );
        this.warning.setText(
          `"${value}" is not a full number, unable to save.`
        );
      }
    }
  }
}

export class NumberCursors extends SettingElement {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "# of Cursors", plugin, "numberCursors");

    this.setting = new Setting(this.element)
      .setName(
        'Number of cursor positions that will display \
          in the status bar before switching to "N cursors".'
      )
      .addText((text) => {
        text
          .setValue(this.plugin.settings?.numberCursors?.toString())
          .onChange(this.numberOnChange())
      });
    this.warning = this.createWarning();
    this.resetSetting();
  }
}

export class SelectionMode extends SettingElement {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "Selecion Mode", plugin, "selectionMode", "Full Selection");

    this.setting = new Setting(this.element)
      .setName(
        "Display just the beginning, just the end, or the full range of a selection."
      )
      .addDropdown((cb) => {
        cb
          .addOption("begin", "Beginning")
          .addOption("end", "End")
          .addOption("full", "Full Selection")
          .setValue(
            this.plugin.settings.selectionMode || DEFAULT_SETTINGS.selectionMode
          )
          .onChange(this.basicOnChange())
      });

    this.resetSetting();
  }
}

export class DisplayCharCount extends SettingElement {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "Display Character Count", plugin, "displayCharCount")

    this.setting = new Setting(this.element)
      .setName("Display the total number of characters selected.")
      .addToggle((cb) => {
        cb
          .setValue(
            this.plugin.settings.displayCharCount != null
              ? this.plugin.settings.displayCharCount
              : DEFAULT_SETTINGS.displayCharCount
          )
          .onChange(this.basicOnChange())
      });
    this.resetSetting();
  }
}

export class DisplayTotalLineCount extends SettingElement {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "Display Total Line Count", plugin, "displayTotalLines")

    this.setting = new Setting(this.element)
      .setName("Display the total number of lines selected.")
      .addToggle((cb) => {
        cb
          .setValue(
            this.plugin.settings.displayTotalLines != null
              ? this.plugin.settings.displayTotalLines
              : DEFAULT_SETTINGS.displayTotalLines
          )
          .onChange(this.basicOnChange())
      });
    this.resetSetting();
  }
}

export class DisplayPattern extends SettingElement {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "Individual Cursor Pattern", plugin, "displayPattern")

    this.setting = new Setting(this.element)
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
          .onChange(this.basicOnChange());
      });
    this.resetSetting();
  }
}

export class CursorSeperator extends SettingElement {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "Cursor Seperator", plugin, "cursorSeperator")

    this.setting = new Setting(this.element)
      .setName(
        "String to seperate multiple curor locations when \
          `# of Cursors` is greater than 1. Consecutive whitespace \
          is squashed to 1 space (per HTML rules)."
      )
      .addText((text) => {
        text
          .setValue(this.plugin.settings.cursorSeperator)
          .onChange(this.basicOnChange());
      });
    this.resetSetting();
  }
}

export class RangeSeperator extends SettingElement {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "Range Seperator", plugin, "rangeSeperator")

    this.setting = new Setting(this.element)
      .setName(
        "String to seperate the beginning and end of a selection \
          when `Selection Mode` is set to `Full Selection`. \
          Consecutive whitespace is squashed to 1 space (per HTML rules)"
      )
      .addText((text) => {
        text
          .setValue(this.plugin.settings.rangeSeperator)
          .onChange(this.basicOnChange());
      });
    this.resetSetting();
  }
}

export class DisplayCursorLineCount extends SettingElement {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "Display Cursor Line Count", plugin, "displayCursorLineCount")

    this.setting = new Setting(this.element)
      .setName("Display the number of lines selected by each cursor.")
      .addToggle((cb) => {
        cb
          .setValue(
            this.plugin.settings.displayCursorLines != null
              ? this.plugin.settings.displayCursorLines
              : DEFAULT_SETTINGS.displayCursorLines
          )
          .onChange(this.basicOnChange())
      });
    this.resetSetting();
  }
}

export class CursorLinePattern extends SettingElement {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "Cursor Line Pattern", plugin, "cursorLinePattern")

    this.setting = new Setting(this.element)
      .setName(
        "Pattern to display number of highlighted lines for each cursor. \
          `lc` is the line count and will not be displayed if only one line \
          is selected or 'Display Cursor Line Count' setting is `false`. \
          Leading and trailing whitespace is trimmed."
      )
      .addText((text) => {
        text
          .setValue(this.plugin.settings.cursorLinePattern)
          .onChange(this.basicOnChange());
      });
    this.resetSetting();
  }
}


export class StatusBarPadding extends SettingElement {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "Pad Status Bar", plugin, "statusBarPadding")

    this.setting = new Setting(this.element)
      .setName("Add padding to lessen the amount the status bar shifts")
      .addToggle((cb) => {
        cb
          .setValue(
            this.plugin.settings.statusBarPadding != null
              ? this.plugin.settings.statusBarPadding
              : DEFAULT_SETTINGS.statusBarPadding
          )
          .onChange(this.basicOnChange())
      });
    this.resetSetting();
  }
}


export class PaddingStep extends SettingElement {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "Padding Width", plugin, "paddingStep")

    this.setting = new Setting(this.element)
      .setName(
        "Amount the status bar will round to when padding. \
        For example, with the default value of '9' the status bar \
        could be set to a width of 81 if the contents width is 78."
      )
      .addText((text) => {
        text
          .setValue(this.plugin.settings?.paddingStep?.toString())
          .onChange(this.numberOnChange())
      });
    this.warning = this.createWarning();
    this.resetSetting();
  }
}


export class WordyDisplay extends SettingElement {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "Display as Percent", plugin, "wordyDisplay")

    this.setting = new Setting(this.element)
      .setName("Display percent thru the document instead of line number")
      .addToggle((cb) => {
        cb
          .setValue(
            this.plugin.settings.wordyDisplay != null
              ? this.plugin.settings.wordyDisplay
              : DEFAULT_SETTINGS.wordyDisplay
          )
          .onChange(this.basicOnChange())
      });
    this.resetSetting();
  }
}


export class FuzzyAmount extends SettingElement {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "Percentage Mode", plugin, "fuzzyAmount", "Strict Percentages")

    this.setting = new Setting(this.element)
      .setName(
        "How many words versus percent numbers to display. <br /> \
        * Very Wordy: only uses words, splits the document into 5ths <br /> \
        * A Little Wordy: only uses words, splits the document into 3rds <br /> \
        * Strict Percentages: Will say at the top and bottom, and then percentages from 1% to 99% <br /> \
        * Low Fuzzy Percentages: Will say at the top and bottom for the first and last 10%, percentages for the rest of the document <br /> \
        * High Fuzzy Percentages: Will say at the top and bottom for the first and last 20%, percentages for the rest of the document <br /> \
        * Only Percentages: Shows percentages throughout the document, no words are used <br /> \
        "
      )
      .addDropdown((cb) => {
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
          .onChange(this.basicOnChange())
      });
    this.resetSetting();
  }
}


export class IncludeFrontmatter extends SettingElement {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "Include Frontmatter", plugin, "includeFrontmatter")

    this.setting = new Setting(this.element)
      .setName("Include the frontmatter as part of the document percentage")
      .addToggle((cb) => {
        cb
          .setValue(
            this.plugin.settings.includeFrontmatter != null
              ? this.plugin.settings.includeFrontmatter
              : DEFAULT_SETTINGS.includeFrontmatter
          )
          .onChange(this.basicOnChange())
      });
    this.resetSetting();
  }
}


export class FrontmatterString extends SettingElement {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "Frontmatter Phrase", plugin, "frontmatterString")

    this.setting = new Setting(this.element)
      .setName("What to call the frontmatter when cursor is inside it")
      .addDropdown((cb) => {
        cb
          .addOption("frontmatter", "frontmatter")
          .addOption("metadata", "metadata")
          .addOption("preamble", "preamble")
          .setValue(
            this.plugin.settings.frontmatterString || DEFAULT_SETTINGS.frontmatterString
          )
          .onChange(this.basicOnChange())
      });
      this.resetSetting();
  }
}


