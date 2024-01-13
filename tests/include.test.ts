// describe("include", () => {
// 	test("handles fast matching", () => {
// 		const l = states({
// 			main: {
// 				"{": "{",
// 				include: "shared",
// 			},
// 			shared: {
// 				"*": "*",
// 				word: /[a-z]+/,
// 			},
// 		});

// 		l.reset("{foo*");
// 		Array.from(l);
// 	});

// 	test("handles multiple states with same fast match", () => {
// 		const l = states({
// 			main: {
// 				include: "shared",
// 				"{": { match: "{", push: "inner" },
// 			},
// 			inner: {
// 				"}": { match: "}", pop: 1 },
// 				include: "shared",
// 			},
// 			shared: {
// 				"*": "*",
// 				word: /[a-z]+/,
// 			},
// 		});

// 		l.reset("foo{bar*}");
// 		Array.from(l);
// 	});

// 	test("handles cycles", () => {
// 		const lexer = states({
// 			$all: {
// 				ws: { match: /\s+/, lineBreaks: true },
// 			},
// 			a: {
// 				a: /a\w/,
// 				switch: { match: "|", next: "b" },
// 				include: "b",
// 			},
// 			b: {
// 				b: /\wb/,
// 				switch: { match: "|", next: "a" },
// 				include: "a",
// 			},
// 		});

// 		lexer.reset("ab ac bb ac cb | ab ac bb ac cb");
// 		expect(
// 			Array.from(lexer)
// 				.filter((tok) => tok.type !== "ws")
// 				.map((tok) => tok.type + " " + tok.value),
// 		).toEqual([
// 			"a ab",
// 			"a ac",
// 			"b bb",
// 			"a ac",
// 			"b cb",
// 			"switch |",
// 			"b ab",
// 			"a ac",
// 			"b bb",
// 			"a ac",
// 			"b cb",
// 		]);
// 	});

// 	test("JS example", () => {
// 		const lexer = states({
// 			$all: { err: error },
// 			main: {
// 				include: "std",
// 			},
// 			brace: {
// 				include: "std",
// 				rbrace: { match: "}", pop: 1 },
// 			},
// 			template: {
// 				include: "std",
// 				tmid: { match: /}(?:\\[^]|[^\\`])*?\${/, value: (s) => s.slice(1, -2) },
// 				tend: {
// 					match: /}(?:\\[^]|[^\\`])*?`/,
// 					value: (s) => s.slice(1, -1),
// 					pop: 1,
// 				},
// 			},
// 			std: {
// 				include: ["comment", "ws"],
// 				id: /[A-Za-z]\w*/,
// 				op: /[!=]==|\+[+=]?|-[-=]|<<=?|>>>?=?|&&?|\|\|?|[<>!=/*&|^%]=|[~!,/*^?:%]/,
// 				tbeg: {
// 					match: /`(?:\\[^]|[^\\`])*?\${/,
// 					value: (s) => s.slice(1, -2),
// 					push: "template",
// 				},
// 				tsim: { match: /`(?:\\[^]|[^\\`])*?`/, value: (s) => s.slice(1, -1) },
// 				str: {
// 					match: /'(?:\\[^]|[^\\'])*?'|"(?:\\[^]|[^\\"])*?"/,
// 					value: (s) => s.slice(1, -1),
// 				},
// 				lbrace: { match: "{", push: "brace" },
// 			},
// 			ws: {
// 				ws: { match: /\s+/, lineBreaks: true },
// 			},
// 			comment: {
// 				lc: /\/\/.+/,
// 				bc: /\/\*[^]*?\*\//,
// 			},
// 		});

// 		lexer.reset(
// 			'`just ` + /* comment */ // line\n`take ${one} and ${a}${two} and a` + {three: `${{four: five}}}`} / "six"',
// 		);
// 		expect(
// 			Array.from(lexer)
// 				.filter((tok) => tok.type !== "ws")
// 				.map((tok) => tok.type + " " + tok.value),
// 		).toEqual([
// 			"tsim just ",
// 			"op +",
// 			"bc /* comment */",
// 			"lc // line",
// 			"tbeg take ",
// 			"id one",
// 			"tmid  and ",
// 			"id a",
// 			"tmid ",
// 			"id two",
// 			"tend  and a",
// 			"op +",
// 			"lbrace {",
// 			"id three",
// 			"op :",
// 			"tbeg ",
// 			"lbrace {",
// 			"id four",
// 			"op :",
// 			"id five",
// 			"rbrace }",
// 			"tend }",
// 			"rbrace }",
// 			"op /",
// 			"str six",
// 		]);
// 	});
// });
