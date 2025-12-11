// 游戏配置
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const GRID_WIDTH = CANVAS_WIDTH / CELL_SIZE;
const GRID_HEIGHT = CANVAS_HEIGHT / CELL_SIZE;

// 游戏状态
let canvas, ctx;
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food = { x: 0, y: 0 };
let score = 0;
let highScore = 0;
let gameRunning = false;
let gamePaused = false;
let gameLoop = null;

// DOM元素
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const finalScoreElement = document.getElementById('finalScore');
const gameOverElement = document.getElementById('gameOver');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const playAgainBtn = document.getElementById('playAgainBtn');

// 初始化游戏
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // 加载最高分
    highScore = localStorage.getItem('snakeHighScore') || 0;
    highScoreElement.textContent = highScore;
    
    // 初始化蛇
    resetGame();
    
    // 事件监听
    startBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', togglePause);
    restartBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);
    
    // 键盘控制
    document.addEventListener('keydown', handleKeyPress);
    
    // 触摸控制（移动端）
    let touchStartX = 0;
    let touchStartY = 0;
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (!gameRunning || gamePaused) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // 水平滑动
            if (deltaX > 30 && direction.x === 0) {
                nextDirection = { x: 1, y: 0 }; // 右
            } else if (deltaX < -30 && direction.x === 0) {
                nextDirection = { x: -1, y: 0 }; // 左
            }
        } else {
            // 垂直滑动
            if (deltaY > 30 && direction.y === 0) {
                nextDirection = { x: 0, y: 1 }; // 下
            } else if (deltaY < -30 && direction.y === 0) {
                nextDirection = { x: 0, y: -1 }; // 上
            }
        }
    });
    
    // 绘制初始状态
    draw();
}

// 重置游戏
function resetGame() {
    // 清除游戏循环
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    
    // 重置状态
    gameRunning = false;
    gamePaused = false;
    score = 0;
    scoreElement.textContent = score;
    
    // 初始化蛇（从中心开始，长度为3）
    snake = [
        { x: Math.floor(GRID_WIDTH / 2), y: Math.floor(GRID_HEIGHT / 2) },
        { x: Math.floor(GRID_WIDTH / 2) - 1, y: Math.floor(GRID_HEIGHT / 2) },
        { x: Math.floor(GRID_WIDTH / 2) - 2, y: Math.floor(GRID_HEIGHT / 2) }
    ];
    
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    
    // 生成食物
    generateFood();
    
    // 隐藏游戏结束界面
    gameOverElement.classList.add('hidden');
    
    // 更新按钮状态
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    
    // 绘制
    draw();
}

// 开始游戏
function startGame() {
    if (gameRunning) return;
    
    gameRunning = true;
    gamePaused = false;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    
    // 开始游戏循环
    gameLoop = setInterval(update, 150);
}

// 暂停/继续游戏
function togglePause() {
    if (!gameRunning) return;
    
    gamePaused = !gamePaused;
    
    if (gamePaused) {
        clearInterval(gameLoop);
        pauseBtn.textContent = '继续';
    } else {
        gameLoop = setInterval(update, 150);
        pauseBtn.textContent = '暂停';
    }
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
    
    // 方向键或WASD
    switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (direction.y === 0) {
                nextDirection = { x: 0, y: -1 };
            }
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (direction.y === 0) {
                nextDirection = { x: 0, y: 1 };
            }
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (direction.x === 0) {
                nextDirection = { x: -1, y: 0 };
            }
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (direction.x === 0) {
                nextDirection = { x: 1, y: 0 };
            }
            break;
        case ' ':
            togglePause();
            break;
    }
}

// 更新游戏状态
function update() {
    // 更新方向
    direction = { ...nextDirection };
    
    // 计算新头部位置
    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };
    
    // 检查碰撞
    if (checkCollision(head)) {
        gameOver();
        return;
    }
    
    // 添加新头部
    snake.unshift(head);
    
    // 检查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        
        // 更新最高分
        if (score > highScore) {
            highScore = score;
            highScoreElement.textContent = highScore;
            localStorage.setItem('snakeHighScore', highScore);
        }
        
        // 生成新食物
        generateFood();
    } else {
        // 移除尾部
        snake.pop();
    }
    
    // 绘制
    draw();
}

// 检查碰撞
function checkCollision(head) {
    // 检查墙壁碰撞
    if (head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT) {
        return true;
    }
    
    // 检查自身碰撞
    for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            return true;
        }
    }
    
    return false;
}

// 生成食物
function generateFood() {
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * GRID_WIDTH),
            y: Math.floor(Math.random() * GRID_HEIGHT)
        };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    
    food = newFood;
}

// 游戏结束
function gameOver() {
    gameRunning = false;
    gamePaused = false;
    
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    
    finalScoreElement.textContent = score;
    gameOverElement.classList.remove('hidden');
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    pauseBtn.textContent = '暂停';
}

// 绘制游戏
function draw() {
    // 清空画布
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // 绘制网格线
    ctx.strokeStyle = '#16213e';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_WIDTH; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, CANVAS_HEIGHT);
        ctx.stroke();
    }
    for (let i = 0; i <= GRID_HEIGHT; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(CANVAS_WIDTH, i * CELL_SIZE);
        ctx.stroke();
    }
    
    // 绘制食物
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(
        food.x * CELL_SIZE + CELL_SIZE / 2,
        food.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    // 绘制蛇
    snake.forEach((segment, index) => {
        if (index === 0) {
            // 蛇头
            ctx.fillStyle = '#4facfe';
        } else {
            // 蛇身
            const gradient = ctx.createLinearGradient(
                segment.x * CELL_SIZE,
                segment.y * CELL_SIZE,
                (segment.x + 1) * CELL_SIZE,
                (segment.y + 1) * CELL_SIZE
            );
            gradient.addColorStop(0, '#00f2fe');
            gradient.addColorStop(1, '#4facfe');
            ctx.fillStyle = gradient;
        }
        
        ctx.fillRect(
            segment.x * CELL_SIZE + 2,
            segment.y * CELL_SIZE + 2,
            CELL_SIZE - 4,
            CELL_SIZE - 4
        );
        
        // 蛇头眼睛
        if (index === 0) {
            ctx.fillStyle = '#fff';
            const eyeSize = 3;
            const eyeOffset = 5;
            
            if (direction.x === 1) {
                // 向右
                ctx.fillRect(segment.x * CELL_SIZE + CELL_SIZE - eyeOffset, segment.y * CELL_SIZE + eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(segment.x * CELL_SIZE + CELL_SIZE - eyeOffset, segment.y * CELL_SIZE + CELL_SIZE - eyeOffset - eyeSize, eyeSize, eyeSize);
            } else if (direction.x === -1) {
                // 向左
                ctx.fillRect(segment.x * CELL_SIZE + eyeOffset - eyeSize, segment.y * CELL_SIZE + eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(segment.x * CELL_SIZE + eyeOffset - eyeSize, segment.y * CELL_SIZE + CELL_SIZE - eyeOffset - eyeSize, eyeSize, eyeSize);
            } else if (direction.y === 1) {
                // 向下
                ctx.fillRect(segment.x * CELL_SIZE + eyeOffset, segment.y * CELL_SIZE + CELL_SIZE - eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(segment.x * CELL_SIZE + CELL_SIZE - eyeOffset - eyeSize, segment.y * CELL_SIZE + CELL_SIZE - eyeOffset, eyeSize, eyeSize);
            } else {
                // 向上
                ctx.fillRect(segment.x * CELL_SIZE + eyeOffset, segment.y * CELL_SIZE + eyeOffset - eyeSize, eyeSize, eyeSize);
                ctx.fillRect(segment.x * CELL_SIZE + CELL_SIZE - eyeOffset - eyeSize, segment.y * CELL_SIZE + eyeOffset - eyeSize, eyeSize, eyeSize);
            }
        }
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);

