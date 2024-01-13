// describe("stateful lexer", () => {
// 	const statefulLexer = states({
// 		start: {
// 			word: /\w+/,
// 			eq: { match: "=", next: "ab" },
// 			myError: error,
// 		},
// 		ab: {
// 			a: "a",
// 			b: "b",
// 			semi: { match: ";", next: "start" },
// 		},
// 	});

// 	test("switches states", () => {
// 		statefulLexer.reset("one=ab;two=");
// 		expect(lexAll(statefulLexer).map(({ type, value }) => [type, value])).toEqual([
// 			["word", "one"],
// 			["eq", "="],
// 			["a", "a"],
// 			["b", "b"],
// 			["semi", ";"],
// 			["word", "two"],
// 			["eq", "="],
// 		]);
// 	});

// 	test("supports errors", () => {
// 		statefulLexer.reset("foo!");
// 		expect(lexAll(statefulLexer).map(({ type, value }) => [type, value])).toEqual([
// 			["word", "foo"],
// 			["myError", "!"],
// 		]);
// 	});

// 	const parens = states({
// 		start: {
// 			word: /\w+/,
// 			lpar: { match: "(", push: "inner" },
// 			rpar: ")",
// 		},
// 		inner: {
// 			thing: /\w+/,
// 			lpar: { match: "(", push: "inner" },
// 			rpar: { match: ")", pop: 1 },
// 		},
// 	});

// 	test("maintains a stack", () => {
// 		parens.reset("a(b(c)d)e");
// 		expect(lexAll(parens).map(({ type, value }) => [type, value])).toEqual([
// 			["word", "a"],
// 			["lpar", "("],
// 			["thing", "b"],
// 			["lpar", "("],
// 			["thing", "c"],
// 			["rpar", ")"],
// 			["thing", "d"],
// 			["rpar", ")"],
// 			["word", "e"],
// 		]);
// 	});

// 	test("allows popping too many times", () => {
// 		parens.reset(")e");
// 		expect(lexAll(parens).map(({ type, value }) => [type, value])).toEqual([
// 			["rpar", ")"],
// 			["word", "e"],
// 		]);
// 	});

// 	test("resets state", () => {
// 		statefulLexer.reset("one=a");
// 		expect(statefulLexer.state).toBe("start");
// 		expect(lexAll(statefulLexer).map(({ type, value }) => [type, value])).toEqual([
// 			["word", "one"],
// 			["eq", "="],
// 			["a", "a"],
// 		]);
// 		expect(statefulLexer.state).toBe("ab");
// 		statefulLexer.reset("one=ab;two=");
// 		expect(statefulLexer.state).toBe("start");
// 	});

// 	test("lexes interpolation example", () => {
// 		const lexer = moo
// 			.states({
// 				main: {
// 					strstart: { match: "`", push: "lit" },
// 					ident: /\w+/,
// 					lbrace: { match: "{", push: "main" },
// 					rbrace: { match: "}", pop: 1 },
// 					colon: ":",
// 					space: { match: /\s+/, lineBreaks: true },
// 				},
// 				lit: {
// 					interp: { match: "${", push: "main" },
// 					escape: /\\./,
// 					strend: { match: "`", pop: 1 },
// 					const: { match: /(?:[^$`]|\$(?!\{))+/, lineBreaks: true },
// 				},
// 			})
// 			.reset("`a${{c: d}}e`");
// 		expect(
// 			lexAll(lexer)
// 				.map((t) => t.type)
// 				.join(" "),
// 		).toBe("strstart const interp lbrace ident colon space ident rbrace rbrace const strend");
// 	});

// 	test("warns for non-existent states", () => {
// 		expect(() => states({ start: { bar: { match: "bar", next: "foo" } } })).toThrow(
// 			"Missing state 'foo'",
// 		);
// 		expect(() => states({ start: { bar: { match: "bar", push: "foo" } } })).toThrow(
// 			"Missing state 'foo'",
// 		);
// 		expect(() =>
// 			states({ start: { foo: "fish", bar: { match: "bar", push: "foo" } } }),
// 		).toThrow("Missing state 'foo'");
// 	});

// 	test("warns for non-boolean pop", () => {
// 		// @ts-ignore
// 		expect(() => states({ start: { bar: { match: "bar", pop: "cow" } } })).toThrow(
// 			"pop must be 1 (in token 'bar' of state 'start')",
// 		);
// 		// @ts-ignore
// 		expect(() => states({ start: { bar: { match: "bar", pop: 2 } } })).toThrow(
// 			"pop must be 1 (in token 'bar' of state 'start')",
// 		);
// 		expect(() => states({ start: { bar: { match: "bar", pop: 1 } } })).not.toThrow();
// 		expect(() => states({ start: { bar: { match: "bar", pop: 1 } } })).not.toThrow();
// 		expect(() => states({ start: { bar: { match: "bar", pop: 1 } } })).not.toThrow();
// 		expect(() => states({ start: { bar: { match: "bar", pop: 1 } } })).not.toThrow();
// 	});
// });
