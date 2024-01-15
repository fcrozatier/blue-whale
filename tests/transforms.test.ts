import { describe, expect, test } from "vitest";
import { compile, keywords } from "../blue-whale";
import { lexAll } from "./utils";

describe("value transforms", () => {
	test("forbid capture groups", () => {
		expect(() =>
			compile([
				{
					type: "",
					match: [/(foo)/, /(bar)/],
				},
			]),
		).toThrow("has capture groups");
	});

	test("transform & keep original", () => {
		const lexer = compile([
			{ type: "fubar", match: /fubar/, value: (x) => x.slice(2) },
			{ type: "string", match: /".*?"/, value: (x) => x.slice(1, -1) },
			{ type: "full", match: /quxx/, value: (x) => x },
			{ type: "moo", match: /moo(?:moo)*moo/, value: (x) => x.slice(3, -3) },
			{ type: "space", match: / +/ },
		]);
		lexer.reset('fubar "yes" quxx moomoomoomoo');
		const tokens = lexAll(lexer).filter((t) => t.type !== "space");
		expect(tokens.shift()).toMatchObject({
			type: "fubar",
			text: "fubar",
			value: "bar",
		});
		expect(tokens.shift()).toMatchObject({
			type: "string",
			text: '"yes"',
			value: "yes",
		});
		expect(tokens.shift()).toMatchObject({ value: "quxx" });
		expect(tokens.shift()).toMatchObject({ value: "moomoo" });
	});

	test("empty transform result", () => {
		const lexer = compile([
			{
				type: "string",
				match: /".*?"/,
				value: (x) => x.slice(1, -1),
			},
		]);
		lexer.reset('""');
		expect(lexer.next()).toMatchObject({ text: '""', value: "" });
	});
});

describe("type transforms", () => {
	test("can use keywords as type", () => {
		const lexer = compile([
			{
				match: /[a-zA-Z]+/,
				type: (x) =>
					keywords({
						"kw-class": "class",
						"kw-def": "def",
						"kw-if": "if",
					})(x) || "identifier",
			},
			{ type: "space", match: /\s+/ },
		]);
		lexer.reset("foo def");
		expect(Array.from(lexer).map((t) => t.type)).toEqual(["identifier", "space", "kw-def"]);
	});

	test("type can be a function", () => {
		const lexer = compile([{ type: () => "moo", match: /[a-zA-Z]+/ }]);
		lexer.reset("baa");
		expect(lexer.next()).toMatchObject({ type: "moo" });
	});

	test("supports case-insensitive keywords", () => {
		const caseInsensitiveKeywords = (map) => {
			const transform = keywords(map);
			return (text: string) => transform(text.toLowerCase());
		};
		const lexer = compile([
			{
				type: "space",
				match: " ",
			},
			{
				type: (x) =>
					caseInsensitiveKeywords({
						keyword: ["moo"],
					})(x) || "identifier",
				match: /[a-zA-Z]+/,
			},
		]);
		lexer.reset("mOo");
		expect(lexer.next()).toMatchObject({ type: "keyword", value: "mOo" });
		lexer.reset("cheese");
		expect(lexer.next()).toMatchObject({ type: "identifier", value: "cheese" });
	});

	test("can be used in an array", () => {
		const lexer = compile([
			{ type: (name) => "word-" + name, match: /[a-z]+/ },
			{ type: "space", match: / +/ },
		]);
		lexer.reset("foo ");
		expect(lexer.next()).toMatchObject({ type: "word-foo", value: "foo" });
		expect(lexer.next()).toMatchObject({ type: "space", value: " " });
	});
});
