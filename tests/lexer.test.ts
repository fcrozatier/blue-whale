import { describe, expect, test } from "vitest";
import { compile } from "../blue-whale";
import { lexAll } from "./utils";

describe("lexer", () => {
	const simpleLexer = compile([
		{ type: "word", match: /[a-z]+/ },
		{ type: "number", match: /[0-9]+/ },
		{ type: "ws", match: / +/ },
	]);

	test("works", () => {
		simpleLexer.reset("ducks are");
		expect(simpleLexer.next()).toMatchObject({ type: "word", value: "ducks" });
		expect(simpleLexer.next()).toMatchObject({ type: "ws", value: " " });
		expect(simpleLexer.next()).toMatchObject({ type: "word", value: "are" });

		simpleLexer.reset("ducks are");
		expect([...simpleLexer].length).toBe(3);
	});

	test("is iterable", () => {
		simpleLexer.reset("only 321 cows");
		const tokens = [
			["word", "only"],
			["ws", " "],
			["number", "321"],
			["ws", " "],
			["word", "cows"],
		];
		for (const t of simpleLexer) {
			const [type, value] = tokens.shift() as (typeof tokens)[number];
			expect(t).toMatchObject({ type, value });
		}
		expect(simpleLexer.next().type).not.toBeTruthy();
		expect(typeof simpleLexer[Symbol.iterator]).toBe("function");
		expect(typeof simpleLexer[Symbol.iterator]()[Symbol.iterator]).toBe("function");
	});

	test("multiline RegExps", () => {
		const lexer = compile([
			{
				type: "file",
				match: /[^]+/,
			},
		]).reset("I like to moo\na lot");
		expect(lexer.next()?.value).toBe("I like to moo\na lot");
	});

	test("can match EOL $", () => {
		const lexer = compile([
			{ type: "x_eol", match: /x$/ },
			{ type: "x", match: /x/ },
			{ type: "WS", match: / +/ },
			{ type: "NL", match: /\n/ },
			{ type: "other", match: /[^ \n]+/ },
		]).reset("x \n x\n yz x");
		const tokens = lexAll(lexer).filter((t) => t.type !== "WS");
		expect(tokens.map((t) => [t.type, t.value])).toEqual([
			["x", "x"],
			["NL", "\n"],
			["x_eol", "x"],
			["NL", "\n"],
			["other", "yz"],
			["x_eol", "x"],
		]);
	});

	test("can match BOL ^", () => {
		const lexer = compile([
			{ type: "x_bol", match: /^x/ },
			{ type: "x", match: /x/ },
			{ type: "WS", match: / +/ },
			{ type: "NL", match: /\n/ },
			{ type: "other", match: /[^ \n]+/ },
		]).reset("x \n x\nx yz");
		const tokens = lexAll(lexer).filter((t) => t.type !== "WS");
		expect(tokens.map((t) => [t.type, t.value])).toEqual([
			["x_bol", "x"],
			["NL", "\n"],
			["x", "x"],
			["NL", "\n"],
			["x_bol", "x"],
			["other", "yz"],
		]);
	});

	test("Token#toString", () => {
		const lexer = compile([
			{ type: "apples", match: "a" },
			{ type: "name", match: /[a-z]/ },
		]).reset("azm");
		expect(String(lexer.next())).toBe("a");
		expect(String(lexer.next())).toBe("z");
		expect(String(lexer.next())).toBe("m");
	});

	test("can be cloned", () => {
		const lexer = compile([
			{ type: "word", match: /[a-z]+/ },
			{ type: "digit", match: /[0-9]/ },
		]);
		lexer.reset("abc9");
		const clone = lexer.clone();
		clone.reset("123");
		expect(lexer.next()).toMatchObject({ value: "abc", offset: 0 });
		expect(clone.next()).toMatchObject({ value: "1", offset: 0 });
		expect(lexer.next()).toMatchObject({ value: "9", offset: 3 });
		expect(clone.next()).toMatchObject({ value: "2", offset: 1 });
	});
});
