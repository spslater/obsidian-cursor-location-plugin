import { Setting, ValueComponent } from "obsidian";
import type CursorLocation from "src/main";
import { DEFAULT_SETTINGS } from "src/constants";
import { showElem, hideElem } from "src/helpers";

export class SettingElement {
  name: string
  element: HTMLElement
  setting: Setting
  warning: HTMLElement
  error: boolean
  override: string
  plugin: CursorLocation
  children: SettingElement[]

  constructor(
    container: HTMLElement,
    title: string,
    plugin: CursorLocation,
    name: string,
    override: string = null
  ) {
    this.name = name;
    this.plugin = plugin;
    this.override = override;
    this.children = [];

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
        this.error = false;
      } else {
        console.log(
          `unable to update ${this.name}, `,
          `unable to parse new value into integer: ${value}`
        );
        this.warning.setText(
          `"${value}" is not a full number, unable to save.`
        );
        this.error = true;
      }
    }
  }

  public show() {
    if (this.element) showElem(this.element);
    if (this.warning) showElem(this.warning);
    this.showChildren();
  }

  public showChildren() {
    this.children.forEach(c => c.show());
  }

  public hide() {
    if (this.element) hideElem(this.element);
    if (this.warning) hideElem(this.warning);
    this.hideChildren();
  }

  public hideChildren() {
    this.children.forEach(c => c.hide());
  }
}

class SettingElementCustom extends SettingElement {
  customName: string
  custom: Setting

  public customOnChange() {
    return async (value: any) => {
      if (this.plugin.settings[this.customName] != value) {
        console.log(`changing ${this.customName}: ${value}`);
      }
      if (typeof DEFAULT_SETTINGS[this.customName] === "boolean") {
        this.plugin.settings[this.customName] = value;
      } else {
        this.plugin.settings[this.customName] = value?.trim();
      }
      await this.plugin.saveSettings();
    }
  }

  public toggleCustom() {
    const isCustom = this.plugin.settings[this.name] == "custom";
    const elem = this.custom.settingEl;
    isCustom ? showElem(elem) : hideElem(elem);
  }

  public basicOnChange() {
    return async (value: string) => {
      await super.basicOnChange()(value)
      this.toggleCustom();
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
          .onChange(this.onChange())
      });
    this.warning = this.createWarning();
    this.resetSetting();
  }

  private onChange() {
    return async (value: any) => {
      await this.numberOnChange()(value);
      if (!this.error) this.toggleChildren();
    }
  }

  public showChildren() {
    if (this.plugin.settings.numberCursors != 1) {
      super.showChildren();
    }
  }

  public toggleChildren() {
    const num = this.plugin.settings.numberCursors;
    num == 1 ? super.hideChildren() : super.showChildren();
  }
}

export class SelectionMode extends SettingElement {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "Selecion Mode", plugin, "selectionMode", "Full Selection");

    this.setting = new Setting(this.element)
      .setName(
        "Display just the beginning, \
        just the end, or the full range of a selection."
      )
      .addDropdown((cb) => {
        cb
          .addOption("full", "Full Selection")
          .addOption("begin", "Beginning")
          .addOption("end", "End")
          .setValue(
            this.plugin.settings.selectionMode 
            || DEFAULT_SETTINGS.selectionMode
          )
          .onChange(this.onChange())
      });
    this.resetSetting();
  }

  private onChange() {
    return async (value: any) => {
      await this.basicOnChange()(value);
      this.toggleChildren();
    }
  }

  public showChildren() {
    if (this.plugin.settings.selectionMode == "full") {
      super.showChildren();
    }
  }

  public toggleChildren() {
    const mode = this.plugin.settings.selectionMode;
    mode == "full" ? super.showChildren() : super.hideChildren();
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

export class DisplayPattern extends SettingElementCustom {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(
      container,
      "Individual Cursor Pattern",
      plugin,
      "displayPatternOption",
      "ch:ln/ct"
    )
    this.customName = "displayPattern"

    this.setting = new Setting(this.element)
      .setName("Pattern to display location information for each cursor.")
      .setDesc(
        "`ch` is the column the cursor is at in the current line, \
        `ln` is the current line number, \
        `ct` is the total line numbers in the file (count)."
      )
      .addDropdown((cb) => {
        cb
          .addOption("clt", "ch:ln/ct")
          .addOption("lct", "ln:ch/ct")
          .addOption("clt2", "ch ln-ct")
          .addOption("clts", "ch ln ct")
          .addOption("lcts", "ln ch ct")
          .addOption("custom", "custom")
          .setValue(
            this.plugin.settings.displayPatternOption
            || DEFAULT_SETTINGS.displayPatternOption
          )
          .onChange(this.basicOnChange())
    });

    this.custom = new Setting(this.element)
      .setName("Custom pattern for display")
      .setDesc(
        "If `ct` is the first or last of the three values, \
        it will be removed when displaying a range."
      )
      .addText((text) => {
        text
          .setValue(this.plugin.settings.displayPattern)
          .onChange(this.customOnChange())
      });
    this.resetSetting();
    this.toggleCustom();
  }
}

export class CursorSeperator extends SettingElementCustom {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(
      container,
      "Cursor Seperator",
      plugin,
      "cursorSeperatorOption",
      "slash `/`"
    );
    this.customName = "cursorSeperator";

    this.setting = new Setting(this.element)
      .setName(
        "String to seperate multiple curor locations when \
        `# of Cursors` is greater than 1. Selecting `custom` \
        will let you type out your own"
      )
      .addDropdown((cb) => {
        cb
          .addOption("slash", "slash `/`")
          .addOption("pipe", "pipe `|`")
          .addOption("tilde", "tilde `~`")
          .addOption("ampersand", "ampersand `&`")
          .addOption("custom", "custom")
          .setValue(
            this.plugin.settings.cursorSeperatorOption
            || DEFAULT_SETTINGS.cursorSeperatorOption
          )
          .onChange(this.basicOnChange())
      });

    this.custom = new Setting(this.element)
      .setName(
        "String will be padded by a space on each side. \
        Consecutive whitespace is squashed to 1 space (per HTML rules). \
        For example: '/' will be displayed as ' / '"
      )
      .addText((text) => {
        text
          .setValue(this.plugin.settings.cursorSeperator)
          .onChange(this.customOnChange())
      });
    this.resetSetting();
    this.toggleCustom();
  }
}

export class RangeSeperator extends SettingElementCustom {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(
      container,
      "Range Seperator",
      plugin,
      "rangeSeperatorOption",
      "arrow '→'"
    )
    this.customName = "rangeSeperator";

    this.setting = new Setting(this.element)
      .setName(
        "String to seperate the beginning and end of a selection \
          when `Selection Mode` is set to `Full Selection`. \
          Selecting `custom` will let you type out your own"
      )
      .addDropdown((cb) => {
        cb
          .addOption("arrow", "arrow '→'")
          .addOption("dash", "dash `-`")
          .addOption("tilde", "tilde `~`")
          .addOption("custom", "custom")
          .setValue(
            this.plugin.settings.rangeSeperatorOption
            || DEFAULT_SETTINGS.rangeSeperatorOption
          )
          .onChange(this.basicOnChange())
      });

    this.custom = new Setting(this.element)
      .setName(
        "String will NOT be padded by a space on each side. \
          Consecutive whitespace is squashed to 1 space (per HTML rules) \
          For example: '->' will be displayed as '2->3' and ' -> ' will \
          be displayed as '2 -> 3'"
      )
      .addText((text) => {
        text
          .setValue(this.plugin.settings.rangeSeperator)
          .onChange(this.customOnChange());
      });
    this.resetSetting();
    this.toggleCustom();
  }
}

export class DisplayCursorLines extends SettingElement {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "Display Cursor Line Count", plugin, "displayCursorLines")

    this.setting = new Setting(this.element)
      .setName("Display the number of lines selected by each cursor.")
      .addToggle((cb) => {
        cb
          .setValue(
            this.plugin.settings.displayCursorLines != null
              ? this.plugin.settings.displayCursorLines
              : DEFAULT_SETTINGS.displayCursorLines
          )
          .onChange(this.onChange())
      });
    this.resetSetting();
  }

  private onChange() {
    return async (value: any) => {
      await this.basicOnChange()(value);
      this.toggleChildren();
    }
  }

  public showChildren() {
    if (this.plugin.settings.displayCursorLines) {
      super.showChildren();
    }
  }

  public toggleChildren() {
    const display = this.plugin.settings.displayCursorLines;
    display ? super.showChildren() : super.hideChildren();
  }
}

export class CursorLinePattern extends SettingElementCustom {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(
      container,
      "Cursor Line Pattern",
      plugin,
      "cursorLinePatternOption",
      "[lc]"
    )
    this.customName = "cursorLinePattern"

    this.setting = new Setting(this.element)
      .setName("Pattern to display number of highlighted lines for each cursor.")
      .addDropdown((cb) => {
        cb
          .addOption("square", "[lc]")
          .addOption("curly", "{lc}")
          .addOption("parens", "(lc)")
          .addOption("pointy", "<lc>")
          .addOption("custom", "custom")
          .setValue(
            this.plugin.settings.cursorLinePatternOption
            || DEFAULT_SETTINGS.cursorLinePatternOption
          )
          .onChange(this.basicOnChange())
      });

    this.custom = new Setting(this.element)
      .setName(
          "`lc` is the line count and will not be displayed if only one line \
          is selected or 'Display Cursor Line Count' setting is `false`. \
          Leading and trailing whitespace is trimmed."
      )
      .addText((text) => {
        text
          .setValue(this.plugin.settings.cursorLinePattern)
          .onChange(this.customOnChange());
      });
    this.resetSetting();
    this.toggleCustom();
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
          .onChange(this.onChange())
      });
    this.resetSetting();
  }

  private onChange() {
    return async (value: any) => {
      await this.basicOnChange()(value);
      this.toggleChildren();
    }
  }

  public showChildren() {
    if (this.plugin.settings.statusBarPadding) {
      super.showChildren();
    }
  }

  public toggleChildren() {
    const display = this.plugin.settings.statusBarPadding;
    display ? super.showChildren() : super.hideChildren();
  }
}


export class PaddingStep extends SettingElementCustom {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(
      container,
      "Padding Width",
      plugin,
      "paddingStepOption",
      "low `6px`"
    )
    this.customName = "paddingStep"

    this.setting = new Setting(this.element)
      .setName("Amount the status bar will round to when padding.")
      .setDesc(
        "For example, with the default value of '12' the status bar \
        could be set to a width of 60 if the contents width is 55."
      )
      .addDropdown((cb) => {
        cb
          .addOption("low", "low `6px`")
          .addOption("medium", "medium `12px`")
          .addOption("high", "high `24px`")
          .addOption("custom", "custom")
          .setValue(
            this.plugin.settings.paddingStepOption
            || DEFAULT_SETTINGS.paddingStepOption
          )
          .onChange(this.basicOnChange())
      });

    this.custom = new Setting(this.element)
      .setName("Multiples of 3 work best, though any positive value will do.")
      .setDesc(
        "A cursor with just the head is around 70px. \
        A single selection with head and anchor plus totals is around 250px. \
        3 selections like the above with individual line counts is around 500px."
      )
      .addText((text) => {
        text
          .setValue(this.plugin.settings?.paddingStep?.toString())
          .onChange(this.numberOnChange())
      });
    this.warning = this.createWarning();
    this.resetSetting();
    this.toggleCustom();
  }
}


export class WordyDisplay extends SettingElement {
  percents: SettingElement[]
  rowcol: SettingElement[]

  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "Display as Percent", plugin, "wordyDisplay")
    this.percents = []
    this.rowcol = []

    this.setting = new Setting(this.element)
      .setName("Display percent thru the document instead of line number")
      .addToggle((cb) => {
        cb
          .setValue(
            this.plugin.settings.wordyDisplay != null
              ? this.plugin.settings.wordyDisplay
              : DEFAULT_SETTINGS.wordyDisplay
          )
          .onChange(this.onChange())
      });
    this.resetSetting();
  }

  private onChange() {
    return async (value: boolean) => {
      await this.basicOnChange()(value)
      this.showSettings();
    }
  }

  public showSettings() {
    if (this.plugin.settings.wordyDisplay) {
      this.percents.forEach(s => s.show());
      this.rowcol.forEach(s => s.hide())
    } else {
      this.percents.forEach(s => s.hide());
      this.rowcol.forEach(s => s.show())
    }
  }
}


export class FuzzyAmount extends SettingElement {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "Percentage Mode", plugin, "fuzzyAmount", "Strict Percentages")

    this.setting = new Setting(this.element)
      .setName("How many words vs percent numbers to display.")
      .setDesc(
        "__Very Wordy__: only uses words, splits the document into 5ths \
        __A Little Wordy__: only uses words, splits the document into 3rds \
        __Strict Percentages__: Will say at the top and bottom, and then percentages from 1% to 99% \
        __Low Fuzzy Percentages__: Will say at the top and bottom for the first and last 10%, percentages for the rest of the document \
        __High Fuzzy Percentages__: Will say at the top and bottom for the first and last 20%, percentages for the rest of the document \
        __Only Percentages__: Shows percentages throughout the document, no words are used"
      )
      .addDropdown((cb) => {
        cb
          .addOption("strictpercent", "Strict Percentages")
          .addOption("lowfuzzypercent", "Low Fuzzy Percentages")
          .addOption("highfuzzypercent", "High Fuzzy Percentages")
          .addOption("onlypercent", "Only Percentages")
          .addOption("verywordy", "Very Wordy")
          .addOption("littewordy", "Little Wordy")
          .setValue(
            this.plugin.settings.fuzzyAmount
            || DEFAULT_SETTINGS.fuzzyAmount
          )
          .onChange(this.basicOnChange())
      });
    this.resetSetting();
  }
}


export class ExcludeFrontmatter extends SettingElement {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "Exclude Frontmatter", plugin, "excludeFrontmatter")

    this.setting = new Setting(this.element)
      .setName("Exclude the frontmatter as part of the document percentage")
      .addToggle((cb) => {
        cb
          .setValue(
            this.plugin.settings.excludeFrontmatter != null
              ? this.plugin.settings.excludeFrontmatter
              : DEFAULT_SETTINGS.excludeFrontmatter
          )
          .onChange(this.onChange())
      });
    this.resetSetting();
  }

  private onChange() {
    return async (value: any) => {
      await this.basicOnChange()(value);
      this.toggleChildren();
    }
  }

  public showChildren() {
    if (this.plugin.settings.excludeFrontmatter) {
      super.showChildren();
    }
  }

  public toggleChildren() {
    const display = this.plugin.settings.excludeFrontmatter;
    display ? super.showChildren() : super.hideChildren();
  }
}


export class FrontmatterString extends SettingElementCustom {
  constructor(container: HTMLElement, plugin: CursorLocation) {
    super(container, "Frontmatter Phrase", plugin, "frontmatterString")
    this.customName = "frontmatterStringCustom";

    this.setting = new Setting(this.element)
      .setName("What to call the frontmatter when cursor is inside it")
      .addDropdown((cb) => {
        cb
          .addOption("frontmatter", "frontmatter")
          .addOption("metadata", "metadata")
          .addOption("preamble", "preamble")
          .addOption("custom", "custom")
          .setValue(
            this.plugin.settings.frontmatterString
            || DEFAULT_SETTINGS.frontmatterString
          )
          .onChange(this.basicOnChange())
      });
    this.custom = new Setting(this.element)
      .setName(
        "If you don't like the options provided, \
        you can set the frontmatter to whaterver \
        you want with this."
      )
      .addText((text) => {
        text
          .setValue(this.plugin.settings?.frontmatterStringCustom)
          .onChange(this.customOnChange())
      });
    this.resetSetting();
    this.toggleCustom();
  }
}

