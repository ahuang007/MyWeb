document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // 画布尺寸
    const WIDTH = 480;
    const HEIGHT = 640;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    
    // 游戏状态
    let gameRunning = false;
    let score = 0;
    let level = 1;
    let highScore = parseInt(localStorage.getItem('feijiHighScore') || '0');
    let lives = 6;
    let animationId = null;
    
    // 关卡配置：每达到分数升级
    const SCORE_PER_LEVEL = 150;
    // 敌机生成：固定间隔 3 秒（毫秒）
    const SPAWN_INTERVAL_MS = 3000;
    // 每次生成：50% 一组 3~6 架，50% 随机 1~2 架
    const FORMATION_CHANCE = 0.5;
    // 每 10 波出现一次 Boss，与普通敌机互斥；第 10 次 Boss（第 100 波）为大 Boss
    const WAVES_PER_BOSS = 10;
    const BOSS_WAVES_UNTIL_BIG = 10;  // 每 10 次 Boss 中第 10 次为大 Boss（波数 100、200…）
    const BOSS_SUMMON_INTERVAL_MS = 5000;  // Boss 召唤小飞机间隔
    const HEAL_DROP_CHANCE = 0.1;
    const MAX_LIVES = 6;
    
    // 玩家
    const player = {
        x: WIDTH / 2 - 25,
        y: HEIGHT - 80,
        width: 50,
        height: 60,
        speed: 6,
        fireRate: 150,
        lastFire: 0
    };
    
    // 敌机图片资源
    const enemyImages = [];
    const ENEMY_IMAGE_PATHS = ['images/enemy.svg', 'images/enemy2.svg', 'images/enemy3.svg'];
    
    // 数组
    let playerBullets = [];
    let enemies = [];
    let enemyBullets = [];
    let particles = [];
    let items = [];  // 回血道具等
    let waveCount = 0;
    
    // 按键状态
    const keys = {};
    
    // DOM
    const scoreEl = document.getElementById('score');
    const highScoreEl = document.getElementById('highScore');
    const livesEl = document.getElementById('lives');
    const levelEl = document.getElementById('level');
    const healthFillEl = document.getElementById('health-fill');
    const finalScoreEl = document.getElementById('final-score');
    const gameOverEl = document.getElementById('game-over');
    const gameStartEl = document.getElementById('game-start');
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const playBtn = document.getElementById('play-btn');
    
    // 敌机生成计时（毫秒）
    let enemySpawnTimer = 0;
    
    function init() {
        highScoreEl.textContent = highScore;
        updateHealthDisplay();
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        startBtn.addEventListener('click', showStartScreen);
        playBtn.addEventListener('click', startGame);
        restartBtn.addEventListener('click', startGame);
        loadEnemyImages();
    }
    
    function loadEnemyImages() {
        let loaded = 0;
        ENEMY_IMAGE_PATHS.forEach((src, i) => {
            const img = new Image();
            img.onload = () => {
                enemyImages[i] = img;
                loaded++;
            };
            img.onerror = () => {
                enemyImages[i] = null;
                loaded++;
            };
            img.src = src;
        });
    }
    
    function getLevelSpeedMultiplier() {
        return 1 + (level - 1) * 0.12;
    }
    
    function updateHealthDisplay() {
        if (healthFillEl) {
            const pct = Math.max(0, Math.min(lives, MAX_LIVES) / MAX_LIVES) * 100;
            healthFillEl.style.width = pct + '%';
        }
        if (livesEl) livesEl.textContent = lives + ' / ' + MAX_LIVES;
    }
    
    function showStartScreen() {
        gameOverEl.classList.add('hidden');
        gameStartEl.classList.remove('hidden');
    }
    
    function startGame() {
        if (animationId) cancelAnimationFrame(animationId);
        gameStartEl.classList.add('hidden');
        gameOverEl.classList.add('hidden');
        
        gameRunning = true;
        score = 0;
        level = 1;
        lives = 6;
        player.x = WIDTH / 2 - player.width / 2;
        player.y = HEIGHT - 80;
        playerBullets = [];
        enemyBullets = [];
        particles = [];
        items = [];
        waveCount = 0;
        enemySpawnTimer = 0;
        lastTime = 0;
        
        scoreEl.textContent = score;
        updateHealthDisplay();
        levelEl.textContent = level;
        startBtn.disabled = true;
        
        gameLoop();
    }
    
    function updateLevel() {
        const newLevel = Math.floor(score / SCORE_PER_LEVEL) + 1;
        if (newLevel > level) {
            level = newLevel;
            if (levelEl) levelEl.textContent = level;
        }
    }
    
    function endGame() {
        gameRunning = false;
        startBtn.disabled = false;
        finalScoreEl.textContent = score;
        gameOverEl.classList.remove('hidden');
        if (animationId) cancelAnimationFrame(animationId);
    }
    
    function handleKeyDown(e) {
        keys[e.code] = true;
        if (e.code === 'Space') e.preventDefault();
    }
    
    function handleKeyUp(e) {
        keys[e.code] = false;
    }
    
    function updatePlayer() {
        if (keys['ArrowLeft'] || keys['KeyA']) {
            player.x -= player.speed;
        }
        if (keys['ArrowRight'] || keys['KeyD']) {
            player.x += player.speed;
        }
        if (keys['ArrowUp'] || keys['KeyW']) {
            player.y -= player.speed;
        }
        if (keys['ArrowDown'] || keys['KeyS']) {
            player.y += player.speed;
        }
        
        player.x = Math.max(0, Math.min(WIDTH - player.width, player.x));
        player.y = Math.max(HEIGHT / 2, Math.min(HEIGHT - player.height, player.y));
        
        // 发射
        if (keys['Space'] && gameRunning) {
            const now = Date.now();
            if (now - player.lastFire > player.fireRate) {
                player.lastFire = now;
                playerBullets.push({
                    x: player.x + player.width / 2 - 3,
                    y: player.y,
                    width: 6,
                    height: 20,
                    speed: -12
                });
            }
        }
    }
    
    function addOneEnemy(x, typeOpt) {
        const speedMult = getLevelSpeedMultiplier();
        const types = [
            { width: 40, height: 40, hp: 1, score: 10, color: '#e74c3c', baseSpeed: 0.7, imgIndex: 0 },
            { width: 50, height: 50, hp: 2, score: 25, color: '#e67e22', baseSpeed: 0.5, imgIndex: 1 },
            { width: 36, height: 36, hp: 1, score: 15, color: '#9b59b6', baseSpeed: 0.9, imgIndex: 2 }
        ];
        const t = typeOpt || types[Math.floor(Math.random() * types.length)];
        const speed = (t.baseSpeed || 0.5) * speedMult;
        const width = t.width;
        const height = t.height;
        x = Math.max(0, Math.min(WIDTH - width, x));
        enemies.push({
            x: x,
            y: -height,
            width: width,
            height: height,
            hp: t.hp,
            maxHp: t.maxHp != null ? t.maxHp : t.hp,
            score: t.score,
            color: t.color,
            speed: speed,
            imgIndex: t.imgIndex != null ? t.imgIndex : 0,
            shootTimer: 0,
            nextShotAt: 1000,
            isBoss: t.isBoss || false,
            summonTimer: t.isBoss ? 0 : undefined,
            summonInterval: t.summonInterval != null ? t.summonInterval : undefined,
            summonCount: t.summonCount != null ? t.summonCount : undefined
        });
    }
    
    function spawnSmallBoss() {
        const w = 70, h = 70;
        const x = (WIDTH - w) / 2;
        addOneEnemy(x, {
            width: w, height: h, hp: 10, maxHp: 10, score: 100,
            color: '#c0392b', baseSpeed: 0.35, imgIndex: 0, isBoss: true,
            summonInterval: BOSS_SUMMON_INTERVAL_MS, summonCount: 2
        });
    }
    
    function spawnBigBoss() {
        const w = 90, h = 90;
        const x = (WIDTH - w) / 2;
        addOneEnemy(x, {
            width: w, height: h, hp: 20, maxHp: 20, score: 200,
            color: '#8e44ad', baseSpeed: 0.25, imgIndex: 1, isBoss: true,
            summonInterval: BOSS_SUMMON_INTERVAL_MS, summonCount: 4
        });
    }

    // Boss 召唤的小飞机：在 Boss 左右两侧并排（与 Boss 同高）
    const SMALL_MINION_TYPE = { width: 40, height: 40, hp: 1, score: 10, color: '#e74c3c', baseSpeed: 0.7, imgIndex: 0 };
    function spawnSummoned(boss, count) {
        const w = SMALL_MINION_TYPE.width;
        const spacing = 12;
        const baseY = boss.y + (boss.height - w) / 2;  // 与 Boss 垂直居中
        const leftCount = Math.floor(count / 2);
        const rightCount = count - leftCount;
        for (let i = 0; i < leftCount; i++) {
            const ex = boss.x - (leftCount - i) * (w + spacing) - w;
            if (ex >= 0) {
                addOneEnemy(ex, SMALL_MINION_TYPE);
                enemies[enemies.length - 1].y = baseY;
            }
        }
        for (let i = 0; i < rightCount; i++) {
            const ex = boss.x + boss.width + spacing + i * (w + spacing);
            if (ex + w <= WIDTH) {
                addOneEnemy(ex, SMALL_MINION_TYPE);
                enemies[enemies.length - 1].y = baseY;
            }
        }
    }
    
    function tryDropHeal(x, y) {
        if (Math.random() < HEAL_DROP_CHANCE) {
            items.push({
                x: x - 12,
                y: y,
                width: 24,
                height: 24,
                type: 'heal',
                speed: 1.2
            });
        }
    }
    
    // 每波只出一种：普通敌机 / 小 Boss / 大 Boss，互斥；每 10 波一次 Boss，第 10 次 Boss 为大 Boss
    function spawnEnemy() {
        waveCount++;
        const isBossWave = waveCount > 0 && waveCount % WAVES_PER_BOSS === 0;
        const isBigBossWave = isBossWave && waveCount % (WAVES_PER_BOSS * BOSS_WAVES_UNTIL_BIG) === 0;
        if (isBigBossWave) {
            spawnBigBoss();
            return;
        }
        if (isBossWave) {
            spawnSmallBoss();
            return;
        }
        spawnNormalWave();
    }

    function spawnNormalWave() {
        const types = [
            { width: 40, height: 40, hp: 1, score: 10, color: '#e74c3c', baseSpeed: 0.7, imgIndex: 0 },
            { width: 50, height: 50, hp: 2, score: 25, color: '#e67e22', baseSpeed: 0.5, imgIndex: 1 },
            { width: 36, height: 36, hp: 1, score: 15, color: '#9b59b6', baseSpeed: 0.9, imgIndex: 2 }
        ];
        const isFormation = Math.random() < FORMATION_CHANCE;
        if (isFormation) {
            const t = types[Math.floor(Math.random() * types.length)];
            const count = 3 + Math.floor(Math.random() * 4);
            const spacing = 36;
            const totalWidth = t.width * count + spacing * (count - 1);
            const startX = (WIDTH - totalWidth) / 2;
            for (let i = 0; i < count; i++) {
                addOneEnemy(startX + i * (spacing + t.width), t);
            }
        } else {
            const count = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < count; i++) {
                addOneEnemy(Math.random() * (WIDTH - 50), null);
            }
        }
    }
    
    function updateEnemies(dt) {
        enemySpawnTimer += dt;
        if (enemySpawnTimer >= SPAWN_INTERVAL_MS) {
            enemySpawnTimer = 0;
            spawnEnemy();
        }
        
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            e.y += e.speed;
            e.shootTimer = (e.shootTimer || 0) + dt;

            // Boss 召唤小飞机：小 Boss 2 架，大 Boss 4 架，按间隔召唤
            if (e.isBoss && e.summonCount && e.summonInterval) {
                e.summonTimer = (e.summonTimer || 0) + dt;
                if (e.summonTimer >= e.summonInterval) {
                    e.summonTimer = 0;
                    spawnSummoned(e, e.summonCount);
                }
            }
            
            // 敌机发射：出现后 1 秒即可攻击，之后固定每 3 秒一次
            const firstShotAt = 1000;
            const shotInterval = 3000;
            const nextShotAt = e.nextShotAt != null ? e.nextShotAt : firstShotAt;
            if (e.shootTimer >= nextShotAt) {
                e.nextShotAt = e.shootTimer + shotInterval;
                enemyBullets.push({
                    x: e.x + e.width / 2 - 2,
                    y: e.y + e.height,
                    width: 4,
                    height: 12,
                    speed: 3 + level * 0.3
                });
            }
            
            if (e.y > HEIGHT) {
                enemies.splice(i, 1);
            }
        }
    }
    
    function updateBullets() {
        for (let i = playerBullets.length - 1; i >= 0; i--) {
            const b = playerBullets[i];
            b.y += b.speed;
            if (b.y + b.height < 0) playerBullets.splice(i, 1);
        }
        
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const b = enemyBullets[i];
            b.y += b.speed;
            if (b.y > HEIGHT) enemyBullets.splice(i, 1);
        }
    }
    
    function updateItems(dt) {
        for (let i = items.length - 1; i >= 0; i--) {
            const it = items[i];
            it.y += it.speed;
            if (it.y > HEIGHT) items.splice(i, 1);
        }
    }
    
    function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= dt;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }
    
    function addExplosion(x, y, color) {
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12 + Math.random();
            particles.push({
                x, y,
                vx: Math.cos(angle) * 4,
                vy: Math.sin(angle) * 4,
                color: color || '#ffaa00',
                life: 1,
                size: 4
            });
        }
    }
    
    function checkCollisions() {
        // 玩家子弹打敌机
        for (let bi = playerBullets.length - 1; bi >= 0; bi--) {
            const b = playerBullets[bi];
            for (let ei = enemies.length - 1; ei >= 0; ei--) {
                const e = enemies[ei];
                if (rectCollide(b, e)) {
                    e.hp--;
                    playerBullets.splice(bi, 1);
                    addExplosion(b.x, b.y, e.color);
                    if (e.hp <= 0) {
                        score += e.score;
                        updateLevel();
                        addExplosion(e.x + e.width / 2, e.y + e.height / 2, e.color);
                        tryDropHeal(e.x + e.width / 2, e.y + e.height / 2);
                        enemies.splice(ei, 1);
                        if (score > highScore) {
                            highScore = score;
                            highScoreEl.textContent = highScore;
                            localStorage.setItem('feijiHighScore', highScore);
                        }
                    }
                    break;
                }
            }
        }
        
        // 敌机子弹打玩家
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const b = enemyBullets[i];
            if (rectCollide(b, player)) {
                enemyBullets.splice(i, 1);
                lives--;
                updateHealthDisplay();
                addExplosion(player.x + player.width / 2, player.y + player.height / 2, '#4facfe');
                if (lives <= 0) endGame();
            }
        }
        
        // 敌机撞玩家
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (rectCollide(e, player)) {
                addExplosion(e.x + e.width / 2, e.y + e.height / 2, e.color);
                enemies.splice(i, 1);
                lives--;
                updateHealthDisplay();
                if (lives <= 0) endGame();
            }
        }
        
        // 回血道具与玩家
        for (let i = items.length - 1; i >= 0; i--) {
            const it = items[i];
            if (rectCollide(it, player)) {
                lives = Math.min(lives + 1, MAX_LIVES);
                updateHealthDisplay();
                items.splice(i, 1);
            }
        }
    }
    
    function rectCollide(a, b) {
        return a.x < b.x + b.width && a.x + a.width > b.x &&
               a.y < b.y + b.height && a.y + a.height > b.y;
    }
    
    function drawPlayer() {
        ctx.save();
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
        
        // 机身
        ctx.fillStyle = '#4facfe';
        ctx.beginPath();
        ctx.moveTo(0, -player.height / 2 + 10);
        ctx.lineTo(-player.width / 2 + 5, player.height / 2 - 5);
        ctx.lineTo(0, player.height / 2 - 15);
        ctx.lineTo(player.width / 2 - 5, player.height / 2 - 5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 机翼
        ctx.fillStyle = 'rgba(0, 242, 254, 0.6)';
        ctx.fillRect(-player.width / 2 - 5, 0, 12, 8);
        ctx.fillRect(player.width / 2 - 7, 0, 12, 8);
        
        ctx.restore();
    }
    
    function drawBullets() {
        ctx.fillStyle = '#00f2fe';
        playerBullets.forEach(b => {
            ctx.fillRect(b.x, b.y, b.width, b.height);
        });
        ctx.fillStyle = '#ff6b6b';
        enemyBullets.forEach(b => {
            ctx.fillRect(b.x, b.y, b.width, b.height);
        });
    }
    
    function drawEnemies() {
        enemies.forEach(e => {
            // 血条在上方（先画血条，再画飞机，避免被遮挡）
            if (e.maxHp > 1) {
                const barY = e.y - 10;
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(e.x, barY, e.width, 5);
                ctx.fillStyle = '#0f0';
                ctx.fillRect(e.x, barY, e.width * (e.hp / e.maxHp), 5);
            }
            const img = enemyImages[e.imgIndex];
            if (img && img.complete && img.naturalWidth) {
                // 敌机箭头朝下：将图片垂直翻转绘制
                ctx.save();
                ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
                ctx.scale(1, -1);
                ctx.drawImage(img, -e.width / 2, -e.height / 2, e.width, e.height);
                ctx.restore();
            } else {
                // 无图时用三角形绘制敌机，箭头朝下（尖头在下方）
                ctx.save();
                ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
                ctx.fillStyle = e.color;
                ctx.beginPath();
                ctx.moveTo(0, e.height / 2 - 4);   // 机头在下
                ctx.lineTo(-e.width / 2 + 4, -e.height / 2 + 4);
                ctx.lineTo(0, -e.height / 2 + 12);
                ctx.lineTo(e.width / 2 - 4, -e.height / 2 + 4);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            }
        });
    }
    
    function drawItems() {
        items.forEach(it => {
            if (it.type === 'heal') {
                ctx.fillStyle = '#2ecc71';
                ctx.strokeStyle = '#27ae60';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(it.x + it.width / 2, it.y + it.height / 2, it.width / 2 - 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.font = 'bold 14px Arial';
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('+', it.x + it.width / 2, it.y + it.height / 2);
            }
        });
    }
    
    function drawParticles() {
        particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            ctx.globalAlpha = 1;
        });
    }
    
    let lastTime = 0;
    function gameLoop(timestamp = 0) {
        if (!gameRunning) return;
        
        const dt = Math.min(timestamp - lastTime, 50);
        lastTime = timestamp;
        
        updatePlayer();
        updateEnemies(dt);
        updateBullets();
        updateItems(dt);
        updateParticles(dt);
        checkCollisions();
        updateLevel();
        scoreEl.textContent = score;
        levelEl.textContent = level;
        
        // 绘制
        ctx.fillStyle = '#0f0c29';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        
        drawEnemies();
        drawBullets();
        drawItems();
        drawPlayer();
        drawParticles();
        
        animationId = requestAnimationFrame(gameLoop);
    }
    
    init();
});
