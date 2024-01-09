interface ErrorRule {
	error: true;
}

interface FallbackRule {
	fallback: true;
}

type TypeMapper = (x: string) => string;

interface Rule {
	match?: RegExp | string | string[];
	/**
	 * Moo tracks detailed information about the input for you.
	 * It will track line numbers, as long as you apply the `lineBreaks: true`
	 * option to any tokens which might contain newlines. Moo will try to warn you if you forget to do this.
	 */
	lineBreaks?: boolean;
	/**
	 * Moves the lexer to a new state, and pushes the old state onto the stack.
	 */
	push?: string;
	/**
	 * Returns to a previous state, by removing one or more states from the stack.
	 */
	pop?: number;
	/**
	 * Moves to a new state, but does not affect the stack.
	 */
	next?: string;
	/**
	 * You can have a token type that both matches tokens and contains error values.
	 */
	error?: true;
	/**
	 * Moo doesn't allow capturing groups, but you can supply a transform function, value(),
	 * which will be called on the value before storing it in the Token object.
	 */
	value?: (x: string) => string;

	/**
	 * Used for mapping one set of types to another.
	 * See https://github.com/no-context/moo#keywords for an example
	 */
	type?: string | TypeMapper;

	shouldThrow?: boolean;
}

type Rules = Record<
	string,
	RegExp | RegExp[] | string | string[] | Rule | Rule[] | ErrorRule | FallbackRule
>;

type SpecObject = Record<
	string,
	string | RegExp | Rule | (string | RegExp | Rule)[] | FallbackRule
>;
// When specified by an array, rules must have a type
type SpecArray = (Required<Pick<Rule, "type">> & Rule)[];

type Spec = SpecObject | SpecArray;

interface LexerState {
	line: number;
	col: number;
	state: string;
	queuedToken?: Token;
	queuedText?: string;
	queuedThrow?: string;
	stack: string[];
}

function isRegExp(o: unknown): o is RegExp {
	return o instanceof RegExp;
}

function isObject(o: unknown) {
	return !!o && typeof o === "object" && !isRegExp(o) && !Array.isArray(o);
}

function reEscape(s: string) {
	return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function reGroups(s: string) {
	const re = new RegExp("|" + s); // Hack to make it match against ""

	return (re.exec("") as RegExpExecArray).length - 1;
}

function reCapture(s: string) {
	return "(" + s + ")";
}

function reUnion(regexps: RegExp[]) {
	if (!regexps.length) return "(?!)";
	return regexps.map((s) => "(?:" + s + ")").join("|");
}

function regexpOrLiteral(obj: string | RegExp) {
	if (typeof obj === "string") {
		return "(?:" + reEscape(obj) + ")";
	} else if (isRegExp(obj)) {
		// TODO: consider /u support
		if (obj.ignoreCase) throw new Error("RegExp /i flag not allowed");
		if (obj.global) throw new Error("RegExp /g flag is implied");
		if (obj.sticky) throw new Error("RegExp /y flag is implied");
		if (obj.multiline) throw new Error("RegExp /m flag is implied");
		return obj.source;
	} else {
		throw new Error("Not a pattern: " + obj);
	}
}

function pad(s: string, length: number) {
	if (s.length > length) {
		return s;
	}
	return Array(length - s.length + 1).join(" ") + s;
}

function lastNLines(string: string, numLines: number) {
	let position = string.length;
	let lineBreaks = 0;
	while (true) {
		const idx = string.lastIndexOf("\n", position - 1);
		if (idx === -1) {
			break;
		} else {
			lineBreaks++;
		}
		position = idx;
		if (lineBreaks === numLines) {
			break;
		}
		if (position === 0) {
			break;
		}
	}
	const startPosition = lineBreaks < numLines ? 0 : position + 1;
	return string.substring(startPosition).split("\n");
}

function objectToRules(object: SpecObject) {
	const keys = Object.getOwnPropertyNames(object);
	const result = [];
	for (const key of keys) {
		const thing = object[key];
		const rules = Array.isArray(thing) ? thing : [thing];
		if (key === "include") {
			for (const rule of rules) {
				result.push({ include: rule });
			}
			continue;
		}
		let match: Rules[string][] = [];
		rules.forEach(function (rule) {
			if (isObject(rule)) {
				if (match.length) result.push(ruleOptions(key, match));
				result.push(ruleOptions(key, rule));
				match = [];
			} else {
				match.push(rule);
			}
		});
		if (match.length) result.push(ruleOptions(key, match));
	}
	return result;
}

function arrayToRules(array: SpecArray) {
	const result = [];
	for (const obj of array) {
		if (obj?.include) {
			const include = Array.isArray(obj.include) ? obj.include : [obj.include];
			for (let j = 0; j < include.length; j++) {
				result.push({ include: include[j] });
			}
			continue;
		}
		if (!obj.type) {
			throw new Error("Rule has no type: " + JSON.stringify(obj));
		}
		result.push(ruleOptions(obj.type, obj));
	}
	return result;
}

// TODO tighten types
function ruleOptions(type: string | TypeMapper, obj) {
	if (!isObject(obj)) {
		obj = { match: obj };
	}
	if (obj.include) {
		throw new Error("Matching rules cannot also include states");
	}

	// nb. error and fallback imply lineBreaks
	let options = {
		defaultType: type,
		lineBreaks: !!obj.error || !!obj.fallback,
		pop: false,
		next: null,
		push: null,
		error: false,
		fallback: false,
		value: null,
		type: null,
		shouldThrow: false,
	};

	options = Object.assign(options, obj);

	// type transform cannot be a string
	if (typeof options.type === "string" && type !== options.type) {
		throw new Error(
			"Type transform cannot be a string (type '" + options.type + "' for token '" + type + "')",
		);
	}

	// convert to array
	const match = options.match;
	options.match = Array.isArray(match) ? match : match ? [match] : [];
	options.match.sort(function (a, b) {
		return isRegExp(a) && isRegExp(b)
			? 0
			: isRegExp(b)
				? -1
				: isRegExp(a)
					? +1
					: b.length - a.length;
	});
	return options;
}

function toRules(spec: Spec) {
	return Array.isArray(spec) ? arrayToRules(spec) : objectToRules(spec);
}

const defaultErrorRule = ruleOptions("error", {
	lineBreaks: true,
	shouldThrow: true,
});

function compileRules(rules: ReturnType<typeof toRules>, hasStates?: boolean) {
	const fast = Object.create(null);
	const groups: typeof rules = [];
	const parts: string[] = [];
	let errorRule = null;
	let fastAllowed = true;
	let unicodeFlag = null;

	// If there is a fallback rule, then disable fast matching
	for (const rule of rules) {
		if (rule.fallback) {
			fastAllowed = false;
		}
	}

	for (const rule of rules) {
		if (rule.include) {
			// all valid inclusions are removed by states() preprocessor
			throw new Error("Inheritance is not allowed in stateless lexers");
		}

		if (rule.error || rule.fallback) {
			// errorRule can only be set once
			if (errorRule) {
				if (!rule.fallback === !errorRule.fallback) {
					throw new Error(
						"Multiple " +
							(rule.fallback ? "fallback" : "error") +
							" rules not allowed (for token '" +
							rule.defaultType +
							"')",
					);
				} else {
					throw new Error(
						"fallback and error are mutually exclusive (for token '" + rule.defaultType + "')",
					);
				}
			}
			errorRule = rule;
		}

		const match = rule.match.slice();
		if (fastAllowed) {
			while (match.length && typeof match[0] === "string" && match[0].length === 1) {
				const word = match.shift();
				fast[word.charCodeAt(0)] = rule;
			}
		}

		// Warn about inappropriate state-switching options
		if (rule.pop || rule.push || rule.next) {
			if (!hasStates) {
				throw new Error(
					"State-switching options are not allowed in stateless lexers (for token '" +
						rule.defaultType +
						"')",
				);
			}
			if (rule.fallback) {
				throw new Error(
					"State-switching options are not allowed on fallback tokens (for token '" +
						rule.defaultType +
						"')",
				);
			}
		}

		// Only rules with a .match are included in the RegExp
		if (match.length === 0) {
			continue;
		}
		fastAllowed = false;

		groups.push(rule);

		// Check unicode flag is used everywhere or nowhere
		for (const obj of match) {
			if (!isRegExp(obj)) {
				continue;
			}

			if (unicodeFlag === null) {
				unicodeFlag = obj.unicode;
			} else if (unicodeFlag !== obj.unicode && rule.fallback === false) {
				throw new Error("If one rule is /u then all must be");
			}
		}

		// convert to RegExp
		const pat = reUnion(match.map(regexpOrLiteral));
		const regexp = new RegExp(pat);

		// validate
		if (regexp.test("")) {
			throw new Error("RegExp matches empty string: " + regexp);
		}
		const groupCount = reGroups(pat);
		if (groupCount > 0) {
			throw new Error("RegExp has capture groups: " + regexp + "\nUse (?: … ) instead");
		}

		// try and detect rules matching newlines
		if (!rule.lineBreaks && regexp.test("\n")) {
			throw new Error("Rule should declare lineBreaks: " + regexp);
		}

		// store regex
		parts.push(reCapture(pat));
	}

	// If there's no fallback rule, use the sticky flag so we only look for
	// matches at the current index.
	const fallbackRule = errorRule && errorRule.fallback;
	let flags = !fallbackRule ? "ym" : "gm";

	if (unicodeFlag === true) flags += "u";
	const combined = new RegExp(reUnion(parts), flags);
	return {
		regexp: combined,
		groups,
		fast,
		error: errorRule || defaultErrorRule,
	};
}

export function compile(spec: Spec): Lexer {
	const result = compileRules(toRules(spec));
	return new Lexer({ start: result }, "start");
}

function checkStateGroup(g, name: string, map) {
	const state = g && (g.push || g.next);
	if (state && !map[state]) {
		throw new Error(
			"Missing state '" + state + "' (in token '" + g.defaultType + "' of state '" + name + "')",
		);
	}
	if (g && g.pop && +g.pop !== 1) {
		throw new Error("pop must be 1 (in token '" + g.defaultType + "' of state '" + name + "')");
	}
}
export const states = function compileStates(states: any, start?: string): Lexer {
	const all = states.$all ? toRules(states.$all) : [];
	delete states.$all;

	const keys = Object.getOwnPropertyNames(states);
	if (!start) start = keys[0];
	if (!start) throw Error("no start state");

	const ruleMap = Object.create(null);
	for (const key of keys) {
		ruleMap[key] = toRules(states[key]).concat(all);
	}
	for (const key of keys) {
		const rules = ruleMap[key];
		const included = Object.create(null);
		for (let j = 0; j < rules.length; j++) {
			const rule = rules[j];
			if (!rule.include) continue;
			const splice = [j, 1];
			if (rule.include !== key && !included[rule.include]) {
				included[rule.include] = true;
				const newRules = ruleMap[rule.include];
				if (!newRules) {
					throw new Error(
						"Cannot include nonexistent state '" + rule.include + "' (in state '" + key + "')",
					);
				}
				for (const newRule of newRules) {
					if (rules.indexOf(newRule) !== -1) continue;
					splice.push(newRule);
				}
			}
			rules.splice.apply(rules, splice);
			j--;
		}
	}

	const map = Object.create(null);
	for (const key of keys) {
		map[key] = compileRules(ruleMap[key], true);
	}

	for (const name of keys) {
		const state = map[name];
		const groups = state.groups;
		for (const group of groups) {
			checkStateGroup(group, name, map);
		}
		const fastKeys = Object.getOwnPropertyNames(state.fast);
		for (const fastKey of fastKeys) {
			checkStateGroup(state.fast[fastKey], name, map);
		}
	}

	return new Lexer(map, start);
};

export const keywords = function keywordTransform(
	map: Record<string, string | string[]>,
): TypeMapper {
	const reverseMap = new Map();

	const types = Object.getOwnPropertyNames(map);
	for (const tokenType of types) {
		const item = map[tokenType];
		const keywordList = Array.isArray(item) ? item : [item];
		keywordList.forEach(function (keyword) {
			if (typeof keyword !== "string") {
				throw new Error("keyword must be string (in keyword '" + tokenType + "')");
			}
			reverseMap.set(keyword, tokenType);
		});
	}
	return (k) => reverseMap.get(k);
};

/***************************************************************************/

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
	type?: string | undefined;
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
		type?: string | undefined;
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
	startState: string;
	states: Record<string, LexerState>;
	buffer: string;
	stack: string[];

	state: string;
	index: number;
	line: LexerState["line"];
	col: LexerState["col"];
	queuedToken: LexerState["queuedToken"];
	queuedText: LexerState["queuedText"];
	queuedThrow: LexerState["queuedThrow"];
	queuedGroup;

	groups: [];
	error;
	re: RegExp;
	fast: [];

	constructor(states: Record<string, LexerState>, state: string) {
		this.startState = state;
		this.states = states;
		this.buffer = "";
		this.stack = [];
		this.reset();
	}

	/**
	 * Empty the internal buffer of the lexer, and set the line, column, and offset counts back to their initial value.
	 */
	reset(data?: string, state?: Partial<LexerState>) {
		this.buffer = data || "";
		this.index = 0;
		this.line = state?.line ?? 1;
		this.col = state?.col ?? 1;
		this.queuedToken = state?.queuedToken;
		this.queuedText = state?.queuedText ?? "";
		this.queuedThrow = state?.queuedThrow;
		this.setState(state?.state ?? this.startState);
		this.stack = state && state.stack ? state.stack.slice() : [];
		return this;
	}

	/**
	 * Returns current state, which you can later pass it as the second argument
	 * to reset() to explicitly control the internal state of the lexer.
	 */
	save(): LexerState {
		return {
			line: this.line,
			col: this.col,
			state: this.state,
			stack: this.stack,
			queuedToken: this.queuedToken,
			queuedText: this.queuedText,
			queuedThrow: this.queuedThrow,
		};
	}

	/**
	 * Transitions to the provided state. Does not push onto the state stack.
	 */
	setState(state: string) {
		if (!state || this.state === state) return;
		this.state = state;
		const info = this.states[state];
		this.groups = info.groups;
		this.error = info.error;
		this.re = info.regexp;
		this.fast = info.fast;
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

	/**
	 * Transitions to the provided state and pushes the state onto the state
	 * stack.
	 */
	pushState(state: string) {
		this.stack.push(this.state);
		this.setState(state);
	}

	_getGroup(match: RegExpExecArray) {
		const groupCount = this.groups.length;
		for (let i = 0; i < groupCount; i++) {
			if (match[i + 1] !== undefined) {
				return this.groups[i];
			}
		}
		throw new Error("Cannot find token type for matched text");
	}

	/**
	 * When you reach the end of Moo's internal buffer, next() will return undefined.
	 * You can always reset() it and feed it more data when that happens.
	 */
	next(): Token | undefined {
		const index = this.index;

		// If a fallback token matched, we don't need to re-run the RegExp
		if (this.queuedGroup) {
			const token = this._token(this.queuedGroup, this.queuedText, index);
			this.queuedGroup = null;
			this.queuedText = "";
			return token;
		}

		const buffer = this.buffer;
		if (index === buffer.length) {
			return undefined; // EOF
		}

		// Fast matching for single characters
		let group = this.fast[buffer.charCodeAt(index)];
		if (group) {
			return this._token(group, buffer.charAt(index), index);
		}

		// Execute RegExp
		const re = this.re;
		re.lastIndex = index;
		const match = eat(re, buffer);

		// Error tokens match the remaining buffer
		const error = this.error;
		if (match == null) {
			return this._token(error, buffer.slice(index, buffer.length), index);
		}

		group = this._getGroup(match);
		const text = match[0];

		if (error.fallback && match.index !== index) {
			this.queuedGroup = group;
			this.queuedText = text;

			// Fallback tokens contain the unmatched portion of the buffer
			return this._token(error, buffer.slice(index, match.index), index);
		}

		return this._token(group, text, index);
	}

	_token(
		group: {
			defaultType?: string;
			lineBreaks: number;
			type?: (input: string) => string;
			value?: (input: string) => string;
			shouldThrow?: boolean;
			push?: string;
			next?: string;
			pop?: boolean;
		},
		text: string,
		offset: number,
	) {
		// count line breaks
		let lineBreaks = 0;
		let nl = 1;
		if (group.lineBreaks) {
			const matchNL = /\n/g;
			if (text === "\n") {
				lineBreaks = 1;
			} else {
				while (matchNL.exec(text)) {
					lineBreaks++;
					nl = matchNL.lastIndex;
				}
			}
		}

		const token = new Token({
			type: (typeof group.type === "function" && group.type(text)) || group.defaultType,
			value: typeof group.value === "function" ? group.value(text) : text,
			text,
			offset,
			lineBreaks,
			line: this.line,
			col: this.col,
		});
		// nb. adding more props to token object will make V8 sad!

		const size = text.length;
		this.index += size;
		this.line += lineBreaks;
		if (lineBreaks !== 0) {
			this.col = size - nl + 1;
		} else {
			this.col += size;
		}

		// throw, if no rule with {error: true}
		if (group.shouldThrow) {
			const err = new Error(this.formatError(token, "invalid syntax"));
			throw err;
		}

		if (group.pop) this.popState();
		else if (group.push) this.pushState(group.push);
		else if (group.next) this.setState(group.next);

		return token;
	}

	/**
	 * Returns a string with a pretty error message.
	 */
	formatError(token: Token | undefined, message?: string) {
		if (!token) {
			// An undefined token indicates EOF
			const text = this.buffer.slice(this.index);
			token = new Token({
				value: text,
				text,
				offset: this.index,
				lineBreaks: text.indexOf("\n") === -1 ? 0 : 1,
				line: this.line,
				col: this.col,
			});
		}

		const numLinesAround = 2;
		const firstDisplayedLine = Math.max(token.line - numLinesAround, 1);
		const lastDisplayedLine = token.line + numLinesAround;
		const lastLineDigits = String(lastDisplayedLine).length;
		const displayedLines = lastNLines(
			this.buffer,
			this.line - token.line + numLinesAround + 1,
		).slice(0, 5);
		const errorLines = [];
		errorLines.push(message + " at line " + token.line + " col " + token.col + ":");
		errorLines.push("");
		for (let i = 0; i < displayedLines.length; i++) {
			const line = displayedLines[i];
			const lineNo = firstDisplayedLine + i;
			errorLines.push(pad(String(lineNo), lastLineDigits) + "  " + line);
			if (lineNo === token.line) {
				errorLines.push(pad("", lastLineDigits + token.col + 1) + "^");
			}
		}
		return errorLines.join("\n");
	}

	clone() {
		return new Lexer(this.states, this.state);
	}

	[Symbol.iterator](): Iterator<Token> {
		return new LexerIterator(this);
	}
}

const eat = function (re: RegExp, buffer: string) {
	// assume re is /y
	return re.exec(buffer);
};

class LexerIterator {
	constructor(public lexer: Lexer) {
		this.lexer = lexer;
	}

	next() {
		const token = this.lexer.next();
		return { value: token, done: !token };
	}

	[Symbol.iterator]() {
		return this;
	}
}

/**
 * Reserved token for indicating a parse fail.
 */
export const error: ErrorRule = Object.freeze({ error: true });

/**
 * Reserved token for indicating a fallback rule.
 */
export const fallback: FallbackRule = Object.freeze({ fallback: true });
