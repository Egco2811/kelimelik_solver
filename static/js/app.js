const { createApp, ref, reactive, watch, nextTick } = Vue;

const SIZE = 15;
const POINTS = {
    'A':1,'B':3,'C':4,'Ç':4,'D':3,'E':1,'F':7,'G':5,'Ğ':8,'H':5,
    'I':1,'İ':2,'J':10,'K':1,'L':1,'M':2,'N':1,'O':2,'Ö':7,
    'P':5,'R':1,'S':2,'Ş':4,'T':1,'U':2,'Ü':3,'V':7,'Y':3,'Z':4
};

const LOWER_TO_UPPER = {
    'a':'A','b':'B','c':'C','ç':'Ç','d':'D','e':'E','f':'F','g':'G',
    'ğ':'Ğ','h':'H','ı':'I','i':'İ','j':'J','k':'K','l':'L','m':'M',
    'n':'N','o':'O','ö':'Ö','p':'P','r':'R','s':'S','ş':'Ş','t':'T',
    'u':'U','ü':'Ü','v':'V','y':'Y','z':'Z'
};
function turkishUpper(str) {
    return str.split('').map(c => LOWER_TO_UPPER[c] || c.toUpperCase()).join('');
}

const premiumGrid = Array(SIZE).fill().map(() => Array(SIZE).fill(''));
function setPremium(r,c,type) {
    premiumGrid[r-1][c-1] = type;
    premiumGrid[r-1][SIZE-c] = type;
    premiumGrid[SIZE-r][c-1] = type;
    premiumGrid[SIZE-r][SIZE-c] = type;
}
setPremium(1,3,'tw'); setPremium(3,1,'tw');
setPremium(2,2,'tl'); setPremium(5,5,'tl');
setPremium(1,6,'dl'); setPremium(6,1,'dl');
setPremium(2,7,'dl'); setPremium(7,2,'dl');
setPremium(6,6,'dl'); setPremium(7,7,'dl');
setPremium(8,3,'dw'); setPremium(3,8,'dw');
setPremium(4,4,'dw');
setPremium(8,8,'star');

const starCenterSVG = `<svg viewBox="0 0 100 100" style="width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg">
    <polygon points="50,10 61,35 90,35 68,55 77,90 50,70 23,90 32,55 10,35 39,35" fill="#fe9908" stroke="#fe9908" stroke-width="8" stroke-linejoin="round"/>
    <text x="50" y="54" text-anchor="middle" dominant-baseline="middle" font-size="28" font-weight="bold" fill="#f3d386" font-family="Segoe UI, sans-serif">2</text>
</svg>`;

const bonusStarSVG = `<svg viewBox="0 0 100 100" style="width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <polygon id="bstar" points="50,10 57,31 80,31 63,45 69,70 50,57 31,70 37,45 20,31 43,31" fill="#fe9908" stroke="#fe9908" stroke-width="6" stroke-linejoin="round"/>
    </defs>
    <use href="#bstar" transform="translate(25,8) scale(0.5)"/>
    <use href="#bstar" transform="translate(5,50) scale(0.5)"/>
    <use href="#bstar" transform="translate(45,50) scale(0.5)"/>
</svg>`;

function setCookie(name, value, days=365) {
    const d = new Date();
    d.setTime(d.getTime() + (days*24*60*60*1000));
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}
function getCookie(name) {
    const c = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
    return c ? decodeURIComponent(c[2]) : null;
}

let solveTimer = null;

const app = createApp({
    data() {
        return {
            board: Array(SIZE).fill().map(() => Array(SIZE).fill(null)),
            rack: [],
            cursor: { row: 8, col: 8 },
            ctxMenu: null,
            rackFocused: false,
            bonusKey: null,
            points: POINTS,

            directionMode: false,
            directionAnchor: null,
            directionOrientation: 'right',
            directionPos: 0,

            longPressTimer: null,
            longPressCell: null,
            ignoreNextClick: false,

            solving: false,
            results: [],
            highlightedMove: null,
            highlightedCells: []
        };
    },
    methods: {
        premiumType(r,c) {
            const key = `${r},${c}`;
            if (this.bonusKey === key) return 'bonus';
            return premiumGrid[r-1]?.[c-1] || '';
        },
        isBonus(r,c) { return this.bonusKey === `${r},${c}`; },
        cellClass(r,c) {
            const premium = this.premiumType(r,c);
            const classes = [];
            if (premium) classes.push(premium);
            else classes.push('empty');
            if (this.board[r-1][c-1]) classes.push('has-letter');
            if (this.cursor.row === r && this.cursor.col === c) classes.push('cursor');
            if (this.isNextCell(r,c) && !this.board[r-1][c-1]) classes.push('next-cell');
            if (this.isHighlighted(r,c)) classes.push('highlight-cell');
            if (this.isNewTile(r,c)) classes.push('new-tile');
            return classes;
        },
        isHighlighted(r,c) {
            if (!this.highlightedMove) return false;
            const m = this.highlightedMove;
            const dr = m.direction === 'down' ? 1 : 0;
            const dc = m.direction === 'right' ? 1 : 0;
            for (let i = 0; i < m.word.length; i++) {
                if (m.start_row + i*dr === r && m.start_col + i*dc === c) return true;
            }
            return false;
        },
        isNewTile(r,c) {
            return this.highlightedCells.some(cell => cell.row === r && cell.col === c);
        },
        premiumLabel(r,c) {
            const premium = this.premiumType(r,c);
            if (premium === 'tw') return '<div class="multiplier-label"><span class="mult-letter">K</span><sup>3</sup></div>';
            if (premium === 'tl') return '<div class="multiplier-label"><span class="mult-letter">H</span><sup>3</sup></div>';
            if (premium === 'dw') return '<div class="multiplier-label"><span class="mult-letter">K</span><sup>2</sup></div>';
            if (premium === 'dl') return '<div class="multiplier-label"><span class="mult-letter">H</span><sup>2</sup></div>';
            if (premium === 'star') return starCenterSVG;
            if (premium === 'bonus') return bonusStarSVG;
            return '';
        },
        isNextCell(r,c) {
            if (!this.directionMode || !this.directionAnchor) return false;
            const dr = this.directionOrientation === 'down' ? this.directionPos : 0;
            const dc = this.directionOrientation === 'right' ? this.directionPos : 0;
            const nr = this.directionAnchor.row + dr;
            const nc = this.directionAnchor.col + dc;
            return nr === r && nc === c;
        },
        clickCell(r,c) {
            if (this.ignoreNextClick) {
                this.ignoreNextClick = false;
                return;
            }
            if (this.directionMode && this.directionAnchor &&
                this.directionAnchor.row === r && this.directionAnchor.col === c) {
                if (this.directionPos === 0) {
                    this.directionOrientation = this.directionOrientation === 'right' ? 'down' : 'right';
                } else {
                    this.directionMode = false;
                    this.directionAnchor = null;
                }
            } else {
                this.directionMode = true;
                this.directionAnchor = { row: r, col: c };
                this.directionOrientation = 'right';
                this.directionPos = 0;
            }
            this.cursor = { row: r, col: c };
            this.focusBoardInput();
        },
        rightClick(r,c,event) {
            if (event) event.preventDefault();
            this.ctxMenu = { r, c, x: event ? event.clientX : 0, y: event ? event.clientY : 0 };
            if (event && event.touches) {
                this.ctxMenu.x = event.touches[0].clientX;
                this.ctxMenu.y = event.touches[0].clientY;
            }
        },
        handleTouchStart(r,c,event) {
            this.ignoreNextClick = false;
            this.longPressCell = { r, c };
            this.longPressTimer = setTimeout(() => {
                this.longPressTimer = null;
                this.ignoreNextClick = true;
                this.rightClick(r, c, event);
            }, 500);
        },
        handleTouchMove() {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
                this.longPressCell = null;
            }
        },
        handleTouchEnd(event) {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        },
        toggleBonus() {
            if (!this.ctxMenu) return;
            const key = `${this.ctxMenu.r},${this.ctxMenu.c}`;
            this.bonusKey = (this.bonusKey === key) ? null : key;
            this.ctxMenu = null;
        },
        clearCell(r,c) { this.board[r-1][c-1] = null; },
        getCellAt(pos) {
            const dr = this.directionOrientation === 'down' ? pos : 0;
            const dc = this.directionOrientation === 'right' ? pos : 0;
            return { row: this.directionAnchor.row + dr, col: this.directionAnchor.col + dc };
        },
        moveAnchorBack() {
            const a = this.directionAnchor;
            if (this.directionOrientation === 'right') {
                if (a.col > 1) { this.directionAnchor = { row: a.row, col: a.col-1 }; return true; }
            } else {
                if (a.row > 1) { this.directionAnchor = { row: a.row-1, col: a.col }; return true; }
            }
            return false;
        },
        onKey(e) {
            const key = e.key;
            if (this.directionMode && this.directionAnchor) {
                if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
                    e.preventDefault();
                    let newRow = this.cursor.row, newCol = this.cursor.col;
                    if (key === 'ArrowUp') newRow = Math.max(1, this.cursor.row - 1);
                    else if (key === 'ArrowDown') newRow = Math.min(SIZE, this.cursor.row + 1);
                    else if (key === 'ArrowLeft') newCol = Math.max(1, this.cursor.col - 1);
                    else if (key === 'ArrowRight') newCol = Math.min(SIZE, this.cursor.col + 1);
                    this.directionAnchor = { row: newRow, col: newCol };
                    this.cursor = { row: newRow, col: newCol };
                    this.directionPos = 0;
                    return;
                }
                if (key === 'Enter') {
                    e.preventDefault();
                    if (this.directionPos === 0) {
                        this.directionOrientation = this.directionOrientation === 'right' ? 'down' : 'right';
                    }
                    return;
                }
                if (key === 'Escape') {
                    e.preventDefault();
                    this.directionMode = false;
                    this.directionAnchor = null;
                    return;
                }
                if (key === ' ') {
                    e.preventDefault();
                    const nxt = this.directionPos + 1;
                    const nc = this.getCellAt(nxt);
                    if (nc.row>=1 && nc.row<=SIZE && nc.col>=1 && nc.col<=SIZE) {
                        this.directionPos = nxt;
                        this.cursor = {row:nc.row, col:nc.col};
                    }
                    return;
                }
                if (key === 'Backspace' || key === 'Delete') {
                    e.preventDefault();
                    if (this.directionPos > 0) {
                        this.directionPos--;
                        const cell = this.getCellAt(this.directionPos);
                        this.clearCell(cell.row, cell.col);
                        this.cursor = {row:cell.row, col:cell.col};
                    } else {
                        const anchor = this.getCellAt(0);
                        this.clearCell(anchor.row, anchor.col);
                        if (this.moveAnchorBack()) {
                            const na = this.directionAnchor;
                            this.cursor = {row:na.row, col:na.col};
                        }
                    }
                    return;
                }
                if (key.length === 1) {
                    const letter = turkishUpper(key);
                    if (letter in POINTS) {
                        e.preventDefault();
                        const cell = this.getCellAt(this.directionPos);
                        if (cell.row<1||cell.row>SIZE||cell.col<1||cell.col>SIZE) return;
                        this.board[cell.row-1][cell.col-1] = letter;
                        this.cursor = {row:cell.row, col:cell.col};
                        this.directionPos++;
                    }
                    return;
                }
                return;
            }

            if (key.startsWith('Arrow')) {
                e.preventDefault();
                if (key === 'ArrowUp' && this.cursor.row>1) this.cursor.row--;
                else if (key === 'ArrowDown' && this.cursor.row<SIZE) this.cursor.row++;
                else if (key === 'ArrowLeft' && this.cursor.col>1) this.cursor.col--;
                else if (key === 'ArrowRight' && this.cursor.col<SIZE) this.cursor.col++;
            } else if (key === 'Backspace' || key === 'Delete') {
                e.preventDefault();
                this.clearCell(this.cursor.row, this.cursor.col);
            } else if (key.length === 1) {
                const letter = turkishUpper(key);
                if (letter in POINTS) {
                    e.preventDefault();
                    this.board[this.cursor.row-1][this.cursor.col-1] = letter;
                }
            }
        },
        onRackKey(e) {
            const key = e.key;
            if (key === 'Backspace' || key === 'Delete') {
                e.preventDefault();
                if (this.rack.length > 0) this.rack.pop();
            } else if (key.length === 1) {
                const letter = turkishUpper(key);
                if (letter in POINTS) {
                    e.preventDefault();
                    if (this.rack.length < 7) this.rack.push(letter);
                }
            }
        },
        focusBoardInput() { this.$refs.boardInput?.focus(); },
        onBoardInputBlur() {},
        focusRackInput() { this.$refs.rackInput?.focus(); },

        triggerSolve() {
            if (solveTimer) clearTimeout(solveTimer);
            solveTimer = setTimeout(() => { this.solveBoard(); }, 400);
        },

        async solveBoard() {
            if (this.rack.length === 0) { this.results = []; this.highlightedMove = null; return; }
            this.solving = true;
            const payload = {
                board: this.board,
                rack: this.rack,
                bonus: this.bonusKey ? this.bonusKey.split(',').map(Number) : null
            };
            try {
                const res = await fetch('/solve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Sunucu hatası');
                const data = await res.json();
                this.results = data;
                this.highlightedMove = data.length > 0 ? data[0] : null;
            } catch (err) { console.error('Çözüm alınamadı:', err); }
            finally { this.solving = false; }
        },

        applyMove(move) {
            const oldBoard = this.board.map(row => [...row]);
            const dr = move.direction === 'down' ? 1 : 0;
            const dc = move.direction === 'right' ? 1 : 0;
            const newCells = [];
            for (let i = 0; i < move.word.length; i++) {
                const r = move.start_row + i*dr;
                const c = move.start_col + i*dc;
                if (!oldBoard[r-1][c-1]) newCells.push({ row: r, col: c });
                this.board[r-1][c-1] = move.word[i];
            }
            for (const lt of move.rack_used) {
                const idx = this.rack.indexOf(lt);
                if (idx !== -1) this.rack.splice(idx, 1);
            }
            this.highlightedCells = newCells;
            this.highlightedMove = move;
            this.results = [];
        },

        highlightMove(move) {
            this.highlightedMove = move;
            this.highlightedCells = [];
        },

        resizeBoard() {
        if (window.innerWidth <= 768) return;
            const leftPanel = this.$el?.querySelector('.left-panel');
        if (window.innerWidth <= 768) return;
            const boardWrapper = this.$el?.querySelector('.board-wrapper');
        if (window.innerWidth <= 768) return;
            if (!leftPanel || !boardWrapper) return;
        if (window.innerWidth <= 768) return;
            const panelWidth = leftPanel.clientWidth;
        if (window.innerWidth <= 768) return;
            const panelHeight = leftPanel.clientHeight;
        if (window.innerWidth <= 768) return;
            const rack = this.$el?.querySelector('.rack-section');
        if (window.innerWidth <= 768) return;
            const buttons = this.$el?.querySelector('.button-row');
        if (window.innerWidth <= 768) return;
            const rackH = rack ? rack.offsetHeight : 0;
        if (window.innerWidth <= 768) return;
            const btnH = buttons ? buttons.offsetHeight : 0;
        if (window.innerWidth <= 768) return;
            const usedHeight = rackH + btnH + 16;
        if (window.innerWidth <= 768) return;
            let availableHeight = panelHeight - usedHeight;
        if (window.innerWidth <= 768) return;
            if (availableHeight < 100) availableHeight = 100;
        if (window.innerWidth <= 768) return;
            const size = Math.min(panelWidth, availableHeight);
        if (window.innerWidth <= 768) return;
            boardWrapper.style.width = size + 'px';
        if (window.innerWidth <= 768) return;
            boardWrapper.style.height = size + 'px';
        if (window.innerWidth <= 768) return;
            boardWrapper.style.maxWidth = size + 'px';
        if (window.innerWidth <= 768) return;
            boardWrapper.style.maxHeight = size + 'px';
        },

        saveGame() {
            const state = { board: this.board, rack: this.rack, bonusKey: this.bonusKey };
            setCookie('kelimelik_save', JSON.stringify(state));
        },
        loadGame() {
            const saved = getCookie('kelimelik_save');
            if (saved) {
                try {
                    const state = JSON.parse(saved);
                    if (state.board && Array.isArray(state.board) && state.board.length === SIZE) this.board = state.board;
                    if (state.rack && Array.isArray(state.rack)) this.rack = state.rack.slice(0, 7);
                    if (state.bonusKey !== undefined) this.bonusKey = state.bonusKey;
                } catch(e) {}
            }
        },
        resetGame() {
            this.board = Array(SIZE).fill().map(() => Array(SIZE).fill(null));
            this.rack = [];
            this.bonusKey = null;
            this.directionMode = false;
            this.directionAnchor = null;
            this.cursor = { row: 8, col: 8 };
            this.results = [];
            this.highlightedMove = null;
            this.highlightedCells = [];
        }
    },
    mounted() {
        this.loadGame();
        this.$nextTick(() => {
            setTimeout(() => this.resizeBoard(), 100);
            setTimeout(() => this.resizeBoard(), 500);
            window.addEventListener('resize', this.resizeBoard);
            window.addEventListener('orientationchange', () => setTimeout(this.resizeBoard, 100));
            const leftPanel = this.$el?.querySelector('.left-panel');
            if (leftPanel) {
                const ro = new ResizeObserver(() => this.resizeBoard());
                ro.observe(leftPanel);
            }
            this.triggerSolve();
        });
        watch(() => this.board, this.saveGame, { deep: true });
        watch(() => this.rack, this.saveGame, { deep: true });
        watch(() => this.bonusKey, this.saveGame);
        watch(() => this.board, () => { this.highlightedCells = []; this.triggerSolve(); }, { deep: true });
        watch(() => this.rack, () => { this.highlightedCells = []; this.triggerSolve(); }, { deep: true });
        watch(() => this.bonusKey, () => { this.highlightedCells = []; this.triggerSolve(); });
        watch(() => this.rack, () => this.$nextTick(this.resizeBoard));
        watch(() => this.results, () => this.$nextTick(this.resizeBoard));
        document.addEventListener('click', (e) => {
            if (this.ctxMenu && !e.target.closest('.context-menu')) this.ctxMenu = null;
        });
    },
    unmounted() {
        window.removeEventListener('resize', this.resizeBoard);
        window.removeEventListener('orientationchange', this.resizeBoard);
    }
});

app.mount('#app');
