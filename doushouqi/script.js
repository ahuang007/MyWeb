document.addEventListener('DOMContentLoaded', () => {
    // 游戏配置
    const BOARD_WIDTH = 7;
    const BOARD_HEIGHT = 9;
    
    // 棋子类型和等级
    const PIECE_TYPES = {
        ELEPHANT: { name: '象', level: 8, emoji: '🐘' },
        LION: { name: '狮', level: 7, emoji: '🦁' },
        TIGER: { name: '虎', level: 6, emoji: '🐅' },
        LEOPARD: { name: '豹', level: 5, emoji: '🐆' },
        WOLF: { name: '狼', level: 4, emoji: '🐺' },
        DOG: { name: '狗', level: 3, emoji: '🐕' },
        CAT: { name: '猫', level: 2, emoji: '🐱' },
        MOUSE: { name: '鼠', level: 1, emoji: '🐭' }
    };
    
    const RED = 'red';
    const BLUE = 'blue';
    
    // 游戏状态
    let board = [];
    let currentPlayer = RED;
    let selectedPiece = null;
    let gameOver = false;
    
    // DOM元素
    const boardElement = document.getElementById('board');
    const currentPlayerElement = document.getElementById('current-player');
    const restartButton = document.getElementById('restart');
    
    // 初始化棋盘
    function initBoard() {
        board = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null));
        
        // 初始化红方（下方）棋子
        const redPieces = [
            { type: PIECE_TYPES.ELEPHANT, row: 8, col: 0 },
            { type: PIECE_TYPES.LION, row: 8, col: 6 },
            { type: PIECE_TYPES.TIGER, row: 8, col: 1 },
            { type: PIECE_TYPES.LEOPARD, row: 8, col: 5 },
            { type: PIECE_TYPES.WOLF, row: 8, col: 2 },
            { type: PIECE_TYPES.DOG, row: 8, col: 4 },
            { type: PIECE_TYPES.CAT, row: 7, col: 1 },
            { type: PIECE_TYPES.MOUSE, row: 7, col: 5 }
        ];
        
        // 初始化蓝方（上方）棋子
        const bluePieces = [
            { type: PIECE_TYPES.ELEPHANT, row: 0, col: 6 },
            { type: PIECE_TYPES.LION, row: 0, col: 0 },
            { type: PIECE_TYPES.TIGER, row: 0, col: 5 },
            { type: PIECE_TYPES.LEOPARD, row: 0, col: 1 },
            { type: PIECE_TYPES.WOLF, row: 0, col: 4 },
            { type: PIECE_TYPES.DOG, row: 0, col: 2 },
            { type: PIECE_TYPES.CAT, row: 1, col: 5 },
            { type: PIECE_TYPES.MOUSE, row: 1, col: 1 }
        ];
        
        redPieces.forEach(p => {
            board[p.row][p.col] = { type: p.type, player: RED };
        });
        
        bluePieces.forEach(p => {
            board[p.row][p.col] = { type: p.type, player: BLUE };
        });
    }
    
    // 检查是否是陷阱
    function isTrap(row, col) {
        const traps = [
            { row: 2, col: 2 }, { row: 2, col: 4 },
            { row: 6, col: 2 }, { row: 6, col: 4 }
        ];
        return traps.some(t => t.row === row && t.col === col);
    }
    
    // 检查是否是兽穴
    function isDen(row, col, player) {
        if (player === RED) {
            return row === 0 && col === 3; // 蓝方兽穴
        } else {
            return row === 8 && col === 3; // 红方兽穴
        }
    }
    
    // 检查是否是河流
    function isWater(row, col) {
        return (row >= 3 && row <= 5) && (col === 1 || col === 2 || col === 4 || col === 5);
    }
    
    // 检查是否可以移动（支持指定玩家）
    function canMove(fromRow, fromCol, toRow, toCol, player = null) {
        const piece = board[fromRow][fromCol];
        const checkPlayer = player !== null ? player : currentPlayer;
        if (!piece || piece.player !== checkPlayer) return false;
        
        // 检查目标位置是否在棋盘内
        if (toRow < 0 || toRow >= BOARD_HEIGHT || toCol < 0 || toCol >= BOARD_WIDTH) {
            return false;
        }
        
        // 不能移动到自己的兽穴
        if (isDen(toRow, toCol, checkPlayer)) {
            return false;
        }
        
        // 检查目标位置是否有己方棋子
        const targetPiece = board[toRow][toCol];
        if (targetPiece && targetPiece.player === checkPlayer) {
            return false;
        }
        
        const type = piece.type;
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        
        // 狮和虎可以横向跳过河
        if ((type === PIECE_TYPES.LION || type === PIECE_TYPES.TIGER) && 
            rowDiff === 0 && colDiff > 1) {
            // 横向跳河：检查路径是否跨越河流
            const minCol = Math.min(fromCol, toCol);
            const maxCol = Math.max(fromCol, toCol);
            
            // 检查路径是否经过河流区域（列1,2,4,5）
            let hasWater = false;
            let allWater = true;
            for (let c = minCol + 1; c < maxCol; c++) {
                if (isWater(fromRow, c)) {
                    hasWater = true;
                    // 检查河中是否有鼠阻挡
                    if (board[fromRow][c] && board[fromRow][c].type === PIECE_TYPES.MOUSE) {
                        return false;
                    }
                } else {
                    allWater = false;
                }
            }
            
            // 如果路径经过河流且路径上的河流区域连续，允许跳河
            if (hasWater && allWater) {
                return true;
            }
        }
        
        // 普通移动：只能走一格（上下左右）
        if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
            // 检查河流规则
            if (isWater(toRow, toCol)) {
                // 只有鼠可以进入水中
                if (type !== PIECE_TYPES.MOUSE) {
                    return false;
                }
            }
            
            // 如果从水中出来，检查是否有其他棋子阻挡
            if (isWater(fromRow, fromCol) && !isWater(toRow, toCol)) {
                // 鼠从水中出来是允许的
                return true;
            }
            
            return true;
        }
        
        return false;
    }
    
    // 检查是否可以吃子
    function canCapture(attacker, defender, defenderInTrap) {
        if (!defender) return true; // 目标位置为空
        
        // 如果防守方在陷阱中，任何棋子都可以吃
        if (defenderInTrap) {
            return true;
        }
        
        // 特殊规则：鼠可以吃象
        if (attacker.type === PIECE_TYPES.MOUSE && defender.type === PIECE_TYPES.ELEPHANT) {
            return true;
        }
        
        // 特殊规则：象不能吃鼠（除非鼠在陷阱中）
        if (attacker.type === PIECE_TYPES.ELEPHANT && defender.type === PIECE_TYPES.MOUSE) {
            return false;
        }
        
        // 等级高的可以吃等级低的
        return attacker.type.level >= defender.type.level;
    }
    
    // 获取有效移动位置（支持指定玩家）
    function getValidMoves(row, col, player = null) {
        const validMoves = [];
        const checkPlayer = player !== null ? player : currentPlayer;
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        // 检查普通移动
        directions.forEach(([dr, dc]) => {
            const newRow = row + dr;
            const newCol = col + dc;
            if (canMove(row, col, newRow, newCol, checkPlayer)) {
                validMoves.push({ row: newRow, col: newCol });
            }
        });
        
        // 检查狮和虎的横向跳河
        const piece = board[row][col];
        if (piece && (piece.type === PIECE_TYPES.LION || piece.type === PIECE_TYPES.TIGER)) {
            // 横向跳河（只能横向）
            for (let c = 0; c < BOARD_WIDTH; c++) {
                if (c !== col && canMove(row, col, row, c, checkPlayer)) {
                    validMoves.push({ row: row, col: c });
                }
            }
        }
        
        return validMoves;
    }
    
    // 获取所有可能的移动（用于AI）
    function getAllPossibleMoves(player) {
        const moves = [];
        for (let row = 0; row < BOARD_HEIGHT; row++) {
            for (let col = 0; col < BOARD_WIDTH; col++) {
                const piece = board[row][col];
                if (piece && piece.player === player) {
                    const validMoves = getValidMoves(row, col, player);
                    validMoves.forEach(move => {
                        moves.push({
                            from: { row, col },
                            to: move,
                            piece: piece
                        });
                    });
                }
            }
        }
        return moves;
    }
    
    // 评估移动的价值
    function evaluateMove(move, player) {
        let score = 0;
        const { from, to, piece } = move;
        const targetPiece = board[to.row][to.col];
        const targetInTrap = isTrap(to.row, to.col);
        
        // 1. 占领对方兽穴（获胜）- 最高优先级
        // 红方要占领蓝方兽穴(0, 3)，蓝方要占领红方兽穴(8, 3)
        if ((player === RED && to.row === 0 && to.col === 3) || 
            (player === BLUE && to.row === 8 && to.col === 3)) {
            score += 10000;
            return score;
        }
        
        // 2. 吃子价值
        if (targetPiece && targetPiece.player !== player) {
            if (canCapture(piece, targetPiece, targetInTrap)) {
                // 根据被吃棋子的等级给分
                score += targetPiece.type.level * 100;
                // 如果吃的是高价值棋子，额外加分
                if (targetPiece.type.level >= 6) {
                    score += 200;
                }
            }
        }
        
        // 3. 保护己方重要棋子（如果移动后不会被吃）
        const originalPiece = board[from.row][from.col];
        // 临时执行移动来检查安全性
        board[to.row][to.col] = originalPiece;
        board[from.row][from.col] = null;
        
        // 检查移动后的位置是否安全
        const isSafe = !isThreatened(to.row, to.col, player);
        if (isSafe && piece.type.level >= 6) {
            score += 50;
        } else if (!isSafe && piece.type.level >= 6) {
            score -= 100; // 重要棋子被威胁，减分
        }
        
        // 恢复棋盘
        board[from.row][from.col] = originalPiece;
        board[to.row][to.col] = targetPiece;
        
        // 4. 向对方兽穴推进
        const enemyDenRow = player === RED ? 0 : 8;
        const distanceToDen = Math.abs(to.row - enemyDenRow);
        score += (9 - distanceToDen) * 10;
        
        // 5. 避免进入陷阱（除非有好处）
        if (isTrap(to.row, to.col)) {
            if (!targetPiece || !canCapture(piece, targetPiece, true)) {
                score -= 30; // 进入陷阱有风险
            }
        }
        
        // 6. 控制中心区域
        if (to.col === 3) {
            score += 20;
        }
        
        return score;
    }
    
    // 检查位置是否被威胁（会被对方吃掉）
    function isThreatened(row, col, player) {
        const enemyPlayer = player === RED ? BLUE : RED;
        for (let r = 0; r < BOARD_HEIGHT; r++) {
            for (let c = 0; c < BOARD_WIDTH; c++) {
                const piece = board[r][c];
                if (piece && piece.player === enemyPlayer) {
                    const validMoves = getValidMoves(r, c, enemyPlayer);
                    for (const move of validMoves) {
                        if (move.row === row && move.col === col) {
                            const targetPiece = board[row][col];
                            const targetInTrap = isTrap(row, col);
                            if (canCapture(piece, targetPiece, targetInTrap)) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }
    
    // AI选择最佳移动
    function aiMakeMove() {
        if (gameOver || currentPlayer !== BLUE) return;
        
        const possibleMoves = getAllPossibleMoves(BLUE);
        if (possibleMoves.length === 0) {
            // 没有可移动的棋子，游戏结束
            return;
        }
        
        // 评估所有移动并选择最佳
        let bestMove = null;
        let bestScore = -Infinity;
        
        possibleMoves.forEach(move => {
            const score = evaluateMove(move, BLUE);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        });
        
        if (bestMove) {
            // 延迟一下，让玩家看到AI的思考过程
            setTimeout(() => {
                executeMove(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col, BLUE);
            }, 500);
        }
    }
    
    // 执行移动（统一移动逻辑）
    function executeMove(fromRow, fromCol, toRow, toCol, player) {
        const targetPiece = board[toRow][toCol];
        const targetInTrap = isTrap(toRow, toCol);
        const attacker = board[fromRow][fromCol];
        
        // 检查是否可以吃子
        if (targetPiece && !canCapture(attacker, targetPiece, targetInTrap)) {
            return false;
        }
        
        // 检查是否占领了对方兽穴
        // 红方要占领蓝方兽穴(0, 3)，蓝方要占领红方兽穴(8, 3)
        if ((player === RED && toRow === 0 && toCol === 3) || 
            (player === BLUE && toRow === 8 && toCol === 3)) {
            gameOver = true;
            showWinner(player);
        }
        
        // 执行移动
        board[toRow][toCol] = board[fromRow][fromCol];
        board[fromRow][fromCol] = null;
        
        // 切换玩家
        currentPlayer = currentPlayer === RED ? BLUE : RED;
        selectedPiece = null;
        
        updateStatus();
        renderBoard();
        
        // 如果是AI的回合，继续AI移动
        if (currentPlayer === BLUE && !gameOver) {
            setTimeout(aiMakeMove, 300);
        }
        
        return true;
    }
    
    // 渲染棋盘
    function renderBoard() {
        boardElement.innerHTML = '';
        
        for (let row = 0; row < BOARD_HEIGHT; row++) {
            for (let col = 0; col < BOARD_WIDTH; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // 添加特殊格子样式
                if (isTrap(row, col)) {
                    cell.classList.add('trap');
                }
                if (isDen(row, col, RED) || isDen(row, col, BLUE)) {
                    cell.classList.add('den');
                }
                if (isWater(row, col)) {
                    cell.classList.add('water');
                }
                
                // 添加棋子
                const piece = board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `piece ${piece.player}`;
                    pieceElement.textContent = piece.type.emoji;
                    pieceElement.title = piece.type.name;
                    cell.appendChild(pieceElement);
                }
                
                // 添加点击事件
                cell.addEventListener('click', () => handleCellClick(row, col));
                
                boardElement.appendChild(cell);
            }
        }
        
        // 高亮选中的棋子
        if (selectedPiece) {
            const cell = boardElement.querySelector(
                `[data-row="${selectedPiece.row}"][data-col="${selectedPiece.col}"]`
            );
            if (cell) {
                cell.classList.add('selected');
            }
            
            // 高亮有效移动位置
            const validMoves = getValidMoves(selectedPiece.row, selectedPiece.col);
            validMoves.forEach(move => {
                const moveCell = boardElement.querySelector(
                    `[data-row="${move.row}"][data-col="${move.col}"]`
                );
                if (moveCell) {
                    moveCell.classList.add('valid-move');
                }
            });
        }
    }
    
    // 处理格子点击
    function handleCellClick(row, col) {
        if (gameOver) return;
        
        // 如果是AI的回合，不允许玩家操作
        if (currentPlayer === BLUE) return;
        
        const piece = board[row][col];
        
        // 如果点击了己方棋子，选择它
        if (piece && piece.player === currentPlayer) {
            selectedPiece = { row, col };
            renderBoard();
            return;
        }
        
        // 如果已经选择了棋子，尝试移动
        if (selectedPiece) {
            if (canMove(selectedPiece.row, selectedPiece.col, row, col)) {
                if (!executeMove(selectedPiece.row, selectedPiece.col, row, col, currentPlayer)) {
                    alert('不能吃这个棋子！');
                    selectedPiece = null;
                    renderBoard();
                }
                // executeMove内部已经处理了AI移动的触发
            } else {
                // 无效移动，取消选择
                selectedPiece = null;
                renderBoard();
            }
        }
    }
    
    // 更新状态显示
    function updateStatus() {
        if (currentPlayerElement) {
            if (currentPlayer === BLUE) {
                currentPlayerElement.textContent = '蓝方（AI思考中...）';
            } else {
                currentPlayerElement.textContent = '红方（你的回合）';
            }
        }
    }
    
    // 显示获胜消息
    function showWinner(winner) {
        const message = document.createElement('div');
        message.className = 'winner-message';
        message.innerHTML = `
            <h2>🎉 ${winner === RED ? '红方' : '蓝方'}获胜！</h2>
            <button onclick="location.reload()">再来一局</button>
        `;
        document.body.appendChild(message);
    }
    
    // 重新开始游戏
    function restartGame() {
        initBoard();
        currentPlayer = RED;
        selectedPiece = null;
        gameOver = false;
        updateStatus();
        renderBoard();
        
        // 移除获胜消息
        const winnerMessage = document.querySelector('.winner-message');
        if (winnerMessage) {
            winnerMessage.remove();
        }
    }
    
    // 事件监听
    if (restartButton) {
        restartButton.addEventListener('click', restartGame);
    }
    
    // 初始化游戏
    initBoard();
    updateStatus();
    renderBoard();
});

