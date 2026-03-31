document.addEventListener('DOMContentLoaded', () => {
    const SLIDE_MS = 130; // 滑动动画时长，需与 CSS transition 一致

    class Game2048 {
        constructor() {
            this.gridSize = 4;
            this.startTiles = 2;
            this.grid = [];
            this.score = 0;
            this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
            this.over = false;
            this.won = false;
            this.canMove = true;
            this.nextId = 0;
            this._cellMetrics = null;

            this.tileContainer = document.querySelector('.tile-container');
            this.scoreContainer = document.getElementById('score');
            this.bestScoreContainer = document.getElementById('best-score');
            this.messageContainer = document.querySelector('.game-message');

            this.init();
            this.setupEventListeners();
        }

        init() {
            this.grid = this.createGrid();
            this.score = 0;
            this.over = false;
            this.won = false;
            this.canMove = true;
            this.nextId = 0;
            this._cellMetrics = null;
            this.updateScore();
            this.clearMessage();
            this.clearTiles();
            this.addStartTiles();
        }

        createGrid() {
            const g = [];
            for (let i = 0; i < this.gridSize; i++) g[i] = new Array(this.gridSize).fill(null);
            return g;
        }

        addStartTiles() {
            for (let i = 0; i < this.startTiles; i++) this.addRandomTile();
        }

        // 动态读取实际单元格尺寸，适配 PC 和移动端不同尺寸
        getCellMetrics() {
            if (this._cellMetrics) return this._cellMetrics;
            const cell = document.querySelector('.grid-cell');
            const size = cell ? cell.offsetWidth : 106.25;
            const gap  = cell ? (parseInt(getComputedStyle(cell).marginRight) || 15) : 15;
            this._cellMetrics = { size, gap };
            return this._cellMetrics;
        }

        tileLeft(col) { const { size, gap } = this.getCellMetrics(); return col * (size + gap); }
        tileTop(row)  { const { size, gap } = this.getCellMetrics(); return row * (size + gap); }

        addRandomTile() {
            if (!this.hasEmptyCell()) return;
            const value = Math.random() < 0.9 ? 2 : 4;
            const pos = this.getRandomEmptyCell();
            const id = this.nextId++;
            this.grid[pos.x][pos.y] = { value, id };
            this.createTileEl(value, id, pos.x, pos.y, 'new');
        }

        createTileEl(value, id, row, col, animClass) {
            const tile = document.createElement('div');
            const cls = value > 2048 ? 'super' : value;
            tile.classList.add('tile', `tile-${cls}`);
            if (animClass) tile.classList.add(`tile-${animClass}`);
            tile.textContent = value;
            tile.style.left = this.tileLeft(col) + 'px';
            tile.style.top  = this.tileTop(row)  + 'px';
            tile.dataset.tileId = id;
            this.tileContainer.appendChild(tile);
            return tile;
        }

        getTileEl(id) {
            return this.tileContainer.querySelector(`[data-tile-id="${id}"]`);
        }

        clearTiles() { this.tileContainer.innerHTML = ''; }

        hasEmptyCell() {
            for (let x = 0; x < this.gridSize; x++)
                for (let y = 0; y < this.gridSize; y++)
                    if (!this.grid[x][y]) return true;
            return false;
        }

        getRandomEmptyCell() {
            const cells = [];
            for (let x = 0; x < this.gridSize; x++)
                for (let y = 0; y < this.gridSize; y++)
                    if (!this.grid[x][y]) cells.push({ x, y });
            return cells[Math.floor(Math.random() * cells.length)];
        }

        updateScore() {
            this.scoreContainer.textContent = this.score;
            if (this.score > this.bestScore) {
                this.bestScore = this.score;
                this.bestScoreContainer.textContent = this.bestScore;
                localStorage.setItem('bestScore', this.bestScore);
            }
        }

        showMessage(won) {
            this.messageContainer.classList.add(won ? 'game-won' : 'game-over');
            this.messageContainer.querySelector('p').textContent = won ? '你赢了!' : '游戏结束!';
        }

        clearMessage() {
            this.messageContainer.classList.remove('game-won', 'game-over');
        }

        setupEventListeners() {
            document.addEventListener('keydown', this.handleKeyDown.bind(this));

            let touchStartX = null, touchStartY = null;
            document.addEventListener('touchstart', (e) => {
                if (e.touches.length > 1) return;
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                e.preventDefault();
            }, { passive: false });

            document.addEventListener('touchend', (e) => {
                if (touchStartX == null) return;
                const dx = e.changedTouches[0].clientX - touchStartX;
                const dy = e.changedTouches[0].clientY - touchStartY;
                touchStartX = null;
                if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
                if (Math.abs(dx) >= Math.abs(dy)) {
                    this.move(dx > 0 ? 'right' : 'left');
                } else {
                    this.move(dy > 0 ? 'down' : 'up');
                }
                e.preventDefault();
            }, { passive: false });

            document.getElementById('new-game-button').addEventListener('click', () => this.init());
            document.querySelector('.retry-button').addEventListener('click', () => this.init());
            window.addEventListener('resize', () => { this._cellMetrics = null; });
        }

        handleKeyDown(event) {
            if (this.over || !this.canMove) return;
            const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
            if (map[event.key]) { event.preventDefault(); this.move(map[event.key]); }
        }

        // 计算移动结果，返回每个方块的位移和合并信息，不修改 this.grid
        computeMove(direction) {
            const size = this.gridSize;
            const newGrid = this.createGrid();
            const tileMoves = []; // { id, fromRow, fromCol, toRow, toCol }
            const merges    = []; // { victimId, survivorId, toRow, toCol, newValue }
            let scoreAdd = 0, moved = false;
            const isVert = direction === 'up'   || direction === 'down';
            const isRev  = direction === 'down' || direction === 'right';

            for (let outer = 0; outer < size; outer++) {
                // 收集这一行/列的所有方块
                let cells = [];
                for (let inner = 0; inner < size; inner++) {
                    const row = isVert ? inner : outer;
                    const col = isVert ? outer : inner;
                    if (this.grid[row][col]) {
                        cells.push({ ...this.grid[row][col], origRow: row, origCol: col });
                    }
                }

                if (isRev) cells.reverse(); // 反转后，index 0 始终是靠近目标墙的方块

                // 合并相邻相同值的方块
                const merged = [];
                let i = 0;
                while (i < cells.length) {
                    if (i + 1 < cells.length && cells[i].value === cells[i + 1].value) {
                        merged.push({
                            value:        cells[i].value * 2,
                            id:           cells[i].id,
                            origRow:      cells[i].origRow,
                            origCol:      cells[i].origCol,
                            victimId:     cells[i + 1].id,
                            victimOrigRow: cells[i + 1].origRow,
                            victimOrigCol: cells[i + 1].origCol,
                        });
                        scoreAdd += cells[i].value * 2;
                        i += 2;
                    } else {
                        merged.push({ ...cells[i], victimId: null });
                        i++;
                    }
                }

                if (isRev) merged.reverse(); // 还原顺序后再填入 newGrid

                // 计算每个方块的目标位置
                for (let j = 0; j < merged.length; j++) {
                    const inner = isRev ? (size - merged.length + j) : j;
                    const toRow = isVert ? inner : outer;
                    const toCol = isVert ? outer : inner;

                    newGrid[toRow][toCol] = { value: merged[j].value, id: merged[j].id };

                    // 幸存方块的位移
                    if (toRow !== merged[j].origRow || toCol !== merged[j].origCol) {
                        moved = true;
                        tileMoves.push({ id: merged[j].id, fromRow: merged[j].origRow, fromCol: merged[j].origCol, toRow, toCol });
                    }

                    // 被合并方块也要滑向合并目标
                    if (merged[j].victimId != null) {
                        moved = true;
                        merges.push({
                            victimId:   merged[j].victimId,
                            survivorId: merged[j].id,
                            toRow, toCol,
                            newValue:   merged[j].value,
                        });
                        tileMoves.push({
                            id:      merged[j].victimId,
                            fromRow: merged[j].victimOrigRow,
                            fromCol: merged[j].victimOrigCol,
                            toRow, toCol,
                        });
                    }
                }
            }

            return { moved, tileMoves, merges, newGrid, scoreAdd };
        }

        move(direction) {
            if (this.over || !this.canMove) return;
            this.canMove = false;

            const { moved, tileMoves, merges, newGrid, scoreAdd } = this.computeMove(direction);

            if (!moved) {
                this.canMove = true;
                return;
            }

            // 立即更新 style.left/top，CSS transition 负责平滑滑动
            for (const mv of tileMoves) {
                const el = this.getTileEl(mv.id);
                if (el) {
                    el.style.left = this.tileLeft(mv.toCol) + 'px';
                    el.style.top  = this.tileTop(mv.toRow)  + 'px';
                }
            }

            this.grid = newGrid;

            // 滑动结束后：处理合并、更新分数、生成新方块
            setTimeout(() => {
                if (scoreAdd > 0) {
                    this.score += scoreAdd;
                    this.updateScore();
                }

                for (const m of merges) {
                    // 移除被合并的方块
                    const victim = this.getTileEl(m.victimId);
                    if (victim) victim.remove();

                    // 幸存方块更新数值并播放弹跳动画
                    const survivor = this.getTileEl(m.survivorId);
                    if (survivor) {
                        const cls = m.newValue > 2048 ? 'super' : m.newValue;
                        survivor.className = `tile tile-${cls} tile-merged`;
                        survivor.textContent = m.newValue;
                    }

                    if (m.newValue === 2048 && !this.won) {
                        this.won = true;
                        this.showMessage(true);
                    }
                }

                // 生成新方块（tile-new 动画在此时启动，节奏自然）
                this.addRandomTile();

                if (!this.canMoveAny()) {
                    this.over = true;
                    this.showMessage(false);
                }

                this.canMove = true;
            }, SLIDE_MS + 20);
        }

        canMoveAny() {
            if (this.hasEmptyCell()) return true;
            for (let x = 0; x < this.gridSize; x++) {
                for (let y = 0; y < this.gridSize; y++) {
                    const v = this.grid[x][y]?.value;
                    if (y < this.gridSize - 1 && this.grid[x][y + 1]?.value === v) return true;
                    if (x < this.gridSize - 1 && this.grid[x + 1][y]?.value === v) return true;
                }
            }
            return false;
        }
    }

    new Game2048();
});