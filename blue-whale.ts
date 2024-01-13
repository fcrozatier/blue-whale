type Rules = Rule[] | LexicalModes;

type LexicalModes = Record<string, Rule[]>;

type Rule =
	| {
			type: string;
			match: Pattern;
			fallback?: never;
			skip?: boolean;
	  }
	| {
			type: string;
			match?: never;
			fallback: true;
			skip?: boolean;
	  };

type Pattern = string | RegExp | (string | RegExp)[];

type LexerStates = Record<string, LexerState>;

type LexerState = {
	regex: RegExp;
	types: string[];
	options: StateOptions;
};

type StateOptions = {
	fallbackRule?: string | undefined;
};

export function compile(rules: Rules): Lexer {
	if (Array.isArray(rules)) {
		const result = compileRules(rules);
		return new Lexer({ start: result }, "start");
	}
	return compileModes(rules);
}

function compileRules(rules: Rule[]): LexerState {
	const parts: string[] = [];
	const types: string[] = [];
	const options: StateOptions = {
		fallbackRule: undefined,
	};

	if (rules.length === 0) {
		throw new Error("no rules");
	}

	for (const rule of rules) {
		if (rule.fallback) {
			if (options.fallbackRule === undefined) {
				options.fallbackRule = rule.type;
				continue;
			} else {
				throw new Error("Multiple fallbacks not allowed");
			}
		}
		const pattern = patternToString(rule.match);
		const regex = new RegExp(pattern);

		// validate
		if (regex.test("")) {
			throw new Error("RegExp matches empty string: " + regex);
		}

		const groupCount = reGroups(pattern);
		if (groupCount > 0) {
			throw new Error("RegExp has capture groups: " + regex + "\nUse (?: … ) instead");
		}

		parts.push(reCapture(pattern));
		types.push(rule.type);
	}

	const flags = options.fallbackRule ? "gm" : "ym";
	const combined = new RegExp(reUnion(parts), flags);

	return {
		regex: combined,
		types,
		options,
	};
}

export function patternToString(pattern: Pattern): string {
	if (Array.isArray(pattern)) {
		return pattern.map((x) => patternToString(x)).join("|");
	}

	if (typeof pattern === "string") {
		return reEscape(pattern);
	} else if (isRegExp(pattern)) {
		// TODO: consider /u support
		if (pattern.ignoreCase) throw new Error("RegExp /i flag not allowed");
		if (pattern.global) throw new Error("RegExp /g flag is implied");
		if (pattern.sticky) throw new Error("RegExp /y flag is implied");
		if (pattern.multiline) throw new Error("RegExp /m flag is implied");
		return pattern.source;
	} else {
		throw new Error("Not a pattern: " + pattern);
	}
}

function isRegExp(o: unknown): o is RegExp {
	return o instanceof RegExp;
}

function reCapture(s: string) {
	return "(" + s + ")";
}

function reEscape(s: string) {
	return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function reGroups(s: string) {
	const re = new RegExp("|" + s); // Hack to make it match against ""

	return (re.exec("") as RegExpExecArray).length - 1;
}

function reUnion(regexps: string[]) {
	return regexps.map((s) => "(?:" + s + ")").join("|");
}

function compileModes(states: LexicalModes) {
	const all = states.$all ? compileRules(states.$all) : {};
	delete states.$all;
}

class Token {
	/**
	 * Returns value of the token, or its type if value isn't available.
	 */
	toString() {
		return this.value;
	}
	/**
	 * The name of the group, as passed to compile.
	 */
	type: string;
	/**
	 * The match contents.
	 */
	value: string;
	/**
	 * The number of bytes from the start of the buffer where the match starts.
	 */
	offset: number;
	/**
	 * The complete match.
	 */
	text: string;
	/**
	 * The number of line breaks found in the match. (Always zero if this rule has lineBreaks: false.)
	 */
	lineBreaks: number;
	/**
	 * The line number of the beginning of the match, starting from 1.
	 */
	line: number;
	/**
	 * The column where the match begins, starting from 1.
	 */
	col: number;

	constructor(options: {
		type: string;
		value: string;
		text: string;
		offset: number;
		lineBreaks: number;
		line: number;
		col: number;
	}) {
		this.type = options.type;
		this.value = options.value;
		this.text = options.text;
		this.offset = options.offset;
		this.lineBreaks = options.lineBreaks;
		this.line = options.line;
		this.col = options.col;
	}
}

export class Lexer {
	states: LexerStates;
	state: LexerState;
	stateName: string;
	stack: string[];
	data: string;
	index: number;

	queuedText: string;
	queuedType: string;

	constructor(states: LexerStates, start: string) {
		this.states = states;
		this.state = states[start];
		this.stateName = start;
		this.stack = [];
		this.reset();
	}

	reset(data?: string) {
		this.data = data ?? "";
		this.index = 0;
		this.queuedText = "";
		this.queuedType = "";
		return this;
	}

	next() {
		const index = this.index;

		// If a fallback token matched, we don't need to re-run the RegExp
		if (this.queuedType) {
			const token = this._token(this.queuedType, this.queuedText, index);
			this.queuedType = "";
			this.queuedText = "";
			return token;
		}

		const data = this.data;
		const re = this.state.regex;
		re.lastIndex = index;

		if (index === data.length) {
			return undefined; //EOF
		}

		const match = re.exec(data);

		// Error tokens match the remaining of the data
		const fallback = this.state.options.fallbackRule;
		if (match === null) {
			if (fallback) {
				return this._token(fallback, data.slice(index, data.length), index);
			} else {
				throw new Error("unmatched token");
			}
		}

		const text = match[0];
		const type = this._getType(match);

		if (fallback && match.index !== index) {
			this.queuedText = text;
			this.queuedType = type;

			// Fallback tokens contain the unmatched portion of the data
			return this._token(fallback, data.slice(index, match.index), index);
		}

		return this._token(type, text, index);
	}

	private _getType(match: RegExpExecArray) {
		const groupTypes = this.state.types.length;
		for (let i = 0; i < groupTypes; i++) {
			if (match[i + 1] !== undefined) {
				return this.state.types[i];
			}
		}
		throw new Error("Cannot find token type for matched text");
	}

	private _token(type: string, text: string, offset: number) {
		const token = new Token({
			type,
			text,
			value: text,
			offset,
			line: -1,
			col: -1,
			lineBreaks: -1,
		});

		this.index += text.length;

		return token;
	}

	clone() {
		return new Lexer(this.states, this.stateName);
	}

	*[Symbol.iterator]() {
		let next = this.next();
		while (next) {
			yield next;
			next = this.next();
		}
	}
}
