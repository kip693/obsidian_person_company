import { Notice, Setting, PluginSettingTab, Plugin } from "obsidian";

import type { App } from "obsidian";

// --- 設定型とデフォルト値 ---
interface ProcessPersonPluginSettings {
  xaiApiKey: string;
  personPrompt: string;
  companyPrompt: string;
  productPrompt: string;
}
const DEFAULT_SETTINGS: ProcessPersonPluginSettings = {
  xaiApiKey: "",
  personPrompt: `この質問に対する回答はObsidianのノートに記載されます。チャットではないので、質問文は含めないでください。
特に基本プロフィール・職歴・経歴や実績・ネットワーク（業界内のつながり）などを詳細にまとめてください。
アウトプットはマークダウン形式で出力してください。なお、headerは最大h2から出力してください。
出来うる限り、根拠となるURLをリンクとして出力してください。
固有名詞については [[固有名詞]] となるように囲んで出力してください。
以下の情報を持つ人物について調べてください`,
  companyPrompt: `この質問に対する回答はObsidianのノートに記載されます。チャットではないので、質問文は含めないでください。
企業の事業内容・沿革・強み・業界での立ち位置・主要なプロダクトやサービス・競合との違いなどを詳細にまとめてください。
アウトプットはマークダウン形式で出力してください。なお、見出しテキストは最大h2まで出力してください。
出来うる限り、根拠となるURLをリンクとして出力してください。
固有名詞については [[固有名詞]] となるように囲んで出力してください。
以下の情報を持つ企業について調べてください`,
  productPrompt: `この質問に対する回答はObsidianのノートに記載されます。チャットではないので、質問文は含めないでください。
プロダクト・サービスの概要、特徴、ターゲットユーザー、競合との違い、実績や導入事例、関連する企業や人物などを詳細にまとめてください。
アウトプットはマークダウン形式で出力してください。headerは最大h2から出力してください。
出来うる限り、根拠となるURLをリンクとして出力してください。
固有名詞については [[固有名詞]] となるように囲んで出力してください。
以下の情報を持つプロダクトについて調べてください`,
};

// --- xaiClient.ts の内容 ---
async function fetchPersonInfoByEmail(
  apiKey: string,
  prompt: string,
  options?: {
    company?: string;
    name?: string;
    email?: string;
    title?: string;
    contact?: string;
  }
): Promise<any> {
  const endpoint = "https://api.x.ai/v1/chat/completions";
  let fullPrompt = prompt;
  if (options?.email) {
    fullPrompt += `\nメールアドレス: ${options.email}`;
  }
  if (options?.name) {
    fullPrompt += `\n名前: ${options.name}`;
  }
  if (options?.company) {
    fullPrompt += `\n会社: ${options.company}`;
  }
  if (options?.title) {
    fullPrompt += `\n職位: ${options.title}`;
  }
  if (options?.contact) {
    fullPrompt += `\nSNS: ${options.contact}`;
  }
  const body = {
    messages: [
      {
        role: "user",
        content: fullPrompt,
      },
    ],
    search_parameters: {
      mode: "on",
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
  apiKey: string,
  prompt: string
): Promise<any> {
  const endpoint = "https://api.x.ai/v1/chat/completions";
  const fullPrompt = `${prompt}\n企業名: ${company}\ndomain: ${domain}\n`;
  const body = {
    messages: [
      {
        role: "user",
        content: fullPrompt,
      },
    ],
    search_parameters: {
      mode: "on",
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

async function fetchProductInfoByName(
  apiKey: string,
  prompt: string,
  options?: { name?: string; company?: string; domain?: string }
): Promise<any> {
  const endpoint = "https://api.x.ai/v1/chat/completions";
  let fullPrompt = prompt;
  if (options?.name) {
    fullPrompt += `\nプロダクト名: ${options.name}`;
  }
  if (options?.company) {
    fullPrompt += `\n会社: ${options.company}`;
  }
  if (options?.domain) {
    fullPrompt += `\ndomain: ${options.domain}`;
  }
  const body = {
    messages: [
      {
        role: "user",
        content: fullPrompt,
      },
    ],
    search_parameters: {
      mode: "on",
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

// ローディング用トースト（通知風UI）
class LoadingToast {
  toastEl: HTMLElement;
  constructor(message: string) {
    this.toastEl = document.createElement("div");
    this.toastEl.className = "ai-loading-toast";
    this.toastEl.innerHTML = `
      <div class="ai-loading-toast-content">
        <span class="ai-loading-spinner-inline"></span>
        <span>${message}</span>
      </div>
    `;
    document.body.appendChild(this.toastEl);
  }
  close() {
    if (this.toastEl && this.toastEl.parentNode) {
      this.toastEl.parentNode.removeChild(this.toastEl);
    }
  }
}

// スタイル追加（1回だけ）
if (!document.getElementById("ai-loading-toast-style")) {
  const style = document.createElement("style");
  style.id = "ai-loading-toast-style";
  style.textContent = `
    .ai-loading-toast {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999;
      background: #222;
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      font-size: 1em;
      display: flex;
      align-items: center;
      min-width: 200px;
      pointer-events: none;
      opacity: 0.95;
    }
    .ai-loading-toast-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .ai-loading-spinner-inline {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid #888;
      border-top: 3px solid #fff;
      border-radius: 50%;
      animation: ai-spin 1s linear infinite;
      margin-right: 4px;
    }
    @keyframes ai-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
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
      "Process with AI",
      async () => {
        await this.runProcessWithAI();
      }
    );
    // コマンド登録（ホットキー割り当て用）
    this.addCommand({
      id: "process-with-ai",
      name: "Process with AI (アクティブノートでAI情報を追記)",
      callback: async () => {
        await this.runProcessWithAI();
      },
    });
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

  async runProcessWithAI() {
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
    let tags: string[] = [];
    if (Array.isArray(frontmatter?.tags)) {
      tags = frontmatter.tags.map((t: any) => t.toString());
    } else if (frontmatter?.tags) {
      tags = frontmatter.tags
        .toString()
        .split(/[\s,]+/)
        .filter(Boolean);
    } else if (frontmatter?.tag) {
      tags = frontmatter.tag
        .toString()
        .split(/[\s,]+/)
        .filter(Boolean);
    }
    // タグで判定
    const isPerson = tags.includes("person") || tags.includes("#person");
    const isCompany = tags.includes("company") || tags.includes("#company");
    const isProduct = tags.includes("product") || tags.includes("#product");
    const email = frontmatter?.email;
    const domain = frontmatter?.domain;
    const title = frontmatter?.title;
    const nameOrCompany = file.basename;
    const company = frontmatter?.company;

    console.log(isPerson, isCompany, isProduct);
    console.log(tags);
    console.log(frontmatter);
    if (isPerson) {
      const loadingToast = new LoadingToast("xAIで人物情報取得中...");
      try {
        const result = await fetchPersonInfoByEmail(
          this.settings.xaiApiKey,
          this.settings.personPrompt,
          {
            company: frontmatter?.company,
            name: nameOrCompany,
            title: title,
            email: email,
            contact: frontmatter?.contact,
          }
        );
        loadingToast.close();
        const content =
          result?.choices?.[0]?.message?.content || JSON.stringify(result);
        await this.app.vault.append(
          file,
          `\n---\n# 人物情報 (xAIより):\n${content}\n`
        );
        new Notice(`「${file.basename}」の人物情報をノートに追記しました`);
      } catch (err: any) {
        loadingToast.close();
        new Notice(`xAI APIエラー: ${err.message}`);
      }
    } else if (isCompany) {
      if (!domain) {
        new Notice("企業情報取得にはdomainが必要です");
        return;
      }
      const loadingToast = new LoadingToast("xAIで企業情報取得中...");
      try {
        const result = await fetchCompanyInfoByDomain(
          nameOrCompany,
          domain,
          this.settings.xaiApiKey,
          this.settings.companyPrompt
        );
        loadingToast.close();
        const content =
          result?.choices?.[0]?.message?.content || JSON.stringify(result);
        await this.app.vault.append(
          file,
          `\n---\n# 企業情報 (xAIより):\n${content}\n`
        );
        new Notice(`「${file.basename}」の企業情報をノートに追記しました`);
      } catch (err: any) {
        loadingToast.close();
        new Notice(`xAI APIエラー: ${err.message}`);
      }
    } else if (isProduct) {
      const loadingToast = new LoadingToast("xAIでプロダクト情報取得中...");
      try {
        const result = await fetchProductInfoByName(
          this.settings.xaiApiKey,
          this.settings.productPrompt,
          {
            name: nameOrCompany,
            company: company,
            domain: domain,
          }
        );
        loadingToast.close();
        const content =
          result?.choices?.[0]?.message?.content || JSON.stringify(result);
        await this.app.vault.append(
          file,
          `\n---\n# プロダクト情報 (xAIより):\n${content}\n`
        );
        new Notice(
          `「${file.basename}」のプロダクト情報をノートに追記しました`
        );
      } catch (err: any) {
        loadingToast.close();
        new Notice(`xAI APIエラー: ${err.message}`);
      }
    } else {
      new Notice("#person または #company タグを付与してください");
    }
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
    new Setting(containerEl)
      .setName("人物プロンプト")
      .setDesc("人物情報取得時のプロンプトを編集できます")
      .addTextArea((text) =>
        text
          .setValue(this.plugin.settings.personPrompt)
          .onChange(async (value) => {
            this.plugin.settings.personPrompt = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(containerEl)
      .setName("企業プロンプト")
      .setDesc("企業情報取得時のプロンプトを編集できます")
      .addTextArea((text) =>
        text
          .setValue(this.plugin.settings.companyPrompt)
          .onChange(async (value) => {
            this.plugin.settings.companyPrompt = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(containerEl)
      .setName("プロダクトプロンプト")
      .setDesc("プロダクト情報取得時のプロンプトを編集できます")
      .addTextArea((text) =>
        text
          .setValue(this.plugin.settings.productPrompt)
          .onChange(async (value) => {
            this.plugin.settings.productPrompt = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
