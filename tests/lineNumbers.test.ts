// describe("line numbers", () => {
// 	const testLexer = compile({
// 		WS: / +/,
// 		word: /[a-z]+/,
// 		NL: { match: /\n/, lineBreaks: true },
// 	});

// 	test("counts line numbers", () => {
// 		const tokens = lexAll(testLexer.reset("cow\nfarm\ngrass"));
// 		expect(tokens.map((t) => t.value)).toEqual(["cow", "\n", "farm", "\n", "grass"]);
// 		expect(tokens.map((t) => t.lineBreaks)).toEqual([0, 1, 0, 1, 0]);
// 		expect(tokens.map((t) => t.line)).toEqual([1, 1, 2, 2, 3]);
// 		expect(tokens.map((t) => t.col)).toEqual([1, 4, 1, 5, 1]);
// 	});

// 	test("tracks columns", () => {
// 		const lexer = compile({
// 			WS: / +/,
// 			thing: { match: /[a-z\n]+/, lineBreaks: true },
// 		});
// 		lexer.reset("pie cheese\nsalad what\n ");
// 		expect(lexer.next()).toMatchObject({ value: "pie", col: 1 });
// 		expect(lexer.next()).toMatchObject({ value: " ", col: 4 });
// 		expect(lexer.next()).toMatchObject({
// 			value: "cheese\nsalad",
// 			col: 5,
// 			line: 1,
// 		});
// 		expect(lexer.next()).toMatchObject({ value: " ", col: 6, line: 2 });
// 		expect(lexer.next()).toMatchObject({ value: "what\n", col: 7, line: 2 });
// 		expect(lexer.next()).toMatchObject({ value: " ", col: 1, line: 3 });
// 	});

// 	test("tries to warn if rule matches \\n", () => {
// 		expect(() => compile({ whitespace: /\s+/ })).toThrow();
// 		expect(() => compile({ multiline: /q[^]*/ })).not.toThrow();
// 	});

// 	test("resets line/col", () => {
// 		const lexer = compile({
// 			WS: / +/,
// 			word: /[a-z]+/,
// 			NL: { match: "\n", lineBreaks: true },
// 		});
// 		lexer.reset("potatoes\nsalad");
// 		expect(lexer).toMatchObject({ buffer: "potatoes\nsalad", line: 1, col: 1 });
// 		lexAll(lexer);
// 		expect(lexer).toMatchObject({ line: 2, col: 6 });
// 		lexer.reset("cheesecake");
// 		expect(lexer).toMatchObject({ buffer: "cheesecake", line: 1, col: 1 });
// 	});
// });
