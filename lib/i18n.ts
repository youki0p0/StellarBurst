import type { Card } from "./types";

export type Lang = "ja" | "en";

export const LANGS: Lang[] = ["ja", "en"];

/**
 * Detect the initial language from the browser. Japanese is the default; an
 * English browser gets English, anything else falls back to Japanese.
 */
export function detectLang(): Lang {
  if (typeof navigator === "undefined") return "ja";
  const l = (navigator.language || "").toLowerCase();
  if (l.startsWith("en")) return "en";
  return "ja";
}

type Entry = { ja: string; en: string };

const DICT: Record<string, Entry> = {
  // Home
  "home.tagline": {
    ja: "2〜8人で遊ぶ、スピーディでカオスなカードバトル・パーティーゲーム。",
    en: "A fast, chaotic 2–8 player card battle party game.",
  },
  "home.yourName": { ja: "あなたの名前", en: "Your name" },
  "home.namePlaceholder": { ja: "名前を入力", en: "Enter a name" },
  "home.createRoom": { ja: "ルームを作成", en: "Create room" },
  "home.solo": { ja: "ソロ（CPU3体と対戦）", en: "Solo vs 3 CPUs (practice)" },
  "home.orJoin": { ja: "または参加", en: "OR JOIN" },
  "home.codePlaceholder": { ja: "コード", en: "CODE" },
  "home.join": { ja: "参加", en: "Join" },
  "home.footer": {
    ja: "シンプルなパーティーカードゲームに着想。著作物の流用はありません。",
    en: "Inspired by simple party card games. No copyrighted assets.",
  },

  // Errors (set as keys by the store)
  "error.not_configured": { ja: "Supabase が設定されていません。", en: "Supabase is not configured." },
  "error.not_found": { ja: "ルームが見つかりません。", en: "Room not found." },
  "error.in_progress": { ja: "そのゲームはすでに進行中です。", en: "That game is already in progress." },
  "error.join_failed": { ja: "ルームに参加できませんでした。", en: "Could not join room." },
  "error.create_failed": {
    ja: "ルームを作成できませんでした。Supabase の設定を確認してください。",
    en: "Could not create room. Check Supabase setup.",
  },
  "error.solo_failed": {
    ja: "ソロゲームを開始できませんでした。Supabase の設定を確認してください。",
    en: "Could not start solo game. Check Supabase setup.",
  },

  // Lobby
  "lobby.roomCode": { ja: "ルームコード", en: "Room code" },
  "lobby.tapToCopy": { ja: "コードをタップでコピー・友達に共有", en: "Tap code to copy · share it with friends" },
  "lobby.copied": { ja: "コピーしました！", en: "Copied!" },
  "lobby.players": { ja: "プレイヤー", en: "Players" },
  "lobby.imReady": { ja: "準備完了！", en: "I'm ready!" },
  "lobby.notReady": { ja: "準備を取り消す", en: "Not ready" },
  "lobby.addCpu": { ja: "＋ CPU を追加", en: "+ Add CPU opponent" },
  "lobby.startBattle": { ja: "バトル開始", en: "Start battle" },
  "lobby.needOpponent": { ja: "開始には対戦相手（CPU可）が必要", en: "Add an opponent (or CPU) to start" },
  "lobby.hint": {
    ja: "ホストは2人以上で開始できます。CPU を追加してソロでも、コードを共有して友達とでも。",
    en: "The host can start anytime once there are 2+ players. Play solo by adding CPUs, or share the code with friends.",
  },
  "lobby.ready": { ja: "準備OK", en: "READY" },

  // Game
  "game.currentTurn": { ja: "現在のターン", en: "Current turn" },
  "game.yourMove": { ja: "あなたの番！", en: "your move!" },
  "game.room": { ja: "ルーム", en: "Room" },
  "game.selectTarget": { ja: "上から対象を選択", en: "Select a target above" },
  "game.incoming": { ja: "着弾", en: "Incoming" },
  "game.fatal": { ja: "致命", en: "FATAL" },
  "game.defendQ": { ja: "防御する？", en: "Defend?" },
  "game.crippled": { ja: "今は防御が封じられています。", en: "Your defense is crippled right now." },
  "game.takeHit": { ja: "そのまま受ける", en: "Take the hit" },
  "game.play": { ja: "使う", en: "Play" },
  "game.cancel": { ja: "キャンセル", en: "Cancel" },
  "game.passTurn": { ja: "ターンをパス", en: "Pass turn" },
  "game.waitingFor": { ja: "待機中：", en: "Waiting for" },
  "game.nextPlayer": { ja: "次のプレイヤー", en: "the next player" },

  // Result
  "result.gameOver": { ja: "ゲーム終了", en: "Game over" },
  "result.wins": { ja: "の勝利！", en: " wins!" },
  "result.youStanding": { ja: "あなたが最後まで生き残りました。", en: "You are the last one standing." },
  "result.betterLuck": { ja: "次のバーストで巻き返そう。", en: "Better luck next burst." },
  "result.standings": { ja: "最終結果", en: "Final standings" },
  "result.rematch": { ja: "再戦", en: "Rematch" },
  "result.waitingHost": { ja: "ホストの再戦開始を待っています…", en: "Waiting for the host to start a rematch…" },
  "result.backHome": { ja: "ホームに戻る", en: "Back to home" },

  // Setup
  "setup.title": { ja: "セットアップが必要", en: "Setup needed" },
  "setup.intro": {
    ja: "StellarBurst はマルチプレイの同期に Supabase の認証情報が必要です。次の環境変数を設定して再読み込みしてください：",
    en: "StellarBurst needs Supabase credentials to sync multiplayer rooms. Add these environment variables and reload:",
  },
  "setup.create": {
    ja: "supabase.com で無料プロジェクトを作成し、Project Settings → API の値をコピーしてください（ブラウザ公開用の publishable キーを使用。service role / secret キーは絶対に使わないこと）。",
    en: "Create a free project at supabase.com and copy these from Project Settings → API (use the browser-safe publishable key — never a service role / secret key).",
  },
  "setup.localVercel": {
    ja: "ローカル: .env.local に設定して再起動。Vercel: Project Settings → Environment Variables に追加（Production / Preview / Development）して再デプロイ。最後に Supabase の SQL エディタで supabase/schema.sql を一度実行してテーブルを作成。",
    en: "Local: put them in .env.local and restart. Vercel: add them in Project Settings → Environment Variables (Production / Preview / Development) and redeploy. Then run supabase/schema.sql once in the Supabase SQL editor to create the tables.",
  },

  // Shared
  "common.you": { ja: "あなた", en: "you" },
  "common.cpu": { ja: "CPU", en: "CPU" },
  "common.host": { ja: "ホスト", en: "host" },
  "common.defeated": { ja: "敗北", en: "DEFEATED" },
  "common.connecting": { ja: "ルームに接続中…", en: "Connecting to room" },

  // Battle log
  "log.title": { ja: "バトルログ", en: "Battle Log" },
  "log.waiting": { ja: "アクション待ち…", en: "Waiting for action…" },

  // Card kind labels
  "kind.attack": { ja: "攻", en: "ATK" },
  "kind.defense": { ja: "防", en: "DEF" },
  "kind.special": { ja: "特", en: "SPC" },

  // Settings
  "settings.language": { ja: "言語", en: "Language" },
};

/** Translate a key, with optional {placeholder} interpolation. */
export function t(
  key: string,
  lang: Lang,
  params?: Record<string, string | number>,
): string {
  let s = DICT[key]?.[lang] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return s;
}

// --- Card text localization ------------------------------------------------

const DEFENSE_TEXT: Record<string, Entry> = {
  reduce_third: { ja: "ダメージを1/3軽減する。", en: "Reduce incoming damage by 1/3." },
  reduce_half: { ja: "ダメージを1/2軽減する。", en: "Reduce incoming damage by 1/2." },
  reduce_twothirds: { ja: "ダメージを2/3軽減する。", en: "Reduce incoming damage by 2/3." },
  reflect: { ja: "攻撃を相手に跳ね返す。", en: "Reflect the attack back at the attacker." },
  nullify_fatal: { ja: "致命の一撃を無効化する。", en: "Negate a fatal attack entirely." },
};

const SPECIAL_TEXT: Record<string, Entry> = {
  heal: { ja: "自分のHPを回復する。", en: "Restore some of your own HP." },
  shuffle_hands: { ja: "全員の手札をシャッフルして配り直す。", en: "Shuffle and redeal every player's hand." },
  skip_turn: { ja: "一定確率で相手の次の行動を飛ばす。", en: "Chance to skip the target's next action." },
  limit_defense: { ja: "相手は3ターン防御できなくなる。", en: "Target cannot defend for 3 turns." },
  slip_damage: { ja: "相手は次の3ターン、継続ダメージを受ける。", en: "Target takes damage over their next 3 turns." },
};

/** Localized description for a card (name stays as authored). */
export function localizeCardDescription(card: Card, lang: Lang): string {
  if (card.kind === "attack") {
    if (card.fatal) {
      return lang === "ja"
        ? "致命の一撃。防御カード1枚で無効化できる。"
        : "A lethal blow. Any defense card may be spent to nullify it.";
    }
    return lang === "ja"
      ? `${card.damage} ダメージを与える。`
      : `Deal ${card.damage} damage.`;
  }
  if (card.kind === "defense" && card.defense) {
    return DEFENSE_TEXT[card.defense]?.[lang] ?? card.description;
  }
  if (card.kind === "special" && card.special) {
    return SPECIAL_TEXT[card.special]?.[lang] ?? card.description;
  }
  return card.description;
}
