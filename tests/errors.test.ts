import { describe, expect, test } from "vitest";
import { compile } from "../blue-whale";

describe("errors", () => {
	test("are thrown by default", () => {
		const lexer = compile([
			{ type: "digits", match: /[0-9]+/ },
			{ type: "nl", match: "\n" },
		]);
		lexer.reset("123\n456baa");
		expect(lexer.next()).toMatchObject({ value: "123" });
		expect(lexer.next()).toMatchObject({ type: "nl" });
		expect(lexer.next()).toMatchObject({ value: "456" });
		// expect(() => lexer.next()).toThrow(
		// 	"invalid syntax at line 2 col 4:\n\n" + "1  123\n" + "2  456baa\n" + "      ^",
		// );
	});

	test("can be externally formatted", () => {
		const lexer = compile([
			{ type: "letters", match: /[a-z\n]+/ },
			{ type: "error", option: "error" },
		]);
		lexer.reset("abc\ndef\ng 12\n345\n6");
		expect(lexer.next()).toMatchObject({
			type: "letters",
			value: "abc\ndef\ng",
		});
		const tok = lexer.next();
		expect(tok).toMatchObject({
			type: "error",
			value: " 12\n345\n6",
			// lineBreaks: 2,
		});
		// expect(lexer.formatError(tok, "numbers!")).toBe(
		// 	"numbers! at line 3 col 2:\n\n" +
		// 		"1  abc\n" +
		// 		"2  def\n" +
		// 		"3  g 12\n" +
		// 		"    ^\n" +
		// 		"4  345\n" +
		// 		"5  6",
		// );
	});

	// test("can format null at EOF", () => {
	// 	const lexer = compile({
	// 		ws: { match: /\s/, lineBreaks: true },
	// 		word: /[a-z]+/,
	// 	});
	// 	lexer.reset("abc\ndef quxx");
	// 	expect(Array.from(lexer).length).toBe(5);
	// 	expect(lexer.line).toBe(2);
	// 	expect(lexer.col).toBe(9);
	// 	expect(lexer.formatError(undefined, "EOF!")).toBe(
	// 		"EOF! at line 2 col 9:\n\n" + "1  abc\n" + "2  def quxx\n" + "           ^",
	// 	);
	// });

	// 	test("can format null even not at EOF", () => {
	// 		const lexer = compile({
	// 			ws: { match: /\s/, lineBreaks: true },
	// 			word: /[a-z]+/,
	// 		});
	// 		lexer.reset("abc\ndef quxx\nbar");
	// 		lexer.next();
	// 		lexer.next();
	// 		expect(lexer.line).toBe(2);
	// 		expect(lexer.col).toBe(1);
	// 		expect(lexer.formatError(undefined, "oh no!")).toBe(
	// 			"oh no! at line 2 col 1:\n\n" + "1  abc\n" + "2  def quxx\n" + "   ^\n" + "3  bar",
	// 		);
	// 	});

	// 	test("seek to end of buffer when thrown", () => {
	// 		const lexer = compile({
	// 			digits: /[0-9]+/,
	// 		});
	// 		lexer.reset("invalid");
	// 		expect(() => lexer.next()).toThrow();
	// 		expect(lexer.next()).toBe(undefined);
	// 	});

	test("can be tokens", () => {
		const lexer = compile([
			{ type: "digits", match: /[0-9]+/ },
			{ type: "error", option: "error" },
		]);
		lexer.reset("123foo");
		expect(lexer.next()).toMatchObject({ type: "digits", value: "123" });
		expect(lexer.next()).toMatchObject({
			type: "error",
			value: "foo",
			offset: 3,
		});
	});

	// test("imply lineBreaks", () => {
	// 	const lexer = compile([
	// 		{ type: "digits", match: /[0-9]+/ },
	// 		{ type: "error", option: "error" },
	// 	]);
	// 	lexer.reset("foo\nbar");
	// 	expect(lexer.next()).toMatchObject({
	// 		type: "error",
	// 		value: "foo\nbar",
	// 		lineBreaks: 1,
	// 	});
	// 	expect(lexer.save()).toMatchObject({ line: 2 });
	// 	expect(lexer.next()).toBe(undefined); // consumes rest of input
	// });

	test("may only have one error rule", () => {
		expect(() =>
			compile([
				{ type: "myError", option: "error" },
				{ type: "myError2", option: "error" },
			]),
		).toThrow("Multiple error rules not allowed");
	});

	test("may also match patterns", () => {
		const lexer = compile([
			{
				type: "space",
				match: / +/,
			},
			{ type: "error", match: /[$]/, option: "error" },
		]);
		lexer.reset("foo");
		expect(lexer.next()).toMatchObject({ type: "error", value: "foo" });
		lexer.reset("$ foo");
		expect(lexer.next()).toMatchObject({ type: "error", value: "$" });
		expect(lexer.next()).toMatchObject({ type: "space", value: " " });
		expect(lexer.next()).toMatchObject({ type: "error", value: "foo" });
	});

	test("don't mess with cloned lexers", () => {
		const lexer = compile([
			{ type: "digits", match: /[0-9]+/ },
			{ type: "error", option: "error" },
		]);

		lexer.reset("123foo");
		const clone = lexer.clone();
		clone.reset("bar");
		expect(lexer.next()).toMatchObject({ type: "digits", value: "123" });
		expect(clone.next()).toMatchObject({ type: "error", value: "bar" });
		expect(lexer.next()).toMatchObject({ type: "error", value: "foo" });
		expect(clone.next()).toBe(undefined);
		expect(lexer.next()).toBe(undefined);
	});
});
