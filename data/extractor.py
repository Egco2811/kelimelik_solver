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

def is_valid_word(madde, entry=None):
    if not madde or not madde.strip():
        return False
    w = madde.strip()
    if len(w) < 2:
        return False
    # Reject phrases (contain spaces)
    if ' ' in w:
        return False
    # Reject entries with punctuation, parentheses, ellipsis, etc.
    if w.startswith('…') or '(' in w or ')' in w or '.' in w:
        return False
    upper = turkish_upper(w)
    # Must be only Turkish letters
    if not re.match(r'^[ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]+$', upper):
        return False
    # Must contain at least one vowel
    if not has_vowel(upper):
        return False

    # Additional filtering: reject chemical symbols (e.g., Ac, Ag, Au)
    # Only for short words (1-2 letters) to avoid over‑filtering
    if entry and len(upper) <= 2:
        anlamlar = entry.get('anlamlarListe', [])
        for anlam in anlamlar:
            text = anlam.get('anlam', '')
            # Check if definition indicates it's a symbol of an element
            if 'simgesi' in text or 'element' in text or 'sembolü' in text:
                # Check if the category is kimya
                ozellikler = anlam.get('ozelliklerListe', [])
                for oz in ozellikler:
                    if oz.get('tam_adi') == 'kimya' or oz.get('kisa_adi') == 'kim.':
                        return False
    return True

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
                    madde = entry.get('madde', '').strip()
                    if not madde:
                        madde = entry.get('madde_duz', '').strip()
                    if is_valid_word(madde, entry):
                        words.add(turkish_upper(madde))
            else:
                madde = data.get('madde', '').strip()
                if not madde:
                    madde = data.get('madde_duz', '').strip()
                if is_valid_word(madde, data):
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
                    madde = entry.get('madde', '').strip()
                    if not madde:
                        madde = entry.get('madde_duz', '').strip()
                    if is_valid_word(madde, entry):
                        words.add(turkish_upper(madde))
                except:
                    continue

    with open(output_path, 'w', encoding='utf-8') as out:
        for w in sorted(words):
            out.write(w + '\n')
    print(f"Valid words: {len(words)} written to {output_path}")

if __name__ == '__main__':
    main()
