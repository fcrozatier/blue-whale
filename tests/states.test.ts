import { describe, test, expect } from "vitest";
import { states } from "../blue-whale";
import { lexAll } from "./utils";

describe("stateful lexer", () => {
	const statefulLexer = states(
		{
			start: [
				{
					type: "word",
					match: /\w+/,
				},
				{ type: "eq", match: "=", next: "ab" },
				{ type: "myError", option: "error" },
			],
			ab: [
				{ type: "a", match: "a" },
				{ type: "b", match: "b" },
				{ type: "semi", match: ";", next: "start" },
			],
		},
		"start",
	);
	test("switches states", () => {
		statefulLexer.reset("one=ab;two=");
		expect(lexAll(statefulLexer).map(({ type, value }) => [type, value])).toEqual([
			["word", "one"],
			["eq", "="],
			["a", "a"],
			["b", "b"],
			["semi", ";"],
			["word", "two"],
			["eq", "="],
		]);
	});
	test("supports errors", () => {
		statefulLexer.reset("foo!");
		expect(lexAll(statefulLexer).map(({ type, value }) => [type, value])).toEqual([
			["word", "foo"],
			["myError", "!"],
		]);
	});
	const parens = states(
		{
			start: [
				{
					type: "word",
					match: /\w+/,
				},
				{ type: "lpar", match: "(", push: "inner" },
				{ type: "rpar", match: ")" },
			],
			inner: [
				{
					type: "thing",
					match: /\w+/,
				},
				{ type: "lpar", match: "(", push: "inner" },
				{ type: "rpar", match: ")", pop: 1 },
			],
		},
		"start",
	);
	test("maintains a stack", () => {
		parens.reset("a(b(c)d)e");
		expect(lexAll(parens).map(({ type, value }) => [type, value])).toEqual([
			["word", "a"],
			["lpar", "("],
			["thing", "b"],
			["lpar", "("],
			["thing", "c"],
			["rpar", ")"],
			["thing", "d"],
			["rpar", ")"],
			["word", "e"],
		]);
	});

	test("allows popping too many times", () => {
		parens.reset(")e");
		expect(lexAll(parens).map(({ type, value }) => [type, value])).toEqual([
			["rpar", ")"],
			["word", "e"],
		]);
	});

	test("resets state", () => {
		statefulLexer.reset("one=a");
		expect(statefulLexer.stateName).toBe("start");
		expect(lexAll(statefulLexer).map(({ type, value }) => [type, value])).toEqual([
			["word", "one"],
			["eq", "="],
			["a", "a"],
		]);
		expect(statefulLexer.stateName).toBe("ab");
		statefulLexer.reset("one=ab;two=");
		expect(statefulLexer.stateName).toBe("start");
	});

	test("lexes interpolation example", () => {
		const lexer = states(
			{
				main: [
					{ type: "strstart", match: "`", push: "lit" },
					{ type: "ident", match: /\w+/ },
					{ type: "lbrace", match: "{", push: "main" },
					{ type: "rbrace", match: "}", pop: 1 },
					{ type: "colon", match: ":" },
					{ type: "space", match: /\s+/ },
				],

				lit: [
					{ type: "interp", match: "${", push: "main" },
					{ type: "escape", match: /\\./ },
					{ type: "strend", match: "`", pop: 1 },
					{ type: "const", match: /(?:[^$`]|\$(?!\{))+/ },
				],
			},
			"main",
		).reset("`a${{c: d}}e`");
		expect(
			lexAll(lexer)
				.map((t) => t.type)
				.join(" "),
		).toBe("strstart const interp lbrace ident colon space ident rbrace rbrace const strend");
	});

	test("warns for non-existent states", () => {
		expect(() => states({ start: [{ type: "bar", match: "bar", next: "foo" }] })).toThrow(
			"Missing state 'foo'",
		);
		expect(() => states({ start: [{ type: "bar", match: "bar", push: "foo" }] })).toThrow(
			"Missing state 'foo'",
		);
		expect(() =>
			states({
				start: [
					{ type: "foo", match: "fish" },
					{ type: "bar", match: "bar", push: "foo" },
				],
			}),
		).toThrow("Missing state 'foo'");
	});
	test("warns for non-boolean pop", () => {
		// @ts-expect-error pop should be 1
		expect(() => states({ start: [{ type: "bar", match: "bar", pop: "cow" }] })).toThrow(
			"pop must be 1 (in token 'bar' of state 'start')",
		);

		// @ts-expect-error pop should be 1
		expect(() => states({ start: [{ type: "bar", match: "bar", pop: 2 }] })).toThrow(
			"pop must be 1 (in token 'bar' of state 'start')",
		);
		expect(() => states({ start: [{ type: "bar", match: "bar", pop: 1 }] })).not.toThrow();
	});
});
