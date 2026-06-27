from flask import Flask, render_template, request, jsonify
from solver.main import init_dictionary, find_best_moves

app = Flask(__name__)

# Load the dictionary at startup (runs when this module is imported by gunicorn)
init_dictionary('data/kelimelik_words.txt')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/solve', methods=['POST'])
def solve():
    data = request.json
    board_state = data['board']
    rack = data['rack']
    bonus_tile = data.get('bonus')
    moves = find_best_moves(board_state, rack, bonus_tile)
    return jsonify(moves)

if __name__ == '__main__':
    # In development, Flask’s dev server will also use this block
    app.run(debug=True, host='0.0.0.0')
