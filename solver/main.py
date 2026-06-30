from .dictionary import load_words
from .board import ScrabbleBoard

_dictionary = None

def init_dictionary(path='kelimelik_words.txt'):
    global _dictionary
    _dictionary = load_words(path)

def find_best_moves(board_state, rack, bonus_tile, goal=None):
    board = ScrabbleBoard(board_state, bonus_tile)
    moves = board.generate_moves(rack, _dictionary)
    if goal is not None:
        goal_r, goal_c = goal[0] - 1, goal[1] - 1
        filtered = []
        for move in moves:
            dr, dc = (1, 0) if move['direction'] == 'down' else (0, 1)
            for i in range(len(move['word'])):
                r = move['start_row'] - 1 + i * dr
                c = move['start_col'] - 1 + i * dc
                if r == goal_r and c == goal_c:
                    filtered.append(move)
                    break
        moves = filtered
    return moves[:20]
