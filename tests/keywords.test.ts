import { describe, expect, test } from "vitest";
import { compile, keywords } from "../index";

describe("keywords", () => {
	test("supports explicit keywords", () => {
		const lexer = compile([
			{ type: (x) => keywords({ keyword: "class" })(x) || "identifier", match: /[a-zA-Z]+/ },
		]);

		lexer.reset("class");
		expect(lexer.next()).toMatchObject({ type: "keyword", value: "class" });
		expect(lexer.next().type).not.toBeTruthy();

		lexer.reset("className");
		expect(lexer.next()).toMatchObject({
			type: "identifier",
			value: "className",
		});
		expect(lexer.next().type).not.toBeTruthy();
	});

	test("keywords can have individual tokenTypes", () => {
		const lexer = compile([
			{
				type: (x) =>
					keywords({
						"kw-class": "class",
						"kw-def": "def",
						"kw-if": "if",
					})(x) || "identifier",
				match: /[a-zA-Z]+/,
			},
			{ type: "space", match: /\s+/ },
		]);
		lexer.reset("foo def");
		expect(Array.from(lexer).map((t) => t.type)).toEqual(["identifier", "space", "kw-def"]);
	});

	test("must be strings", () => {
		expect(() =>
			compile([
				{
					type: keywords({
						// @ts-expect-error keywords must be string
						"kw-class": { foo: "bar" },
					}),
					match: /[a-zA-Z]+/,
				},
			]),
		).toThrow("keyword must be string (in keyword 'kw-class')");
	});
});
