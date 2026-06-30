from flask import Flask, request, jsonify, render_template
from solver.main import find_best_moves, init_dictionary
import os

app = Flask(__name__)

DICT_PATH = os.path.join(os.path.dirname(__file__), 'data', 'kelimelik_words.txt')
init_dictionary(DICT_PATH)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/solve', methods=['POST'])
def solve():
    data = request.json
    board = data.get('board')
    rack = data.get('rack', [])
    bonus = data.get('bonus')
    goal = data.get('goal')  # [row, col] 1-indexed, or None
    if board is None:
        return jsonify({'error': 'Board missing'}), 400
    moves = find_best_moves(board, rack, bonus, goal)
    return jsonify(moves)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
