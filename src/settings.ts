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
    const cursorLocationSettings: e.SettingElement[] = [
      new e.NumberCursors(containerEl, this.plugin),
      new e.SelectionMode(containerEl, this.plugin),
      new e.DisplayCharCount(containerEl, this.plugin),
      new e.DisplayTotalLineCount(containerEl, this.plugin),
      new e.DisplayPattern(containerEl, this.plugin),
      new e.CursorSeperator(containerEl, this.plugin),
      new e.RangeSeperator(containerEl, this.plugin),
      new e.DisplayCursorLineCount(containerEl, this.plugin),
      new e.CursorLinePattern(containerEl, this.plugin),
      new e.StatusBarPadding(containerEl, this.plugin),
      new e.PaddingStep(containerEl, this.plugin),
      new e.WordyDisplay(containerEl, this.plugin),
      new e.FuzzyAmount(containerEl, this.plugin),
      new e.IncludeFrontmatter(containerEl, this.plugin),
      new e.FrontmatterString(containerEl, this.plugin),
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
        })
      );
  }
}
