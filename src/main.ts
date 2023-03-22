import {
  Plugin,
  WorkspaceLeaf,
} from "obsidian";
import {
  EditorView,
} from "@codemirror/view";
import {
  DEFAULT_SETTINGS,
  CursorLocationSettings,
  CursorLocationSettingTab
} from "src/settings"
import {
  editorPlugin
} from "src/plugin"

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
