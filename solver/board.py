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

POINTS = {'A':1,'B':3,'C':3,'Ç':3,'D':3,'E':1,'F':7,'G':5,'Ğ':8,'H':4,
          'I':2,'İ':1,'J':10,'K':1,'L':1,'M':2,'N':1,'O':2,'Ö':5,
          'P':5,'R':1,'S':2,'Ş':3,'T':1,'U':2,'Ü':5,'V':4,'Y':4,'Z':4}

DIRS = [(0,1,'right'), (1,0,'down')]

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
                    for dr,dc,_ in DIRS:
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

    def _score_main(self, word, start_r, start_c, dr, dc, new_mask):
        score = 0
        mult = 1
        bonus_added = False
        for i,(lt,new) in enumerate(zip(word,new_mask)):
            r = start_r + i*dr
            c = start_c + i*dc
            pt = POINTS[lt]
            if new:
                prem = PREMIUM[r][c]
                if prem=='dl': pt*=2
                elif prem=='tl': pt*=3
                elif prem in ('dw','star'): mult*=2
                elif prem=='tw': mult*=3
                if self.bonus and (r,c)==self.bonus and not bonus_added:
                    score += 25; bonus_added = True
            score += pt
        return score*mult

    def _score_cross(self, word, start_r, start_c, dr, dc, new_positions):
        total = 0
        for i, lt in enumerate(word):
            r = start_r + i*dr
            c = start_c + i*dc
            pt = POINTS[lt]
            if (r,c) in new_positions:
                prem = PREMIUM[r][c]
                if prem=='dl': pt*=2
                elif prem=='tl': pt*=3
            total += pt
        return total

    def generate_moves(self, rack, dictionary):
        moves = []
        rack_letters = list(rack)
        anchors = self.get_anchors()

        for r,c in anchors:
            for dr,dc,dir_name in DIRS:
                # find leftmost/upmost start position
                sr,sc = r,c
                while True:
                    nr,nc = sr-dr,sc-dc
                    if 0<=nr<SIZE and 0<=nc<SIZE and not self.is_empty(nr,nc):
                        sr,sc = nr,nc
                    else:
                        break

                def dfs(cr, cc, prefix, rack_left, used, new_mask, new_cells):
                    # If we have placed at least one tile and the prefix is a valid word, record the move
                    if used and dictionary.is_word(prefix):
                        # Validate cross-words
                        temp_board = [row[:] for row in self.board]
                        for i, lt in enumerate(prefix):
                            row_i = sr + i*dr
                            col_i = sc + i*dc
                            temp_board[row_i][col_i] = lt

                        perp_dr, perp_dc = (1,0) if dr==0 else (0,1)
                        valid = True
                        cross_scores = 0
                        for i, is_new in enumerate(new_mask):
                            if is_new:
                                row_i = sr + i*dr
                                col_i = sc + i*dc
                                cross_word, cross_sr, cross_sc = self._cross_word_at(row_i, col_i, perp_dr, perp_dc, temp_board)
                                if len(cross_word) > 1:
                                    if not dictionary.is_word(cross_word):
                                        valid = False
                                        break
                                    # score cross-word, only new tiles matter
                                    cross_new_positions = set()
                                    for j, lt in enumerate(cross_word):
                                        tr = cross_sr + j*perp_dr
                                        tc = cross_sc + j*perp_dc
                                        if (tr,tc) in new_cells:
                                            cross_new_positions.add((tr,tc))
                                    cross_scores += self._score_cross(cross_word, cross_sr, cross_sc, perp_dr, perp_dc, cross_new_positions)
                        if valid:
                            main_score = self._score_main(prefix, sr, sc, dr, dc, new_mask)
                            total = main_score + cross_scores
                            if len(used) == 7:
                                total += 50
                            moves.append({
                                'word': prefix,
                                'start_row': sr+1,
                                'start_col': sc+1,
                                'direction': dir_name,
                                'score': total,
                                'rack_used': used[:]
                            })
                        # Do NOT return here; continue to try longer extensions

                    # Continue building
                    if cr >= SIZE or cc >= SIZE:
                        return

                    if not self.is_empty(cr, cc):
                        lt = self.board[cr][cc]
                        if dictionary.is_prefix(prefix + lt):
                            dfs(cr+dr, cc+dc, prefix+lt, rack_left, used, new_mask+[False], new_cells+[(cr,cc)])
                    else:
                        # Try placing rack letters, but only if we haven't exhausted all letters
                        tried = set()
                        for i, lt in enumerate(rack_left):
                            if lt in tried: continue
                            tried.add(lt)
                            new_pref = prefix + lt
                            if dictionary.is_prefix(new_pref):
                                dfs(cr+dr, cc+dc, new_pref,
                                    rack_left[:i] + rack_left[i+1:],
                                    used+[lt], new_mask+[True],
                                    new_cells+[(cr,cc)])

                dfs(sr, sc, '', rack_letters, [], [], [])

        # Deduplicate by (word, start_row, start_col, direction) keeping highest score
        best = {}
        for m in moves:
            key = (m['word'], m['start_row'], m['start_col'], m['direction'])
            if key not in best or m['score'] > best[key]['score']:
                best[key] = m
        return sorted(best.values(), key=lambda x: x['score'], reverse=True)
