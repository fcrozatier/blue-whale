// describe("example: python", () => {
// 	const pythonLexer = python.pythonLexer;

// 	test("1 + 2", () => {
// 		expect(python.outputTokens("1 + 2")).toEqual([
// 			'NUMBER "1"',
// 			'OP "+"',
// 			'NUMBER "2"',
// 			'ENDMARKER ""',
// 		]);
// 	});

// 	// use non-greedy matching
// 	test("triple-quoted strings", () => {
// 		const example = '"""abc""" 1+1 """def"""';
// 		expect(lexAll(pythonLexer.reset(example)).map((t) => t.value)).toEqual([
// 			"abc",
// 			" ",
// 			"1",
// 			"+",
// 			"1",
// 			" ",
// 			"def",
// 		]);
// 	});

// 	test("example python file", () => {
// 		expect(python.outputTokens(python.pythonFile)).toEqual(python.pythonTokens);
// 	});

// 	test("kurt python", () => {
// 		const tokens = python.outputTokens(fs.readFileSync("test/kurt.py", "utf-8"));
// 		expect(tokens).toMatchSnapshot();
// 		expect(tokens.pop()).toBe('ENDMARKER ""');
// 		tokens.pop();
// 		expect(tokens.pop()).not.toBe('ERRORTOKEN ""');
// 	});
// });
