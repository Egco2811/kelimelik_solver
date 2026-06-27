#!/usr/bin/env python3
import sys
import re
import json

# Turkish uppercase letters valid for Scrabble
VALID_LETTERS = set('ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ')
WORD_RE = re.compile(r'^[ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]+$')

def is_valid_word(w):
    w = w.strip()
    if len(w) < 2:
        return False
    if w.startswith('…') or '(' in w or ')' in w or '.' in w:
        return False
    return bool(WORD_RE.match(w.upper()))

def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <input.json>")
        sys.exit(1)
    input_path = sys.argv[1]
    output_path = 'kelimelik_words.txt'
    
    print(f'Reading {input_path} (JSON‑Lines format)...')
    words = set()
    count = 0
    with open(input_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError as e:
                print(f'Skipping malformed line: {e}')
                continue
            madde = entry.get('madde', '')
            if is_valid_word(madde):
                words.add(madde.upper())
            count += 1
    print(f'Processed {count} lines.')
    print(f'Valid single-word entries: {len(words)}')
    
    with open(output_path, 'w', encoding='utf-8') as out:
        for w in sorted(words):
            out.write(w + '\n')
    print(f'Word list written to {output_path}')

if __name__ == '__main__':
    main()
