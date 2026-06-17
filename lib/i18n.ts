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
  "error.persist_failed": {
    ja: "操作をサーバに保存できませんでした。Supabase の権限/RLS（特に rooms の UPDATE 許可）を確認し、supabase/schema.sql を再実行してください。",
    en: "Couldn't save to the server. Check Supabase permissions/RLS (especially rooms UPDATE) and re-run supabase/schema.sql.",
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
  "lobby.leave": { ja: "退出する", en: "Leave room" },
  "lobby.disband": { ja: "ルームを解散", en: "Disband room" },
  "lobby.kick": { ja: "追放", en: "Kick" },
  "room.reveal": { ja: "ルームコードを表示", en: "Show room code" },
  "room.hide": { ja: "ルームコードを隠す", en: "Hide room code" },
  "room.hiddenHint": { ja: "配信中も安心。👁 で表示・コピー", en: "Hidden for streaming — tap 👁 to reveal & copy" },
  "lobby.needOpponent": { ja: "開始には対戦相手（CPU可）が必要", en: "Add an opponent (or CPU) to start" },
  "lobby.hint": {
    ja: "ホストは2人以上で開始できます。CPU を追加してソロでも、コードを共有して友達とでも。",
    en: "The host can start anytime once there are 2+ players. Play solo by adding CPUs, or share the code with friends.",
  },
  "lobby.ready": { ja: "準備OK", en: "READY" },

  // Game
  "game.currentTurn": { ja: "現在の軌道", en: "Current orbit" },
  "game.yourMove": { ja: "あなたの番！", en: "your move!" },
  "game.room": { ja: "ルーム", en: "Room" },
  "game.orbit": { ja: "軌道", en: "Orbit" },
  "game.selectTarget": { ja: "標的の星を選択", en: "Pick a target star" },
  "game.incoming": { ja: "来るフレア", en: "Incoming flare" },
  "game.fatal": { ja: "超新星", en: "SUPERNOVA" },
  "game.defendQ": { ja: "どうする？", en: "Respond?" },
  "game.crippled": { ja: "今は星盾を張れません。", en: "Your shields are down right now." },
  "game.takeHit": { ja: "減光を受ける", en: "Take the light loss" },
  "game.play": { ja: "使う", en: "Play" },
  "game.cancel": { ja: "キャンセル", en: "Cancel" },
  "game.passTurn": { ja: "ターンをパス", en: "Pass turn" },
  "game.waitingFor": { ja: "待機中：", en: "Waiting for" },
  "game.nextPlayer": { ja: "次のプレイヤー", en: "the next player" },

  // Result
  "result.gameOver": { ja: "全ての星が暗転…", en: "All stars darkened…" },
  "result.wins": { ja: " が最後の星！", en: " is the Last Star!" },
  "result.youStanding": { ja: "あなたの光だけが残った。", en: "Yours is the only light left." },
  "result.betterLuck": { ja: "次の軌道で輝き返そう。", en: "Shine brighter next orbit." },
  "result.standings": { ja: "最終輝度", en: "Final luminosity" },
  "result.lum": { ja: "輝度", en: "Lum" },
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
  "log.info": { ja: "—", en: "—" },
  "log.begin": { ja: "バトル開始！", en: "The battle begins!" },
  "log.joined": { ja: "{name} が参加しました。", en: "{name} joined the room." },
  "log.rematch": { ja: "ロビーに戻りました（再戦）。", en: "Returned to the lobby for a rematch." },
  "log.pass": { ja: "{name} は軌道で様子を見た。", en: "{name} holds position." },
  "log.eliminate": { ja: "{name} の光が尽き、暗転した…", en: "{name} has darkened…" },
  "log.win": { ja: "最後の星は {name}！", en: "{name} is the Last Star!" },
  "log.slipTick": { ja: "{name} は流星侵食で {dmg} 減光。", en: "{name} decays for {dmg} light." },
  "log.skipped": { ja: "{name} は日食に覆われ行動できない。", en: "{name} is eclipsed — turn skipped." },
  "log.heal": { ja: "{name} が {amt} 再点火した。", en: "{name} rekindles {amt} light." },
  "log.shuffle": {
    ja: "{name} の星雲嵐！全員の手札が乱れた。",
    en: "{name}'s nebula storm scrambles every hand!",
  },
  "log.skipOk": {
    ja: "{name} が {target} を日食で覆った——次の行動を飛ばす！",
    en: "{name} eclipses {target} — their next turn is skipped!",
  },
  "log.skipFail": {
    ja: "{name} の日食は {target} に届かなかった。",
    en: "{name}'s eclipse misses {target}.",
  },
  "log.slip": { ja: "{name} が {target} に流星侵食を付与（3ターン）。", en: "{name} sets meteor decay on {target} for 3 turns." },
  "log.reverse": { ja: "{name} が軌道を逆行させた！", en: "{name} reverses the orbit!" },
  "log.aoe": { ja: "{name} のメテオ！全ての星が {dmg} 減光。", en: "{name}'s meteor — every star loses {dmg} light!" },
  "log.passAttack": { ja: "{target} はフレアを次の星へ受け流した！", en: "{target} shoves the flare onward!" },
  "log.chain": { ja: "流星が {target} へ連鎖！", en: "The meteor chains to {target}!" },
  "log.attack": {
    ja: "{name} の {card} が {target} を直撃（{dmg} 減光）。",
    en: "{name}'s {card} flares {target} ({dmg} light).",
  },
  "log.attackFatal": {
    ja: "{name} の超新星が {target} を呑み込む！",
    en: "{name}'s supernova engulfs {target}!",
  },
  "log.negate": {
    ja: "{target} は {card} で超新星を相殺！",
    en: "{target} negates the supernova with {card}!",
  },
  "log.reflect": {
    ja: "{target} が {dmg} を {attacker} へ重力反射！",
    en: "{target} reflects {dmg} light back at {attacker}!",
  },
  "log.block": {
    ja: "{target} は {card} で減光を防いだ。",
    en: "{target} shields with {card}.",
  },
  "log.takeDamage": { ja: "{target} は {dmg} 減光。", en: "{target} loses {dmg} light." },

  // Card kind labels
  "kind.attack": { ja: "攻", en: "ATK" },
  "kind.defense": { ja: "防", en: "DEF" },
  "kind.special": { ja: "特", en: "SPC" },

  // Damage unit shown beside an attack card's number
  "card.dmg": { ja: "減光", en: "DMG" },

  // Attack target labels (shown as a badge on attack cards)
  "target.next": { ja: "隣", en: "Next" },
  "target.prev": { ja: "逆隣", en: "Prev" },
  "target.random": { ja: "ランダム", en: "Random" },
  "target.all": { ja: "全体", en: "All" },
  "target.choose": { ja: "指定", en: "Pick" },

  // STELLA finishing call
  "common.burst": { ja: "危険", en: "LOW" },
  "stella.toggle": { ja: "STELLAコール（トドメ宣言）", en: "STELLA call (declare a finish)" },
  "stella.declareBtn": { ja: "🌟 STELLA！で使う", en: "🌟 Play with STELLA!" },
  "stella.windowTitle": { ja: "STELLA！宣言中", en: "STELLA called!" },
  "stella.youAreTarget": { ja: "トドメ宣言された！防御するか受けろ！", en: "You're called for the finish — block it or take it!" },
  "stella.pointOutBtn": { ja: "指摘する！", en: "Point it out!" },
  "stella.pointedAlready": { ja: "指摘済み", en: "Pointed out" },
  "stella.bystanderHint": { ja: "本当にトドメ？的中で強化・ハズレで −10", en: "A real finish? Buff if right · −10 if wrong" },
  "stella.attackerWait": { ja: "相手の反応を待っています…", en: "Waiting for the table to react…" },
  "log.stellaDeclare": {
    ja: "{name} が {target} にトドメ宣言——STELLA！",
    en: "{name} calls STELLA on {target} — going for the finish!",
  },
  "log.stellaFail": { ja: "{name} はトドメを外した（コール失敗で {dmg} 減光）。", en: "{name} failed the finish (−{dmg} light)." },
  "log.pointOut": { ja: "{name} が指摘した！", en: "{name} points it out!" },
  "log.pointHit": { ja: "{name} の指摘は的中！", en: "{name} called it right!" },
  "log.mispoint": { ja: "{name} の誤指摘——{dmg} 減光。", en: "{name} mispointed — −{dmg} light." },
  "log.buffHeal": { ja: "{name} は加護で {amt} 再点火！", en: "{name} is rewarded — rekindles {amt} light!" },
  "log.buffShield": { ja: "{name} は星盾の加護を得た！", en: "{name} gains a shield aegis!" },
  "log.buffCard": { ja: "{name} は手札を1枚授かった！", en: "{name} is granted an extra card!" },
  "log.guardHold": { ja: "{name} の星盾の加護がフレアを弾いた！", en: "{name}'s aegis shrugs off the flare!" },

  // Settings
  "settings.language": { ja: "言語", en: "Language" },

  // Card catalog (debug)
  "home.cards": { ja: "カード図鑑", en: "Card catalog" },
  "cards.title": { ja: "カード図鑑", en: "Card Catalog" },
  "cards.subtitle": {
    ja: "全カードの見本（デバッグ用）。",
    en: "Every card archetype (for debugging).",
  },
  "cards.attacks": { ja: "攻撃", en: "Attacks" },
  "cards.defenses": { ja: "防御", en: "Defenses" },
  "cards.defenseColors": { ja: "防御カードの色", en: "Defense colors" },
  "cards.specials": { ja: "特殊", en: "Specials" },
  "cards.back": { ja: "← ホームに戻る", en: "← Back to home" },
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
  block: { ja: "減光を全てカット", en: "Block all damage" },
  reflect: { ja: "カットして反射", en: "Block + reflect back" },
  pass: { ja: "次の星へ受け流す", en: "Pass to next star" },
};

const SPECIAL_TEXT: Record<string, Entry> = {
  heal: { ja: "輝度を回復", en: "Rekindle light" },
  shuffle_hands: { ja: "全員の手札を混ぜる", en: "Shuffle all hands" },
  skip_turn: { ja: "次の星を日食(行動不可)", en: "Eclipse the next star" },
  reverse: { ja: "軌道を逆行", en: "Reverse the orbit" },
  slip_damage: { ja: "次の星を侵食(3ターン)", en: "Decay next, 3 turns" },
};

// Kept short so they fit a card on one line.
const CARD_NAME: Record<string, Entry> = {
  // Flares (attacks)
  "cardname.supernova": { ja: "超新星", en: "Supernova" },
  "cardname.meteorshower": { ja: "流星群", en: "Meteors" },
  "cardname.meteorshot": { ja: "メテオ", en: "Meteor" },
  "cardname.solar": { ja: "フレア", en: "Flare" },
  "cardname.redgiant": { ja: "赤色巨星", en: "Red Giant" },
  "cardname.comet": { ja: "コメット", en: "Comet" },
  "cardname.aurora": { ja: "オーロラ", en: "Aurora" },
  // Shields (defense)
  "cardname.starshield": { ja: "星盾", en: "Shield" },
  "cardname.mirrororbit": { ja: "重力反射", en: "Mirror" },
  "cardname.gravitypass": { ja: "軌道流し", en: "Pass" },
  // Specials
  "cardname.rekindle": { ja: "再点火", en: "Rekindle" },
  "cardname.nebula": { ja: "星雲嵐", en: "Nebula" },
  "cardname.eclipse": { ja: "日食", en: "Eclipse" },
  "cardname.retrograde": { ja: "逆行", en: "Retrograde" },
  "cardname.decay": { ja: "流星侵食", en: "Decay" },
};

/** Stable i18n key for a card's name, derived from its attributes. */
export function cardNameKey(card: Card): string {
  if (card.kind === "attack") {
    if (card.fatal) return "cardname.supernova";
    if (card.chain) return "cardname.meteorshower";
    if (card.attackTarget === "all") return "cardname.meteorshot";
    if (card.color === "red") return "cardname.redgiant";
    if (card.color === "blue") return "cardname.comet";
    if (card.color === "green") return "cardname.aurora";
    return "cardname.solar";
  }
  if (card.kind === "defense") {
    const map: Record<string, string> = {
      block: "cardname.starshield",
      reflect: "cardname.mirrororbit",
      pass: "cardname.gravitypass",
    };
    return map[card.defense ?? ""] ?? "cardname.starshield";
  }
  const map: Record<string, string> = {
    heal: "cardname.rekindle",
    shuffle_hands: "cardname.nebula",
    skip_turn: "cardname.eclipse",
    reverse: "cardname.retrograde",
    slip_damage: "cardname.decay",
  };
  return map[card.special ?? ""] ?? "cardname.rekindle";
}

/** Localized card name. */
export function localizeCardName(card: Card, lang: Lang): string {
  return CARD_NAME[cardNameKey(card)]?.[lang] ?? card.name;
}

/** Localize a card-name key produced by cardNameKey (used by the battle log). */
export function localizeCardNameKey(key: string, lang: Lang): string {
  return CARD_NAME[key]?.[lang] ?? key;
}

/** Localized description for a card. */
export function localizeCardDescription(card: Card, lang: Lang): string {
  const ja = lang === "ja";
  if (card.kind === "attack") {
    const d = card.damage ?? 0;
    if (card.fatal) return ja ? "超新星。星盾1枚で防げる。" : "Supernova. Any shield negates it.";
    if (card.chain) return ja ? `${d} 減光。防がれなければ次の星へ連鎖。` : `${d} light loss; chains to the next star if undefended.`;
    switch (card.attackTarget) {
      case "all":
        return ja ? `全ての星が ${d} 減光。` : `Every other star loses ${d} light.`;
      case "prev":
        return ja ? `逆行方向の星へ ${d} 減光。` : `${d} light loss to the previous star.`;
      case "random":
        return ja ? `ランダムな星へ ${d} 減光。` : `${d} light loss to a random star.`;
      case "choose":
        return ja ? `選んだ星へ ${d} 減光（レア）。` : `${d} light loss to a chosen star (rare).`;
      default:
        return ja ? `次の軌道の星へ ${d} 減光。` : `${d} light loss to the next star.`;
    }
  }
  if (card.kind === "defense" && card.defense) {
    return DEFENSE_TEXT[card.defense]?.[lang] ?? card.description;
  }
  if (card.kind === "special" && card.special) {
    return SPECIAL_TEXT[card.special]?.[lang] ?? card.description;
  }
  return card.description;
}
