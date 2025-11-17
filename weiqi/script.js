class WeiqiGame {
    constructor() {
        this.boardSize = 19;
        this.gridSize = 0;
        this.cellSize = 0;
        this.currentPlayer = 'black'; // 黑子先行
        this.board = [];
        this.stones = [];
        this.blackCaptures = 0;
        this.whiteCaptures = 0;
        this.lastMove = null;
        this.passCount = 0;
        this.gameOver = false;
        
        this.init();
    }

    init() {
        this.createBoard();
        this.setupEventListeners();
        this.updateDisplay();
    }

    createBoard() {
        const board = document.getElementById('board');
        board.innerHTML = '';
        
        // 计算网格大小
        const boardWidth = board.offsetWidth;
        this.cellSize = boardWidth / (this.boardSize - 1);
        this.gridSize = this.cellSize * (this.boardSize - 1);
        
        // 创建棋盘网格线
        for (let i = 0; i < this.boardSize; i++) {
            // 水平线
            const hLine = document.createElement('div');
            hLine.className = 'grid-line horizontal';
            hLine.style.top = `${i * this.cellSize}px`;
            board.appendChild(hLine);
            
            // 垂直线
            const vLine = document.createElement('div');
            vLine.className = 'grid-line vertical';
            vLine.style.left = `${i * this.cellSize}px`;
            board.appendChild(vLine);
        }
        
        // 创建星位点
        const starPoints = [3, 9, 15];
        for (const x of starPoints) {
            for (const y of starPoints) {
                const starPoint = document.createElement('div');
                starPoint.className = 'star-point';
                starPoint.style.left = `${x * this.cellSize}px`;
                starPoint.style.top = `${y * this.cellSize}px`;
                board.appendChild(starPoint);
            }
        }
        
        // 初始化棋盘状态
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(null));
        this.stones = [];
    }

    setupEventListeners() {
        const board = document.getElementById('board');
        board.addEventListener('click', (e) => this.handleBoardClick(e));
        
        document.getElementById('restart').addEventListener('click', () => this.restart());
        document.getElementById('pass').addEventListener('click', () => this.pass());
        document.getElementById('resign').addEventListener('click', () => this.resign());
    }

    handleBoardClick(e) {
        if (this.gameOver) return;
        
        const rect = e.target.getBoundingClientRect();
        const x = Math.round((e.clientX - rect.left) / this.cellSize);
        const y = Math.round((e.clientY - rect.top) / this.cellSize);
        
        if (x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize) {
            this.placeStone(x, y);
        }
    }

    placeStone(x, y) {
        if (this.board[y][x] !== null) return; // 该位置已有棋子
        
        // 创建临时棋子检查是否合法
        const tempBoard = JSON.parse(JSON.stringify(this.board));
        tempBoard[y][x] = this.currentPlayer;
        
        // 检查自杀规则
        if (!this.hasLiberties(x, y, tempBoard)) {
            // 检查能否提子
            const canCapture = this.checkCapture(x, y, tempBoard);
            if (!canCapture) {
                alert('禁着点：不能自杀！');
                return;
            }
        }
        
        // 检查劫争规则
        if (this.isKo(x, y, tempBoard)) {
            alert('劫争：不能立即提劫！');
            return;
        }
        
        // 落子
        this.board[y][x] = this.currentPlayer;
        this.lastMove = {x, y, player: this.currentPlayer};
        this.passCount = 0;
        
        // 提子
        const capturedStones = this.captureStones(x, y);
        
        // 更新得分
        if (this.currentPlayer === 'black') {
            this.blackCaptures += capturedStones.length;
        } else {
            this.whiteCaptures += capturedStones.length;
        }
        
        // 切换玩家
        this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
        
        this.updateDisplay();
    }

    hasLiberties(x, y, board = this.board) {
        const visited = new Set();
        return this.checkLiberties(x, y, board, visited);
    }

    checkLiberties(x, y, board, visited) {
        if (x < 0 || x >= this.boardSize || y < 0 || y >= this.boardSize) return false;
        if (visited.has(`${x},${y}`)) return false;
        
        visited.add(`${x},${y}`);
        
        if (board[y][x] === null) return true; // 空位
        if (board[y][x] !== this.currentPlayer) return false; // 对方棋子
        
        // 检查四个方向
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dx, dy] of directions) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < this.boardSize && ny >= 0 && ny < this.boardSize) {
                if (this.checkLiberties(nx, ny, board, visited)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    checkCapture(x, y, board) {
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dx, dy] of directions) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < this.boardSize && ny >= 0 && ny < this.boardSize) {
                if (board[ny][nx] && board[ny][nx] !== this.currentPlayer) {
                    if (!this.hasLiberties(nx, ny, board)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    captureStones(x, y) {
        const captured = [];
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        for (const [dx, dy] of directions) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < this.boardSize && ny >= 0 && ny < this.boardSize) {
                if (this.board[ny][nx] && this.board[ny][nx] !== this.currentPlayer) {
                    const group = this.getGroup(nx, ny);
                    if (!this.hasAnyLiberties(group)) {
                        captured.push(...group);
                        // 提子
                        for (const stone of group) {
                            this.board[stone.y][stone.x] = null;
                        }
                    }
                }
            }
        }
        
        return captured;
    }

    getGroup(x, y, visited = new Set()) {
        if (x < 0 || x >= this.boardSize || y < 0 || y >= this.boardSize) return [];
        const key = `${x},${y}`;
        if (visited.has(key)) return [];
        
        visited.add(key);
        const color = this.board[y][x];
        if (!color) return [];
        
        const group = [{x, y, color}];
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        for (const [dx, dy] of directions) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < this.boardSize && ny >= 0 && ny < this.boardSize) {
                if (this.board[ny][nx] === color) {
                    group.push(...this.getGroup(nx, ny, visited));
                }
            }
        }
        
        return group;
    }

    hasAnyLiberties(group) {
        for (const stone of group) {
            if (this.hasLiberties(stone.x, stone.y)) {
                return true;
            }
        }
        return false;
    }

    isKo(x, y, tempBoard) {
        // 简单的劫争检查：不能立即提回单个棋子
        const captured = this.captureStones(x, y);
        if (captured.length === 1) {
            const lastMove = this.lastMove;
            if (lastMove && captured[0].x === lastMove.x && captured[0].y === lastMove.y) {
                return true;
            }
        }
        return false;
    }

    pass() {
        this.passCount++;
        this.lastMove = null;
        this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
        
        if (this.passCount >= 2) {
            this.endGame();
        }
        
        this.updateDisplay();
    }

    resign() {
        const winner = this.currentPlayer === 'black' ? '白方' : '黑方';
        alert(`${winner}获胜！`);
        this.gameOver = true;
        this.updateDisplay();
    }

    endGame() {
        // 简单的胜负判断
        const blackScore = this.blackCaptures;
        const whiteScore = this.whiteCaptures;
        
        let winner = '';
        if (blackScore > whiteScore) {
            winner = '黑方';
        } else if (whiteScore > blackScore) {
            winner = '白方';
        } else {
            winner = '平局';
        }
        
        alert(`游戏结束！${winner}获胜！`);
        this.gameOver = true;
    }

    restart() {
        this.currentPlayer = 'black';
        this.blackCaptures = 0;
        this.whiteCaptures = 0;
        this.lastMove = null;
        this.passCount = 0;
        this.gameOver = false;
        
        this.createBoard();
        this.updateDisplay();
    }

    updateDisplay() {
        // 更新当前玩家显示
        document.getElementById('current-player').textContent = 
            this.currentPlayer === 'black' ? '黑子' : '白子';
        
        // 更新得分显示
        document.getElementById('black-captures').textContent = this.blackCaptures;
        document.getElementById('white-captures').textContent = this.whiteCaptures;
        
        // 清空棋盘上的棋子
        const stones = document.querySelectorAll('.stone');
        stones.forEach(stone => stone.remove());
        
        // 绘制棋子
        const board = document.getElementById('board');
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (this.board[y][x]) {
                    const stone = document.createElement('div');
                    stone.className = `stone ${this.board[y][x]}`;
                    stone.style.left = `${x * this.cellSize}px`;
                    stone.style.top = `${y * this.cellSize}px`;
                    
                    // 高亮显示最后一步
                    if (this.lastMove && this.lastMove.x === x && this.lastMove.y === y) {
                        stone.classList.add('highlight');
                    }
                    
                    board.appendChild(stone);
                }
            }
        }
        
        // 更新按钮状态
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            if (this.gameOver && button.id !== 'restart') {
                button.disabled = true;
            } else {
                button.disabled = false;
            }
        });
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    new WeiqiGame();
});