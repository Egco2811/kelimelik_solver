from .dictionary import Dictionary

SIZE = 15
PREMIUM = [['' for _ in range(SIZE)] for _ in range(SIZE)]

def _set(r,c,t):
    PREMIUM[r][c]=t; PREMIUM[r][SIZE-1-c]=t; PREMIUM[SIZE-1-r][c]=t; PREMIUM[SIZE-1-r][SIZE-1-c]=t

_set(0,2,'tw'); _set(2,0,'tw')
_set(1,1,'tl'); _set(4,4,'tl')
_set(0,5,'tl'); _set(5,0,'dl')
_set(1,6,'tl'); _set(6,1,'dl')
_set(5,5,'dl'); _set(6,6,'dl')
_set(7,2,'dw'); _set(2,7,'dw')
_set(3,3,'dw')
_set(7,7,'star')

POINTS = {'A':1,'B':3,'C':4,'Ç':4,'D':3,'E':1,'F':7,'G':5,'Ğ':8,'H':5,
          'I':2,'İ':1,'J':10,'K':1,'L':1,'M':2,'N':1,'O':2,'Ö':7,
          'P':5,'R':1,'S':2,'Ş':4,'T':1,'U':2,'Ü':3,'V':7,'Y':3,'Z':4}

ALLOWED_LETTERS = list(POINTS.keys())

DIRS = [(0,1,'right'), (1,0,'down')]
NEIGHBOR_DIRS = [(-1,0), (1,0), (0,-1), (0,1)]

class ScrabbleBoard:
    def __init__(self, board_state, bonus=None):
        self.board = board_state
        self.bonus = (bonus[0]-1, bonus[1]-1) if bonus else None

    def is_empty(self,r,c):
        return self.board[r][c] is None

    def get_anchors(self):
        anchors = set()
        has_tile = False
        for r in range(SIZE):
            for c in range(SIZE):
                if not self.is_empty(r,c):
                    has_tile = True
                    for dr,dc in NEIGHBOR_DIRS:
                        nr,nc = r+dr,c+dc
                        if 0<=nr<SIZE and 0<=nc<SIZE and self.is_empty(nr,nc):
                            anchors.add((nr,nc))
        if not has_tile:
            anchors.add((7,7))
        return anchors

    def _cross_word_at(self, r, c, dr, dc, board):
        sr, sc = r, c
        while sr-dr>=0 and sc-dc>=0 and board[sr-dr][sc-dc] is not None:
            sr-=dr; sc-=dc
        word = ''
        cr,cc = sr,sc
        while cr<SIZE and cc<SIZE and board[cr][cc] is not None:
            word += board[cr][cc]
            cr+=dr; cc+=dc
        return word, sr, sc

    def _score_word(self, word, start_r, start_c, dr, dc, new_mask, joker_mask):
        score = 0
        mult = 1
        for i, lt in enumerate(word):
            r = start_r + i*dr
            c = start_c + i*dc
            if joker_mask[i]:
                pt = 0
            else:
                pt = POINTS[lt]
            if new_mask[i]:
                prem = PREMIUM[r][c]
                if prem == 'dl':
                    pt *= 2
                elif prem == 'tl':
                    pt *= 3
                elif prem in ('dw', 'star'):
                    mult *= 2
                elif prem == 'tw':
                    mult *= 3
            score += pt
        return score * mult

    def generate_moves(self, rack, dictionary):
        moves = []
        rack_letters = list(rack)
        anchors = self.get_anchors()

        for r,c in anchors:
            for dr,dc,dir_name in DIRS:
                run_r, run_c = r, c
                while True:
                    pr,pc = run_r-dr, run_c-dc
                    if 0<=pr<SIZE and 0<=pc<SIZE and not self.is_empty(pr,pc):
                        run_r, run_c = pr, pc
                    else:
                        break

                anchor_offset = (r-run_r)*dr + (c-run_c)*dc

                max_left = 0
                er, ec = run_r-dr, run_c-dc
                while (0<=er<SIZE and 0<=ec<SIZE and self.is_empty(er,ec)
                       and max_left < len(rack_letters)):
                    max_left += 1
                    er -= dr; ec -= dc

                for left_len in range(max_left+1):
                    start_r = run_r - left_len*dr
                    start_c = run_c - left_len*dc
                    anchor_index = left_len + anchor_offset

                    def dfs(cr, cc, prefix, rack_left, used, new_mask, new_cells,
                            sr=start_r, sc=start_c, anchor_index=anchor_index):
                        if used and len(prefix) > anchor_index and dictionary.is_word(prefix):
                            temp_board = [row[:] for row in self.board]
                            for i, lt in enumerate(prefix):
                                row_i = sr + i*dr
                                col_i = sc + i*dc
                                temp_board[row_i][col_i] = lt

                            perp_dr, perp_dc = (1,0) if dr==0 else (0,1)
                            valid = True
                            cross_scores = 0
                            cell_to_rack = {}
                            used_idx = 0
                            for i, is_new in enumerate(new_mask):
                                if is_new:
                                    cell_to_rack[(sr + i*dr, sc + i*dc)] = used[used_idx]
                                    used_idx += 1

                            main_joker = [False] * len(prefix)
                            used_idx = 0
                            for i, is_new in enumerate(new_mask):
                                if is_new:
                                    if used[used_idx] == '?':
                                        main_joker[i] = True
                                    used_idx += 1

                            main_score = self._score_word(prefix, sr, sc, dr, dc, new_mask, main_joker)

                            for i, is_new in enumerate(new_mask):
                                if is_new:
                                    row_i = sr + i*dr
                                    col_i = sc + i*dc
                                    cross_word, cross_sr, cross_sc = self._cross_word_at(row_i, col_i, perp_dr, perp_dc, temp_board)
                                    if len(cross_word) > 1:
                                        if not dictionary.is_word(cross_word):
                                            valid = False
                                            break
                                        cross_new_mask = []
                                        cross_joker = []
                                        for j, lt in enumerate(cross_word):
                                            tr = cross_sr + j*perp_dr
                                            tc = cross_sc + j*perp_dc
                                            is_new_cell = (tr, tc) in new_cells
                                            cross_new_mask.append(is_new_cell)
                                            if is_new_cell:
                                                rack_sym = cell_to_rack.get((tr, tc))
                                                cross_joker.append(rack_sym == '?')
                                            else:
                                                cross_joker.append(False)
                                        cross_scores += self._score_word(cross_word, cross_sr, cross_sc, perp_dr, perp_dc, cross_new_mask, cross_joker)

                            if valid:
                                total = main_score + cross_scores
                                if self.bonus and self.bonus in new_cells:
                                    total += 25
                                if len(used) == 7:
                                    total += 30
                                moves.append({
                                    'word': prefix,
                                    'start_row': sr+1,
                                    'start_col': sc+1,
                                    'direction': dir_name,
                                    'score': total,
                                    'rack_used': used[:]
                                })

                        if cr >= SIZE or cc >= SIZE:
                            return

                        if not self.is_empty(cr, cc):
                            lt = self.board[cr][cc]
                            if dictionary.is_prefix(prefix + lt):
                                dfs(cr+dr, cc+dc, prefix+lt, rack_left, used, new_mask+[False], new_cells+[(cr,cc)])
                        else:
                            for i, tile in enumerate(rack_left):
                                if tile == '?':
                                    letters_to_try = ALLOWED_LETTERS
                                else:
                                    letters_to_try = [tile]
                                for letter in letters_to_try:
                                    if dictionary.is_prefix(prefix + letter):
                                        new_prefix = prefix + letter
                                        new_used = used + [tile]
                                        new_rack = rack_left[:i] + rack_left[i+1:]
                                        dfs(cr+dr, cc+dc, new_prefix, new_rack,
                                            new_used, new_mask+[True],
                                            new_cells+[(cr,cc)])

                    dfs(start_r, start_c, '', rack_letters, [], [], [])

        best = {}
        for m in moves:
            key = (m['word'], m['start_row'], m['start_col'], m['direction'])
            if key not in best or m['score'] > best[key]['score']:
                best[key] = m
        return sorted(best.values(), key=lambda x: x['score'], reverse=True)
