#!/usr/bin/env python3
"""Render a fare value (e.g. "17.97") as a shaded blocky ASCII digit
display, for the fare-confirmation step of the pedir-uber skill.

Usage: render_fare.py 17.97
"""

import sys

GLYPHS = {
    '0': [" ███ ", "█   █", "█   █", "█   █", " ███ "],
    '1': ["  █  ", " ██  ", "  █  ", "  █  ", " ███ "],
    '2': [" ███ ", "█   █", "   █ ", "  █  ", "█████"],
    '3': [" ███ ", "█   █", "  ██ ", "█   █", " ███ "],
    '4': ["█   █", "█   █", "█████", "    █", "    █"],
    '5': ["█████", "█    ", "████ ", "    █", "████ "],
    '6': [" ███ ", "█    ", "████ ", "█   █", " ███ "],
    '7': ["█████", "    █", "   █ ", "  █  ", "  █  "],
    '8': [" ███ ", "█   █", " ███ ", "█   █", " ███ "],
    '9': [" ███ ", "█   █", " ████", "    █", " ███ "],
    '.': ["     ", "     ", "     ", "     ", "  █  "],
    ',': ["     ", "     ", "     ", "     ", "  █  "],
}


def shade(glyph):
    return [row.replace(" ", "░") for row in glyph]


def render(value: str) -> str:
    glyphs = [shade(GLYPHS[c]) for c in value if c in GLYPHS]
    if not glyphs:
        raise ValueError(f"No renderable characters in {value!r}")

    rows = ["░".join(g[r] for g in glyphs) for r in range(5)]
    width = len(rows[0])
    pad_row = "░" * (width + 2)
    padded = [pad_row] + ["░" + row + "░" for row in rows] + [pad_row]
    return "\n".join(padded)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: render_fare.py <fare digits, e.g. 17.97>", file=sys.stderr)
        sys.exit(1)
    print(render(sys.argv[1]))
