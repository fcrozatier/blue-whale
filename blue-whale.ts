type Rules = SimpleRule[];

type LexicalModes = Record<string, StateSwitchingRule[]>;

type SimpleRule =
	| {
			type: string | StringMapper;
			match: Pattern;
			value?: StringMapper;
			option?: "error";
	  }
	| {
			type: string;
			match?: never;
			value?: never;
			option: "fallback" | "error";
	  };

type StateSwitchingRule = SimpleRule & { next?: string; push?: string; pop?: 1 };

type StringMapper = (x: string) => string;

type Pattern = string | RegExp | (string | RegExp)[];

type LexerStates = Record<string, LexerState>;

type LexerState = {
	regex: RegExp;
	rules: SimpleRule[];
	options: StateOptions;
};

type StateOptions = {
	fallbackRule?: SimpleRule | undefined;
	errorRule?: SimpleRule | undefined;
};

export function compile(rules: Rules): Lexer {
	const result = compileRules(rules);
	return new Lexer({ start: result }, "start");
}

function compileRules(rules: SimpleRule[], hasStates = false): LexerState {
	const parts: string[] = [];
	const options: StateOptions = {};

	if (rules.length === 0) {
		throw new Error("no rules");
	}

	for (const rule of rules) {
		switch (rule.option) {
			case "fallback":
				if (!options.fallbackRule) {
					options.fallbackRule = rule;
					continue;
				} else {
					throw new Error("Multiple fallback rules not allowed");
				}

			case "error":
				if (!options.errorRule) {
					options.errorRule = rule;
					// An error rule can have a match
					if (!rule.match) continue;
				} else {
					throw new Error("Multiple error rules not allowed");
				}
		}

		if ("next" in rule || "push" in rule || "pop" in rule) {
			if (!hasStates) {
				throw new Error(
					"State-switching options are not allowed in stateless lexers (for token '" +
						rule.type +
						"')",
				);
			}
			// if (rule.option==="") {
			// 	throw new Error(
			// 		"State-switching options are not allowed on fallback tokens (for token '" +
			// 			rule.defaultType +
			// 			"')",
			// 	);
			// }
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
	}

	const flags = options.fallbackRule ? "gm" : "ym";
	const combined = new RegExp(reUnion(parts), flags);

	return {
		regex: combined,
		rules,
		options,
	};
}

function patternToString(pattern: Pattern): string {
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
	if (!regexps.length) return "(?!)";
	return regexps.map((s) => "(?:" + s + ")").join("|");
}

export const states = function compileStates<T extends LexicalModes>(states: T, start?: keyof T) {
	const all = states.$all ? compileRules(states.$all) : null;
	delete states.$all;

	const stateKeys = Object.getOwnPropertyNames(states);
	if (!start) {
		if (stateKeys.length === 1) {
			start = stateKeys[0];
		} else {
			throw new Error("no start state provided");
		}
	}

	const lexerStates: LexerStates = Object.create(null);
	for (const key of stateKeys) {
		const rules = states[key];
		const state = compileRules(rules, true);
		lexerStates[key] = state;
	}

	return new Lexer(lexerStates, start as string);
};

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
	start: string;
	states: LexerStates;
	state: LexerState;
	stateName: string;
	stack: string[];
	data: string;
	index: number;

	queuedText: string;
	queuedRule: SimpleRule | null | undefined;

	constructor(states: LexerStates, start: string) {
		this.start = start;
		this.states = states;
		this.state = states[start];
		this.stateName = start;
		this.stack = [];
		this.reset();
	}

	reset(data?: string) {
		this.stateName = this.start;
		this.state = this.states[this.stateName];
		this.data = data ?? "";
		this.index = 0;
		this.queuedText = "";
		this.queuedRule = null;
		return this;
	}

	next() {
		const index = this.index;

		// If a fallback token matched, we don't need to re-run the RegExp
		if (this.queuedRule) {
			const token = this._token(this.queuedRule, this.queuedText, index);
			this.queuedRule = null;
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
			}
			const error = this.state.options.errorRule;
			if (error) {
				return this._token(error, data.slice(index, data.length), index);
			} else {
				throw new Error("unmatched token");
			}
		}

		const text = match[0];
		const rule = this._getRule(match);

		if (fallback && match.index !== index) {
			this.queuedText = text;
			this.queuedRule = rule;

			// Fallback tokens contain the unmatched portion of the data
			return this._token(fallback, data.slice(index, match.index), index);
		}

		return this._token(rule, text, index);
	}

	private _getRule(match: RegExpExecArray) {
		const groupTypes = this.state.rules.length;
		for (let i = 0; i < groupTypes; i++) {
			if (match[i + 1] !== undefined) {
				return this.state.rules[i];
			}
		}
		throw new Error("Cannot find token type for matched text");
	}

	private _token(rule: SimpleRule | StateSwitchingRule, text: string, offset: number) {
		const token = new Token({
			type: typeof rule.type === "function" ? rule.type(text) : rule.type,
			text,
			value: typeof rule.value === "function" ? rule.value(text) : text,
			offset,
			line: -1,
			col: -1,
			lineBreaks: -1,
		});

		this.index += text.length;

		if (isStateSwitchingRule(rule)) {
			if (rule.pop) this.popState();
			else if (rule.next) this.setState(rule.next);
			else if (rule.push) this.pushState(rule.push);
		}

		return token;
	}

	/**
	 * Transitions to the provided state. Does not push onto the state stack.
	 */
	setState(stateName: string) {
		if (this.stateName === stateName) return;
		this.stateName = stateName;
		this.state = this.states[stateName];
	}

	/**
	 * Transitions to the provided state and pushes the state onto the state
	 * stack.
	 */
	pushState(stateName: string) {
		this.stack.push(this.stateName);
		this.setState(stateName);
	}

	/**
	 * Returns back to the previous state in the stack.
	 */
	popState() {
		const last = this.stack.pop();
		if (last) {
			this.setState(last);
		}
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

function isStateSwitchingRule(rule: SimpleRule | StateSwitchingRule): rule is StateSwitchingRule {
	return (
		Object.prototype.hasOwnProperty.call(rule, "next") ||
		Object.prototype.hasOwnProperty.call(rule, "push") ||
		Object.prototype.hasOwnProperty.call(rule, "pop")
	);
}

export function keywords(map: Record<string, string | string[]>): StringMapper {
	const reverseMap = new Map();

	const types = Object.getOwnPropertyNames(map);
	for (const tokenType of types) {
		const item = map[tokenType];
		const keywordList = Array.isArray(item) ? item : [item];
		keywordList.forEach((keyword) => {
			if (typeof keyword !== "string") {
				throw new Error("keyword must be string (in keyword '" + tokenType + "')");
			}
			reverseMap.set(keyword, tokenType);
		});
	}
	return (k) => reverseMap.get(k);
}
