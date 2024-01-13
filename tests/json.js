import { compile } from "../moo";

export const jsonLexer = compile({
	"{": "{",
	"}": "}",
	"[": "[",
	"]": "]",
	",": ",",
	":": ":",
	space: { match: /\s+/, lineBreaks: true },
	NUMBER: /-?(?:[0-9]|[1-9][0-9]+)(?:\.[0-9]+)?(?:[eE][-+]?[0-9]+)?\b/,
	STRING: /"(?:\\["bfnrt/\\]|\\u[a-fA-F0-9]{4}|[^"\\])*"/,
	TRUE: /true\b/,
	FALSE: /false\b/,
	NULL: /null\b/,
});
