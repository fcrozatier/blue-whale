import { describe, expect, test } from "vitest";
import { compile, states } from "../blue-whale";
import { lexAll } from "./utils";

describe("compiler", () => {
	test("handles empty rule set", () => {
		expect(() => compile([])).toThrow("no rules");

		expect(() => compile([{ type: "", match: "" }])).toThrow("RegExp matches empty string");

		const lex2 = compile([{ type: "err", option: "error" }]);
		lex2.reset("nope!");
		expect(lex2.next()).toMatchObject({ type: "err", text: "nope!" });

		// const lex3 = states({ main: {} });
		// lex3.reset("nope!");
		// expect(() => lex3.next()).toThrow("invalid syntax");

		const lex4 = states({ main: [{ type: "err", option: "error" }] });
		lex4.reset("nope!");
		expect(lex4.next()).toMatchObject({ type: "err", text: "nope!" });
	});

	test("warns for /g, /y, /i, /m", () => {
		expect(() => compile([{ type: "", match: /foo/ }])).not.toThrow();
		expect(() => compile([{ type: "", match: /foo/g }])).toThrow("implied");
		expect(() => compile([{ type: "", match: /foo/i }])).toThrow("not allowed");
		expect(() => compile([{ type: "", match: /foo/y }])).toThrow("implied");
		expect(() => compile([{ type: "", match: /foo/m }])).toThrow("implied");
	});

	// test("warns about missing states", () => {
	// 	const rules = [
	// 		{ match: "=", next: "missing" },
	// 		{ match: "=", push: "missing" },
	// 	];
	// 	for (const rule of rules) {
	// 		expect(() => states({ start: { thing: rule } })).toThrow(
	// 			"Missing state 'missing' (in token 'thing' of state 'start')",
	// 		);
	// 	}
	// });

	// test("accepts multiple fast rules in states", () => {
	// 	const states = {
	// 		main: {
	// 			a: "a",
	// 			b: "b",
	// 		},
	// 	};
	// 	expect(() => states(states)).not.toThrow();
	// });

	// test("warns about inappropriate state-switching options", () => {
	// 	const rules = [
	// 		{ match: "=", next: "state" },
	// 		{ match: "=", push: "state" },
	// 		{ match: "=", pop: true },
	// 	];
	// 	for (const rule of rules) {
	// 		//@ts-ignore
	// 		expect(() => compile({ thing: rule })).toThrow(
	// 			"State-switching options are not allowed in stateless lexers (for token 'thing')",
	// 		);
	// 	}
	// });

	test("accepts rules in an array", () => {
		const lexer = compile([
			{
				type: "word",
				match: /[a-z]+/,
			},
			{ type: "number", match: /[0-9]+/ },
			{ type: "space", match: / +/ },
		]);
		lexer.reset("ducks are 123 bad");
		expect(lexer.next()).toMatchObject({ type: "word", value: "ducks" });
		expect(lexer.next()).toMatchObject({ type: "space", value: " " });

		lexer.reset("ducks are 123 bad");
		expect([...lexer].map((x) => x.toString())).toStrictEqual([
			"ducks",
			" ",
			"are",
			" ",
			"123",
			" ",
			"bad",
		]);
	});

	test("accepts a list of match objects", () => {
		const lexer = compile([{ type: "paren", match: ["(", ")"] }]);
		lexer.reset("())(");
		expect(lexAll(lexer).map((x) => x.value)).toEqual(["(", ")", ")", "("]);
	});

	test("accepts mixed rules and match objects", () => {
		const lexer = compile([{ type: "op", match: [/regexp/, "string", /something/, "lol"] }]);

		expect(lexer.reset("string").next()).toMatchObject({
			type: "op",
			value: "string",
		});
		expect(lexer.reset("regexp").next()).toMatchObject({
			type: "op",
			value: "regexp",
		});
		expect(lexer.reset("something").next()).toMatchObject({
			type: "op",
			value: "something",
		});
	});

	test("accepts rules in an array", () => {
		const lexer = compile([
			{ type: "keyword", match: "Bob" },
			{ type: "word", match: /[a-z]+/ },
			{ type: "number", match: /[0-9]+/ },
			{ type: "space", match: / +/ },
		]);
		lexer.reset("Bob ducks are 123 bad");
		expect(lexer.next()).toMatchObject({ type: "keyword", value: "Bob" });
		expect(lexer.next()).toMatchObject({ type: "space", value: " " });
		expect(lexer.next()).toMatchObject({ type: "word", value: "ducks" });
		expect(lexer.next()).toMatchObject({ type: "space", value: " " });
	});

	test("accepts a list of RegExps", () => {
		const lexer = compile([
			{
				type: "number",
				match: [/[0-9]+\.[0-9]+/, /[0-9]+/],
			},
			{ type: "space", match: / +/ },
		]);
		lexer.reset("12.04 123 3.14");
		const tokens = lexAll(lexer).filter((t) => t.type !== "space");
		expect(tokens.shift()).toMatchObject({ type: "number", value: "12.04" });
		expect(tokens.shift()).toMatchObject({ type: "number", value: "123" });
		expect(tokens.shift()).toMatchObject({ type: "number", value: "3.14" });
	});
});

describe("compiles literals", () => {
	test("escapes strings", () => {
		const lexer = compile([
			{
				type: "tok1",
				match: "-/\\^$*+",
			},
			{ type: "tok2", match: ["?.()|[]{}", "cow"] },
		]);
		lexer.reset("-/\\^$*+?.()|[]{}");
		expect(lexer.next()).toMatchObject({ value: "-/\\^$*+" });
		expect(lexer.next()).toMatchObject({ value: "?.()|[]{}" });
	});

	test("matches first literal across rules", () => {
		const lexer = compile([
			{ type: "one", match: "moo" },
			{ type: "two", match: "moomintroll" },
		]);
		lexer.reset("moomintroll");
		expect(lexer.next()).toMatchObject({ value: "moo" });
	});
});
