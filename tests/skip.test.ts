import { describe, test, expect } from "vitest";
import { compile, states } from "../index";
import { lexAll } from "./utils";

describe("skip channel", () => {
	const simpleLexer = compile([
		{ type: "num", match: /\d+/ },
		{
			type: "word",
			match: /\w+/,
		},
		{ type: "space", match: /\s+/, option: "skip" },
	]);
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
				{ type: "b", match: "b", option: "skip" },
				{ type: "semi", match: ";", next: "start" },
			],
		},
		"start",
	);

	test("can skip", () => {
		simpleLexer.reset(" 123 one ab 234 ");
		const tokens = lexAll(simpleLexer);
		expect(tokens.map(({ type, value }) => [type, value])).toEqual([
			["num", "123"],
			["word", "one"],
			["word", "ab"],
			["num", "234"],
		]);
	});
	test("supports states", () => {
		statefulLexer.reset("abc=ab;");
		expect(lexAll(statefulLexer).map(({ type, value }) => [type, value])).toEqual([
			["word", "abc"],
			["eq", "="],
			["a", "a"],
			["semi", ";"],
		]);
	});
});
