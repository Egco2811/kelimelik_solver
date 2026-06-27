import sys
import re
import json

TR_LOWER = 'abcçdefgğhıijklmnoöprsştuüvyz'
TR_UPPER = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'
LOWER_TO_UPPER = dict(zip(TR_LOWER, TR_UPPER))
VOWELS = set('AEIİOÖUÜ')

def turkish_upper(s):
    return ''.join(LOWER_TO_UPPER.get(c, c.upper()) for c in s)

def has_vowel(w):
    return any(ch in VOWELS for ch in w)

def is_valid_word(w):
    w = w.strip()
    if len(w) < 2:
        return False
    if w.startswith('…') or '(' in w or ')' in w or '.' in w:
        return False
    upper = turkish_upper(w)
    if not re.match(r'^[ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]+$', upper):
        return False
    return has_vowel(upper)

def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <input.json>")
        sys.exit(1)
    input_path = sys.argv[1]
    output_path = 'kelimelik_words.txt'

    words = set()
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read().strip()
        try:
            data = json.loads(content)
            if isinstance(data, list):
                for entry in data:
                    madde = entry.get('madde', '')
                    if is_valid_word(madde):
                        words.add(turkish_upper(madde))
            else:
                # single object? fallback
                madde = data.get('madde', '')
                if is_valid_word(madde):
                    words.add(turkish_upper(madde))
        except json.JSONDecodeError:
            # JSON Lines format
            f.seek(0)
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    madde = entry.get('madde', '')
                    if is_valid_word(madde):
                        words.add(turkish_upper(madde))
                except:
                    continue

    with open(output_path, 'w', encoding='utf-8') as out:
        for w in sorted(words):
            out.write(w + '\n')
    print(f"Valid words: {len(words)} written to {output_path}")

if __name__ == '__main__':
    main()
