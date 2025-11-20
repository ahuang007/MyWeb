document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化游戏...');
    
    // 游戏配置
    const BOARD_SIZE = 15; // 15x15个交叉点（标准五子棋棋盘）
    const EMPTY = 0;
    const BLACK = 1;
    const WHITE = 2;

    // 游戏状态
    let gameBoard = [];
    let currentPlayer = BLACK; // 黑子先行
    let gameOver = false;
    let lastMove = null;
    let aiMode = true; // 默认启用AI对战模式
    let winningCells = [];

    // DOM元素
    const boardElement = document.getElementById('board');
    const currentPlayerElement = document.getElementById('current-player');
    const restartButton = document.getElementById('restart');

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

            // 创建棋盘网格线和星位点
            createBoardGrid();
            
            // 创建棋盘可点击区域（覆盖整个棋盘）
            createBoardOverlay();
            
            console.log('游戏初始化完成');
        } catch (error) {
            console.error('初始化游戏时出错:', error);
        }
    }
    
    // 创建棋盘网格线
    function createBoardGrid() {
        const boardSize = BOARD_SIZE;
        const boardWidth = boardElement.clientWidth;
        const boardHeight = boardElement.clientHeight;
        const cellSize = boardWidth / (boardSize - 1);
        
        // 创建水平线
        for (let i = 0; i < boardSize; i++) {
            const line = document.createElement('div');
            line.className = 'grid-line horizontal';
            line.style.top = (i * cellSize) + 'px';
            boardElement.appendChild(line);
        }
        
        // 创建垂直线
        for (let i = 0; i < boardSize; i++) {
            const line = document.createElement('div');
            line.className = 'grid-line vertical';
            line.style.left = (i * cellSize) + 'px';
            boardElement.appendChild(line);
        }
        
        // 创建星位点（标准五子棋星位点）
        const starPoints = [
            { x: 3, y: 3 }, { x: 3, y: 7 }, { x: 3, y: 11 },
            { x: 7, y: 3 }, { x: 7, y: 7 }, { x: 7, y: 11 },
            { x: 11, y: 3 }, { x: 11, y: 7 }, { x: 11, y: 11 }
        ];
        
        starPoints.forEach(point => {
            const star = document.createElement('div');
            star.className = 'star-point';
            star.style.left = (point.x * cellSize) + 'px';
            star.style.top = (point.y * cellSize) + 'px';
            boardElement.appendChild(star);
        });
    }
    
    // 创建棋盘可点击覆盖层
    function createBoardOverlay() {
        const boardSize = BOARD_SIZE;
        const boardWidth = boardElement.clientWidth;
        const boardHeight = boardElement.clientHeight;
        const cellSize = boardWidth / (boardSize - 1);
        
        // 创建透明的覆盖层用于点击检测
        const overlay = document.createElement('div');
        overlay.className = 'board-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.cursor = 'pointer';
        
        overlay.addEventListener('click', function(e) {
            const rect = boardElement.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // 计算点击的交叉点坐标
            const col = Math.round(x / cellSize);
            const row = Math.round(y / cellSize);
            
            console.log(`点击坐标: x=${x}, y=${y}, 行=${row}, 列=${col}`);
            
            // 检查坐标是否在有效范围内
            if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
                handleBoardClick(row, col);
            }
        });
        
        boardElement.appendChild(overlay);
    }
    
    // 处理棋盘点击事件
    function handleBoardClick(row, col) {
        console.log(`棋盘点击: 行=${row}, 列=${col}`);
        
        if (gameOver) {
            console.log('游戏已结束，忽略点击');
            return;
        }
        
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
        
        // 计算棋子位置
        const boardSize = BOARD_SIZE;
        const boardWidth = boardElement.clientWidth;
        const cellSize = boardWidth / (boardSize - 1);
        const left = col * cellSize;
        const top = row * cellSize;
        
        // 移除上一步落子的标记
        if (lastMove) {
            const lastPiece = document.querySelector('.piece.last-move');
            if (lastPiece) {
                lastPiece.classList.remove('last-move');
            }
        }
        
        // 创建棋子元素
        const piece = document.createElement('div');
        piece.className = `piece ${currentPlayer === BLACK ? 'black' : 'white'} last-move`;
        piece.style.position = 'absolute';
        piece.style.left = left + 'px';
        piece.style.top = top + 'px';
        piece.style.transform = 'translate(-50%, -50%)';
        
        boardElement.appendChild(piece);
        
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
        // 获胜棋子会自动高亮，因为它们在DOM中都有'winning'类
        // 我们只需要确保样式正确应用
        const pieces = document.querySelectorAll('.piece');
        pieces.forEach(piece => {
            piece.classList.remove('winning');
        });
        
        // 给获胜的棋子添加高亮样式
        setTimeout(() => {
            for (const cell of winningCells) {
                const boardWidth = boardElement.clientWidth;
                const cellSize = boardWidth / (BOARD_SIZE - 1);
                const left = cell.col * cellSize;
                const top = cell.row * cellSize;
                
                // 找到对应的棋子
                const pieces = document.querySelectorAll('.piece');
                pieces.forEach(piece => {
                    const style = getComputedStyle(piece);
                    const pieceLeft = parseInt(style.left);
                    const pieceTop = parseInt(style.top);
                    
                    if (pieceLeft === left && pieceTop === top) {
                        piece.classList.add('winning');
                    }
                });
            }
        }, 100);
    }
    
    // 重新开始游戏
    function restartGame() {
        initGame();
    }
    

    
    // AI落子
    function makeAiMove() {
        console.log('AI开始思考...');
        if (gameOver) {
            console.log('游戏已结束，AI不落子');
            return;
        }
        
        // 分析当前局势
        const gameAnalysis = analyzeGameState();
        console.log('游戏分析:', gameAnalysis);
        
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
    
    // 分析游戏状态
    function analyzeGameState() {
        const analysis = {
            gamePhase: getGamePhase(),
            playerThreats: evaluatePlayerThreats(),
            aiThreats: evaluateAiThreats(),
            strategicAdvantage: evaluateStrategicAdvantage(),
            recommendedStrategy: ''
        };
        
        // 根据局势推荐策略
        if (analysis.playerThreats.severe > 0) {
            analysis.recommendedStrategy = '紧急防守';
        } else if (analysis.aiThreats.winning > 0) {
            analysis.recommendedStrategy = '立即进攻';
        } else if (analysis.playerThreats.high > 0) {
            analysis.recommendedStrategy = '优先防守';
        } else if (analysis.aiThreats.high > 0) {
            analysis.recommendedStrategy = '积极进攻';
        } else if (analysis.gamePhase === 'early') {
            analysis.recommendedStrategy = '布局发展';
        } else {
            analysis.recommendedStrategy = '平衡攻防';
        }
        
        return analysis;
    }
    
    // 评估玩家威胁
    function evaluatePlayerThreats() {
        const threats = {
            severe: 0,   // 严重威胁（活四、双三）
            high: 0,     // 高级威胁（活三）
            medium: 0,   // 中级威胁（冲四）
            low: 0      // 低级威胁（活二）
        };
        
        // 检查所有空位，评估玩家可能造成的威胁
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (gameBoard[row][col] === EMPTY) {
                    // 模拟玩家落子
                    gameBoard[row][col] = BLACK;
                    
                    // 检查威胁等级
                    if (checkWinningMove(row, col, BLACK)) {
                        threats.severe++;
                    } else if (countLiveFour(row, col, BLACK) > 0) {
                        threats.severe++;
                    } else if (countDoubleThree(row, col, BLACK) >= 2) {
                        threats.severe++;
                    } else if (countLiveThree(row, col, BLACK) > 0) {
                        threats.high++;
                    } else if (countPotentialFour(row, col, BLACK, false) > 0) {
                        threats.medium++;
                    } else if (countLiveTwo(row, col, BLACK) > 1) {
                        threats.low++;
                    }
                    
                    // 撤销模拟
                    gameBoard[row][col] = EMPTY;
                }
            }
        }
        
        return threats;
    }
    
    // 评估AI威胁
    function evaluateAiThreats() {
        const threats = {
            winning: 0,  // 必胜机会
            high: 0,     // 高级威胁
            medium: 0,   // 中级威胁
            low: 0       // 低级威胁
        };
        
        // 检查所有空位，评估AI可能造成的威胁
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (gameBoard[row][col] === EMPTY) {
                    // 模拟AI落子
                    gameBoard[row][col] = WHITE;
                    
                    // 检查威胁等级
                    if (checkWinningMove(row, col, WHITE)) {
                        threats.winning++;
                    } else if (countLiveFour(row, col, WHITE) > 0) {
                        threats.high++;
                    } else if (countDoubleThree(row, col, WHITE) >= 2) {
                        threats.high++;
                    } else if (countLiveThree(row, col, WHITE) > 0) {
                        threats.medium++;
                    } else if (countPotentialFour(row, col, WHITE, false) > 0) {
                        threats.medium++;
                    } else if (countLiveTwo(row, col, WHITE) > 1) {
                        threats.low++;
                    }
                    
                    // 撤销模拟
                    gameBoard[row][col] = EMPTY;
                }
            }
        }
        
        return threats;
    }
    
    // 评估战略优势
    function evaluateStrategicAdvantage() {
        let advantage = 0;
        
        // 中心控制优势
        const centerControl = evaluateCenterControl();
        advantage += centerControl;
        
        // 连子优势
        const connectionAdvantage = evaluateConnectionAdvantage();
        advantage += connectionAdvantage;
        
        // 灵活度优势
        const flexibilityAdvantage = evaluateFlexibilityAdvantage();
        advantage += flexibilityAdvantage;
        
        return advantage;
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
                    
                    // 考虑防守优先级：如果玩家有严重威胁，优先防守
                    const defensePriority = getDefensePriority(row, col);
                    const finalScore = score + defensePriority;
                    
                    // 考虑战略价值
                    const strategicValue = evaluateStrategicPosition(row, col);
                    const enhancedScore = finalScore + strategicValue;
                    
                    // 更新最佳位置
                    if (enhancedScore > bestScore) {
                        bestScore = enhancedScore;
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

    // 评估战略位置价值
    function evaluateStrategicPosition(row, col) {
        let strategicValue = 0;
        
        // 1. 中心控制价值
        const centerDistance = Math.abs(row - BOARD_SIZE / 2) + Math.abs(col - BOARD_SIZE / 2);
        strategicValue += (BOARD_SIZE - centerDistance) * 5;
        
        // 2. 连接价值（与己方棋子连接）
        strategicValue += evaluateConnectionValue(row, col) * 20;
        
        // 3. 阻断价值（阻断对手连接）
        strategicValue += evaluateBlockingValue(row, col) * 15;
        
        // 4. 发展潜力价值
        strategicValue += evaluateDevelopmentPotential(row, col) * 10;
        
        return strategicValue;
    }
    
    // 评估连接价值
    function evaluateConnectionValue(row, col) {
        let connectionValue = 0;
        
        // 检查8个方向
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const r = row + dr;
                const c = col + dc;
                
                if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                    if (gameBoard[r][c] === WHITE) {
                        connectionValue += 2; // 连接己方棋子
                    } else if (gameBoard[r][c] === BLACK) {
                        connectionValue += 1; // 靠近对手棋子也有价值
                    }
                }
            }
        }
        
        return connectionValue;
    }
    
    // 评估阻断价值
    function evaluateBlockingValue(row, col) {
        let blockingValue = 0;
        
        // 检查对手的潜在连线
        const directions = [
            { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 }
        ];
        
        for (const dir of directions) {
            // 正向阻断
            let forwardBlock = 0;
            let r = row + dir.dr;
            let c = col + dir.dc;
            
            while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                if (gameBoard[r][c] === BLACK) {
                    forwardBlock++;
                } else if (gameBoard[r][c] === EMPTY) {
                    break;
                } else {
                    break;
                }
                r += dir.dr;
                c += dir.dc;
            }
            
            // 反向阻断
            let backwardBlock = 0;
            r = row - dir.dr;
            c = col - dir.dc;
            
            while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                if (gameBoard[r][c] === BLACK) {
                    backwardBlock++;
                } else if (gameBoard[r][c] === EMPTY) {
                    break;
                } else {
                    break;
                }
                r -= dir.dr;
                c -= dir.dc;
            }
            
            // 总阻断价值
            const totalBlock = forwardBlock + backwardBlock;
            if (totalBlock >= 2) {
                blockingValue += totalBlock * 3;
            }
        }
        
        return blockingValue;
    }
    
    // 评估发展潜力
    function evaluateDevelopmentPotential(row, col) {
        let potential = 0;
        
        // 检查周围空位
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const r = row + dr;
                const c = col + dc;
                
                if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                    if (gameBoard[r][c] === EMPTY) {
                        // 空位越多，发展潜力越大
                        const distance = Math.abs(dr) + Math.abs(dc);
                        potential += (3 - distance) * 2;
                    }
                }
            }
        }
        
        return potential;
    }

    // 获取防守优先级
    function getDefensePriority(row, col) {
        let priority = 0;
        const opponent = BLACK; // 玩家是黑子
        
        // 检查玩家是否有即将获胜的威胁
        if (hasImmediateThreat(opponent)) {
            priority += 10000; // 玩家有严重威胁，优先防守
        }
        
        // 检查此位置是否能够阻断玩家的连线
        const blockingValue = evaluateBlockingEffectiveness(row, col, opponent);
        priority += blockingValue;
        
        return priority;
    }

    // 检查是否有立即威胁（玩家即将获胜）
    function hasImmediateThreat(player) {
        // 检查玩家是否在任何位置可以立即获胜
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (gameBoard[row][col] === EMPTY) {
                    gameBoard[row][col] = player;
                    const isWinningMove = checkWinningMove(row, col, player);
                    gameBoard[row][col] = EMPTY;
                    
                    if (isWinningMove) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // 评估阻断效果
    function evaluateBlockingEffectiveness(row, col, opponent) {
        let effectiveness = 0;
        
        // 检查4个主要方向
        const directions = [
            { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 }
        ];
        
        for (const dir of directions) {
            // 检查这个位置是否能够阻断对手的连线
            const blockValue = evaluateDirectionalBlock(row, col, dir.dr, dir.dc, opponent);
            effectiveness += blockValue;
        }
        
        return effectiveness;
    }

    // 评估特定方向的阻断效果
    function evaluateDirectionalBlock(row, col, dr, dc, opponent) {
        let blockValue = 0;
        
        // 检查正向
        let forwardCount = countOpponentInDirection(row, col, dr, dc, opponent);
        
        // 检查反向
        let backwardCount = countOpponentInDirection(row, col, -dr, -dc, opponent);
        
        const totalOpponentCount = forwardCount + backwardCount;
        
        // 根据阻断的对手棋子数量评估价值
        if (totalOpponentCount >= 3) {
            blockValue += 3000; // 阻断3个连续棋子
        } else if (totalOpponentCount >= 2) {
            blockValue += 1500; // 阻断2个连续棋子
        } else if (totalOpponentCount >= 1) {
            blockValue += 500; // 阻断1个棋子
        }
        
        return blockValue;
    }

    // 计算特定方向上的对手棋子数量
    function countOpponentInDirection(row, col, dr, dc, opponent) {
        let count = 0;
        
        let r = row + dr;
        let c = col + dc;
        
        while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
            if (gameBoard[r][c] === opponent) {
                count++;
            } else if (gameBoard[r][c] !== EMPTY) {
                break; // 遇到己方棋子
            } else {
                break; // 遇到空位
            }
            r += dr;
            c += dc;
        }
        
        return count;
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
        const opponent = player === BLACK ? WHITE : BLACK;
        
        // 1. 检查是否获胜（最高优先级）
        if (checkWinningMove(row, col, player)) {
            return 100000; // 立即获胜
        }
        
        // 2. 检查是否阻止对手获胜（第二优先级）
        if (checkWinningMove(row, col, opponent)) {
            return 50000; // 阻止对手获胜
        }
        
        // 3. 检查是否创造必胜局势（双活三、活四等）
        const winningOpportunity = evaluateWinningOpportunity(row, col, player);
        if (winningOpportunity > 40000) {
            return winningOpportunity;
        }
        
        // 4. 检查对手的威胁程度
        const defensiveScore = evaluateDefensiveNeeds(row, col, player);
        
        // 5. 检查是否创造进攻机会
        const offensiveScore = evaluateOffensiveOpportunity(row, col, player);
        
        // 6. 战略平衡：智能攻防决策
        const gamePhase = getGamePhase();
        
        if (gamePhase === 'early') {
            // 早期：侧重发展和布局
            return offensiveScore * 1.2 + defensiveScore * 0.8 + evaluateStrategicValue(row, col, player);
        } else if (gamePhase === 'mid') {
            // 中期：平衡攻防
            if (offensiveScore > defensiveScore + 3000) {
                // 明显进攻机会，优先进攻
                return offensiveScore * 1.3 + defensiveScore * 0.7;
            } else if (defensiveScore > offensiveScore + 3000) {
                // 明显防守需求，优先防守
                return defensiveScore * 1.3 + offensiveScore * 0.7;
            }
            // 平衡状态
            return offensiveScore + defensiveScore + evaluateStrategicValue(row, col, player);
        } else {
            // 后期：更注重进攻获胜
            return offensiveScore * 1.4 + defensiveScore * 0.6;
        }
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

    // 评估进攻机会
    function evaluateOffensiveOpportunity(row, col, player) {
        let score = 0;
        
        // 检查是否创建活四
        if (countPotentialFour(row, col, player) >= 1) {
            score += 10000;
        }
        
        // 检查是否创建双三（两个活三）
        if (countDoubleThree(row, col, player) >= 2) {
            score += 8000;
        }
        
        // 检查是否创建活三
        if (countLiveThree(row, col, player) >= 1) {
            score += 3000;
        }
        
        // 检查是否创建冲四
        if (countPotentialFour(row, col, player, false) >= 1) {
            score += 2000;
        }
        
        // 靠近对手棋子的进攻位置加分（主动进攻）
        score += evaluateProximityToOpponent(row, col, player) * 10;
        
        return score;
    }

    // 评估防守需求
    function evaluateDefensiveNeeds(row, col, player) {
        let score = 0;
        const opponent = player === BLACK ? WHITE : BLACK;
        
        // 1. 检查对手的威胁程度
        if (checkWinningMove(row, col, opponent)) {
            return 50000; // 最高优先级防守
        }
        
        // 2. 检查对手是否创建活四
        if (countPotentialFour(row, col, opponent) >= 1) {
            score += 40000;
        }
        
        // 3. 检查对手是否创建双三（两个活三）
        const doubleThreeCount = countDoubleThree(row, col, opponent);
        if (doubleThreeCount >= 2) {
            score += 20000;
        } else if (doubleThreeCount === 1) {
            score += 15000; // 单个双三也是严重威胁
        }
        
        // 4. 检查对手是否创建活三
        if (countLiveThree(row, col, opponent) >= 1) {
            score += 12000;
        }
        
        // 5. 检查对手是否创建冲四
        if (countPotentialFour(row, col, opponent, false) >= 1) {
            score += 10000;
        }
        
        // 6. 检查对手的潜在威胁（活二、冲三等）
        const threatScore = evaluateThreatPotential(row, col, opponent);
        score += threatScore;
        
        // 7. 阻断对手连线的防守位置加分
        const blockingScore = evaluateBlockingPosition(row, col, player);
        score += blockingScore * 80; // 增加阻断位置的权重
        
        // 8. 关键防守位置额外加分（棋盘中心、交叉点等）
        if (isKeyDefensivePosition(row, col)) {
            score += 500;
        }
        
        return score;
    }

    // 计算潜在的四连珠数量
    function countPotentialFour(row, col, player, countLiveFour = true) {
        const directions = [
            { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 }
        ];
        
        let count = 0;
        
        for (const dir of directions) {
            const pattern = getPatternInDirection(row, col, dir.dr, dir.dc, player);
            if (pattern.totalCount === 4 && pattern.hasEmptyEnds) {
                count++;
            } else if (!countLiveFour && pattern.totalCount === 4) {
                count++;
            }
        }
        
        return count;
    }

    // 计算双三数量
    function countDoubleThree(row, col, player) {
        const directions = [
            { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 }
        ];
        
        let doubleThreeCount = 0;
        
        for (const dir of directions) {
            const pattern = getPatternInDirection(row, col, dir.dr, dir.dc, player);
            if (pattern.totalCount === 3 && pattern.hasEmptyEnds) {
                doubleThreeCount++;
            }
        }
        
        return Math.floor(doubleThreeCount / 2);
    }

    // 计算活三数量
    function countLiveThree(row, col, player) {
        const directions = [
            { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 }
        ];
        
        let count = 0;
        
        for (const dir of directions) {
            const pattern = getPatternInDirection(row, col, dir.dr, dir.dc, player);
            if (pattern.totalCount === 3 && pattern.hasEmptyEnds) {
                count++;
            }
        }
        
        return count;
    }

    // 获取方向上的棋型模式
    function getPatternInDirection(row, col, dr, dc, player) {
        let totalCount = 1; // 当前位置
        let hasEmptyEnds = false;
        
        // 正向检查
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
            if (gameBoard[r][c] === player) {
                totalCount++;
            } else if (gameBoard[r][c] === EMPTY) {
                hasEmptyEnds = true;
                break;
            } else {
                break;
            }
            r += dr;
            c += dc;
        }
        
        // 反向检查
        r = row - dr;
        c = col - dc;
        while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
            if (gameBoard[r][c] === player) {
                totalCount++;
            } else if (gameBoard[r][c] === EMPTY) {
                hasEmptyEnds = true;
                break;
            } else {
                break;
            }
            r -= dr;
            c -= dc;
        }
        
        return { totalCount, hasEmptyEnds };
    }

    // 评估靠近对手的位置价值
    function evaluateProximityToOpponent(row, col, player) {
        const opponent = player === BLACK ? WHITE : BLACK;
        let proximityScore = 0;
        
        // 检查周围8个方向是否有对手棋子
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const r = row + dr;
                const c = col + dc;
                
                if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                    if (gameBoard[r][c] === opponent) {
                        // 距离越近，分数越高
                        const distance = Math.abs(dr) + Math.abs(dc);
                        proximityScore += (3 - distance) * 10;
                    }
                }
            }
        }
        
        return proximityScore;
    }

    // 评估阻断位置的价值
    function evaluateBlockingPosition(row, col, player) {
        const opponent = player === BLACK ? WHITE : BLACK;
        let blockingScore = 0;
        
        // 检查4个主要方向
        const directions = [
            { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 }
        ];
        
        for (const dir of directions) {
            // 检查正向的对手棋子
            let opponentCount = 0;
            let r = row + dir.dr;
            let c = col + dir.dc;
            
            while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                if (gameBoard[r][c] === opponent) {
                    opponentCount++;
                } else if (gameBoard[r][c] === EMPTY || gameBoard[r][c] === player) {
                    break;
                }
                r += dir.dr;
                c += dir.dc;
            }
            
            // 检查反向的对手棋子
            r = row - dir.dr;
            c = col - dir.dc;
            while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                if (gameBoard[r][c] === opponent) {
                    opponentCount++;
                } else if (gameBoard[r][c] === EMPTY || gameBoard[r][c] === player) {
                    break;
                }
                r -= dir.dr;
                c -= dir.dc;
            }
            
            // 根据阻断的对手棋子数量加分
            if (opponentCount >= 2) {
                blockingScore += opponentCount * 20;
            }
        }
        
        return blockingScore;
    }

    // 评估对手的潜在威胁
    function evaluateThreatPotential(row, col, player) {
        let threatScore = 0;
        
        // 检查各个方向的威胁
        const directions = [
            { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 }
        ];
        
        for (const dir of directions) {
            // 检查正向
            let forwardThreat = analyzeThreatInDirection(row, col, dir.dr, dir.dc, player);
            
            // 检查反向
            let backwardThreat = analyzeThreatInDirection(row, col, -dir.dr, -dir.dc, player);
            
            threatScore += forwardThreat + backwardThreat;
        }
        
        return threatScore;
    }

    // 分析特定方向的威胁
    function analyzeThreatInDirection(row, col, dr, dc, player) {
        let threatScore = 0;
        let consecutiveCount = 0;
        let emptyCount = 0;
        
        let r = row + dr;
        let c = col + dc;
        
        // 检查连续棋子和空位
        while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
            if (gameBoard[r][c] === player) {
                consecutiveCount++;
            } else if (gameBoard[r][c] === EMPTY) {
                emptyCount++;
                break;
            } else {
                break;
            }
            r += dr;
            c += dc;
        }
        
        // 根据连续棋子和空位情况评估威胁
        if (consecutiveCount >= 1 && emptyCount >= 1) {
            if (consecutiveCount === 2) {
                threatScore += 800; // 活二威胁
            } else if (consecutiveCount === 1) {
                threatScore += 200; // 单子威胁
            }
        }
        
        return threatScore;
    }

    // 检查是否是关键防守位置
    function isKeyDefensivePosition(row, col) {
        // 棋盘中心区域
        const center = BOARD_SIZE / 2;
        const distanceFromCenter = Math.abs(row - center) + Math.abs(col - center);
        
        // 靠近中心的位置
        if (distanceFromCenter <= 3) {
            return true;
        }
        
        // 对手棋子周围的交叉点
        const opponent = currentPlayer === BLACK ? WHITE : BLACK;
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const r = row + dr;
                const c = col + dc;
                
                if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                    if (gameBoard[r][c] === opponent) {
                        // 检查是否是交叉点（在两个对手棋子之间）
                        if (isIntersectionPoint(row, col)) {
                            return true;
                        }
                    }
                }
            }
        }
        
        return false;
    }

    // 检查是否是交叉点（在两个对手棋子之间的位置）
    function isIntersectionPoint(row, col) {
        let crossDirections = 0;
        
        const directions = [
            { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 }
        ];
        
        for (const dir of directions) {
            const hasOpponentInDirection = checkOpponentInDirection(row, col, dir.dr, dir.dc);
            const hasOpponentInOppositeDirection = checkOpponentInDirection(row, col, -dir.dr, -dir.dc);
            
            if (hasOpponentInDirection && hasOpponentInOppositeDirection) {
                crossDirections++;
            }
        }
        
        return crossDirections >= 2; // 至少有两个方向上有对手棋子
    }

    // 检查特定方向上是否有对手棋子
    function checkOpponentInDirection(row, col, dr, dc) {
        const opponent = currentPlayer === BLACK ? WHITE : BLACK;
        
        let r = row + dr;
        let c = col + dc;
        
        while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
            if (gameBoard[r][c] === opponent) {
                return true;
            } else if (gameBoard[r][c] !== EMPTY) {
                break; // 遇到己方棋子或边界
            }
            r += dr;
            c += dc;
        }
        
        return false;
    }

    // 评估必胜局势
    function evaluateWinningOpportunity(row, col, player) {
        let score = 0;
        
        // 检查是否创造活四
        if (countLiveFour(row, col, player) >= 1) {
            score += 45000; // 创造活四，接近必胜
        }
        
        // 检查是否创造双活三
        if (countDoubleLiveThree(row, col, player) >= 2) {
            score += 43000; // 创造双活三，必胜局面
        }
        
        // 检查是否创造双活二（潜在进攻模式）
        if (countDoubleLiveTwo(row, col, player) >= 2) {
            score += 8000; // 创造良好的进攻基础
        }
        
        // 检查是否创造多重威胁
        const multiThreatScore = evaluateMultiThreat(row, col, player);
        score += multiThreatScore;
        
        return score;
    }

    // 计算活四数量
    function countLiveFour(row, col, player) {
        let count = 0;
        const directions = [
            { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 }
        ];
        
        for (const dir of directions) {
            const pattern = getPatternInDirection(row, col, dir.dr, dir.dc, player);
            if (pattern.totalCount === 4 && pattern.hasEmptyEnds) {
                count++;
            }
        }
        
        return count;
    }

    // 计算双活三数量
    function countDoubleLiveThree(row, col, player) {
        let liveThreeCount = 0;
        const directions = [
            { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 }
        ];
        
        for (const dir of directions) {
            const pattern = getPatternInDirection(row, col, dir.dr, dir.dc, player);
            if (pattern.totalCount === 3 && pattern.hasEmptyEnds) {
                liveThreeCount++;
            }
        }
        
        return liveThreeCount;
    }

    // 计算双活二数量
    function countDoubleLiveTwo(row, col, player) {
        let liveTwoCount = 0;
        const directions = [
            { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 }
        ];
        
        for (const dir of directions) {
            const pattern = getPatternInDirection(row, col, dir.dr, dir.dc, player);
            if (pattern.totalCount === 2 && pattern.hasEmptyEnds) {
                liveTwoCount++;
            }
        }
        
        return liveTwoCount;
    }

    // 评估多重威胁
    function evaluateMultiThreat(row, col, player) {
        let score = 0;
        
        // 检查不同方向的威胁组合
        const directions = [
            { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 }
        ];
        
        let threatDirections = 0;
        
        for (const dir of directions) {
            const threatValue = evaluateDirectionalThreat(row, col, dir.dr, dir.dc, player);
            if (threatValue > 0) {
                threatDirections++;
                score += threatValue;
            }
        }
        
        // 多重威胁奖励
        if (threatDirections >= 2) {
            score += threatDirections * 1000;
        }
        
        return score;
    }

    // 评估特定方向的威胁
    function evaluateDirectionalThreat(row, col, dr, dc, player) {
        let threatScore = 0;
        
        // 检查正向
        let forwardThreat = analyzeThreatInDirection(row, col, dr, dc, player);
        
        // 检查反向
        let backwardThreat = analyzeThreatInDirection(row, col, -dr, -dc, player);
        
        threatScore = forwardThreat + backwardThreat;
        
        // 连续威胁额外奖励
        if (forwardThreat > 0 && backwardThreat > 0) {
            threatScore += 500;
        }
        
        return threatScore;
    }

    // 获取游戏阶段
    function getGamePhase() {
        let pieceCount = 0;
        
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (gameBoard[row][col] !== EMPTY) {
                    pieceCount++;
                }
            }
        }
        
        if (pieceCount <= 10) {
            return 'early'; // 早期：0-10个棋子
        } else if (pieceCount <= 40) {
            return 'mid';   // 中期：11-40个棋子
        } else {
            return 'late';   // 后期：40+个棋子
        }
    }

    // 增强进攻机会评估
    function evaluateOffensiveOpportunity(row, col, player) {
        let score = 0;
        
        // 检查是否创建活四
        if (countLiveFour(row, col, player) >= 1) {
            score += 10000;
        }
        
        // 检查是否创建双三（两个活三）
        const doubleThreeCount = countDoubleThree(row, col, player);
        if (doubleThreeCount >= 2) {
            score += 8000;
        } else if (doubleThreeCount === 1) {
            score += 4000;
        }
        
        // 检查是否创建活三
        if (countLiveThree(row, col, player) >= 1) {
            score += 3000;
        }
        
        // 检查是否创建冲四
        if (countPotentialFour(row, col, player, false) >= 1) {
            score += 2000;
        }
        
        // 靠近对手棋子的进攻位置加分（主动进攻）
        score += evaluateProximityToOpponent(row, col, player) * 10;
        
        // 根据游戏阶段调整进攻权重
        const gamePhase = getGamePhase();
        if (gamePhase === 'early') {
            score *= 1.1; // 早期鼓励进攻布局
        } else if (gamePhase === 'late') {
            score *= 1.3; // 后期更注重进攻
        }
        
        return score;
    }
    
    // 评估中心控制
    function evaluateCenterControl() {
        let centerControl = 0;
        const center = Math.floor(BOARD_SIZE / 2);
        
        // 检查中心区域的控制情况
        for (let row = center - 2; row <= center + 2; row++) {
            for (let col = center - 2; col <= center + 2; col++) {
                if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
                    if (gameBoard[row][col] === WHITE) {
                        centerControl += 3; // AI控制中心位置
                    } else if (gameBoard[row][col] === BLACK) {
                        centerControl -= 2; // 玩家控制中心位置
                    }
                }
            }
        }
        
        return centerControl;
    }
    
    // 评估连接优势
    function evaluateConnectionAdvantage() {
        let connectionAdvantage = 0;
        
        // 检查AI棋子的连接情况
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (gameBoard[row][col] === WHITE) {
                    // 检查周围连接
                    connectionAdvantage += countConnectedPieces(row, col, WHITE);
                }
            }
        }
        
        return connectionAdvantage;
    }
    
    // 评估灵活度优势
    function evaluateFlexibilityAdvantage() {
        let flexibilityAdvantage = 0;
        
        // 检查AI棋子的发展潜力
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (gameBoard[row][col] === WHITE) {
                    // 检查周围空位数量
                    flexibilityAdvantage += countEmptyNeighbors(row, col);
                }
            }
        }
        
        return flexibilityAdvantage;
    }
    
    // 计算连接的棋子数量
    function countConnectedPieces(row, col, player) {
        let connectedCount = 0;
        
        // 检查8个方向
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const r = row + dr;
                const c = col + dc;
                
                if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                    if (gameBoard[r][c] === player) {
                        connectedCount += 2; // 连接的棋子加分
                    }
                }
            }
        }
        
        return connectedCount;
    }
    
    // 计算空位邻居数量
    function countEmptyNeighbors(row, col) {
        let emptyCount = 0;
        
        // 检查8个方向
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const r = row + dr;
                const c = col + dc;
                
                if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                    if (gameBoard[r][c] === EMPTY) {
                        emptyCount++;
                    }
                }
            }
        }
        
        return emptyCount;
    }
    
    // 检查是否有立即威胁
    function hasImmediateThreat(player) {
        // 检查玩家是否在任何位置可以立即获胜
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (gameBoard[row][col] === EMPTY) {
                    gameBoard[row][col] = player;
                    const isWinningMove = checkWinningMove(row, col, player);
                    gameBoard[row][col] = EMPTY;
                    
                    if (isWinningMove) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    // 评估阻断效果
    function evaluateBlockingEffectiveness(row, col, opponent) {
        let effectiveness = 0;
        
        // 检查4个主要方向
        const directions = [
            { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 }
        ];
        
        for (const dir of directions) {
            // 检查这个位置是否能够阻断对手的连线
            const blockValue = evaluateDirectionalBlock(row, col, dir.dr, dir.dc, opponent);
            effectiveness += blockValue;
        }
        
        return effectiveness;
    }
    
    // 评估特定方向的阻断效果
    function evaluateDirectionalBlock(row, col, dr, dc, opponent) {
        let blockValue = 0;
        
        // 检查正向
        let forwardCount = countOpponentInDirection(row, col, dr, dc, opponent);
        
        // 检查反向
        let backwardCount = countOpponentInDirection(row, col, -dr, -dc, opponent);
        
        const totalOpponentCount = forwardCount + backwardCount;
        
        // 根据阻断的对手棋子数量评估价值
        if (totalOpponentCount >= 3) {
            blockValue += 3000; // 阻断3个连续棋子
        } else if (totalOpponentCount >= 2) {
            blockValue += 1500; // 阻断2个连续棋子
        } else if (totalOpponentCount >= 1) {
            blockValue += 500; // 阻断1个棋子
        }
        
        return blockValue;
    }
    
    // 计算特定方向上的对手棋子数量
    function countOpponentInDirection(row, col, dr, dc, opponent) {
        let count = 0;
        
        let r = row + dr;
        let c = col + dc;
        
        while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
            if (gameBoard[r][c] === opponent) {
                count++;
            } else if (gameBoard[r][c] !== EMPTY) {
                break; // 遇到己方棋子
            } else {
                break; // 遇到空位
            }
            r += dr;
            c += dc;
        }
        
        return count;
    }
    
    // 计算活二数量
    function countLiveTwo(row, col, player) {
        let count = 0;
        const directions = [
            { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 }
        ];
        
        for (const dir of directions) {
            const pattern = getPatternInDirection(row, col, dir.dr, dir.dc, player);
            if (pattern.totalCount === 2 && pattern.hasEmptyEnds) {
                count++;
            }
        }
        
        return count;
    }
    
    // 评估防守需求
    function evaluateDefensiveNeeds(row, col, player) {
        let score = 0;
        const opponent = player === BLACK ? WHITE : BLACK;
        
        // 1. 检查对手的威胁程度
        if (checkWinningMove(row, col, opponent)) {
            return 50000; // 最高优先级防守
        }
        
        // 2. 检查对手是否创建活四
        if (countLiveFour(row, col, opponent) >= 1) {
            score += 40000;
        }
        
        // 3. 检查对手是否创建双三（两个活三）
        const doubleThreeCount = countDoubleThree(row, col, opponent);
        if (doubleThreeCount >= 2) {
            score += 20000;
        } else if (doubleThreeCount === 1) {
            score += 15000; // 单个双三也是严重威胁
        }
        
        // 4. 检查对手是否创建活三
        if (countLiveThree(row, col, opponent) >= 1) {
            score += 12000;
        }
        
        // 5. 检查对手是否创建冲四
        if (countPotentialFour(row, col, opponent, false) >= 1) {
            score += 10000;
        }
        
        // 6. 检查对手的潜在威胁（活二、冲三等）
        const threatScore = evaluateThreatPotential(row, col, opponent);
        score += threatScore;
        
        // 7. 阻断对手连线的防守位置加分
        const blockingScore = evaluateBlockingPosition(row, col, player);
        score += blockingScore * 80; // 增加阻断位置的权重
        
        // 8. 关键防守位置额外加分（棋盘中心、交叉点等）
        if (isKeyDefensivePosition(row, col)) {
            score += 500;
        }
        
        return score;
    }
    
    // 评估中心控制
    function evaluateCenterControl() {
        let centerControl = 0;
        const center = Math.floor(BOARD_SIZE / 2);
        
        // 检查中心区域的控制情况
        for (let row = center - 2; row <= center + 2; row++) {
            for (let col = center - 2; col <= center + 2; col++) {
                if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
                    if (gameBoard[row][col] === WHITE) {
                        centerControl += 3; // AI控制中心位置
                    } else if (gameBoard[row][col] === BLACK) {
                        centerControl -= 2; // 玩家控制中心位置
                    }
                }
            }
        }
        
        return centerControl;
    }
    
    // 评估连接优势
    function evaluateConnectionAdvantage() {
        let connectionAdvantage = 0;
        
        // 检查AI棋子的连接情况
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (gameBoard[row][col] === WHITE) {
                    // 检查周围连接
                    connectionAdvantage += countConnectedPieces(row, col, WHITE);
                }
            }
        }
        
        return connectionAdvantage;
    }
    
    // 评估灵活度优势
    function evaluateFlexibilityAdvantage() {
        let flexibilityAdvantage = 0;
        
        // 检查AI棋子的发展潜力
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (gameBoard[row][col] === WHITE) {
                    // 检查周围空位数量
                    flexibilityAdvantage += countEmptyNeighbors(row, col);
                }
            }
        }
        
        return flexibilityAdvantage;
    }
    
    // 计算连接的棋子数量
    function countConnectedPieces(row, col, player) {
        let connectedCount = 0;
        
        // 检查8个方向
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const r = row + dr;
                const c = col + dc;
                
                if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                    if (gameBoard[r][c] === player) {
                        connectedCount += 2; // 连接的棋子加分
                    }
                }
            }
        }
        
        return connectedCount;
    }
    
    // 计算空位邻居数量
    function countEmptyNeighbors(row, col) {
        let emptyCount = 0;
        
        // 检查8个方向
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const r = row + dr;
                const c = col + dc;
                
                if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                    if (gameBoard[r][c] === EMPTY) {
                        emptyCount++;
                    }
                }
            }
        }
        
        return emptyCount;
    }
    
    // 检查是否有立即威胁
    function hasImmediateThreat(player) {
        // 检查玩家是否在任何位置可以立即获胜
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (gameBoard[row][col] === EMPTY) {
                    gameBoard[row][col] = player;
                    const isWinningMove = checkWinningMove(row, col, player);
                    gameBoard[row][col] = EMPTY;
                    
                    if (isWinningMove) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    // 评估阻断效果
    function evaluateBlockingEffectiveness(row, col, opponent) {
        let effectiveness = 0;
        
        // 检查4个主要方向
        const directions = [
            { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 }
        ];
        
        for (const dir of directions) {
            // 检查这个位置是否能够阻断对手的连线
            const blockValue = evaluateDirectionalBlock(row, col, dir.dr, dir.dc, opponent);
            effectiveness += blockValue;
        }
        
        return effectiveness;
    }
    
    // 评估特定方向的阻断效果
    function evaluateDirectionalBlock(row, col, dr, dc, opponent) {
        let blockValue = 0;
        
        // 检查正向
        let forwardCount = countOpponentInDirection(row, col, dr, dc, opponent);
        
        // 检查反向
        let backwardCount = countOpponentInDirection(row, col, -dr, -dc, opponent);
        
        const totalOpponentCount = forwardCount + backwardCount;
        
        // 根据阻断的对手棋子数量评估价值
        if (totalOpponentCount >= 3) {
            blockValue += 3000; // 阻断3个连续棋子
        } else if (totalOpponentCount >= 2) {
            blockValue += 1500; // 阻断2个连续棋子
        } else if (totalOpponentCount >= 1) {
            blockValue += 500; // 阻断1个棋子
        }
        
        return blockValue;
    }
    
    // 计算特定方向上的对手棋子数量
    function countOpponentInDirection(row, col, dr, dc, opponent) {
        let count = 0;
        
        let r = row + dr;
        let c = col + dc;
        
        while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
            if (gameBoard[r][c] === opponent) {
                count++;
            } else if (gameBoard[r][c] !== EMPTY) {
                break; // 遇到己方棋子
            } else {
                break; // 遇到空位
            }
            r += dr;
            c += dc;
        }
        
        return count;
    }
    
    // 计算活二数量
    function countLiveTwo(row, col, player) {
        let count = 0;
        const directions = [
            { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 }
        ];
        
        for (const dir of directions) {
            const pattern = getPatternInDirection(row, col, dir.dr, dir.dc, player);
            if (pattern.totalCount === 2 && pattern.hasEmptyEnds) {
                count++;
            }
        }
        
        return count;
    }
    
    // 评估防守需求
    function evaluateDefensiveNeeds(row, col, player) {
        let score = 0;
        const opponent = player === BLACK ? WHITE : BLACK;
        
        // 1. 检查对手的威胁程度
        if (checkWinningMove(row, col, opponent)) {
            return 50000; // 最高优先级防守
        }
        
        // 2. 检查对手是否创建活四
        if (countLiveFour(row, col, opponent) >= 1) {
            score += 40000;
        }
        
        // 3. 检查对手是否创建双三（两个活三）
        const doubleThreeCount = countDoubleThree(row, col, opponent);
        if (doubleThreeCount >= 2) {
            score += 20000;
        } else if (doubleThreeCount === 1) {
            score += 15000; // 单个双三也是严重威胁
        }
        
        // 4. 检查对手是否创建活三
        if (countLiveThree(row, col, opponent) >= 1) {
            score += 12000;
        }
        
        // 5. 检查对手是否创建冲四
        if (countPotentialFour(row, col, opponent, false) >= 1) {
            score += 10000;
        }
        
        // 6. 检查对手的潜在威胁（活二、冲三等）
        const threatScore = evaluateThreatPotential(row, col, opponent);
        score += threatScore;
        
        // 7. 阻断对手连线的防守位置加分
        const blockingScore = evaluateBlockingPosition(row, col, player);
        score += blockingScore * 80; // 增加阻断位置的权重
        
        // 8. 关键防守位置额外加分（棋盘中心、交叉点等）
        if (isKeyDefensivePosition(row, col)) {
            score += 500;
        }
        
        return score;
    }
});