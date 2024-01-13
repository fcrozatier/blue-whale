// describe("save/restore", () => {
// 	const testLexer = compile({
// 		word: /[a-z]+/,
// 		NL: { match: "\n", lineBreaks: true },
// 	});

// 	test("can save info", () => {
// 		testLexer.reset("one\ntwo");
// 		lexAll(testLexer);
// 		expect(testLexer.save()).toMatchObject({ line: 2, col: 4 });
// 	});

// 	test("can restore info", () => {
// 		testLexer.reset("\nthree", { line: 2, col: 4 });
// 		expect(testLexer).toMatchObject({ line: 2, col: 4, buffer: "\nthree" });
// 	});

// 	const statefulLexer = states({
// 		start: {
// 			word: /\w+/,
// 			eq: { match: "=", push: "ab" },
// 		},
// 		ab: {
// 			a: "a",
// 			b: "b",
// 			semi: { match: ";", push: "start" },
// 		},
// 	});

// 	test("can save state", () => {
// 		statefulLexer.reset("one=ab");
// 		statefulLexer.next();
// 		expect(statefulLexer.state).toBe("start");
// 		expect(statefulLexer.save()).toMatchObject({ state: "start" });
// 		statefulLexer.next();
// 		expect(statefulLexer.state).toBe("ab");
// 		expect(statefulLexer.save()).toMatchObject({ state: "ab" });
// 	});

// 	test("can restore state", () => {
// 		statefulLexer.reset("ab", { line: 0, col: 0, state: "ab" });
// 		expect(statefulLexer.state).toBe("ab");
// 		expect(lexAll(statefulLexer).length).toBe(2);
// 	});

// 	test("can save stack", () => {
// 		statefulLexer.reset("one=a;");
// 		statefulLexer.next(); // one
// 		statefulLexer.next(); // =
// 		expect(statefulLexer.save()).toMatchObject({ stack: ["start"] });
// 		statefulLexer.next(); // a
// 		statefulLexer.next(); // ;
// 		expect(statefulLexer.save()).toMatchObject({ stack: ["start", "ab"] });
// 	});

// 	test("can restore stack", () => {
// 		statefulLexer.reset("one=a;", { stack: ["one", "two"], state: "ab" });
// 		expect(statefulLexer.state).toBe("ab");
// 		expect(statefulLexer.stack).toEqual(["one", "two"]);
// 	});
// });
