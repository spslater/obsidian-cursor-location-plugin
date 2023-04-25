import { App, PluginSettingTab, Setting } from "obsidian";
import type CursorLocation from "src/main";
import * as e from "src/elements";

export class CursorLocationSettingTab extends PluginSettingTab {
  plugin: CursorLocation;

  constructor(app: App, plugin: CursorLocation) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();
    containerEl.createDiv().createEl("h2", { text: "Cursor Information" });

    const NumberCursors = new e.NumberCursors(containerEl, this.plugin);
    const CursorSeperator = new e.CursorSeperator(containerEl, this.plugin);
    NumberCursors.children.push(CursorSeperator);

    const SelectionMode = new e.SelectionMode(containerEl, this.plugin);
    const RangeSeperator = new e.RangeSeperator(containerEl, this.plugin);
    SelectionMode.children.push(RangeSeperator);

    const WordyDisplay = new e.WordyDisplay(containerEl, this.plugin);
    // Add a Dropdown "Pattern" option, maybe switch Display Pattern
    // As part of the "custom" option, show the other options
    const DisplayPattern = new e.DisplayPattern(containerEl, this.plugin);

    const DisplayCursorLines = new e.DisplayCursorLines(containerEl, this.plugin);
    const CursorLinePattern = new e.CursorLinePattern(containerEl, this.plugin);
    DisplayCursorLines.children.push(CursorLinePattern);

    const FuzzyAmount = new e.FuzzyAmount(containerEl, this.plugin);
    const ExcludeFrontmatter = new e.ExcludeFrontmatter(containerEl, this.plugin);
    const FrontmatterString = new e.FrontmatterString(containerEl, this.plugin);
    ExcludeFrontmatter.children.push(FrontmatterString);

    const StatusBarPadding = new e.StatusBarPadding(containerEl, this.plugin);
    const PaddingStep = new e.PaddingStep(containerEl, this.plugin);
    StatusBarPadding.children.push(PaddingStep);

    const DisplayCharCount = new e.DisplayCharCount(containerEl, this.plugin);
    const DisplayTotalLineCount = new e.DisplayTotalLineCount(containerEl, this.plugin);

    WordyDisplay.percents.push(FuzzyAmount);
    WordyDisplay.percents.push(ExcludeFrontmatter);
    WordyDisplay.rowcol.push(DisplayPattern);
    WordyDisplay.rowcol.push(DisplayCursorLines);

    ExcludeFrontmatter.toggleChildren();
    NumberCursors.toggleChildren();
    SelectionMode.toggleChildren();
    DisplayCursorLines.toggleChildren();
    StatusBarPadding.toggleChildren();
    WordyDisplay.showSettings();

    const cursorLocationSettings: e.SettingElement[] = [
      NumberCursors,
      SelectionMode,
      DisplayCharCount,
      DisplayTotalLineCount,
      DisplayPattern,
      CursorSeperator,
      RangeSeperator,
      DisplayCursorLines,
      CursorLinePattern,
      StatusBarPadding,
      PaddingStep,
      WordyDisplay,
      FuzzyAmount,
      ExcludeFrontmatter,
      FrontmatterString,
    ];

    containerEl.createDiv().createEl("h2", { text: "Reset All Settings" });
    let resetAllEl = containerEl.createDiv();
    new Setting(resetAllEl)
      .setName("Reset all settings to default values.")
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async () => {
          console.log("resetting all values to their defaults");
          cursorLocationSettings.forEach(setting => setting.resetComponent());
          await this.plugin.saveSettings();
          NumberCursors.toggleChildren();
          SelectionMode.toggleChildren();
          DisplayCursorLines.toggleChildren();
          StatusBarPadding.toggleChildren();
          WordyDisplay.showSettings();
        })
      );
  }
}
