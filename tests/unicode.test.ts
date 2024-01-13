// describe("unicode flag", () => {
// 	test("allows all rules to be /u", () => {
// 		expect(() => compile({ a: /foo/u, b: /bar/u, c: "quxx" })).not.toThrow();
// 		expect(() => compile({ a: /foo/u, b: /bar/, c: "quxx" })).toThrow(
// 			"If one rule is /u then all must be",
// 		);
// 		expect(() => compile({ a: /foo/, b: /bar/u, c: "quxx" })).toThrow(
// 			"If one rule is /u then all must be",
// 		);
// 	});

// 	test("unicode rules work with fallback token", () => {
// 		expect(() => compile({ a: fallback, b: /bar/u, c: /quxx/u })).not.toThrow();
// 	});

// 	test("supports unicode", () => {
// 		const lexer = compile({
// 			a: /[𝌆]/u,
// 		});
// 		lexer.reset("𝌆");
// 		expect(lexer.next()).toMatchObject({ value: "𝌆" });
// 		lexer.reset("𝌆".charCodeAt(0).toString());
// 		expect(() => lexer.next()).toThrow();

// 		const lexer2 = compile({
// 			a: /\u{1D356}/u,
// 		});
// 		lexer2.reset("𝍖");
// 		expect(lexer2.next()).toMatchObject({ value: "𝍖" });
// 		lexer2.reset("\\u{1D356}");
// 		expect(() => lexer2.next()).toThrow();
// 	});
// });
