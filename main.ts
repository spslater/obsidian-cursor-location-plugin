import { App, Editor, EditorPosition, EditorSelection, MarkdownView, Plugin } from 'obsidian';
import * as CodeMirror from "codemirror";

export default class CursorLocation extends Plugin {
	private cursorStatusBar: HTMLElement;

	async onload() {
		console.log('loading Cursor Location plugin');

		this.registerCodeMirror((cm: CodeMirror.Editor) => {
			cm.on("cursorActivity", this.updateCursor);
		});

		this.updateCursor(this.getEditor())
	}

	private getEditor(): Editor {
		return this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
	}

	private cursorString(cursor: EditorPosition): string {
		return cursor.ch + ":" + (cursor.line + 1)
	}

	private updateCursor = (editor: CodeMirror.Editor | Editor): void => {
		if (editor) {
			let cursor = editor.getCursor();
			if (!this.cursorStatusBar) {
				this.cursorStatusBar = this.addStatusBarItem();
			}
			let selections = ""
			// this.getEditor()?.listSelections()?.forEach(selection => {
			// 	selections += "(" + this.cursorString(selection.anchor) + "//" + this.cursorString(selection.head) + ")"
			// })
			this.cursorStatusBar.setText(
				this.cursorString(cursor) + "/" + editor.lineCount() + " " + selections
			);
		}
	}
}
