document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化游戏...');
    
    // 游戏配置
    const BOARD_SIZE = 14; // 14x14的交叉点（15x15的格子减去1）
    const EMPTY = 0;
    const BLACK = 1;
    const WHITE = 2;

    // 游戏状态
    let gameBoard = [];
    let currentPlayer = BLACK; // 黑子先行
    let gameOver = false;
    let lastMove = null;
    let aiMode = false;
    let winningCells = [];

    // DOM元素
    const boardElement = document.getElementById('board');
    const currentPlayerElement = document.getElementById('current-player');
    const restartButton = document.getElementById('restart');
    const playerModeButton = document.getElementById('player-mode');
    const aiModeButton = document.getElementById('ai-mode');

    // 检查DOM元素是否存在
    if (!boardElement) {
        console.error('找不到棋盘元素！');
        return;
    }
    if (!currentPlayerElement) {
        console.error('找不到当前玩家显示元素！');
    }
    if (!restartButton) {
        console.error('找不到重新开始按钮！');
    }
    if (!playerModeButton) {
        console.error('找不到人人对战按钮！');
    }
    if (!aiModeButton) {
        console.error('找不到人机对战按钮！');
    }

    // 初始化游戏
    initGame();

    // 事件监听
    if (restartButton) {
        restartButton.addEventListener('click', function(e) {
            console.log('重新开始按钮被点击');
            e.preventDefault(); // 阻止默认行为
            restartGame();
        });
    }
    
    if (playerModeButton) {
        playerModeButton.addEventListener('click', function(e) {
            console.log('人人对战按钮被点击');
            e.preventDefault(); // 阻止默认行为
            setGameMode(false);
        });
    }
    
    if (aiModeButton) {
        aiModeButton.addEventListener('click', function(e) {
            console.log('人机对战按钮被点击');
            e.preventDefault(); // 阻止默认行为
            setGameMode(true);
        });
    }

    // 初始化游戏
    function initGame() {
        console.log('初始化游戏...');
        try {
            // 清空棋盘
            boardElement.innerHTML = '';
            gameBoard = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(EMPTY));
            currentPlayer = BLACK;
            gameOver = false;
            lastMove = null;
            winningCells = [];

            // 更新显示
            updateCurrentPlayerDisplay();

            // 创建棋盘格子
            for (let row = 0; row < BOARD_SIZE; row++) {
                for (let col = 0; col < BOARD_SIZE; col++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';

                    // 添加边缘类，用于正确显示网格线
                    if (row === 0) cell.classList.add('top-edge');
                    if (row === BOARD_SIZE - 1) cell.classList.add('bottom-edge');
                    if (col === 0) cell.classList.add('left-edge');
                    if (col === BOARD_SIZE - 1) cell.classList.add('right-edge');

                    cell.dataset.row = row;
                    cell.dataset.col = col;
                    cell.addEventListener('click', function(e) {
                        console.log(`单元格点击: 行=${row}, 列=${col}`);
                        handleCellClick(e);
                    });
                    boardElement.appendChild(cell);
                }
            }
            
            // 确保游戏模式按钮状态正确
            if (playerModeButton && aiModeButton) {
                playerModeButton.classList.toggle('active', !aiMode);
                aiModeButton.classList.toggle('active', aiMode);
            }
            
            console.log('游戏初始化完成');
        } catch (error) {
            console.error('初始化游戏时出错:', error);
        }
    }

    // 处理格子点击事件
    function handleCellClick(event) {
        console.log('处理单元格点击事件...');
        
        if (gameOver) {
            console.log('游戏已结束，忽略点击');
            return;
        }

        // 获取单元格元素（无论点击的是单元格还是其中的棋子）
        let cellElement = event.target;
        while (cellElement && !cellElement.classList.contains('cell')) {
            cellElement = cellElement.parentElement;
        }
        
        if (!cellElement) {
            console.error('无法找到单元格元素');
            return;
        }
        
        const row = parseInt(cellElement.dataset.row);
        const col = parseInt(cellElement.dataset.col);
        
        console.log(`点击位置: 行=${row}, 列=${col}`);
        
        // 检查是否可以在此位置落子
        if (gameBoard[row][col] !== EMPTY) {
            console.log('该位置已有棋子，忽略点击');
            return;
        }
        
        // 落子
        console.log(`玩家落子: 行=${row}, 列=${col}`);
        placePiece(row, col);
        
        // 如果游戏没有结束且是AI模式，让AI落子
        if (!gameOver && aiMode && currentPlayer === WHITE) {
            console.log('AI模式下轮到AI落子');
            setTimeout(makeAiMove, 500); // 延迟500ms，让玩家看清自己的落子
        }
    }
    
    // 落子
    function placePiece(row, col) {
        console.log(`放置${currentPlayer === BLACK ? '黑' : '白'}子在 行=${row}, 列=${col}`);
        gameBoard[row][col] = currentPlayer;
        
        // 更新上一步落子位置
        if (lastMove) {
            const lastCell = document.querySelector(`[data-row="${lastMove.row}"][data-col="${lastMove.col}"]`);
            const lastPiece = lastCell.querySelector('.piece');
            if (lastPiece) {
                lastPiece.classList.remove('last-move');
            }
        }
        
        // 创建棋子元素
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        const piece = document.createElement('div');
        piece.className = `piece ${currentPlayer === BLACK ? 'black' : 'white'} last-move`;
        cell.appendChild(piece);
        
        // 记录最后一步
        lastMove = { row, col };
        
        // 检查胜负
        if (checkWin(row, col)) {
            gameOver = true;
            highlightWinningCells();
            // 使用DOM元素显示结果，而不是alert
            currentPlayerElement.textContent = `${currentPlayer === BLACK ? '黑子' : '白子'}获胜！`;
            console.log(`${currentPlayer === BLACK ? '黑子' : '白子'}获胜！`);
            return;
        }
        
        // 检查平局
        if (checkDraw()) {
            gameOver = true;
            // 使用DOM元素显示结果，而不是alert
            currentPlayerElement.textContent = '平局！';
            console.log('游戏结束，平局！');
            return;
        }
        
        // 切换玩家
        currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
        updateCurrentPlayerDisplay();
        console.log(`切换到${currentPlayer === BLACK ? '黑' : '白'}子回合`);
    }
    
    // 更新当前玩家显示
    function updateCurrentPlayerDisplay() {
        currentPlayerElement.textContent = currentPlayer === BLACK ? '黑子' : '白子';
    }
    
    // 检查是否获胜
    function checkWin(row, col) {
        const directions = [
            { dr: 0, dc: 1 },  // 水平
            { dr: 1, dc: 0 },  // 垂直
            { dr: 1, dc: 1 },  // 对角线 /
            { dr: 1, dc: -1 }  // 对角线 \
        ];
        
        for (const dir of directions) {
            const count = countConsecutive(row, col, dir.dr, dir.dc) + 
                          countConsecutive(row, col, -dir.dr, -dir.dc) - 1;
            
            if (count >= 5) {
                // 记录获胜的棋子位置
                winningCells = [];
                for (let i = 0; i < count; i++) {
                    const r = row + dir.dr * i;
                    const c = col + dir.dc * i;
                    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && gameBoard[r][c] === currentPlayer) {
                        winningCells.push({ row: r, col: c });
                    }
                }
                for (let i = 1; i < count; i++) {
                    const r = row - dir.dr * i;
                    const c = col - dir.dc * i;
                    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && gameBoard[r][c] === currentPlayer) {
                        winningCells.push({ row: r, col: c });
                    }
                }
                return true;
            }
        }
        
        return false;
    }
    
    // 计算连续棋子数量
    function countConsecutive(row, col, dr, dc) {
        const player = gameBoard[row][col];
        let count = 1;
        let r = row + dr;
        let c = col + dc;
        
        while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && gameBoard[r][c] === player) {
            count++;
            r += dr;
            c += dc;
        }
        
        return count;
    }
    
    // 检查是否平局
    function checkDraw() {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (gameBoard[row][col] === EMPTY) {
                    return false;
                }
            }
        }
        return true;
    }
    
    // 高亮获胜的棋子
    function highlightWinningCells() {
        for (const cell of winningCells) {
            const cellElement = document.querySelector(`[data-row="${cell.row}"][data-col="${cell.col}"]`);
            const pieceElement = cellElement.querySelector('.piece');
            if (pieceElement) {
                pieceElement.classList.add('winning');
            }
        }
    }
    
    // 重新开始游戏
    function restartGame() {
        initGame();
    }
    
    // 设置游戏模式
    function setGameMode(isAiMode) {
        console.log(`设置游戏模式: ${isAiMode ? 'AI模式' : '人人对战模式'}`);
        aiMode = isAiMode;
        playerModeButton.classList.toggle('active', !aiMode);
        aiModeButton.classList.toggle('active', aiMode);
        
        // 重新开始游戏
        restartGame();
        
        // 如果切换到AI模式且当前是白子回合，让AI落子
        if (aiMode && currentPlayer === WHITE && !gameOver) {
            console.log('AI模式下白子回合，AI准备落子...');
            setTimeout(makeAiMove, 500);
        }
    }
    
    // AI落子
    function makeAiMove() {
        console.log('AI开始思考...');
        if (gameOver) {
            console.log('游戏已结束，AI不落子');
            return;
        }
        
        // 获取最佳落子位置
        const bestMove = findBestMove();
        console.log(`AI决定落子在: 行=${bestMove ? bestMove.row : 'undefined'}, 列=${bestMove ? bestMove.col : 'undefined'}`);
        
        // 落子
        if (bestMove) {
            placePiece(bestMove.row, bestMove.col);
        } else {
            console.error('AI无法找到合适的落子位置');
        }
    }
    
    // 找到最佳落子位置
    function findBestMove() {
        console.log('AI正在寻找最佳落子位置...');
        let bestScore = -Infinity;
        let bestMove = null;
        
        // 如果是AI第一步，优先考虑中心位置
        if (isFirstMove()) {
            const center = Math.floor(BOARD_SIZE / 2);
            if (gameBoard[center][center] === EMPTY) {
                console.log('AI选择中心位置');
                return { row: center, col: center };
            }
        }
        
        // 评估每个空位置
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (gameBoard[row][col] === EMPTY) {
                    // 模拟落子
                    gameBoard[row][col] = WHITE;
                    
                    // 评估此位置
                    const score = evaluatePosition(row, col, WHITE);
                    
                    // 撤销模拟
                    gameBoard[row][col] = EMPTY;
                    
                    // 更新最佳位置
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = { row, col };
                    }
                }
            }
        }
        
        // 如果没有找到最佳位置，随机选择一个空位置
        if (!bestMove) {
            console.log('AI没有找到最佳位置，随机选择一个空位置');
            bestMove = getRandomEmptyCell();
        }
        
        console.log(`AI选择位置: 行=${bestMove.row}, 列=${bestMove.col}, 分数=${bestScore}`);
        return bestMove;
    }
    
    // 检查是否是AI的第一步
    function isFirstMove() {
        let emptyCount = 0;
        let blackCount = 0;
        
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (gameBoard[row][col] === EMPTY) {
                    emptyCount++;
                } else if (gameBoard[row][col] === BLACK) {
                    blackCount++;
                }
            }
        }
        
        // 如果只有一个黑子，说明是AI的第一步
        return blackCount === 1 && emptyCount === BOARD_SIZE - 1;
    }
    
    // 获取随机空位置
    function getRandomEmptyCell() {
        const emptyCells = [];
        
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (gameBoard[row][col] === EMPTY) {
                    emptyCells.push({ row, col });
                }
            }
        }
        
        if (emptyCells.length === 0) {
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * emptyCells.length);
        return emptyCells[randomIndex];
    }
    
    // 评估位置分数
    function evaluatePosition(row, col, player) {
        // 检查是否获胜
        if (checkWinningMove(row, col, player)) {
            return 10000; // 非常高的分数，表示获胜
        }
        
        // 检查是否阻止对手获胜
        const opponent = player === BLACK ? WHITE : BLACK;
        if (checkWinningMove(row, col, opponent)) {
            return 5000; // 高分，表示阻止对手获胜
        }
        
        // 评估此位置的战略价值
        return evaluateStrategicValue(row, col, player);
    }
    
    // 检查是否是获胜的一步
    function checkWinningMove(row, col, player) {
        const directions = [
            { dr: 0, dc: 1 },  // 水平
            { dr: 1, dc: 0 },  // 垂直
            { dr: 1, dc: 1 },  // 对角线 /
            { dr: 1, dc: -1 }  // 对角线 \
        ];
        
        for (const dir of directions) {
            const count = countConsecutiveForPlayer(row, col, dir.dr, dir.dc, player) + 
                          countConsecutiveForPlayer(row, col, -dir.dr, -dir.dc, player) - 1;
            
            if (count >= 5) {
                return true;
            }
        }
        
        return false;
    }
    
    // 计算特定玩家的连续棋子数量
    function countConsecutiveForPlayer(row, col, dr, dc, player) {
        let count = 1;
        let r = row + dr;
        let c = col + dc;
        
        while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && gameBoard[r][c] === player) {
            count++;
            r += dr;
            c += dc;
        }
        
        return count;
    }
    
    // 评估位置的战略价值
    function evaluateStrategicValue(row, col, player) {
        let score = 0;
        
        // 方向：水平、垂直、对角线/、对角线\
        const directions = [
            { dr: 0, dc: 1 },
            { dr: 1, dc: 0 },
            { dr: 1, dc: 1 },
            { dr: 1, dc: -1 }
        ];
        
        // 对每个方向评分
        for (const dir of directions) {
            score += evaluateDirection(row, col, dir.dr, dir.dc, player);
        }
        
        // 棋盘中心位置加分
        const centerDistance = Math.abs(row - BOARD_SIZE / 2) + Math.abs(col - BOARD_SIZE / 2);
        score += (BOARD_SIZE - centerDistance) * 2;
        
        return score;
    }
    
    // 评估特定方向的战略价值
    function evaluateDirection(row, col, dr, dc, player) {
        const opponent = player === BLACK ? WHITE : BLACK;
        let score = 0;
        
        // 检查连续的己方棋子
        let ownCount = 1;
        let emptyBefore = false;
        let emptyAfter = false;
        
        // 检查前方
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
            if (gameBoard[r][c] === player) {
                ownCount++;
            } else if (gameBoard[r][c] === EMPTY) {
                emptyAfter = true;
                break;
            } else {
                break;
            }
            r += dr;
            c += dc;
        }
        
        // 检查后方
        r = row - dr;
        c = col - dc;
        while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
            if (gameBoard[r][c] === player) {
                ownCount++;
            } else if (gameBoard[r][c] === EMPTY) {
                emptyBefore = true;
                break;
            } else {
                break;
            }
            r -= dr;
            c -= dc;
        }
        
        // 根据连续棋子数量和两端是否有空位评分
        if (ownCount >= 5) {
            score += 10000; // 五连珠
        } else if (ownCount === 4) {
            if (emptyBefore && emptyAfter) {
                score += 2000; // 活四
            } else if (emptyBefore || emptyAfter) {
                score += 500; // 冲四
            }
        } else if (ownCount === 3) {
            if (emptyBefore && emptyAfter) {
                score += 200; // 活三
            } else if (emptyBefore || emptyAfter) {
                score += 50; // 冲三
            }
        } else if (ownCount === 2) {
            if (emptyBefore && emptyAfter) {
                score += 20; // 活二
            } else if (emptyBefore || emptyAfter) {
                score += 5; // 冲二
            }
        }
        
        return score;
    }
});