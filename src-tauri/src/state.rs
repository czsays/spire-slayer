use serde::{Deserialize, Serialize};

// ── Core types matching the STS2MCP API response ────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RunInfo {
    pub act: u32,
    pub floor: u32,
    pub ascension: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Power {
    pub id: String,
    pub name: String,
    pub amount: i32,
    #[serde(rename = "type")]
    pub power_type: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Card {
    pub index: Option<i32>,
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub card_type: Option<String>,
    pub cost: Option<serde_json::Value>, // Can be string "X" or number
    pub description: Option<String>,
    pub target_type: Option<String>,
    pub can_play: Option<bool>,
    pub unplayable_reason: Option<String>,
    pub is_upgraded: Option<bool>,
    pub rarity: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EnemyIntent {
    #[serde(rename = "type")]
    pub intent_type: Option<String>,
    pub label: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Enemy {
    pub entity_id: Option<String>,
    pub combat_id: Option<i32>,
    pub name: String,
    pub hp: i32,
    pub max_hp: i32,
    pub block: Option<i32>,
    pub status: Option<Vec<Power>>,
    pub intents: Option<Vec<EnemyIntent>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RelicInfo {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub counter: Option<serde_json::Value>, // Can be int or null
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PotionInfo {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub slot: Option<i32>,
    pub can_use_in_combat: Option<bool>,
    pub target_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct BattleState {
    pub round: Option<i32>,
    pub turn: Option<String>,
    pub is_play_phase: Option<bool>,
    pub enemies: Vec<Enemy>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PlayerState {
    pub character: Option<String>,
    pub hp: i32,
    pub max_hp: i32,
    pub block: Option<i32>,
    pub energy: Option<i32>,
    pub max_energy: Option<i32>,
    pub gold: Option<i32>,
    pub hand: Option<Vec<Card>>,
    pub draw_pile_count: Option<i32>,
    pub discard_pile_count: Option<i32>,
    pub exhaust_pile_count: Option<i32>,
    pub draw_pile: Option<Vec<Card>>,
    pub discard_pile: Option<Vec<Card>>,
    pub exhaust_pile: Option<Vec<Card>>,
    pub status: Option<Vec<Power>>,
    pub relics: Option<Vec<RelicInfo>>,
    pub potions: Option<Vec<PotionInfo>>,
}

/// Raw response from the STS2MCP API (GET /api/v1/singleplayer?format=json)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct McpApiResponse {
    pub state_type: Option<String>,
    pub message: Option<String>,
    pub run: Option<RunInfo>,
    pub player: Option<PlayerState>,
    pub battle: Option<BattleState>,
}

// ── App-level game state sent to the frontend ───────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppGameState {
    pub connected: bool,
    pub data_source: String, // "mcp_api" | "none"
    pub state_type: String,  // "combat" | "map" | "event" | "shop" | etc.
    pub version: u64,

    // Run info
    pub act: u32,
    pub floor: u32,
    pub ascension: u32,

    // Player
    pub character: String,
    pub current_hp: i32,
    pub max_hp: i32,
    pub player_block: i32,
    pub energy: i32,
    pub max_energy: i32,
    pub gold: i32,

    // Player buffs/debuffs (extracted from status powers)
    pub player_strength: i32,
    pub player_dexterity: i32,
    pub player_focus: i32,
    pub player_vulnerable: i32,
    pub player_weak: i32,
    pub player_frail: i32,
    pub player_ritual: i32,
    pub player_vigor: i32,
    pub player_plated_armor: i32,
    pub player_metallicize: i32,

    // Cards
    pub hand: Vec<AppCard>,
    pub draw_pile: Vec<AppCard>,
    pub discard_pile: Vec<AppCard>,
    pub exhaust_pile: Vec<AppCard>,
    pub draw_pile_count: i32,
    pub discard_pile_count: i32,
    pub exhaust_pile_count: i32,

    // Enemies
    pub enemies: Vec<AppEnemy>,

    // Relics & Potions
    pub relics: Vec<AppRelic>,
    pub potions: Vec<AppPotion>,

    // Battle info
    pub battle_round: i32,
    pub battle_turn: String,
    pub is_play_phase: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppCard {
    pub id: String,
    pub name: String,
    pub card_type: String,
    pub cost: String,
    pub description: String,
    pub is_upgraded: bool,
    pub can_play: bool,
    pub target_type: String,
    pub pile: String, // "hand" | "draw" | "discard" | "exhaust"
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppEnemy {
    pub entity_id: String,
    pub combat_id: i32,
    pub name: String,
    pub hp: i32,
    pub max_hp: i32,
    pub block: i32,
    pub strength: i32,
    pub vulnerable: i32,
    pub weak: i32,
    pub intents: Vec<AppIntent>,
    pub status: Vec<AppPower>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppIntent {
    pub intent_type: String,
    pub label: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppPower {
    pub id: String,
    pub name: String,
    pub amount: i32,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppRelic {
    pub id: String,
    pub name: String,
    pub description: String,
    pub counter: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppPotion {
    pub id: String,
    pub name: String,
    pub description: String,
    pub slot: i32,
    pub can_use: bool,
}

// ── Conversion from raw API response to app state ───────────────────

fn extract_power_amount(powers: &[Power], name: &str) -> i32 {
    powers
        .iter()
        .find(|p| p.name.eq_ignore_ascii_case(name) || p.id.eq_ignore_ascii_case(name))
        .map(|p| p.amount)
        .unwrap_or(0)
}

fn cost_to_string(cost: &Option<serde_json::Value>) -> String {
    match cost {
        Some(serde_json::Value::Number(n)) => {
            if let Some(i) = n.as_i64() {
                i.to_string()
            } else {
                n.to_string()
            }
        }
        Some(serde_json::Value::String(s)) => s.clone(),
        _ => "0".to_string(),
    }
}

fn convert_card(card: &Card, pile: &str) -> AppCard {
    AppCard {
        id: card.id.clone(),
        name: card.name.clone(),
        card_type: card.card_type.clone().unwrap_or_default(),
        cost: cost_to_string(&card.cost),
        description: card.description.clone().unwrap_or_default(),
        is_upgraded: card.is_upgraded.unwrap_or(false),
        can_play: card.can_play.unwrap_or(false),
        target_type: card.target_type.clone().unwrap_or_default(),
        pile: pile.to_string(),
    }
}

fn convert_enemy(enemy: &Enemy) -> AppEnemy {
    let status_list = enemy.status.as_deref().unwrap_or_default();
    AppEnemy {
        entity_id: enemy.entity_id.clone().unwrap_or_default(),
        combat_id: enemy.combat_id.unwrap_or(0),
        name: enemy.name.clone(),
        hp: enemy.hp,
        max_hp: enemy.max_hp,
        block: enemy.block.unwrap_or(0),
        strength: extract_power_amount(status_list, "strength"),
        vulnerable: extract_power_amount(status_list, "vulnerable"),
        weak: extract_power_amount(status_list, "weak"),
        intents: enemy
            .intents
            .as_deref()
            .unwrap_or_default()
            .iter()
            .map(|i| AppIntent {
                intent_type: i.intent_type.clone().unwrap_or_default(),
                label: i.label.clone().unwrap_or_default(),
                description: i.description.clone().unwrap_or_default(),
            })
            .collect(),
        status: status_list
            .iter()
            .map(|p| AppPower {
                id: p.id.clone(),
                name: p.name.clone(),
                amount: p.amount,
                description: p.description.clone().unwrap_or_default(),
            })
            .collect(),
    }
}

impl AppGameState {
    pub fn from_api_response(resp: &McpApiResponse, version: u64) -> Self {
        let player = resp.player.as_ref();
        let battle = resp.battle.as_ref();
        let run = resp.run.as_ref();

        let player_status = player
            .and_then(|p| p.status.as_deref())
            .unwrap_or_default();

        let hand_cards: Vec<AppCard> = player
            .and_then(|p| p.hand.as_ref())
            .map(|cards| cards.iter().map(|c| convert_card(c, "hand")).collect())
            .unwrap_or_default();

        let draw_cards: Vec<AppCard> = player
            .and_then(|p| p.draw_pile.as_ref())
            .map(|cards| cards.iter().map(|c| convert_card(c, "draw")).collect())
            .unwrap_or_default();

        let discard_cards: Vec<AppCard> = player
            .and_then(|p| p.discard_pile.as_ref())
            .map(|cards| cards.iter().map(|c| convert_card(c, "discard")).collect())
            .unwrap_or_default();

        let exhaust_cards: Vec<AppCard> = player
            .and_then(|p| p.exhaust_pile.as_ref())
            .map(|cards| cards.iter().map(|c| convert_card(c, "exhaust")).collect())
            .unwrap_or_default();

        let enemies: Vec<AppEnemy> = battle
            .map(|b| b.enemies.iter().map(convert_enemy).collect())
            .unwrap_or_default();

        let relics: Vec<AppRelic> = player
            .and_then(|p| p.relics.as_ref())
            .map(|rs| {
                rs.iter()
                    .map(|r| AppRelic {
                        id: r.id.clone(),
                        name: r.name.clone(),
                        description: r.description.clone().unwrap_or_default(),
                        counter: r.counter.as_ref().and_then(|v| v.as_i64()).map(|v| v as i32),
                    })
                    .collect()
            })
            .unwrap_or_default();

        let potions: Vec<AppPotion> = player
            .and_then(|p| p.potions.as_ref())
            .map(|ps| {
                ps.iter()
                    .map(|p| AppPotion {
                        id: p.id.clone(),
                        name: p.name.clone(),
                        description: p.description.clone().unwrap_or_default(),
                        slot: p.slot.unwrap_or(0),
                        can_use: p.can_use_in_combat.unwrap_or(false),
                    })
                    .collect()
            })
            .unwrap_or_default();

        // Determine state_type — normalize combat types
        let raw_state = resp.state_type.clone().unwrap_or_default();
        let state_type = match raw_state.as_str() {
            "monster" | "elite" | "boss" => "combat".to_string(),
            other => other.to_string(),
        };

        AppGameState {
            connected: true,
            data_source: "mcp_api".to_string(),
            state_type,
            version,

            act: run.map(|r| r.act).unwrap_or(0),
            floor: run.map(|r| r.floor).unwrap_or(0),
            ascension: run.map(|r| r.ascension).unwrap_or(0),

            character: player.and_then(|p| p.character.clone()).unwrap_or_default(),
            current_hp: player.map(|p| p.hp).unwrap_or(0),
            max_hp: player.map(|p| p.max_hp).unwrap_or(0),
            player_block: player.and_then(|p| p.block).unwrap_or(0),
            energy: player.and_then(|p| p.energy).unwrap_or(0),
            max_energy: player.and_then(|p| p.max_energy).unwrap_or(0),
            gold: player.and_then(|p| p.gold).unwrap_or(0),

            player_strength: extract_power_amount(player_status, "strength"),
            player_dexterity: extract_power_amount(player_status, "dexterity"),
            player_focus: extract_power_amount(player_status, "focus"),
            player_vulnerable: extract_power_amount(player_status, "vulnerable"),
            player_weak: extract_power_amount(player_status, "weak"),
            player_frail: extract_power_amount(player_status, "frail"),
            player_ritual: extract_power_amount(player_status, "ritual"),
            player_vigor: extract_power_amount(player_status, "vigor"),
            player_plated_armor: extract_power_amount(player_status, "plated armor"),
            player_metallicize: extract_power_amount(player_status, "metallicize"),

            hand: hand_cards,
            draw_pile: draw_cards,
            discard_pile: discard_cards,
            exhaust_pile: exhaust_cards,
            draw_pile_count: player.and_then(|p| p.draw_pile_count).unwrap_or(0),
            discard_pile_count: player.and_then(|p| p.discard_pile_count).unwrap_or(0),
            exhaust_pile_count: player.and_then(|p| p.exhaust_pile_count).unwrap_or(0),

            enemies,
            relics,
            potions,

            battle_round: battle.and_then(|b| b.round).unwrap_or(0),
            battle_turn: battle.and_then(|b| b.turn.clone()).unwrap_or_default(),
            is_play_phase: battle.and_then(|b| b.is_play_phase).unwrap_or(false),
        }
    }

    pub fn disconnected() -> Self {
        AppGameState {
            connected: false,
            data_source: "none".to_string(),
            ..Default::default()
        }
    }
}
