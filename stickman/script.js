document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const W = 700;
    const H = 400;
    canvas.width = W;
    canvas.height = H;

    const GROUND_Y = 320;
    const GRAVITY = 0.6;
    const JUMP_STRENGTH = 14;
    const MOVE_SPEED = 5;
    const ATTACK_DURATION = 12;
    const ATTACK_COOLDOWN = 20;
    const PLAYER_HP = 100;
    const STATUE_HP = 1000;
    const STATUE_WIDTH = 50;
    const STATUE_HEIGHT = 90;
    function getMineTime() { return goldRush ? GOLDRUSH_MINE_TIME : BASE_MINE_TIME; }
    const GOLD_PER_TRIP = 100;
    const START_GOLD = 500;

    const UNIT_TYPES = {
        miner:  { cost: 150,  hp: 10,  speed: 2,   damageMin: 1,  damageMax: 2,   range: 0,   width: 20,  height: 45 },
        club:   { cost: 120,  hp: 20,  speed: 2.2, damageMin: 5,  damageMax: 10,  range: 0,   width: 24,  height: 50 },
        archer: { cost: 300,  hp: 9,   speed: 2,   damageMin: 6,  damageMax: 10,  range: 120, width: 22,  height: 48 },
        sword:  { cost: 250,  hp: 40,  speed: 2.1, damageMin: 10, damageMax: 20, range: 0,   width: 24,  height: 50 },
        spear:  { cost: 500,  hp: 100, speed: 2,   damageMin: 30, damageMax: 50,  range: 0,   width: 26,  height: 52 },
        giant:  { cost: 1800, hp: 300, speed: 1,   damageMin: 100, damageMax: 150, range: 0,   width: 72,  height: 150 },
        mage:   { cost: 1200,  hp: 50, speed: 1.5, damageMin: 60, damageMax: 99,  range: 150, width: 24,  height: 50 },
        boss:   { cost: 0,     hp: 2000, speed: 0.8, damageMin: 250, damageMax: 300, range: 0,   width: 96,  height: 200 }
    };
    const TOTAL_LEVELS = 7;
    let upgradeLevels = JSON.parse(localStorage.getItem('stickmanUpgrades') || '{"miner":0,"club":0,"archer":0,"sword":0,"spear":0,"mage":0,"giant":0}');
    let exp = parseInt(localStorage.getItem('stickmanExp') || '0', 10);
    const EXP_PER_LEVEL = 2;
    const UPGRADE_COST = 1;

    function getUnitStats(typeKey) {
        const t = UNIT_TYPES[typeKey];
        if (!t) return { hp: 10, damageMin: 10, damageMax: 10 };
        const lv = upgradeLevels[typeKey] || 0;
        return {
            hp: (t.hp || 10) + lv,
            damageMin: (t.damageMin != null ? t.damageMin : 10) + lv,
            damageMax: (t.damageMax != null ? t.damageMax : 10) + lv
        };
    }
    function rollDamage(typeKey, upgradeLv) {
        const s = getUnitStats(typeKey);
        return s.damageMin + Math.floor(Math.random() * (s.damageMax - s.damageMin + 1));
    }
    function rollDamageForUnit(u) {
        if (!u) return 10;
        if (u.type === 'hero') return 15;
        const t = UNIT_TYPES[u.type];
        if (!t) return 10;
        const lv = u.upgradeLevel != null ? u.upgradeLevel : (upgradeLevels[u.type] || 0);
        const min = (t.damageMin != null ? t.damageMin : 10) + lv;
        const max = (t.damageMax != null ? t.damageMax : 10) + lv;
        return min + Math.floor(Math.random() * (max - min + 1));
    }
    const LEVEL_ORDER = ['miner', 'club', 'archer', 'sword', 'spear', 'mage', 'giant'];
    const DIAMONDS_PER_LEVEL = 100;
    const GOLDRUSH_COST = 100;
    const BASE_MINE_TIME = 100;
    const GOLDRUSH_MINE_TIME = 55;

    function getUnlockedForLevel(level) {
        if (level >= 6) return LEVEL_ORDER.slice();
        return LEVEL_ORDER.slice(0, level + 1);
    }

    const statueLeft = {
        x: 25,
        y: GROUND_Y - STATUE_HEIGHT,
        width: STATUE_WIDTH,
        height: STATUE_HEIGHT,
        hp: STATUE_HP,
        maxHp: STATUE_HP,
        side: 'player'
    };
    const statueRight = {
        x: W - 25 - STATUE_WIDTH,
        y: GROUND_Y - STATUE_HEIGHT,
        width: STATUE_WIDTH,
        height: STATUE_HEIGHT,
        hp: STATUE_HP,
        maxHp: STATUE_HP,
        side: 'enemy'
    };

    function getMineLeft() {
        return { x: statueLeft.x + statueLeft.width + 50, y: GROUND_Y - 48, w: 50, h: 40 };
    }
    function getMineRight() {
        return { x: statueRight.x - 100, y: GROUND_Y - 48, w: 50, h: 40 };
    }

    let gameRunning = false;
    let currentLevel = 1;
    let playerGold = START_GOLD;
    let enemyGold = 300;
    let diamonds = parseInt(localStorage.getItem('stickmanDiamonds') || '0', 10);
    let goldRush = localStorage.getItem('stickmanGoldRush') === 'true';
    const keys = {};

    const player = {
        x: 120,
        y: GROUND_Y - 60,
        vx: 0,
        vy: 0,
        width: 28,
        height: 58,
        onGround: true,
        state: 'idle',
        attackTimer: 0,
        attackCooldown: 0,
        facing: 1,
        hp: PLAYER_HP,
        maxHp: PLAYER_HP
    };

    let units = [];
    let projectiles = [];
    let enemySpawnTimer = 0;
    let level6Triggered = false;
    const LEVEL6_TRIGGER_DIST = 150;
    let level7BossSpawned = false;
    let statueArcherTimer = 0;
    const STATUE_ARCHER_ZONE_LEFT = 220;
    const STATUE_ARCHER_DAMAGE = 1;
    const STATUE_ARCHER_INTERVAL = 50;
    const MELEE_INTERVAL = 28;
    const ARROW_RAIN_COUNT = 10;
    const ARROW_RAIN_DAMAGE = 20;
    const ARROW_RAIN_ZONE = { x: 260, w: 180, h: 80 };
    let arrowRainCooldown = 0;
    let arrowRainArrows = [];
    const ARROW_RAIN_SKILL_COOLDOWN = 400;
    const ARROW_RAIN_DIAMOND_COST = 200;
    let berserkUntil = 0;
    let berserkCooldown = 0;
    const BERSERK_DURATION = 300;
    const BERSERK_COOLDOWN = 600;
    const BERSERK_DIAMOND_COST = 250;
    const BERSERK_BONUS = 1.05;
    player.isHero = true;
    player.controlled = true;

    const goldEl = document.getElementById('gold');
    const baseHpEl = document.getElementById('base-hp');
    const healthEl = document.getElementById('health');
    const levelNumEl = document.getElementById('level-num');
    const diamondsEl = document.getElementById('diamonds');
    const gameOverEl = document.getElementById('game-over');
    const gameOverDescEl = document.getElementById('game-over-desc');
    const gameStartEl = document.getElementById('game-start');
    const levelCompleteEl = document.getElementById('level-complete');
    const levelCompleteTitleEl = document.getElementById('level-complete-title');
    const nextLevelBtn = document.getElementById('next-level-btn');
    const gameOverTitleEl = document.getElementById('game-over-title');
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const shopBtn = document.getElementById('shop-btn');
    const shopPanel = document.getElementById('shop-panel');
    const buyGoldrushBtn = document.getElementById('buy-goldrush');
    const shopGoldrushDone = document.getElementById('shop-goldrush-done');
    const buyArrowrainBtn = document.getElementById('buy-arrowrain');
    const shopArrowrainDone = document.getElementById('shop-arrowrain-done');
    const buyBerserkBtn = document.getElementById('buy-berserk');
    const shopBerserkDone = document.getElementById('shop-berserk-done');
    const shopExpEl = document.getElementById('shop-exp');
    const expEl = document.getElementById('exp');
    const shopCloseBtn = document.getElementById('shop-close');

    function init() {
        document.addEventListener('keydown', (e) => {
            keys[e.code] = true;
            if (e.code === 'Space') e.preventDefault();
        });
        document.addEventListener('keyup', (e) => { keys[e.code] = false; });
        startBtn.addEventListener('click', () => { currentLevel = 1; startLevel(1); });
        restartBtn.addEventListener('click', () => startLevel(currentLevel));
        nextLevelBtn.addEventListener('click', () => {
            levelCompleteEl.classList.add('hidden');
            if (currentLevel >= TOTAL_LEVELS) {
                currentLevel = 1;
                startLevel(1);
            } else {
                currentLevel++;
                startLevel(currentLevel);
            }
        });
        const ARROW_RAIN_SHOP_COST = 500;
        const BERSERK_SHOP_COST = 500;
        shopBtn.addEventListener('click', () => {
            shopPanel.classList.remove('hidden');
            buyGoldrushBtn.classList.toggle('hidden', goldRush);
            shopGoldrushDone.classList.toggle('hidden', !goldRush);
            const ar = localStorage.getItem('stickmanArrowRain') === 'true';
            const br = localStorage.getItem('stickmanBerserk') === 'true';
            if (buyArrowrainBtn) { buyArrowrainBtn.classList.toggle('hidden', ar); }
            if (shopArrowrainDone) shopArrowrainDone.classList.toggle('hidden', !ar);
            if (buyBerserkBtn) { buyBerserkBtn.classList.toggle('hidden', br); }
            if (shopBerserkDone) shopBerserkDone.classList.toggle('hidden', !br);
            if (shopExpEl) shopExpEl.textContent = exp;
            document.querySelectorAll('.upgrade-btn').forEach(btn => {
                const type = btn.dataset.type;
                const lv = upgradeLevels[type] || 0;
                btn.disabled = exp < UPGRADE_COST;
                btn.textContent = (type === 'miner' ? '矿工' : type === 'club' ? '棒士' : type === 'archer' ? '弓箭手' : type === 'sword' ? '剑士' : type === 'spear' ? '茅士' : type === 'mage' ? '法师' : '巨人') + '+1 (Lv.' + lv + ')';
            });
        });
        shopCloseBtn.addEventListener('click', () => shopPanel.classList.add('hidden'));
        // 移动端虚拟按键
        function bindMobileBtn(id, code) {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[code] = true; }, { passive: false });
            el.addEventListener('touchend', (e) => { e.preventDefault(); keys[code] = false; }, { passive: false });
            el.addEventListener('touchcancel', (e) => { e.preventDefault(); keys[code] = false; }, { passive: false });
        }
        bindMobileBtn('btn-left', 'ArrowLeft');
        bindMobileBtn('btn-right', 'ArrowRight');
        bindMobileBtn('btn-jump', 'Space');
        bindMobileBtn('btn-attack', 'KeyZ');
        bindMobileBtn('btn-arrowrain', 'KeyQ');
        bindMobileBtn('btn-berserk', 'KeyE');
        buyGoldrushBtn.addEventListener('click', () => {
            if (!goldRush && diamonds >= GOLDRUSH_COST) {
                diamonds -= GOLDRUSH_COST;
                goldRush = true;
                localStorage.setItem('stickmanDiamonds', diamonds);
                localStorage.setItem('stickmanGoldRush', 'true');
                diamondsEl.textContent = diamonds;
                buyGoldrushBtn.classList.add('hidden');
                shopGoldrushDone.classList.remove('hidden');
            }
        });
        if (buyArrowrainBtn) buyArrowrainBtn.addEventListener('click', () => {
            if (localStorage.getItem('stickmanArrowRain') === 'true') return;
            if (diamonds >= ARROW_RAIN_SHOP_COST) {
                diamonds -= ARROW_RAIN_SHOP_COST;
                localStorage.setItem('stickmanDiamonds', diamonds);
                localStorage.setItem('stickmanArrowRain', 'true');
                if (diamondsEl) diamondsEl.textContent = diamonds;
                buyArrowrainBtn.classList.add('hidden');
                if (shopArrowrainDone) shopArrowrainDone.classList.remove('hidden');
            }
        });
        if (buyBerserkBtn) buyBerserkBtn.addEventListener('click', () => {
            if (localStorage.getItem('stickmanBerserk') === 'true') return;
            if (diamonds >= BERSERK_SHOP_COST) {
                diamonds -= BERSERK_SHOP_COST;
                localStorage.setItem('stickmanDiamonds', diamonds);
                localStorage.setItem('stickmanBerserk', 'true');
                if (diamondsEl) diamondsEl.textContent = diamonds;
                buyBerserkBtn.classList.add('hidden');
                if (shopBerserkDone) shopBerserkDone.classList.remove('hidden');
            }
        });
        document.querySelectorAll('.upgrade-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                if (!type || exp < UPGRADE_COST) return;
                exp -= UPGRADE_COST;
                upgradeLevels[type] = (upgradeLevels[type] || 0) + 1;
                localStorage.setItem('stickmanExp', exp);
                localStorage.setItem('stickmanUpgrades', JSON.stringify(upgradeLevels));
                if (expEl) expEl.textContent = exp;
                if (shopExpEl) shopExpEl.textContent = exp;
                const lv = upgradeLevels[type];
                const names = { miner: '矿工', club: '棒士', archer: '弓箭手', sword: '剑士', spear: '茅士', mage: '法师', giant: '巨人' };
                btn.textContent = (names[type] || type) + '+1 (Lv.' + lv + ')';
                btn.disabled = exp < UPGRADE_COST;
            });
        });
        document.querySelectorAll('.spawn-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!gameRunning) return;
                const type = btn.dataset.type;
                const cost = parseInt(btn.dataset.cost, 10);
                const unlocked = getUnlockedForLevel(currentLevel);
                if (UNIT_TYPES[type] && unlocked.includes(type) && playerGold >= cost) {
                    playerGold -= cost;
                    goldEl.textContent = playerGold;
                    spawnUnit(type, 'player');
                }
            });
        });
        diamondsEl.textContent = diamonds;
        if (expEl) expEl.textContent = exp;
    }

    function startLevel(level) {
        currentLevel = level;
        gameStartEl.classList.add('hidden');
        gameOverEl.classList.add('hidden');
        levelCompleteEl.classList.add('hidden');
        gameRunning = true;
        playerGold = START_GOLD;
        enemyGold = 300;
        units = [];
        projectiles = [];
        enemySpawnTimer = 0;
        statueLeft.hp = STATUE_HP;
        statueRight.hp = STATUE_HP;
        player.x = 120;
        player.y = GROUND_Y - 60;
        player.vx = 0;
        player.vy = 0;
        player.onGround = true;
        player.state = 'idle';
        player.attackTimer = 0;
        player.attackCooldown = 0;
        player.facing = 1;
        player.hp = PLAYER_HP;
        player.maxHp = PLAYER_HP;
        player.width = 28;
        player.height = 58;
            player.type = 'hero';
            player.isHero = true;
        player.controlled = true;
        arrowRainArrows = [];
        arrowRainCooldown = 0;
        berserkUntil = 0;
        berserkCooldown = 0;
        if (levelNumEl) levelNumEl.textContent = level;
        const levelNameEl = document.getElementById('level-name');
        if (levelNameEl) levelNameEl.textContent = level === 6 ? '剑士反击' : level === 7 ? '最终BOSS战' : '';
        goldEl.textContent = playerGold;
        baseHpEl.textContent = statueLeft.hp + '/' + statueLeft.maxHp;
        healthEl.textContent = player.hp + '/' + player.maxHp;
        spawnUnit('miner', 'player');
        spawnUnit('miner', 'player');
        spawnUnit('miner', 'enemy');
        if (level === 6) {
            level6Triggered = false;
            const t = UNIT_TYPES.sword;
            const stats = getUnitStats('sword');
            const cols = 10;
            const gap = 4;
            for (let i = 0; i < 100; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = statueRight.x - t.width - 12 - col * (t.width + gap);
                const u = { type: 'sword', side: 'enemy', x, y: GROUND_Y - t.height, vx: 0, width: t.width, height: t.height, hp: stats.hp, maxHp: stats.hp, upgradeLevel: 0, state: 'walk', facing: -1, attackTimer: 0, mineTimer: 0, speed: t.speed, range: t.range, holdPosition: true };
                units.push(u);
            }
        } else if (level === 7) {
            level7BossSpawned = false;
        }
        updateSpawnButtons();
        gameLoop();
    }

    function spawnUnit(type, side) {
        const t = UNIT_TYPES[type];
        if (!t) return;
        const isPlayer = side === 'player';
        const stats = getUnitStats(type);
        const x = isPlayer ? statueLeft.x + statueLeft.width + 12 : statueRight.x - t.width - 12;
        const u = {
            type, side,
            x, y: GROUND_Y - t.height,
            vx: 0,
            width: t.width,
            height: t.height,
            hp: stats.hp,
            maxHp: stats.hp,
            upgradeLevel: isPlayer ? (upgradeLevels[type] || 0) : 0,
            state: type === 'miner' ? 'walk_to_mine' : 'walk',
            facing: isPlayer ? 1 : -1,
            attackTimer: 0,
            mineTimer: 0,
            speed: t.speed,
            range: t.range
        };
        if (type === 'miner') u.vx = isPlayer ? t.speed : -t.speed;
        else u.vx = isPlayer ? t.speed : -t.speed;
        units.push(u);
    }

    function updateSpawnButtons() {
        const unlocked = getUnlockedForLevel(currentLevel);
        document.querySelectorAll('.spawn-btn').forEach(btn => {
            const type = btn.dataset.type;
            const cost = parseInt(btn.dataset.cost, 10);
            const canUse = unlocked.includes(type);
            btn.disabled = !gameRunning || !canUse || playerGold < cost;
            btn.title = canUse ? '' : '通关后解锁';
            btn.classList.toggle('locked', !canUse);
        });
    }

    function updatePlayer() {
        if (berserkCooldown > 0) berserkCooldown--;
        if (arrowRainCooldown > 0) arrowRainCooldown--;
        const arrowRainUnlock = localStorage.getItem('stickmanArrowRain') === 'true';
        const berserkUnlock = localStorage.getItem('stickmanBerserk') === 'true';
        const berserkCost = berserkUnlock ? 0 : BERSERK_DIAMOND_COST;
        const arrowRainCost = arrowRainUnlock ? 0 : ARROW_RAIN_DIAMOND_COST;
        if (keys['KeyE'] && berserkCooldown <= 0 && (berserkUnlock || diamonds >= berserkCost)) {
            if (!berserkUnlock) { diamonds -= BERSERK_DIAMOND_COST; localStorage.setItem('stickmanDiamonds', diamonds); if (diamondsEl) diamondsEl.textContent = diamonds; }
            berserkUntil = BERSERK_DURATION;
            berserkCooldown = BERSERK_COOLDOWN;
        }
        if (berserkUntil > 0) berserkUntil--;
        if (keys['KeyQ'] && arrowRainCooldown <= 0 && arrowRainArrows.length === 0 && (arrowRainUnlock || diamonds >= arrowRainCost)) {
            if (!arrowRainUnlock) { diamonds -= ARROW_RAIN_DIAMOND_COST; localStorage.setItem('stickmanDiamonds', diamonds); if (diamondsEl) diamondsEl.textContent = diamonds; }
            arrowRainCooldown = ARROW_RAIN_SKILL_COOLDOWN;
            for (let i = 0; i < ARROW_RAIN_COUNT; i++) {
                arrowRainArrows.push({
                    x: ARROW_RAIN_ZONE.x + (i / (ARROW_RAIN_COUNT - 1)) * (ARROW_RAIN_ZONE.w - 20),
                    y: -20 - i * 15
                });
            }
        }
        arrowRainArrows.forEach(a => {
            a.y += 5;
            if (a.y >= GROUND_Y - 15) {
                a.landed = true;
                units.forEach(u => {
                    if (u.side === 'enemy' && u.state !== 'dead' && u.x + u.width >= ARROW_RAIN_ZONE.x && u.x <= ARROW_RAIN_ZONE.x + ARROW_RAIN_ZONE.w) {
                        if (u.holdPosition) level6Triggered = true;
                        u.hp -= ARROW_RAIN_DAMAGE;
                    }
                });
            }
        });
        arrowRainArrows = arrowRainArrows.filter(a => !a.landed);

        if (!player.controlled || player.hp <= 0) return;
        if (player.attackCooldown > 0) player.attackCooldown--;
        if (player.attackTimer > 0) {
            player.attackTimer--;
            if (player.attackTimer === 0) player.state = player.onGround ? 'idle' : 'jump';
            return;
        }
        if (keys['KeyZ'] && player.attackCooldown === 0) {
            player.state = 'attack';
            player.attackTimer = ATTACK_DURATION;
            player.attackCooldown = ATTACK_COOLDOWN;
            player.hitEnemies = new Set();
            return;
        }
        if (keys['ArrowLeft']) { player.vx = -MOVE_SPEED; player.facing = -1; }
        else if (keys['ArrowRight']) { player.vx = MOVE_SPEED; player.facing = 1; }
        else player.vx = 0;
        if (keys['Space'] && player.onGround) {
            player.vy = -JUMP_STRENGTH;
            player.onGround = false;
        }
        player.vy += GRAVITY;
        player.x += player.vx;
        player.y += player.vy;
        player.x = Math.max(statueLeft.x + statueLeft.width + 5, Math.min(W - player.width - 5, player.x));
        if (player.y >= GROUND_Y - player.height) {
            player.y = GROUND_Y - player.height;
            player.vy = 0;
            player.onGround = true;
            if (player.state === 'jump') player.state = 'idle';
        } else {
            player.onGround = false;
            if (player.state !== 'attack') player.state = 'jump';
        }
        if (player.state !== 'attack' && player.state !== 'jump')
            player.state = player.vx !== 0 ? 'run' : 'idle';
    }

    function getAttackBox() {
        const w = 55, h = 32;
        const x = player.facing === 1 ? player.x + player.width : player.x - w;
        return { x, y: player.y + player.height / 2 - h / 2, width: w, height: h };
    }

    function hitStatue(statue, damage) {
        statue.hp = Math.max(0, statue.hp - damage);
        if (statue.side === 'player') {
            baseHpEl.textContent = statue.hp + '/' + statue.maxHp;
            if (statue.hp <= 0) endGame(false);
        } else if (statue.hp <= 0) {
            if (currentLevel === TOTAL_LEVELS) {
                if (!level7BossSpawned) {
                    level7BossSpawned = true;
                    const t = UNIT_TYPES.boss;
                    const stats = getUnitStats('boss');
                    const u = { type: 'boss', side: 'enemy', x: statueRight.x - t.width - 12, y: GROUND_Y - t.height, vx: -t.speed, width: t.width, height: t.height, hp: stats.hp, maxHp: stats.hp, upgradeLevel: 0, state: 'walk', facing: -1, attackTimer: 0, mineTimer: 0, speed: t.speed, range: t.range };
                    units.push(u);
                }
                return;
            }
            levelComplete();
        }
    }

    function trySwitchToNextUnit() {
        const next = units.find(u => u.side === 'player' && u.state !== 'dead' && u.type !== 'miner');
            if (next) {
            player.x = next.x;
            player.y = next.y;
            player.width = next.width;
            player.height = next.height;
            player.hp = next.hp;
            player.maxHp = next.maxHp;
            player.type = next.type;
            player.upgradeLevel = next.upgradeLevel;
            player.isHero = false;
            player.controlled = true;
            units = units.filter(u => u !== next);
            if (healthEl) healthEl.textContent = player.hp + '/' + player.maxHp;
            return;
        }
        player.controlled = false;
        player.hp = 0;
        if (healthEl) healthEl.textContent = '无';
    }

    function rectOverlap(a, b) {
        return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    }

    function getEffectiveClubDamage(unit) {
        const u = unit || player;
        const lv = u.upgradeLevel != null ? u.upgradeLevel : (upgradeLevels.club || 0);
        const t = UNIT_TYPES.club;
        const min = (t.damageMin || 5) + lv, max = (t.damageMax || 10) + lv;
        const d = min + Math.floor(Math.random() * (max - min + 1));
        return Math.floor(d * (berserkUntil > 0 ? BERSERK_BONUS : 1));
    }
    function getPlayerDamage() {
        if (player.type === 'hero') return 15;
        return rollDamageForUnit(player);
    }

    function levelComplete() {
        gameRunning = false;
        diamonds += DIAMONDS_PER_LEVEL;
        exp += EXP_PER_LEVEL;
        localStorage.setItem('stickmanDiamonds', diamonds);
        localStorage.setItem('stickmanExp', exp);
        if (diamondsEl) diamondsEl.textContent = diamonds;
        if (expEl) expEl.textContent = exp;
        if (levelCompleteTitleEl) levelCompleteTitleEl.textContent = currentLevel >= TOTAL_LEVELS ? '全通关！' : '第' + currentLevel + '关通过！';
        if (nextLevelBtn) nextLevelBtn.textContent = currentLevel >= TOTAL_LEVELS ? '再玩一次' : '下一关';
        levelCompleteEl.classList.remove('hidden');
    }

    function updateUnits() {
        const ml = getMineLeft(), mr = getMineRight();
        const box = gameRunning && player.attackTimer > 0 && player.attackTimer <= ATTACK_DURATION - 4 ? getAttackBox() : null;
        const hitSet = player.hitEnemies || new Set();

        units.forEach(u => {
            if (u.state === 'dead') return;
            if (u.type === 'miner') {
                const mine = u.side === 'player' ? ml : mr;
                if (u.state === 'walk_to_mine') {
                    u.x += u.vx;
                    const inMine = u.x >= mine.x - 5 && u.x <= mine.x + mine.w + 5;
                    if (inMine) { u.state = 'mining'; u.mineTimer = 0; }
                } else if (u.state === 'mining') {
                    u.mineTimer++;
                    const mineTime = u.side === 'player' ? getMineTime() : BASE_MINE_TIME;
                    if (u.mineTimer >= mineTime) {
                        u.state = 'return';
                        u.vx = u.side === 'player' ? -u.speed : u.speed;
                    }
                } else if (u.state === 'return') {
                    u.x += u.vx;
                    const baseX = u.side === 'player' ? statueLeft.x + statueLeft.width : statueRight.x;
                    const reached = u.side === 'player' ? u.x <= baseX + 25 : u.x >= baseX - 25;
                    if (reached) {
                        if (u.side === 'player') {
                            playerGold += GOLD_PER_TRIP;
                            goldEl.textContent = playerGold;
                        } else {
                            enemyGold += GOLD_PER_TRIP;
                        }
                        u.state = 'walk_to_mine';
                        u.vx = u.side === 'player' ? u.speed : -u.speed;
                    }
                }
                return;
            }

            if (currentLevel === 6 && u.holdPosition) {
                if (!level6Triggered) {
                    const playerInRange = player.controlled && player.hp > 0 && (u.x - (player.x + player.width) <= LEVEL6_TRIGGER_DIST);
                    const allyInRange = units.some(o => o.side === 'player' && o.state !== 'dead' && (u.x - (o.x + o.width) <= LEVEL6_TRIGGER_DIST));
                    if (playerInRange || allyInRange) level6Triggered = true;
                }
                if (level6Triggered) { u.holdPosition = false; u.vx = -u.speed; }
                if (u.holdPosition) u.vx = 0;
            }
            const nextX = u.x + u.vx;
            const me = { x: nextX, y: u.y, width: u.width, height: u.height };
            const tol = 3;
            const meNow = { x: u.x - tol, y: u.y, width: u.width + tol * 2, height: u.height };
            let blocked = false;
            let meleeTarget = null;
            if (u.side === 'enemy') {
                if (player.controlled && player.hp > 0 && (rectOverlap(me, player) || rectOverlap(meNow, player))) blocked = true;
                if (!blocked) units.forEach(o => {
                    if (o.side === 'player' && o.state !== 'dead' && (rectOverlap(me, o) || rectOverlap(meNow, o))) { blocked = true; if (!meleeTarget) meleeTarget = o; }
                });
            } else {
                units.forEach(o => {
                    if (o.side === 'enemy' && o.state !== 'dead' && (rectOverlap(me, o) || rectOverlap(meNow, o))) { blocked = true; if (!meleeTarget) meleeTarget = o; }
                });
            }
            if (blocked) {
                u.vx = 0;
                const meExact = { x: u.x, y: u.y, width: u.width, height: u.height };
                const target = u.side === 'enemy' ? (player.controlled && player.hp > 0 && (rectOverlap(meExact, player) || rectOverlap(me, player)) ? player : meleeTarget) : meleeTarget;
                if (target) {
                    u.meleeTimer = (u.meleeTimer || 0) + 1;
                    if (u.meleeTimer >= MELEE_INTERVAL) {
                        u.meleeTimer = 0;
                        const dmg = u.type === 'club' && u.side === 'player' && berserkUntil > 0 ? getEffectiveClubDamage(u) : rollDamageForUnit(u);
                        if (target === player && player.controlled) {
                            player.hp = Math.max(0, player.hp - dmg);
                            if (healthEl) healthEl.textContent = player.hp + '/' + player.maxHp;
                            if (player.hp <= 0) trySwitchToNextUnit();
                        } else if (target && target.hp !== undefined) {
                            target.hp -= dmg;
                            if (target.holdPosition) level6Triggered = true;
                            if (target.hp <= 0) { target.state = 'dead'; target.deadTimer = 0; if (target.side === 'enemy') { playerGold += Math.floor(UNIT_TYPES[target.type].cost / 10); goldEl.textContent = playerGold; } }
                        }
                    }
                    if (target && target !== player && target.side !== u.side) {
                        target.meleeTimer = (target.meleeTimer || 0) + 1;
                        if (target.meleeTimer >= MELEE_INTERVAL) {
                            target.meleeTimer = 0;
                            u.hp -= target.type === 'club' && target.side === 'player' && berserkUntil > 0 ? getEffectiveClubDamage(target) : rollDamageForUnit(target);
                            if (u.holdPosition) level6Triggered = true;
                            if (u.hp <= 0) { u.state = 'dead'; u.deadTimer = 0; if (u.side === 'enemy') { playerGold += Math.floor(UNIT_TYPES[u.type].cost / 10); goldEl.textContent = playerGold; } }
                        }
                    } else if (target === player && player.controlled && player.hp > 0) {
                        player.attackTimer = (player.attackTimer || 0) + 1;
                        if (player.attackTimer >= MELEE_INTERVAL) {
                            player.attackTimer = 0;
                            const pdmg = player.type === 'club' && berserkUntil > 0 ? getEffectiveClubDamage() : getPlayerDamage();
                            u.hp -= pdmg;
                            if (u.holdPosition) level6Triggered = true;
                            if (u.hp <= 0) { u.state = 'dead'; u.deadTimer = 0; playerGold += Math.floor(UNIT_TYPES[u.type].cost / 10); goldEl.textContent = playerGold; }
                        }
                    }
                }
            } else {
                u.vx = (u.side === 'player' ? 1 : -1) * u.speed;
                u.x = nextX;
            }
            u.x = Math.max(statueLeft.x + statueLeft.width + 10, Math.min(W - u.width - 10, u.x));

            if (u.side === 'enemy' && !blocked) {
                if (u.x <= statueLeft.x + statueLeft.width + 25) {
                    u.attackTimer = (u.attackTimer || 0) + 1;
                    if (u.attackTimer >= 30) { hitStatue(statueLeft, rollDamageForUnit(u)); u.attackTimer = 0; }
                }
            } else if (u.side === 'player' && !blocked) {
                if (u.x + u.width >= statueRight.x - 25) {
                    u.attackTimer = (u.attackTimer || 0) + 1;
                    if (u.attackTimer >= 30) {
                        const d = u.type === 'club' && berserkUntil > 0 ? getEffectiveClubDamage(u) : rollDamageForUnit(u);
                        hitStatue(statueRight, d);
                        u.attackTimer = 0;
                    }
                }
            }

            if (box && u.side === 'enemy' && !hitSet.has(u)) {
                if (box.x < u.x + u.width && box.x + box.width > u.x && box.y < u.y + u.height && box.y + box.height > u.y) {
                    hitSet.add(u);
                    if (u.holdPosition) level6Triggered = true;
                    const dmg = player.type === 'club' && berserkUntil > 0 ? getEffectiveClubDamage() : getPlayerDamage();
                    u.hp -= dmg;
                    if (u.hp <= 0) {
                        u.state = 'dead';
                        u.deadTimer = 0;
                        playerGold += Math.floor(UNIT_TYPES[u.type].cost / 10);
                        goldEl.textContent = playerGold;
                    }
                }
            }
        });

        statueArcherTimer++;
        if (statueArcherTimer >= STATUE_ARCHER_INTERVAL) {
            statueArcherTimer = 0;
            const inZone = units.filter(u => u.side === 'enemy' && u.state !== 'dead' && u.x < STATUE_ARCHER_ZONE_LEFT);
            if (inZone.length > 0) {
                const t = inZone[0];
                if (t.holdPosition) level6Triggered = true;
                t.hp -= STATUE_ARCHER_DAMAGE;
                if (t.hp <= 0) { t.state = 'dead'; t.deadTimer = 0; }
            }
        }
        if (box) {
            const sr = statueRight;
            if (player.facing === 1 && player.x + player.width >= sr.x - 20 && player.x <= sr.x + sr.width + 20 &&
                box.x < sr.x + sr.width && box.x + box.width > sr.x)
                hitStatue(statueRight, 25);
        }

        projectiles.forEach(p => {
            p.x += p.vx;
            if (p.x < -20 || p.x > W + 20) { p.dead = true; return; }
            const hit = units.find(u => u.side === p.targetSide && u.state !== 'dead' && u.x <= p.x + 10 && u.x + u.width >= p.x - 10 && u.y + u.height >= p.y && u.y <= p.y + 10);
            if (hit) { if (hit.holdPosition) level6Triggered = true; hit.hp -= p.damage; if (hit.hp <= 0) { hit.state = 'dead'; hit.deadTimer = 0; } p.dead = true; }
            if (p.targetSide === 'player' && player.controlled && player.hp > 0 && player.x <= p.x + 10 && player.x + player.width >= p.x - 10) { player.hp = Math.max(0, player.hp - p.damage); healthEl.textContent = player.hp + '/' + player.maxHp; if (player.hp <= 0) trySwitchToNextUnit(); p.dead = true; }
        });
        projectiles = projectiles.filter(p => !p.dead);

        units.forEach(u => {
            if (u.state === 'dead' || u.type === 'miner') return;
            if (u.range > 0) {
                u.rangedTimer = (u.rangedTimer || 0) + 1;
                const target = u.side === 'player' ? units.find(e => e.side === 'enemy' && e.state !== 'dead' && e.x > u.x && e.x - u.x < u.range) : (units.find(e => e.side === 'player' && e.state !== 'dead' && u.x - e.x < u.range) || (player.x < u.x && u.x - player.x < u.range ? player : null));
                if (target && u.rangedTimer >= 55) {
                    projectiles.push({ x: u.x + (u.facing > 0 ? u.width : 0), y: u.y + u.height / 2, vx: (u.facing || 1) * 6, damage: rollDamageForUnit(u), targetSide: u.side === 'player' ? 'enemy' : 'player' });
                    u.rangedTimer = 0;
                }
            }
        });

        units = units.filter(u => {
            if (u.state !== 'dead') return true;
            u.deadTimer = (u.deadTimer || 0) + 1;
            return u.deadTimer < 28;
        });

        if (currentLevel === TOTAL_LEVELS && level7BossSpawned && !units.some(u => u.type === 'boss' && u.state !== 'dead')) levelComplete();

        enemySpawnTimer++;
        if (enemySpawnTimer >= 120) {
            enemySpawnTimer = 0;
            const unlocked = getUnlockedForLevel(currentLevel);
            const aff = unlocked.filter(t => UNIT_TYPES[t] && UNIT_TYPES[t].cost <= enemyGold);
            if (aff.length > 0) {
                const minerCost = UNIT_TYPES.miner ? UNIT_TYPES.miner.cost : 999;
                const enemyMinerCount = units.filter(o => o.side === 'enemy' && o.type === 'miner' && o.state !== 'dead').length;
                const preferMiner = unlocked.includes('miner') && enemyGold >= minerCost && enemyMinerCount < 3;
                const pick = preferMiner ? 'miner' : aff[Math.floor(Math.random() * aff.length)];
                enemyGold -= UNIT_TYPES[pick].cost;
                spawnUnit(pick, 'enemy');
            }
        }
        updateSpawnButtons();
    }

    function endGame(win) {
        gameRunning = false;
        if (finalScoreEl) finalScoreEl.textContent = playerGold;
        if (gameOverTitleEl) gameOverTitleEl.textContent = win ? '胜利！' : '失败';
        if (gameOverDescEl) gameOverDescEl.textContent = win ? '' : '己方基地被摧毁，本关未通过';
        gameOverEl.classList.remove('hidden');
    }

    function drawHealthBar(x, y, w, h, hp, maxHp, color) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = color || '#0f0';
        ctx.fillRect(x, y, w * (hp / maxHp), h);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
    }

    function drawStatue(statue) {
        const s = statue;
        ctx.fillStyle = s.side === 'player' ? '#2b6cb0' : '#c53030';
        ctx.fillRect(s.x, s.y + 20, s.width, s.height - 20);
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(s.x + 5, s.y + s.height - 25, s.width - 10, 18);
        ctx.beginPath();
        ctx.arc(s.x + s.width / 2, s.y + 18, 14, 0, Math.PI * 2);
        ctx.fillStyle = s.side === 'player' ? '#63b3ed' : '#fc8181';
        ctx.fill();
        ctx.strokeStyle = '#2d3748';
        ctx.lineWidth = 2;
        ctx.stroke();
        drawHealthBar(s.x, s.y - 14, s.width, 10, s.hp, s.maxHp, s.side === 'player' ? '#48bb78' : '#f56565');
    }

    function drawMine(mine, label) {
        ctx.fillStyle = 'rgba(237, 137, 54, 0.9)';
        ctx.fillRect(mine.x, mine.y, mine.w, mine.h);
        ctx.strokeStyle = '#c05621';
        ctx.lineWidth = 2;
        ctx.strokeRect(mine.x, mine.y, mine.w, mine.h);
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label || '矿', mine.x + mine.w / 2, mine.y + mine.h / 2 + 4);
        ctx.textAlign = 'left';
    }

    function drawGround() {
        ctx.strokeStyle = '#4a5568';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        ctx.lineTo(W, GROUND_Y);
        ctx.stroke();
        ctx.fillStyle = 'rgba(45, 55, 72, 0.5)';
        ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    }

    function drawUnit(u) {
        const isBoss = u.type === 'boss';
        const isGiant = u.type === 'giant' || isBoss;
        const scale = isBoss ? 4 : (isGiant ? 3 : 1);
        const cx = u.x + u.width / 2;
        const footY = u.y + u.height;
        const headY = u.y + (isBoss ? 32 : isGiant ? 24 : Math.min(14, u.height * 0.28));
        const bodyTop = u.y + (isBoss ? 56 : isGiant ? 42 : Math.min(22, u.height * 0.44));
        const bodyBottom = u.y + u.height - (isBoss ? 32 : isGiant ? 24 : 12);
        const armLen = isBoss ? 48 : (isGiant ? 36 : 12);
        const armDrop = isBoss ? 28 : (isGiant ? 24 : 10);
        const legLen = isBoss ? 40 : (isGiant ? 30 : 10);
        const headR = isBoss ? 32 : (isGiant ? 24 : 10);
        const dir = u.facing || 1;
        const isEnemy = u.side === 'enemy';
        const colors = { miner: '#ecc94b', club: '#00f2fe', archer: '#68d391', sword: '#63b3ed', spear: '#9f7aea', giant: '#ed8936', mage: '#fc8181', boss: '#4a5568' };
        ctx.strokeStyle = isEnemy ? '#e53e3e' : (colors[u.type] || '#00f2fe');
        ctx.lineWidth = isBoss ? 5 : (isGiant ? 4 : 3);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, headY, headR, 0, Math.PI * 2);
        ctx.stroke();
        if (u.type === 'mage') {
            ctx.fillStyle = isEnemy ? '#c53030' : '#805ad5';
            ctx.beginPath();
            ctx.moveTo(cx - 8, headY - headR + 2);
            ctx.lineTo(cx, headY - headR - 8);
            ctx.lineTo(cx + 8, headY - headR + 2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = isEnemy ? '#9b2c2c' : '#6b46c1';
            ctx.stroke();
            ctx.strokeStyle = isEnemy ? '#e53e3e' : (colors[u.type] || '#00f2fe');
        } else if (u.type === 'boss') {
            ctx.fillStyle = '#2d3748';
            ctx.strokeStyle = '#1a202c';
            ctx.beginPath();
            ctx.arc(cx, headY, headR + 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, headY, headR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = isEnemy ? '#e53e3e' : (colors[u.type] || '#00f2fe');
        }
        ctx.beginPath();
        ctx.moveTo(cx, bodyTop);
        ctx.lineTo(cx, bodyBottom);
        ctx.stroke();
        ctx.moveTo(cx, bodyTop + armDrop);
        ctx.lineTo(cx - armLen * dir, bodyTop + armDrop + 8);
        ctx.moveTo(cx, bodyTop + armDrop);
        ctx.lineTo(cx + armLen * dir, bodyTop + armDrop + 8);
        ctx.stroke();
        ctx.moveTo(cx, bodyBottom);
        ctx.lineTo(cx - legLen * dir, footY);
        ctx.moveTo(cx, bodyBottom);
        ctx.lineTo(cx + legLen * dir, footY);
        ctx.stroke();
        if (u.type === 'miner') {
            ctx.beginPath();
            ctx.moveTo(cx + 8 * dir, bodyTop + 12);
            ctx.lineTo(cx + 22 * dir, bodyTop + 8);
            ctx.lineTo(cx + 20 * dir, bodyTop + 18);
            ctx.closePath();
            ctx.stroke();
        } else if (u.type === 'club' || u.type === 'giant' || u.type === 'boss') {
            const weaponLen = u.type === 'boss' ? 55 : (35 * scale);
            ctx.lineWidth = u.type === 'boss' ? 8 : ctx.lineWidth;
            ctx.beginPath();
            ctx.moveTo(cx + (14 * scale) * dir, bodyTop + 10);
            ctx.lineTo(cx + weaponLen * dir, bodyTop - (u.type === 'boss' ? 8 : 2));
            ctx.stroke();
            ctx.lineWidth = isBoss ? 5 : (isGiant ? 4 : 3);
        } else if (u.type === 'sword') {
            ctx.beginPath();
            ctx.moveTo(cx + 12 * dir, bodyTop + 8);
            ctx.lineTo(cx + 40 * dir, bodyTop + 4);
            ctx.stroke();
        } else if (u.type === 'spear') {
            ctx.beginPath();
            ctx.moveTo(cx + 12 * dir, bodyTop + 8);
            ctx.lineTo(cx + 48 * dir, bodyTop);
            ctx.stroke();
            ctx.fillStyle = isEnemy ? '#742a2a' : '#4a5568';
            ctx.strokeStyle = isEnemy ? '#c53030' : '#2d3748';
            const shieldX = cx - 12 * dir;
            const shieldY = bodyTop + 14;
            ctx.fillRect(shieldX - 6, shieldY - 8, 12, 16);
            ctx.strokeRect(shieldX - 6, shieldY - 8, 12, 16);
        }
        if (u.maxHp > 0)
            drawHealthBar(u.x, u.y - 8, u.width, 5, Math.max(0, u.hp), u.maxHp, u.side === 'player' ? '#48bb78' : '#f56565');
    }

    function drawPlayer() {
        const obj = player;
        const cx = obj.x + obj.width / 2;
        const headY = obj.y + 14;
        const bodyTop = obj.y + 22;
        const bodyBottom = obj.y + obj.height - 12;
        const dir = obj.facing || 1;
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, headY, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, bodyTop);
        ctx.lineTo(cx, bodyBottom);
        ctx.stroke();
        ctx.moveTo(cx, bodyTop + 8);
        ctx.lineTo(cx - 12 * dir, bodyTop + 18);
        ctx.moveTo(cx, bodyTop + 8);
        ctx.lineTo(cx + 12 * dir, bodyTop + 18);
        ctx.stroke();
        ctx.moveTo(cx, bodyBottom);
        ctx.lineTo(cx - 10 * dir, obj.y + obj.height);
        ctx.moveTo(cx, bodyBottom);
        ctx.lineTo(cx + 10 * dir, obj.y + obj.height);
        ctx.stroke();
        if (obj.state === 'attack' && obj.attackTimer > 0) {
            ctx.beginPath();
            ctx.moveTo(cx + 14 * dir, bodyTop + 10);
            ctx.lineTo(cx + 45 * dir, bodyTop + 5);
            ctx.stroke();
        }
        if (obj.hp < obj.maxHp) drawHealthBar(obj.x, obj.y - 8, obj.width, 5, obj.hp, obj.maxHp, '#48bb78');
    }

    function draw() {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, W, H);
        drawGround();
        drawMine(getMineLeft(), '己方矿');
        drawMine(getMineRight(), '敌方矿');
        drawStatue(statueLeft);
        drawStatue(statueRight);
        units.forEach(u => { if (u.state !== 'dead') drawUnit(u); });
        projectiles.forEach(p => {
            ctx.fillStyle = p.targetSide === 'enemy' ? '#68d391' : '#fc8181';
            ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
        });
        arrowRainArrows.forEach(a => {
            ctx.fillStyle = 'rgba(100,200,255,0.9)';
            ctx.fillRect(a.x - 2, a.y - 8, 4, 12);
        });
        if (player.controlled && player.hp > 0) drawPlayer();
    }

    function gameLoop() {
        if (!gameRunning) return;
        updatePlayer();
        updateUnits();
        draw();
        requestAnimationFrame(gameLoop);
    }

    init();
});
