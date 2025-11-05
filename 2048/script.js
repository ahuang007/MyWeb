document.addEventListener('DOMContentLoaded', () => {
    // 游戏主类
    class Game2048 {
        constructor() {
            this.gridSize = 4; // 4x4网格
            this.startTiles = 2; // 初始方块数量
            this.grid = []; // 游戏网格
            this.score = 0; // 当前分数
            this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0; // 最高分
            this.over = false; // 游戏是否结束
            this.won = false; // 是否获胜
            this.canMove = true; // 是否可以移动
            
            // 初始化DOM元素
            this.tileContainer = document.querySelector('.tile-container');
            this.scoreContainer = document.getElementById('score');
            this.bestScoreContainer = document.getElementById('best-score');
            this.messageContainer = document.querySelector('.game-message');
            
            // 初始化游戏
            this.init();
            
            // 设置事件监听器
            this.setupEventListeners();
        }
        
        // 初始化游戏
        init() {
            // 重置游戏状态
            this.grid = this.createGrid();
            this.score = 0;
            this.over = false;
            this.won = false;
            this.canMove = true;
            
            // 更新UI
            this.updateScore();
            this.clearMessage();
            this.clearTiles();
            
            // 添加初始方块
            this.addStartTiles();
        }
        
        // 创建空网格
        createGrid() {
            const grid = [];
            for (let i = 0; i < this.gridSize; i++) {
                grid[i] = [];
                for (let j = 0; j < this.gridSize; j++) {
                    grid[i][j] = null;
                }
            }
            return grid;
        }
        
        // 添加初始方块
        addStartTiles() {
            for (let i = 0; i < this.startTiles; i++) {
                this.addRandomTile();
            }
        }
        
        // 添加随机方块
        addRandomTile() {
            if (this.hasEmptyCell()) {
                const value = Math.random() < 0.9 ? 2 : 4; // 90%概率为2，10%概率为4
                const position = this.getRandomEmptyCell();
                
                // 在网格中设置方块
                this.grid[position.x][position.y] = value;
                
                // 在UI中添加方块
                this.addTile(value, position);
            }
        }
        
        // 检查是否有空单元格
        hasEmptyCell() {
            for (let x = 0; x < this.gridSize; x++) {
                for (let y = 0; y < this.gridSize; y++) {
                    if (this.grid[x][y] === null) {
                        return true;
                    }
                }
            }
            return false;
        }
        
        // 获取随机空单元格
        getRandomEmptyCell() {
            const emptyCells = [];
            
            for (let x = 0; x < this.gridSize; x++) {
                for (let y = 0; y < this.gridSize; y++) {
                    if (this.grid[x][y] === null) {
                        emptyCells.push({ x, y });
                    }
                }
            }
            
            if (emptyCells.length > 0) {
                return emptyCells[Math.floor(Math.random() * emptyCells.length)];
            }
            return null;
        }
        
        // 在UI中添加方块
        addTile(value, position) {
            const tile = document.createElement('div');
            tile.classList.add('tile', `tile-${value}`, 'tile-new');
            tile.textContent = value;
            tile.style.left = (position.y * 106.25 + position.y * 15) + 'px';
            tile.style.top = (position.x * 106.25 + position.x * 15) + 'px';
            tile.setAttribute('data-x', position.x);
            tile.setAttribute('data-y', position.y);
            tile.setAttribute('data-value', value);
            
            this.tileContainer.appendChild(tile);
        }
        
        // 清除所有方块
        clearTiles() {
            while (this.tileContainer.firstChild) {
                this.tileContainer.removeChild(this.tileContainer.firstChild);
            }
        }
        
        // 更新分数
        updateScore() {
            this.scoreContainer.textContent = this.score;
            
            if (this.score > this.bestScore) {
                this.bestScore = this.score;
                this.bestScoreContainer.textContent = this.bestScore;
                localStorage.setItem('bestScore', this.bestScore);
            }
        }
        
        // 显示游戏消息
        showMessage(won) {
            this.messageContainer.classList.add(won ? 'game-won' : 'game-over');
            this.messageContainer.querySelector('p').textContent = won ? '你赢了!' : '游戏结束!';
        }
        
        // 清除游戏消息
        clearMessage() {
            this.messageContainer.classList.remove('game-won', 'game-over');
        }
        
        // 设置事件监听器
        setupEventListeners() {
            // 键盘事件
            document.addEventListener('keydown', this.handleKeyDown.bind(this));
            
            // 触摸事件
            let touchStartX, touchStartY;
            let touchEndX, touchEndY;
            
            document.addEventListener('touchstart', (event) => {
                if (event.touches.length > 1) return;
                touchStartX = event.touches[0].clientX;
                touchStartY = event.touches[0].clientY;
                event.preventDefault();
            }, { passive: false });
            
            document.addEventListener('touchend', (event) => {
                if (!touchStartX || !touchStartY) return;
                
                touchEndX = event.changedTouches[0].clientX;
                touchEndY = event.changedTouches[0].clientY;
                
                const dx = touchEndX - touchStartX;
                const dy = touchEndY - touchStartY;
                
                if (Math.abs(dx) > Math.abs(dy)) {
                    // 水平滑动
                    if (dx > 0) {
                        this.move('right');
                    } else {
                        this.move('left');
                    }
                } else {
                    // 垂直滑动
                    if (dy > 0) {
                        this.move('down');
                    } else {
                        this.move('up');
                    }
                }
                
                touchStartX = null;
                touchStartY = null;
                event.preventDefault();
            }, { passive: false });
            
            // 新游戏按钮
            document.getElementById('new-game-button').addEventListener('click', () => {
                this.init();
            });
            
            // 重试按钮
            document.querySelector('.retry-button').addEventListener('click', () => {
                this.init();
            });
        }
        
        // 处理键盘事件
        handleKeyDown(event) {
            if (this.over || !this.canMove) return;
            
            switch (event.key) {
                case 'ArrowUp':
                    event.preventDefault();
                    this.move('up');
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    this.move('down');
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    this.move('left');
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    this.move('right');
                    break;
            }
        }
        
        // 移动方块
        move(direction) {
            if (this.over || !this.canMove) return;
            
            this.canMove = false;
            
            // 创建网格副本用于比较
            const previousGrid = JSON.parse(JSON.stringify(this.grid));
            
            // 初始化合并位置数组
            this.mergedPositions = [];
            
            // 根据方向移动方块
            let moved = false;
            
            if (direction === 'up') {
                moved = this.moveUp();
            } else if (direction === 'down') {
                moved = this.moveDown();
            } else if (direction === 'left') {
                moved = this.moveLeft();
            } else if (direction === 'right') {
                moved = this.moveRight();
            }
            
            // 如果有移动，添加新方块
            if (moved) {
                // 重新渲染网格
                this.renderGrid();
                
                // 添加新方块
                setTimeout(() => {
                    this.addRandomTile();
                    
                    // 检查游戏状态
                    if (!this.canMoveAny()) {
                        this.over = true;
                        this.showMessage(false);
                    }
                    
                    this.canMove = true;
                }, 100);
            } else {
                this.canMove = true;
            }
        }
        
        // 向上移动
        moveUp() {
            let moved = false;
            
            for (let y = 0; y < this.gridSize; y++) {
                for (let x = 1; x < this.gridSize; x++) {
                    if (this.grid[x][y] !== null) {
                        let newX = x;
                        
                        // 向上移动直到碰到边界或其他方块
                        while (newX > 0 && this.grid[newX - 1][y] === null) {
                            newX--;
                        }
                        
                        // 如果可以合并
                        if (newX > 0 && this.grid[newX - 1][y] === this.grid[x][y]) {
                            // 合并方块
                            this.grid[newX - 1][y] *= 2;
                            this.grid[x][y] = null;
                            
                            // 记录合并位置
                            this.mergedPositions.push({
                                x: newX - 1,
                                y: y,
                                value: this.grid[newX - 1][y]
                            });
                            
                            // 更新分数
                            this.score += this.grid[newX - 1][y];
                            this.updateScore();
                            
                            // 检查是否获胜
                            if (this.grid[newX - 1][y] === 2048 && !this.won) {
                                this.won = true;
                                this.showMessage(true);
                            }
                            
                            moved = true;
                        } else if (newX !== x) {
                            // 移动方块
                            this.grid[newX][y] = this.grid[x][y];
                            this.grid[x][y] = null;
                            moved = true;
                        }
                    }
                }
            }
            
            return moved;
        }
        
        // 向下移动
        moveDown() {
            let moved = false;
            
            for (let y = 0; y < this.gridSize; y++) {
                for (let x = this.gridSize - 2; x >= 0; x--) {
                    if (this.grid[x][y] !== null) {
                        let newX = x;
                        
                        // 向下移动直到碰到边界或其他方块
                        while (newX < this.gridSize - 1 && this.grid[newX + 1][y] === null) {
                            newX++;
                        }
                        
                        // 如果可以合并
                        if (newX < this.gridSize - 1 && this.grid[newX + 1][y] === this.grid[x][y]) {
                            // 合并方块
                            this.grid[newX + 1][y] *= 2;
                            this.grid[x][y] = null;
                            
                            // 记录合并位置
                            this.mergedPositions.push({
                                x: newX + 1,
                                y: y,
                                value: this.grid[newX + 1][y]
                            });
                            
                            // 更新分数
                            this.score += this.grid[newX + 1][y];
                            this.updateScore();
                            
                            // 检查是否获胜
                            if (this.grid[newX + 1][y] === 2048 && !this.won) {
                                this.won = true;
                                this.showMessage(true);
                            }
                            
                            moved = true;
                        } else if (newX !== x) {
                            // 移动方块
                            this.grid[newX][y] = this.grid[x][y];
                            this.grid[x][y] = null;
                            moved = true;
                        }
                    }
                }
            }
            
            return moved;
        }
        
        // 向左移动
        moveLeft() {
            let moved = false;
            
            for (let x = 0; x < this.gridSize; x++) {
                for (let y = 1; y < this.gridSize; y++) {
                    if (this.grid[x][y] !== null) {
                        let newY = y;
                        
                        // 向左移动直到碰到边界或其他方块
                        while (newY > 0 && this.grid[x][newY - 1] === null) {
                            newY--;
                        }
                        
                        // 如果可以合并
                        if (newY > 0 && this.grid[x][newY - 1] === this.grid[x][y]) {
                            // 合并方块
                            this.grid[x][newY - 1] *= 2;
                            this.grid[x][y] = null;
                            
                            // 记录合并位置
                            this.mergedPositions.push({
                                x: x,
                                y: newY - 1,
                                value: this.grid[x][newY - 1]
                            });
                            
                            // 更新分数
                            this.score += this.grid[x][newY - 1];
                            this.updateScore();
                            
                            // 检查是否获胜
                            if (this.grid[x][newY - 1] === 2048 && !this.won) {
                                this.won = true;
                                this.showMessage(true);
                            }
                            
                            moved = true;
                        } else if (newY !== y) {
                            // 移动方块
                            this.grid[x][newY] = this.grid[x][y];
                            this.grid[x][y] = null;
                            moved = true;
                        }
                    }
                }
            }
            
            return moved;
        }
        
        // 向右移动
        moveRight() {
            let moved = false;
            
            for (let x = 0; x < this.gridSize; x++) {
                for (let y = this.gridSize - 2; y >= 0; y--) {
                    if (this.grid[x][y] !== null) {
                        let newY = y;
                        
                        // 向右移动直到碰到边界或其他方块
                        while (newY < this.gridSize - 1 && this.grid[x][newY + 1] === null) {
                            newY++;
                        }
                        
                        // 如果可以合并
                        if (newY < this.gridSize - 1 && this.grid[x][newY + 1] === this.grid[x][y]) {
                            // 合并方块
                            this.grid[x][newY + 1] *= 2;
                            this.grid[x][y] = null;
                            
                            // 记录合并位置
                            this.mergedPositions.push({
                                x: x,
                                y: newY + 1,
                                value: this.grid[x][newY + 1]
                            });
                            
                            // 更新分数
                            this.score += this.grid[x][newY + 1];
                            this.updateScore();
                            
                            // 检查是否获胜
                            if (this.grid[x][newY + 1] === 2048 && !this.won) {
                                this.won = true;
                                this.showMessage(true);
                            }
                            
                            moved = true;
                        } else if (newY !== y) {
                            // 移动方块
                            this.grid[x][newY] = this.grid[x][y];
                            this.grid[x][y] = null;
                            moved = true;
                        }
                    }
                }
            }
            
            return moved;
        }
        
        // 重新渲染网格
        renderGrid() {
            // 获取当前所有方块
            const currentTiles = Array.from(this.tileContainer.querySelectorAll('.tile'));
            const newTilePositions = [];
            
            // 记录新的方块位置
            for (let x = 0; x < this.gridSize; x++) {
                for (let y = 0; y < this.gridSize; y++) {
                    if (this.grid[x][y] !== null) {
                        // 检查此位置是否是合并位置
                        const isMerged = this.mergedPositions && this.mergedPositions.some(pos => 
                            pos.x === x && pos.y === y
                        );
                        
                        newTilePositions.push({
                            value: this.grid[x][y],
                            x: x,
                            y: y,
                            merged: isMerged
                        });
                    }
                }
            }
            
            // 更新现有方块的位置
            currentTiles.forEach(tile => {
                const tileX = parseInt(tile.getAttribute('data-x'));
                const tileY = parseInt(tile.getAttribute('data-y'));
                const tileValue = parseInt(tile.getAttribute('data-value'));
                
                // 查找此方块的新位置
                const newPosition = newTilePositions.find(pos => 
                    pos.value === tileValue && 
                    !pos.used
                );
                
                if (newPosition) {
                    // 标记此位置已使用
                    newPosition.used = true;
                    
                    // 更新方块位置
                    tile.setAttribute('data-x', newPosition.x);
                    tile.setAttribute('data-y', newPosition.y);
                    tile.setAttribute('data-value', newPosition.value);
                    
                    // 应用CSS过渡动画
                    setTimeout(() => {
                        tile.style.left = (newPosition.y * 106.25 + newPosition.y * 15) + 'px';
                        tile.style.top = (newPosition.x * 106.25 + newPosition.x * 15) + 'px';
                    }, 0);
                } else {
                    // 此方块已被合并或移除
                    setTimeout(() => {
                        tile.remove();
                    }, 100);
                }
            });
            
            // 添加新方块
            newTilePositions.forEach(pos => {
                if (!pos.used) {
                    const tile = document.createElement('div');
                    tile.classList.add('tile', `tile-${pos.value}`);
                    
                    // 如果是合并产生的方块，添加合并动画类
                    if (pos.merged) {
                        tile.classList.add('tile-merged');
                    } else {
                        tile.classList.add('tile-new');
                    }
                    
                    tile.textContent = pos.value;
                    tile.style.left = (pos.y * 106.25 + pos.y * 15) + 'px';
                    tile.style.top = (pos.x * 106.25 + pos.x * 15) + 'px';
                    tile.setAttribute('data-x', pos.x);
                    tile.setAttribute('data-y', pos.y);
                    tile.setAttribute('data-value', pos.value);
                    
                    this.tileContainer.appendChild(tile);
                }
            });
        }
        
        // 检查是否可以移动
        canMoveAny() {
            // 检查是否有空单元格
            if (this.hasEmptyCell()) {
                return true;
            }
            
            // 检查是否有可合并的方块
            for (let x = 0; x < this.gridSize; x++) {
                for (let y = 0; y < this.gridSize; y++) {
                    const value = this.grid[x][y];
                    
                    // 检查右侧
                    if (y < this.gridSize - 1 && this.grid[x][y + 1] === value) {
                        return true;
                    }
                    
                    // 检查下方
                    if (x < this.gridSize - 1 && this.grid[x + 1][y] === value) {
                        return true;
                    }
                }
            }
            
            return false;
        }
    }
    
    // 创建游戏实例
    const game = new Game2048();
});