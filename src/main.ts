import {
  Plugin,
  Notice,
  TFile,
  PluginSettingTab,
  App,
  Setting,
} from "obsidian";

// --- 設定型とデフォルト値 ---
interface ProcessPersonPluginSettings {
  xaiApiKey: string;
}
const DEFAULT_SETTINGS: ProcessPersonPluginSettings = {
  xaiApiKey: "",
};

// --- xaiClient.ts の内容 ---
async function fetchPersonInfoByEmail(
  email: string,
  apiKey: string,
  options?: { company?: string; name?: string }
): Promise<any> {
  const endpoint = "https://api.x.ai/v1/chat/completions";
  // ユーザーのメールアドレスから人物の情報を取得する
  let prompt = `
        この質問に対する回答はObsidianのノートに記載されます。チャットではないので、質問文は含めないでください。
        特に職歴・嗜好性・趣味・職業における考え方などを詳細にまとめてください。
        アウトプットはマークダウン形式で出力してください。なお、headerは最大h2から出力してください。
        以下の情報を持つ人物について調べてください
        メールアドレス: ${email}
        `;
  if (options?.name) {
    prompt += `\n名前: ${options.name}`;
  }
  if (options?.company) {
    prompt += `\n会社: ${options.company}`;
  }
  const body = {
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    search_parameters: {
      mode: "auto",
    },
    model: "grok-3-latest",
  };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`APIリクエスト失敗: ${res.status}`);
  }
  return await res.json();
}

async function fetchCompanyInfoByDomain(
  company: string,
  domain: string,
  apiKey: string
): Promise<any> {
  const endpoint = "https://api.x.ai/v1/chat/completions";
  let prompt = `\nこの質問に対する回答はObsidianのノートに記載されます。チャットではないので、質問文は含めないでください。\n企業の事業内容・沿革・強み・業界での立ち位置・主要なプロダクトやサービス・競合との違いなどを詳細にまとめてください。\nアウトプットはマークダウン形式で出力してください。なお、見出しテキストは最大h2まで出力してください。\n以下の情報を持つ企業について調べてください\n企業名: ${company}\ndomain: ${domain}\n`;
  const body = {
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    search_parameters: {
      mode: "auto",
    },
    model: "grok-3-latest",
  };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`APIリクエスト失敗: ${res.status}`);
  }
  return await res.json();
}

export default class ProcessPersonPlugin extends Plugin {
  settings!: ProcessPersonPluginSettings;
  ribbonIconEl: HTMLElement | null = null;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new ProcessPersonSettingTab(this.app, this));
    console.log("Process Person plugin loaded");
    // ツールリボンにボタンを追加
    this.ribbonIconEl = this.addRibbonIcon(
      "bot",
      "Process Person",
      async () => {
        // APIキー未設定時のガード
        if (!this.settings.xaiApiKey) {
          new Notice(
            "xAI APIキーが設定されていません。設定画面から入力してください。"
          );
          return;
        }
        // アクティブファイル取得
        const file = this.app.workspace.getActiveFile();
        if (!file) {
          new Notice("アクティブなノートがありません");
          return;
        }
        // frontmatter取得
        const cache = this.app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter;
        if (!frontmatter) {
          new Notice("プロパティ（frontmatter）が見つかりません");
          return;
        }
        const email = frontmatter.email;
        const domain = frontmatter.domain;
        // ファイル名から拡張子を除いたものを名前または企業名とする
        const nameOrCompany = file.basename;
        if (email) {
          new Notice(`email: ${email}`);
          let loadingNotice = new Notice("xAIで情報取得中...");
          try {
            const result = await fetchPersonInfoByEmail(
              email,
              this.settings.xaiApiKey,
              { company: frontmatter.company, name: nameOrCompany }
            );
            loadingNotice.hide();
            const content =
              result?.choices?.[0]?.message?.content || JSON.stringify(result);
            await this.app.vault.append(
              file,
              `\n---\n# 人物情報 (xAIより):\n${content}\n`
            );
            new Notice("xAIの情報をノートに追記しました");
          } catch (err: any) {
            loadingNotice.hide();
            new Notice(`xAI APIエラー: ${err.message}`);
          }
        } else if (domain) {
          new Notice(`domain: ${domain}`);
          let loadingNotice = new Notice("xAIで企業情報取得中...");
          try {
            const result = await fetchCompanyInfoByDomain(
              nameOrCompany,
              domain,
              this.settings.xaiApiKey
            );
            loadingNotice.hide();
            const content =
              result?.choices?.[0]?.message?.content || JSON.stringify(result);
            await this.app.vault.append(
              file,
              `\n---\n# 企業情報 (xAIより):\n${content}\n`
            );
            new Notice("xAIの企業情報をノートに追記しました");
          } catch (err: any) {
            loadingNotice.hide();
            new Notice(`xAI APIエラー: ${err.message}`);
          }
        } else {
          new Notice("emailプロパティが見つかりません");
        }
      }
    );
  }

  onunload() {
    if (this.ribbonIconEl) {
      this.ribbonIconEl.remove();
    }
    console.log("Process Person plugin unloaded");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class ProcessPersonSettingTab extends PluginSettingTab {
  plugin: ProcessPersonPlugin;
  constructor(app: App, plugin: ProcessPersonPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Process Person Plugin 設定" });
    new Setting(containerEl)
      .setName("xAI APIキー")
      .setDesc("xAIのAPIキーを入力してください")
      .addText((text) =>
        text
          .setPlaceholder("xai-...")
          .setValue(this.plugin.settings.xaiApiKey)
          .onChange(async (value) => {
            this.plugin.settings.xaiApiKey = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
