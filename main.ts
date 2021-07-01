import {
  App,
  DropdownComponent,
  Editor,
  EditorPosition,
  EditorSelection,
  MarkdownView,
  Plugin,
  PluginSettingTab,
  Setting,
  TextComponent,
  ToggleComponent,
} from "obsidian";
import * as CodeMirror from "codemirror";

interface CursorLocationSettings {
  numberCursors: number;
  selectionMode: string;
  displayCount: boolean;
}

const DEFAULT_SETTINGS: CursorLocationSettings = {
  numberCursors: 1,
  selectionMode: "end",
  displayCount: true,
};

export default class CursorLocation extends Plugin {
  private cursorStatusBar: HTMLElement;
  settings: CursorLocationSettings;

  async onload() {
    console.log("loading Cursor Location plugin");

    this.registerCodeMirror((cm: CodeMirror.Editor) => {
      cm.on("cursorActivity", this.updateCursor);
    });

    await this.loadSettings();
    this.addSettingTab(new CursorLocationSettingTab(this.app, this));

    this.updateCursor(this.getEditor());
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

  private cursorString(cursor: EditorPosition): string {
    return cursor.ch + ":" + (cursor.line + 1);
  }

  private cursorDisplay(selection: EditorSelection): string {
    let value: string;
    if (this.settings.selectionMode == "begin") {
      value = this.cursorString(selection.anchor);
    } else if (this.settings.selectionMode == "end") {
      value = this.cursorString(selection.head);
    } else if (
      selection.anchor.ch == selection.head.ch &&
      selection.anchor.line == selection.head.line
    ) {
      value = this.cursorString(selection.head);
    } else {
      value =
        this.cursorString(selection.anchor) +
        " -> " +
        this.cursorString(selection.head);
    }
    return value;
  }

  private updateCursor = (editor: CodeMirror.Editor | Editor): void => {
    if (editor) {
      if (!this.cursorStatusBar) {
        this.cursorStatusBar = this.addStatusBarItem();
      }
      let selections: EditorSelection[] = editor.listSelections();
      if (selections && this.settings.numberCursors) {
        let display: string;
        if (selections.length == 1) {
          let value: string = this.cursorDisplay(selections[0]);
          display = value + "/" + editor.lineCount();
        } else if (selections.length < this.settings.numberCursors) {
          let cursorStrings: string[] = [];
          selections.forEach((value) => {
            cursorStrings.push(this.cursorDisplay(value));
          });
          display = cursorStrings.join(" / ");
        } else {
          display = selections.length.toString() + " cursors";
        }
        if (this.settings.displayCount && editor.somethingSelected()) {
          let selectionText = editor.getSelection();
          display +=
            " (" +
            (selectionText.length - selections.length + 1) +
            " selected)";
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

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    let cursorNumber = new Setting(containerEl)
      .setName("# of Cursor")
      .setDesc("Number of cursors to display in the status bar.")
      .addText((text) =>
        text
          .setValue(this.plugin.settings?.numberCursors?.toString())
          .onChange(async (value) => {
            let parsedValue = parseInt(value);
            if (!isNaN(parsedValue)) {
              console.log(
                "Updating number of cursors to display to " + parsedValue
              );
              warningSection.setText("");
              this.plugin.settings.numberCursors = parsedValue;
              await this.plugin.saveSettings();
            } else {
              console.log(
                "Number of cursors to display not updated." +
                  "Unable to parse new value into integer: " +
                  value
              );
              warningSection.setText(
                value + " is not a number, unable to save."
              );
            }
          })
      );

    let warningSection = containerEl.createEl("p", {
      text: "",
      attr: { style: "color:red" },
    });

    let selectionMode = new Setting(containerEl)
      .setName("Selection Mode")
      .setDesc(
        "Display the just the beginning, just the end, " +
          "or the full range of a selection."
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
            console.log("Changing range display to " + value);
            this.plugin.settings.selectionMode = value;
            await this.plugin.saveSettings();
          })
      );

    let displayCount = new Setting(containerEl)
      .setName("Display Count")
      .setDesc("Display the total number of characters selected.")
      .addToggle((cb) =>
        cb
          .setValue(
            this.plugin.settings.displayCount != null
              ? this.plugin.settings.displayCount
              : DEFAULT_SETTINGS.displayCount
          )
          .onChange(async (value) => {
            console.log("Chanign display count visiblity to " + value);
            this.plugin.settings.displayCount = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Reset")
      .setDesc("Reset settings to default values.")
      .addButton((cb) =>
        cb.setButtonText("Reset").onClick(async (evt) => {
          let numberCursorsComponent: TextComponent = cursorNumber
            .components[0] as TextComponent;
          numberCursorsComponent.setValue(
            DEFAULT_SETTINGS.numberCursors.toString()
          );
          let selectionModeComponent: DropdownComponent = selectionMode
            .components[0] as DropdownComponent;
          selectionModeComponent.setValue(DEFAULT_SETTINGS.selectionMode);
          let displayCountComponent: ToggleComponent = displayCount
            .components[0] as ToggleComponent;
          displayCountComponent.setValue(DEFAULT_SETTINGS.displayCount);
          warningSection.setText("");
          this.plugin.settings = DEFAULT_SETTINGS;
          await this.plugin.saveSettings();
        })
      );
  }
}
