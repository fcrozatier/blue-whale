import { describe, expect, test } from "vitest";
import { compile } from "../blue-whale";
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
