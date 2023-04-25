import { Plugin, WorkspaceLeaf } from "obsidian";
import { EditorView } from "@codemirror/view";
import { CursorLocationSettingTab } from "src/settings";
import { editorPlugin } from "src/plugin";
import {DEFAULT_SETTINGS, CursorLocationSettings} from "src/constants";

export default class CursorLocation extends Plugin {
  public cursorStatusBar: HTMLElement = null;
  public showUpdates: boolean = true;
  public settings: CursorLocationSettings;

  async onload() {
    console.log("loading Cursor Location plugin");
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new CursorLocationSettingTab(this.app, this));

    this.cursorStatusBar = this.addStatusBarItem();

    this.registerEditorExtension(editorPlugin);

    this.app.workspace.onLayoutReady(() => {
      this.giveEditorPlugin(this.app.workspace.getMostRecentLeaf());
      this.updateShowStatus();
    });

    this.registerEvent(
      this.app.workspace.on(
        "active-leaf-change",
        async (leaf: WorkspaceLeaf) => {
          this.giveEditorPlugin(leaf);
          this.updateShowStatus();
        }
      )
    );

    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.updateShowStatus();
      })
    );
  }

  private updateShowStatus() {
    const mode: string = this.app.workspace.getLeaf().getViewState()
      .state?.mode;
    this.showUpdates = mode == "source";
    if (!this.showUpdates) {
      this.cursorStatusBar.setText("");
      this.cursorStatusBar.removeAttribute("style");
    }
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
      editorPlug.update();
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
