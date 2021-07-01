import { 
	App,
	Editor,
	EditorPosition,
	EditorSelection,
	MarkdownView,
	Plugin,
	PluginSettingTab,
	Setting,
	TextComponent,
} from 'obsidian';
import * as CodeMirror from "codemirror";

interface CursorLocationSettings {
	numberCursors: number;
}

const DEFAULT_SETTINGS: CursorLocationSettings = {
	numberCursors: 1
}

export default class CursorLocation extends Plugin {
	private cursorStatusBar: HTMLElement;
	settings: CursorLocationSettings;

	async onload() {
		console.log('loading Cursor Location plugin');

		this.registerCodeMirror((cm: CodeMirror.Editor) => {
			cm.on("cursorActivity", this.updateCursor);
		});

		await this.loadSettings();
		this.addSettingTab(new CursorLocationSettingTab(this.app, this));

		this.updateCursor(this.getEditor());
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
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
			let selections = "";
			// let selections: EditorSelection[] = this.getEditor()?.listSelections()
			// this.getEditor()?.listSelections()?.forEach(selection => {
			// 	selections += "(" + this.cursorString(selection.anchor) + "//" + this.cursorString(selection.head) + ")"
			// })
			this.cursorStatusBar.setText(
				this.cursorString(cursor) + "/" + editor.lineCount() + " " + selections
			);
		}
	}
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
			.setName('# of Cursor')
			.setDesc('Number of cursors to display in the status bar.')
			.addText(text => text
				.setValue(this.plugin.settings?.numberCursors?.toString())
				.onChange(async (value) => {
					let parsedValue = parseInt(value);
					if (!isNaN(parsedValue)) {
						console.log(
							"Updating number of cursors to display to " +
							parsedValue
						)
						warningSection.setText('')
						this.plugin.settings.numberCursors = parsedValue;
						await this.plugin.saveSettings();
					} else {
						console.log(
							"Number of cursors to display not updated."+
							"Unable to parse new value into integer: " +
							value
						)
						warningSection.setText(
							value +
							" is not a number, unable to save."
						)
					}
				}));

		let warningSection = containerEl.createEl('p', {
			text: '',
			attr: { "style": "color:red" },
		});

		new Setting(containerEl)
			.setName('Reset')
			.setDesc(
				'Reset number of cursors to ' +
				DEFAULT_SETTINGS.numberCursors
			)
			.addButton(cb => cb
				.setButtonText("Reset")
				.onClick(async (evt) => {
					let textComponent: TextComponent = 
						cursorNumber.components[0] as TextComponent;
					textComponent.setValue(
						DEFAULT_SETTINGS.numberCursors.toString()
					)
					warningSection.setText('')
					this.plugin.settings.numberCursors =
						DEFAULT_SETTINGS.numberCursors;
					await this.plugin.saveSettings()
				})
			);
	}
}