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

    
    // 棋盘静态评估（从 BLUE 视角）
    function staticEval() {
        let score = 0;
        for (let r = 0; r < BOARD_HEIGHT; r++) {
            for (let c = 0; c < BOARD_WIDTH; c++) {
                const p = board[r][c];
                if (!p) continue;
                const sign = p.player === BLUE ? 1 : -1;
                // 棋子本身价值
                score += sign * p.type.level * 150;
                // 向敌方兽穴推进价值
                const enemyDen = p.player === BLUE ? 8 : 0;
                const advance = (9 - Math.abs(r - enemyDen)) * 8;
                score += sign * advance;
                // 靠近中心列加分
                score += sign * (3 - Math.abs(c - 3)) * 5;
                // 占领陷阱周边加分（对对手的陷阱）
                if (p.player === BLUE && isTrap(r, c)) score -= 80;
                if (p.player === RED && isTrap(r, c)) score += 80;
            }
        }
        return score;
    }

    // Minimax Alpha-Beta for 斗兽棋
    function dszAlphaBeta(depth, alpha, beta, isMaximizing) {
        if (depth === 0) return staticEval();

        const player = isMaximizing ? BLUE : RED;
        const moves = getAllPossibleMoves(player);

        if (moves.length === 0) return isMaximizing ? -99999 : 99999;

        // 移动排序：优先吃子 / 进兽穴
        moves.sort((a, b) => {
            const scoreMove = (m) => {
                let s = 0;
                const target = board[m.to.row][m.to.col];
                if (target) s += target.type.level * 100;
                const enemyDen = player === BLUE ? 8 : 0;
                s += (9 - Math.abs(m.to.row - enemyDen)) * 5;
                return s;
            };
            return scoreMove(b) - scoreMove(a);
        });

        if (isMaximizing) {
            let best = -Infinity;
            for (const m of moves) {
                const saved = board[m.to.row][m.to.col];
                const attacker = board[m.from.row][m.from.col];
                const targetInTrap = isTrap(m.to.row, m.to.col);
                if (saved && !canCapture(attacker, saved, targetInTrap)) continue;
                // 胜利条件：进入对方兽穴
                if (player === BLUE && m.to.row === 8 && m.to.col === 3) return 99999 + depth;
                board[m.to.row][m.to.col] = attacker;
                board[m.from.row][m.from.col] = null;
                const s = dszAlphaBeta(depth - 1, alpha, beta, false);
                board[m.from.row][m.from.col] = attacker;
                board[m.to.row][m.to.col] = saved;
                if (s > best) best = s;
                if (s > alpha) alpha = s;
                if (beta <= alpha) break;
            }
            return best;
        } else {
            let best = Infinity;
            for (const m of moves) {
                const saved = board[m.to.row][m.to.col];
                const attacker = board[m.from.row][m.from.col];
                const targetInTrap = isTrap(m.to.row, m.to.col);
                if (saved && !canCapture(attacker, saved, targetInTrap)) continue;
                if (player === RED && m.to.row === 0 && m.to.col === 3) return -(99999 + depth);
                board[m.to.row][m.to.col] = attacker;
                board[m.from.row][m.from.col] = null;
                const s = dszAlphaBeta(depth - 1, alpha, beta, true);
                board[m.from.row][m.from.col] = attacker;
                board[m.to.row][m.to.col] = saved;
                if (s < best) best = s;
                if (s < beta) beta = s;
                if (beta <= alpha) break;
            }
            return best;
        }
    }

    // AI选择最佳移动（Minimax depth=3）
    function aiMakeMove() {
        if (gameOver || currentPlayer !== BLUE) return;

        const moves = getAllPossibleMoves(BLUE);
        if (moves.length === 0) return;

        let bestMove = null;
        let bestScore = -Infinity;

        for (const m of moves) {
            const saved = board[m.to.row][m.to.col];
            const attacker = board[m.from.row][m.from.col];
            const targetInTrap = isTrap(m.to.row, m.to.col);
            if (saved && !canCapture(attacker, saved, targetInTrap)) continue;
            // 立即获胜
            if (m.to.row === 8 && m.to.col === 3) {
                bestMove = m;
                break;
            }
            board[m.to.row][m.to.col] = attacker;
            board[m.from.row][m.from.col] = null;
            const s = dszAlphaBeta(2, -Infinity, Infinity, false);
            board[m.from.row][m.from.col] = attacker;
            board[m.to.row][m.to.col] = saved;
            if (s > bestScore) {
                bestScore = s;
                bestMove = m;
            }
        }

        if (bestMove) {
            setTimeout(() => {
                executeMove(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col, BLUE);
            }, 400);
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
                cell.addEventListener('touchend', (e) => { e.preventDefault(); handleCellClick(row, col); }, { passive: false });
                
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

