# Kelimelik Solver

Web application that finds the best moves for the Turkish word game "Kelimelik" (similar to Scrabble). It uses a dictionary extracted from the official Turkish Language Association (TDK) API.

Live demo: https://kelimelik-solver.onrender.com/

## Features

- 15x15 board with premium squares (double/triple letter/word, center star, and custom 25-point bonus)
- Rack of up to 7 letters
- Calculates best moves considering cross-words, premiums, and 50-point bonus for using all letters
- Highlights placed tiles and shows detailed move scores

## Setup

1. Clone the repository.
2. Create a virtual environment and install dependencies:
   ```pip install -r requirements.txt```
3. Generate the dictionary (Optional as there already is a words list in this repo):
   - Fetch word list from TDK:
     ```python fetch_words.py```
   - Extract valid single words (uppercase, at least 2 letters, contains a vowel, no punctuation):
     ```python extractor.py sozluk_words.json```
   This produces ```kelimelik_words.txt``` in the project root.
4. Place ```kelimelik_words.txt``` in the ```data/``` folder (or adjust path in ```app.py```).

## Running Locally

```python app.py```
Then open http://localhost:5000.

## Deployment

The app is configured for Render. Use the provided render.yaml or manually set:
- Build command: ```pip install -r requirements.txt```
- Start command: ```gunicorn app:app```

## Structure

- app.py – Flask server, loads dictionary and serves frontend.
- solver/ – backend logic (board, dictionary trie, move generation).
- static/ – CSS and JavaScript (Vue.js frontend).
- templates/ – HTML template.
- fetch_words.py – downloads raw word list from TDK.
- extractor.py – filters and formats the word list.
- requirements.txt – Python dependencies.
- render.yaml – Render deployment configuration.

## Licence

This software is licensed using GNU AGPLv3 license. Full text is in the LICENSE.txt file. 
