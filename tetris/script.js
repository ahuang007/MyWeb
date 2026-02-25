document.addEventListener('DOMContentLoaded', () => {
    // 游戏配置
    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 30;
    const COLORS = [
        '#000000', // 空白
        '#00F0F0', // I - 青色
        '#0000F0', // O - 蓝色
        '#F0A000', // T - 橙色
        '#00F000', // S - 绿色
        '#F00000', // Z - 红色
        '#A000F0', // J - 紫色
        '#F0F000'  // L - 黄色
    ];
    
    // 7种方块形状定义（相对于中心点的坐标）
    const SHAPES = [
        // I
        [
            [[0, -1], [0, 0], [0, 1], [0, 2]],
            [[-1, 0], [0, 0], [1, 0], [2, 0]]
        ],
        // O
        [
            [[0, 0], [1, 0], [0, 1], [1, 1]]
        ],
        // T
        [
            [[0, -1], [-1, 0], [0, 0], [1, 0]],
            [[0, -1], [0, 0], [0, 1], [1, 0]],
            [[-1, 0], [0, 0], [1, 0], [0, 1]],
            [[0, -1], [-1, 0], [0, 0], [0, 1]]
        ],
        // S
        [
            [[0, -1], [1, -1], [-1, 0], [0, 0]],
            [[0, -1], [0, 0], [1, 0], [1, 1]]
        ],
        // Z
        [
            [[-1, -1], [0, -1], [0, 0], [1, 0]],
            [[1, -1], [0, 0], [1, 0], [0, 1]]
        ],
        // J
        [
            [[-1, -1], [-1, 0], [0, 0], [1, 0]],
            [[0, -1], [1, -1], [0, 0], [0, 1]],
            [[-1, 0], [0, 0], [1, 0], [1, 1]],
            [[0, -1], [0, 0], [-1, 1], [0, 1]]
        ],
        // L
        [
            [[1, -1], [-1, 0], [0, 0], [1, 0]],
            [[0, -1], [0, 0], [0, 1], [1, 1]],
            [[-1, 0], [0, 0], [1, 0], [-1, 1]],
            [[-1, -1], [0, -1], [0, 0], [0, 1]]
        ]
    ];
    
    // 游戏状态
    let canvas, ctx, nextCanvas, nextCtx;
    let board = [];
    let currentPiece = null;
    let nextPiece = null;
    let score = 0;
    let highScore = 0;
    let level = 1;
    let lines = 0;
    let gameRunning = false;
    let gamePaused = false;
    let dropTime = 0;
    let lastTime = 0;
    let dropInterval = 1000; // 初始下落间隔（毫秒）
    
    // DOM元素
    const scoreEl = document.getElementById('score');
    const highScoreEl = document.getElementById('highScore');
    const levelEl = document.getElementById('level');
    const linesEl = document.getElementById('lines');
    const finalScoreEl = document.getElementById('final-score');
    const gameOverEl = document.getElementById('game-over');
    const gamePausedEl = document.getElementById('game-paused');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const restartBtn = document.getElementById('restart-btn');
    const playAgainBtn = document.getElementById('play-again');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnRotate = document.getElementById('btn-rotate');
    const btnDown = document.getElementById('btn-down');
    
    // 陀螺仪：左右倾斜移动，带节流
    let gyroGamma = 0;
    let lastGyroMove = 0;
    const GYRO_THROTTLE_MS = 180;
    const GYRO_DEADZONE = 12;
    
    // 初始化
    function init() {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
        nextCanvas = document.getElementById('nextCanvas');
        nextCtx = nextCanvas.getContext('2d');
        
        canvas.width = COLS * BLOCK_SIZE;
        canvas.height = ROWS * BLOCK_SIZE;
        
        // 加载最高分
        highScore = parseInt(localStorage.getItem('tetrisHighScore') || '0');
        highScoreEl.textContent = highScore;
        
        // 初始化棋盘
        initBoard();
        
        // 事件监听
        startBtn.addEventListener('click', startGame);
        pauseBtn.addEventListener('click', togglePause);
        restartBtn.addEventListener('click', resetGame);
        playAgainBtn.addEventListener('click', resetGame);
        document.addEventListener('keydown', handleKeyPress);
        setupMobileControls();
        setupGyro();
        
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            document.body.classList.add('mobile-fullscreen');
        }
        
        // 绘制初始状态
        draw();
        drawNext();
    }
    
    function setupMobileControls() {
        if (!btnLeft || !btnRight || !btnRotate || !btnDown) return;
        const trigger = (fn) => {
            if (!gameRunning || gamePaused) return;
            fn();
            draw();
        };
        btnLeft.addEventListener('pointerdown', (e) => { e.preventDefault(); trigger(() => movePiece(-1)); });
        btnRight.addEventListener('pointerdown', (e) => { e.preventDefault(); trigger(() => movePiece(1)); });
        btnRotate.addEventListener('pointerdown', (e) => { e.preventDefault(); trigger(rotatePiece); });
        btnDown.addEventListener('pointerdown', (e) => { e.preventDefault(); trigger(dropPiece); });
        [btnLeft, btnRight, btnRotate, btnDown].forEach(el => {
            if (el) {
                el.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
            }
        });
    }
    
    function setupGyro() {
        if (typeof DeviceOrientationEvent === 'undefined') return;
        const onOrientation = (e) => {
            if (e.gamma != null) gyroGamma = e.gamma;
        };
        const reqPermission = () => {
            if (typeof DeviceOrientationEvent.requestPermission !== 'function') {
                window.addEventListener('deviceorientation', onOrientation);
                return;
            }
            DeviceOrientationEvent.requestPermission()
                .then((perm) => {
                    if (perm === 'granted') window.addEventListener('deviceorientation', onOrientation);
                })
                .catch(() => {});
        };
        window.addEventListener('deviceorientation', onOrientation);
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            startBtn.addEventListener('click', () => reqPermission(), { once: true });
        }
    }
    
    function applyGyroMove() {
        if (!gameRunning || gamePaused || !currentPiece) return;
        const now = Date.now();
        if (now - lastGyroMove < GYRO_THROTTLE_MS) return;
        if (gyroGamma < -GYRO_DEADZONE) {
            movePiece(-1);
            lastGyroMove = now;
        } else if (gyroGamma > GYRO_DEADZONE) {
            movePiece(1);
            lastGyroMove = now;
        }
    }
    
    // 初始化棋盘
    function initBoard() {
        board = [];
        for (let row = 0; row < ROWS; row++) {
            board[row] = [];
            for (let col = 0; col < COLS; col++) {
                board[row][col] = 0;
            }
        }
    }
    
    // 创建新方块
    function createPiece() {
        const type = Math.floor(Math.random() * SHAPES.length);
        return {
            type: type,
            shape: SHAPES[type][0],
            rotation: 0,
            x: Math.floor(COLS / 2) - 1,
            y: 0,
            color: type + 1
        };
    }
    
    // 开始游戏
    function startGame() {
        if (gameRunning) return;
        
        resetGame();
        gameRunning = true;
        gamePaused = false;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        
        currentPiece = createPiece();
        nextPiece = createPiece();
        
        lastTime = performance.now();
        gameLoop();
    }
    
    // 重置游戏
    function resetGame() {
        initBoard();
        score = 0;
        level = 1;
        lines = 0;
        dropInterval = 1000;
        scoreEl.textContent = score;
        levelEl.textContent = level;
        linesEl.textContent = lines;
        gameOverEl.classList.add('hidden');
        gamePausedEl.classList.add('hidden');
        gameRunning = false;
        gamePaused = false;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        pauseBtn.textContent = '暂停';
        draw();
    }
    
    // 暂停/继续
    function togglePause() {
        if (!gameRunning) return;
        gamePaused = !gamePaused;
        if (gamePaused) {
            pauseBtn.textContent = '继续';
            gamePausedEl.classList.remove('hidden');
        } else {
            pauseBtn.textContent = '暂停';
            gamePausedEl.classList.add('hidden');
            lastTime = performance.now();
            gameLoop();
        }
    }
    
    // 游戏循环
    function gameLoop(time = 0) {
        if (!gameRunning || gamePaused) return;
        
        const deltaTime = time - lastTime;
        lastTime = time;
        
        dropTime += deltaTime;
        
        if (dropTime > dropInterval) {
            dropPiece();
            dropTime = 0;
        }
        
        applyGyroMove();
        draw();
        requestAnimationFrame(gameLoop);
    }
    
    // 方块下落
    function dropPiece() {
        if (!currentPiece) return;
        
        currentPiece.y++;
        if (checkCollision(currentPiece)) {
            currentPiece.y--;
            placePiece();
            clearLines();
            currentPiece = nextPiece;
            nextPiece = createPiece();
            drawNext();
            
            if (checkCollision(currentPiece)) {
                gameOver();
            }
        }
    }
    
    // 检查碰撞
    function checkCollision(piece) {
        for (let block of piece.shape) {
            const x = piece.x + block[0];
            const y = piece.y + block[1];
            
            if (x < 0 || x >= COLS || y >= ROWS) {
                return true;
            }
            if (y >= 0 && board[y][x] !== 0) {
                return true;
            }
        }
        return false;
    }
    
    // 放置方块
    function placePiece() {
        for (let block of currentPiece.shape) {
            const x = currentPiece.x + block[0];
            const y = currentPiece.y + block[1];
            if (y >= 0) {
                board[y][x] = currentPiece.color;
            }
        }
    }
    
    // 清除满行
    function clearLines() {
        let cleared = 0;
        for (let row = ROWS - 1; row >= 0; row--) {
            if (board[row].every(cell => cell !== 0)) {
                board.splice(row, 1);
                board.unshift(new Array(COLS).fill(0));
                cleared++;
                row++; // 重新检查这一行
            }
        }
        
        if (cleared > 0) {
            // 计算分数
            const points = [0, 100, 300, 500, 800];
            score += points[cleared] * level;
            lines += cleared;
            
            // 升级
            const newLevel = Math.floor(lines / 10) + 1;
            if (newLevel > level) {
                level = newLevel;
                dropInterval = Math.max(100, 1000 - (level - 1) * 100);
            }
            
            scoreEl.textContent = score;
            levelEl.textContent = level;
            linesEl.textContent = lines;
            
            // 更新最高分
            if (score > highScore) {
                highScore = score;
                highScoreEl.textContent = highScore;
                localStorage.setItem('tetrisHighScore', highScore);
            }
        }
    }
    
    // 旋转方块
    function rotatePiece() {
        if (!currentPiece) return;
        
        const shapeType = currentPiece.type;
        const rotations = SHAPES[shapeType];
        const currentRotation = currentPiece.rotation;
        const nextRotation = (currentRotation + 1) % rotations.length;
        
        const originalShape = currentPiece.shape;
        currentPiece.shape = rotations[nextRotation];
        currentPiece.rotation = nextRotation;
        
        if (checkCollision(currentPiece)) {
            // 尝试左右移动后再旋转
            currentPiece.x--;
            if (checkCollision(currentPiece)) {
                currentPiece.x += 2;
                if (checkCollision(currentPiece)) {
                    currentPiece.x--;
                    currentPiece.shape = originalShape;
                    currentPiece.rotation = currentRotation;
                    return;
                }
            }
        }
    }
    
    // 移动方块
    function movePiece(direction) {
        if (!currentPiece) return;
        
        currentPiece.x += direction;
        if (checkCollision(currentPiece)) {
            currentPiece.x -= direction;
        }
    }
    
    // 快速下落
    function hardDrop() {
        if (!currentPiece) return;
        
        while (!checkCollision(currentPiece)) {
            currentPiece.y++;
        }
        currentPiece.y--;
        placePiece();
        clearLines();
        currentPiece = nextPiece;
        nextPiece = createPiece();
        drawNext();
        
        if (checkCollision(currentPiece)) {
            gameOver();
        }
    }
    
    // 绘制
    function draw() {
        // 清空画布
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制已放置的方块
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (board[row][col] !== 0) {
                    drawBlock(ctx, col, row, COLORS[board[row][col]]);
                }
            }
        }
        
        // 绘制当前方块
        if (currentPiece) {
            for (let block of currentPiece.shape) {
                const x = currentPiece.x + block[0];
                const y = currentPiece.y + block[1];
                if (y >= 0) {
                    drawBlock(ctx, x, y, COLORS[currentPiece.color]);
                }
            }
        }
    }
    
    // 绘制下一个方块
    function drawNext() {
        if (!nextPiece) return;
        
        nextCtx.fillStyle = '#1a1a2e';
        nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
        
        const offsetX = 2;
        const offsetY = 2;
        const scale = 0.8;
        const size = BLOCK_SIZE * scale;
        
        for (let block of nextPiece.shape) {
            const x = offsetX + (block[0] + 1) * size;
            const y = offsetY + (block[1] + 1) * size;
            
            // 绘制方块
            nextCtx.fillStyle = COLORS[nextPiece.color];
            nextCtx.fillRect(x, y, size - 2, size - 2);
            
            // 绘制边框
            nextCtx.strokeStyle = '#333';
            nextCtx.lineWidth = 1;
            nextCtx.strokeRect(x, y, size - 2, size - 2);
            
            // 绘制高光
            nextCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            nextCtx.fillRect(x + 2, y + 2, size / 3, size / 3);
        }
    }
    
    // 绘制单个方块
    function drawBlock(context, col, row, color, isNext = false) {
        const size = isNext ? BLOCK_SIZE : BLOCK_SIZE;
        const x = col * size;
        const y = row * size;
        
        // 绘制方块
        context.fillStyle = color;
        context.fillRect(x + 1, y + 1, size - 2, size - 2);
        
        // 绘制边框
        context.strokeStyle = '#333';
        context.lineWidth = 2;
        context.strokeRect(x + 1, y + 1, size - 2, size - 2);
        
        // 绘制高光
        context.fillStyle = 'rgba(255, 255, 255, 0.3)';
        context.fillRect(x + 2, y + 2, size / 3, size / 3);
    }
    
    // 处理键盘输入
    function handleKeyPress(e) {
        if (!gameRunning || gamePaused) {
            if (e.key === ' ' || e.key === 'Enter') {
                if (!gameRunning) {
                    startGame();
                } else {
                    togglePause();
                }
            }
            return;
        }
        
        switch(e.key) {
            case 'ArrowLeft':
                movePiece(-1);
                break;
            case 'ArrowRight':
                movePiece(1);
                break;
            case 'ArrowDown':
                dropPiece();
                break;
            case 'ArrowUp':
                rotatePiece();
                break;
            case ' ':
                togglePause();
                break;
            case 's':
            case 'S':
                hardDrop();
                break;
        }
        
        draw();
    }
    
    // 游戏结束
    function gameOver() {
        gameRunning = false;
        gamePaused = false;
        finalScoreEl.textContent = score;
        gameOverEl.classList.remove('hidden');
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        pauseBtn.textContent = '暂停';
    }
    
    // 初始化
    init();
});
