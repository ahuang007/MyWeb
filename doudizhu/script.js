document.addEventListener('DOMContentLoaded', () => {
    // 卡牌定义
    const SUITS = ['♠', '♥', '♦', '♣'];
    const VALUES = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
    const JOKERS = ['小王', '大王'];
    
    // 卡牌等级（用于比较大小）
    const CARD_RANKS = {
        '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
        'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15, '小王': 16, '大王': 17
    };
    
    // 游戏状态
    let deck = [];
    let players = {
        player: [],
        ai1: [],
        ai2: []
    };
    let landlordCards = [];
    let landlord = null;
    let currentPlayer = 'player';
    let lastPlay = null;
    let gamePhase = 'waiting'; // waiting, calling, playing, finished
    
    // DOM元素
    const gameStatusEl = document.getElementById('game-status');
    const newGameBtn = document.getElementById('new-game');
    const landlordPhaseEl = document.getElementById('landlord-phase');
    const gamePhaseEl = document.getElementById('game-phase');
    const gameResultEl = document.getElementById('game-result');
    const callLandlordBtn = document.getElementById('call-landlord');
    const passCallBtn = document.getElementById('pass-call');
    const playCardsBtn = document.getElementById('play-cards');
    const passTurnBtn = document.getElementById('pass-turn');
    
    // 初始化
    newGameBtn.addEventListener('click', startNewGame);
    callLandlordBtn.addEventListener('click', () => callLandlord('player'));
    passCallBtn.addEventListener('click', () => passCall('player'));
    playCardsBtn.addEventListener('click', playCards);
    passTurnBtn.addEventListener('click', passTurn);
    document.getElementById('play-again').addEventListener('click', startNewGame);
    
    // 创建一副牌
    function createDeck() {
        const newDeck = [];
        
        // 普通牌
        for (const suit of SUITS) {
            for (const value of VALUES) {
                newDeck.push({
                    suit: suit,
                    value: value,
                    rank: CARD_RANKS[value],
                    display: value + suit,
                    color: (suit === '♥' || suit === '♦') ? 'red' : 'black'
                });
            }
        }
        
        // 大小王
        JOKERS.forEach(joker => {
            newDeck.push({
                suit: '',
                value: joker,
                rank: CARD_RANKS[joker],
                display: joker,
                color: 'red'
            });
        });
        
        return shuffleDeck(newDeck);
    }
    
    // 洗牌
    function shuffleDeck(deck) {
        const shuffled = [...deck];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    // 开始新游戏
    function startNewGame() {
        // 重置状态
        deck = createDeck();
        players = { player: [], ai1: [], ai2: [] };
        landlordCards = [];
        landlord = null;
        currentPlayer = 'player';
        lastPlay = null;
        gamePhase = 'calling';
        callCount = 0;
        selectedCards = [];
        
        // 发牌
        dealCards();
        
        // 显示叫地主阶段
        landlordPhaseEl.style.display = 'block';
        gamePhaseEl.style.display = 'none';
        gameResultEl.style.display = 'none';
        
        // 显示地主牌
        displayLandlordCards();
        
        // 显示玩家手牌
        displayPlayerCards();
        
        // 更新状态
        gameStatusEl.textContent = '叫地主阶段';
        
        // 重置AI动作显示
        updateAIAction('ai1', '等待中...');
        updateAIAction('ai2', '等待中...');
        
        // 玩家先叫
        callLandlordBtn.disabled = false;
        passCallBtn.disabled = false;
    }
    
    // 发牌
    function dealCards() {
        // 每人17张
        for (let i = 0; i < 17; i++) {
            players.player.push(deck.pop());
            players.ai1.push(deck.pop());
            players.ai2.push(deck.pop());
        }
        
        // 剩余3张作为地主牌
        landlordCards = [deck.pop(), deck.pop(), deck.pop()];
        
        // 排序
        sortCards(players.player);
        sortCards(players.ai1);
        sortCards(players.ai2);
    }
    
    // 排序手牌
    function sortCards(cards) {
        cards.sort((a, b) => a.rank - b.rank);
    }
    
    // 显示地主牌
    function displayLandlordCards() {
        const container = document.getElementById('landlord-cards');
        container.innerHTML = '';
        landlordCards.forEach(card => {
            const cardEl = createCardElement(card, false);
            container.appendChild(cardEl);
        });
    }
    
    // 显示玩家手牌
    function displayPlayerCards() {
        const container = document.getElementById('player-cards');
        container.innerHTML = '';
        players.player.forEach((card, index) => {
            const cardEl = createCardElement(card, true);
            cardEl.dataset.index = index;
            cardEl.addEventListener('click', () => toggleCardSelection(index));
            container.appendChild(cardEl);
        });
        updateCardCounts();
    }
    
    // 创建卡牌元素
    function createCardElement(card, clickable) {
        const div = document.createElement('div');
        div.className = `card ${card.color}`;
        
        if (card.value === '小王' || card.value === '大王') {
            div.textContent = card.value;
        } else {
            div.innerHTML = `
                <div class="card-value">${card.value}</div>
                <div class="card-suit">${card.suit}</div>
            `;
        }
        
        return div;
    }
    
    // 创建背面卡牌元素
    function createBackCardElement() {
        const div = document.createElement('div');
        div.className = 'card back';
        div.textContent = '?';
        return div;
    }
    
    // 切换卡牌选择
    let selectedCards = [];
    function toggleCardSelection(index) {
        if (gamePhase !== 'playing' || currentPlayer !== 'player') return;
        
        const cardEl = document.querySelector(`#player-cards .card[data-index="${index}"]`);
        if (!cardEl) return;
        
        const idx = selectedCards.indexOf(index);
        if (idx > -1) {
            selectedCards.splice(idx, 1);
            cardEl.classList.remove('selected');
        } else {
            selectedCards.push(index);
            cardEl.classList.add('selected');
        }
        
        // 更新出牌按钮状态
        playCardsBtn.disabled = selectedCards.length === 0;
    }
    
    // 叫地主
    function callLandlord(player) {
        if (player === 'player') {
            landlord = 'player';
            endCallingPhase();
        } else {
            // AI叫地主
            landlord = player;
            endCallingPhase();
        }
    }
    
    // 不叫
    let callCount = 0;
    function passCall(player) {
        callCount++;
        if (player === 'player') {
            updateAIAction('ai1', '思考中...');
            setTimeout(() => {
                const shouldCall = Math.random() > 0.4; // AI有60%概率叫地主
                if (shouldCall) {
                    updateAIAction('ai1', '叫地主');
                    callLandlord('ai1');
                } else {
                    updateAIAction('ai1', '不叫');
                    setTimeout(() => {
                        const shouldCall2 = Math.random() > 0.4;
                        if (shouldCall2) {
                            updateAIAction('ai2', '叫地主');
                            callLandlord('ai2');
                        } else {
                            updateAIAction('ai2', '不叫');
                            // 如果都不叫，玩家必须叫
                            if (callCount >= 3) {
                                landlord = 'player';
                                endCallingPhase();
                            }
                        }
                    }, 1000);
                }
            }, 1000);
        }
    }
    
    // 更新AI动作显示
    function updateAIAction(ai, action) {
        const el = document.getElementById(`${ai}-action`);
        if (el) {
            el.textContent = action;
        }
    }
    
    // 结束叫地主阶段
    function endCallingPhase() {
        gamePhase = 'playing';
        landlordPhaseEl.style.display = 'none';
        gamePhaseEl.style.display = 'block';
        
        // 地主获得3张底牌
        if (landlord === 'player') {
            players.player.push(...landlordCards);
            sortCards(players.player);
            displayPlayerCards();
        } else if (landlord === 'ai1') {
            players.ai1.push(...landlordCards);
            sortCards(players.ai1);
        } else {
            players.ai2.push(...landlordCards);
            sortCards(players.ai2);
        }
        
        // 显示玩家手牌
        displayAICards();
        
        // 更新地主显示
        const landlordNames = {
            'player': '玩家',
            'ai1': 'AI1',
            'ai2': 'AI2'
        };
        document.getElementById('landlord-display').textContent = `地主：${landlordNames[landlord]}`;
        
        // 地主先出牌
        currentPlayer = landlord;
        if (currentPlayer === 'player') {
            enablePlayerActions();
        } else {
            setTimeout(() => makeAIPlay(), 1000);
        }
        
        gameStatusEl.textContent = `当前出牌：${currentPlayer === 'player' ? '玩家' : currentPlayer}`;
    }
    
    // 显示AI手牌（背面）
    function displayAICards() {
        // AI1
        const ai1Container = document.getElementById('ai1-cards');
        ai1Container.innerHTML = '';
        for (let i = 0; i < players.ai1.length; i++) {
            ai1Container.appendChild(createBackCardElement());
        }
        
        // AI2
        const ai2Container = document.getElementById('ai2-cards');
        ai2Container.innerHTML = '';
        for (let i = 0; i < players.ai2.length; i++) {
            ai2Container.appendChild(createBackCardElement());
        }
        
        updateCardCounts();
    }
    
    // 更新卡牌数量
    function updateCardCounts() {
        document.getElementById('player-cards-count').textContent = players.player.length;
        document.getElementById('ai1-cards-count').textContent = players.ai1.length;
        document.getElementById('ai2-cards-count').textContent = players.ai2.length;
    }
    
    // 出牌
    function playCards() {
        if (selectedCards.length === 0) return;
        
        const cards = selectedCards.map(idx => players.player[idx]).sort((a, b) => a.rank - b.rank);
        const playType = getPlayType(cards);
        
        if (!playType) {
            alert('无效的出牌组合！');
            return;
        }
        
        // 检查是否能压过上家
        if (lastPlay && !canBeat(lastPlay, { type: playType, cards: cards })) {
            alert('无法压过上家的牌！');
            return;
        }
        
        // 移除手牌
        selectedCards.sort((a, b) => b - a);
        selectedCards.forEach(idx => {
            players.player.splice(idx, 1);
        });
        selectedCards = [];
        
        // 记录出牌
        lastPlay = { type: playType, cards: cards, player: 'player' };
        displayLastPlay('player', cards);
        
        // 检查是否获胜
        if (players.player.length === 0) {
            endGame('player');
            return;
        }
        
        // 切换到下一个玩家
        nextPlayer();
    }
    
    // 不要
    function passTurn() {
        if (currentPlayer !== 'player') return;
        
        // 如果上家是玩家自己，不能不要
        if (!lastPlay || lastPlay.player === 'player') {
            alert('你必须出牌！');
            return;
        }
        
        nextPlayer();
    }
    
    // 下一个玩家
    function nextPlayer() {
        const order = ['player', 'ai1', 'ai2'];
        const currentIdx = order.indexOf(currentPlayer);
        currentPlayer = order[(currentIdx + 1) % 3];
        
        // 记录连续不要的次数
        if (!window.passCount) window.passCount = 0;
        
        // 如果连续两个玩家都不要，清空上家出牌
        if (lastPlay && lastPlay.player === currentPlayer) {
            window.passCount++;
            if (window.passCount >= 2) {
                lastPlay = null;
                clearLastPlay();
                window.passCount = 0;
            }
        } else {
            window.passCount = 0;
        }
        
        gameStatusEl.textContent = `当前出牌：${currentPlayer === 'player' ? '玩家' : currentPlayer}`;
        
        if (currentPlayer === 'player') {
            enablePlayerActions();
        } else {
            disablePlayerActions();
            setTimeout(() => makeAIPlay(), 1000);
        }
    }
    
    // 启用玩家操作
    function enablePlayerActions() {
        playCardsBtn.disabled = selectedCards.length === 0;
        passTurnBtn.disabled = !lastPlay || lastPlay.player === 'player';
    }
    
    // 禁用玩家操作
    function disablePlayerActions() {
        playCardsBtn.disabled = true;
        passTurnBtn.disabled = true;
    }
    
    // AI出牌
    function makeAIPlay() {
        const ai = currentPlayer;
        const aiCards = players[ai];
        
        // 如果没有上家出牌或上家是自己，AI出最小的牌
        if (!lastPlay || lastPlay.player === ai) {
            const play = findBestPlay(aiCards, null);
            if (play) {
                // 移除手牌
                play.cards.forEach(card => {
                    const idx = aiCards.findIndex(c => c === card);
                    if (idx > -1) aiCards.splice(idx, 1);
                });
                
                lastPlay = { type: play.type, cards: play.cards, player: ai };
                displayLastPlay(ai, play.cards);
                displayAICards();
                
                // 检查是否获胜
                if (aiCards.length === 0) {
                    endGame(ai);
                    return;
                }
                
                nextPlayer();
            }
        } else {
            // 尝试压过上家
            const play = findBestPlay(aiCards, lastPlay);
            if (play && canBeat(lastPlay, { type: play.type, cards: play.cards })) {
                // 移除手牌
                play.cards.forEach(card => {
                    const idx = aiCards.findIndex(c => c === card);
                    if (idx > -1) aiCards.splice(idx, 1);
                });
                
                lastPlay = { type: play.type, cards: play.cards, player: ai };
                displayLastPlay(ai, play.cards);
                displayAICards();
                
                // 检查是否获胜
                if (aiCards.length === 0) {
                    endGame(ai);
                    return;
                }
                
                nextPlayer();
            } else {
                // 不要
                updateAILastPlay(ai, '不要');
                nextPlayer();
            }
        }
    }
    
    // 显示上家出牌
    function displayLastPlay(player, cards) {
        const area = document.getElementById('last-play-cards');
        area.innerHTML = '';
        
        if (cards && cards.length > 0) {
            cards.forEach(card => {
                const cardEl = createCardElement(card, false);
                area.appendChild(cardEl);
            });
        }
        
        updateAILastPlay(player, cards ? `${cards.length}张` : '不要');
    }
    
    // 更新AI上家出牌显示
    function updateAILastPlay(player, text) {
        const el = document.getElementById(`${player}-last-play`);
        if (el) {
            el.textContent = text;
        }
    }
    
    // 清空上家出牌
    function clearLastPlay() {
        document.getElementById('last-play-cards').innerHTML = '';
        updateAILastPlay('player', '');
        updateAILastPlay('ai1', '');
        updateAILastPlay('ai2', '');
    }
    
    // 获取出牌类型
    function getPlayType(cards) {
        if (cards.length === 0) return null;
        if (cards.length === 1) return 'single';
        if (cards.length === 2) {
            if (cards[0].rank === cards[1].rank) return 'pair';
            return null;
        }
        if (cards.length === 3) {
            if (cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank) {
                return 'triple';
            }
            return null;
        }
        if (cards.length === 4) {
            // 可能是炸弹或三带一
            const ranks = cards.map(c => c.rank);
            if (ranks[0] === ranks[1] && ranks[1] === ranks[2] && ranks[2] === ranks[3]) {
                return 'bomb';
            }
            if (ranks[0] === ranks[1] && ranks[1] === ranks[2]) {
                return 'triple_with_one';
            }
            if (ranks[1] === ranks[2] && ranks[2] === ranks[3]) {
                return 'triple_with_one';
            }
            return null;
        }
        // 顺子（5张或以上连续单张）
        if (cards.length >= 5) {
            const ranks = cards.map(c => c.rank);
            let isStraight = true;
            for (let i = 1; i < ranks.length; i++) {
                if (ranks[i] !== ranks[i-1] + 1 || ranks[i] >= 15) {
                    isStraight = false;
                    break;
                }
            }
            if (isStraight) return 'straight';
        }
        return null;
    }
    
    // 判断能否压过
    function canBeat(last, current) {
        if (!last) return true;
        
        // 炸弹可以压过任何非炸弹
        if (current.type === 'bomb' && last.type !== 'bomb') return true;
        if (last.type === 'bomb' && current.type !== 'bomb') return false;
        
        // 类型必须相同
        if (current.type !== last.type) return false;
        
        // 比较大小
        const lastRank = getPlayRank(last.cards);
        const currentRank = getPlayRank(current.cards);
        
        return currentRank > lastRank;
    }
    
    // 获取出牌的主牌等级
    function getPlayRank(cards) {
        if (cards.length === 0) return 0;
        
        const type = getPlayType(cards);
        if (type === 'single') return cards[0].rank;
        if (type === 'pair') return cards[0].rank;
        if (type === 'triple') return cards[0].rank;
        if (type === 'triple_with_one') {
            // 找到三张相同的
            const ranks = cards.map(c => c.rank);
            for (let i = 0; i < ranks.length - 2; i++) {
                if (ranks[i] === ranks[i+1] && ranks[i+1] === ranks[i+2]) {
                    return ranks[i];
                }
            }
        }
        if (type === 'straight') return cards[0].rank;
        if (type === 'bomb') return cards[0].rank;
        
        return 0;
    }
    
    // AI找最佳出牌
    function findBestPlay(cards, lastPlay) {
        if (!lastPlay) {
            // 出最小的单张
            return { type: 'single', cards: [cards[0]] };
        }
        
        // 尝试找到能压过的牌
        const sortedCards = [...cards].sort((a, b) => a.rank - b.rank);
        
        // 简单策略：找能压过的最小牌
        if (lastPlay.type === 'single') {
            for (const card of sortedCards) {
                if (card.rank > getPlayRank(lastPlay.cards)) {
                    return { type: 'single', cards: [card] };
                }
            }
        } else if (lastPlay.type === 'pair') {
            for (let i = 0; i < sortedCards.length - 1; i++) {
                if (sortedCards[i].rank === sortedCards[i+1].rank && 
                    sortedCards[i].rank > getPlayRank(lastPlay.cards)) {
                    return { type: 'pair', cards: [sortedCards[i], sortedCards[i+1]] };
                }
            }
        }
        
        return null;
    }
    
    // 结束游戏
    function endGame(winner) {
        gamePhase = 'finished';
        disablePlayerActions();
        
        const isLandlordWin = (winner === landlord);
        const resultTitle = document.getElementById('result-title');
        
        if (winner === 'player') {
            resultTitle.textContent = isLandlordWin ? '恭喜！地主获胜！' : '恭喜！农民获胜！';
        } else {
            resultTitle.textContent = isLandlordWin ? '地主获胜！' : '农民获胜！';
        }
        
        gamePhaseEl.style.display = 'none';
        gameResultEl.style.display = 'block';
    }
});
