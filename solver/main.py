from .dictionary import load_words
from .board import ScrabbleBoard

_dictionary = None

def init_dictionary(path='kelimelik_words.txt'):
    global _dictionary
    _dictionary = load_words(path)

def find_best_moves(board_state, rack, bonus_tile):
    board = ScrabbleBoard(board_state, bonus_tile)
    moves = board.generate_moves(rack, _dictionary)
    # Return top 20 moves
    return moves[:20]
