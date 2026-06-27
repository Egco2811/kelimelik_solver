const { createApp, ref, reactive } = Vue;

const SIZE = 15;
const POINTS = {
    'A':1,'B':3,'C':3,'Ç':3,'D':3,'E':1,'F':7,'G':5,'Ğ':8,'H':4,
    'I':2,'İ':1,'J':10,'K':1,'L':1,'M':2,'N':1,'O':2,'Ö':5,
    'P':5,'R':1,'S':2,'Ş':3,'T':1,'U':2,'Ü':5,'V':4,'Y':4,'Z':4
};

const premiumGrid = Array(SIZE).fill().map(() => Array(SIZE).fill(''));
function setPremium(r,c,type) {
    premiumGrid[r-1][c-1] = type;
    premiumGrid[r-1][SIZE-c] = type;
    premiumGrid[SIZE-r][c-1] = type;
    premiumGrid[SIZE-r][SIZE-c] = type;
}
setPremium(1,3,'tw'); setPremium(3,1,'tw');
setPremium(2,2,'tl'); setPremium(5,5,'tl');
setPremium(1,6,'tl'); setPremium(6,1,'dl');
setPremium(2,7,'tl'); setPremium(7,2,'dl');
setPremium(6,6,'dl'); setPremium(7,7,'dl');
setPremium(8,3,'dw'); setPremium(3,8,'dw');
setPremium(4,4,'dw');
setPremium(8,8,'star');

// Centre star – large orange star with white "2" on background #f3d386
const starCenterSVG = `<svg viewBox="0 0 100 100" style="width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg">
    <polygon points="50,10 61,35 90,35 68,55 77,90 50,70 23,90 32,55 10,35 39,35" fill="#fe9908" stroke="#fe9908" stroke-width="8" stroke-linejoin="round"/>
    <text x="50" y="54" text-anchor="middle" dominant-baseline="middle" font-size="28" font-weight="bold" fill="#f3d386" font-family="Segoe UI, sans-serif">2</text>
</svg>`;

// Bonus tile – three orange stars forming a symmetrical triangle
const bonusStarSVG = `<svg viewBox="0 0 100 100" style="width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <polygon id="bstar" points="50,10 57,31 80,31 63,45 69,70 50,57 31,70 37,45 20,31 43,31" fill="#fe9908" stroke="#fe9908" stroke-width="6" stroke-linejoin="round"/>
    </defs>
    <!-- top star centred -->
    <use href="#bstar" transform="translate(25,8) scale(0.5)"/>
    <!-- bottom stars centred symmetrically -->
    <use href="#bstar" transform="translate(5,50) scale(0.5)"/>
    <use href="#bstar" transform="translate(45,50) scale(0.5)"/>
</svg>`;

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
            directionPos: 0
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
            if (this.cursor.row === r && this.cursor.col === c) classes.push('cursor');
            if (this.isNextCell(r,c) && !this.board[r-1][c-1]) classes.push('next-cell');
            return classes;
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
            this.focusBoard();
        },
        rightClick(r,c,event) {
            event.preventDefault();
            this.ctxMenu = { r, c, x: event.clientX, y: event.clientY };
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
                if (key.startsWith('Arrow')) {
                    e.preventDefault();
                    this.directionMode = false;
                    this.directionAnchor = null;
                } else if (key === ' ') {
                    e.preventDefault();
                    const nxt = this.directionPos+1;
                    const nc = this.getCellAt(nxt);
                    if (nc.row>=1 && nc.row<=SIZE && nc.col>=1 && nc.col<=SIZE) {
                        this.directionPos = nxt;
                        this.cursor = {row:nc.row, col:nc.col};
                    }
                    return;
                } else if (key === 'Backspace' || key === 'Delete') {
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
                } else if (key.length === 1 && key.toUpperCase() in POINTS) {
                    e.preventDefault();
                    const letter = key.toUpperCase();
                    const cell = this.getCellAt(this.directionPos);
                    if (cell.row<1||cell.row>SIZE||cell.col<1||cell.col>SIZE) return;
                    this.board[cell.row-1][cell.col-1] = letter;
                    this.cursor = {row:cell.row, col:cell.col};
                    this.directionPos++;
                    return;
                } else if (key === 'Escape') {
                    this.directionMode = false;
                    this.directionAnchor = null;
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
            } else if (key.length === 1 && key.toUpperCase() in POINTS) {
                e.preventDefault();
                this.board[this.cursor.row-1][this.cursor.col-1] = key.toUpperCase();
            }
        },
        onRackKey(e) {
            const key = e.key;
            if (key === 'Backspace' || key === 'Delete') {
                e.preventDefault();
                if (this.rack.length > 0) this.rack.pop();
            } else if (key.length === 1 && key.toUpperCase() in POINTS) {
                e.preventDefault();
                if (this.rack.length < 7) this.rack.push(key.toUpperCase());
            }
        },
        focusRack() { this.$el.querySelector('.rack-input-container')?.focus(); },
        focusBoard() { this.$el.querySelector('.board-wrapper')?.focus(); }
    },
    mounted() {
        document.addEventListener('click', (e) => {
            if (this.ctxMenu && !e.target.closest('.context-menu')) this.ctxMenu = null;
        });
    }
});

app.mount('#app');
