const assert = require('assert');
const {computeCSSTokenLength, computeJSTokenLength} = require('../../lib/minification-estimator');

/* eslint-env jest */

describe('minification estimator', () => {
  describe('CSS', () => {
    it('should compute length of meaningful content', () => {
      const full = `
        /*
         * a complicated comment
         * that is
         * several
         * lines
         */
        .my-class {
          /* a simple comment */
          width: 100px;
          height: 100px;
        }
      `;

      const minified = '.my-class{width:100px;height:100px;}';
      assert.equal(computeCSSTokenLength(full), minified.length);
    });

    it('should handle string edge cases', () => {
      const pairs = [
        ['.my-class { content: "/*"; }', '.my-class{content:"/*";}'],
        ['.my-class { content: \'/* */\'; }', '.my-class{content:\'/* */\';}'],
        ['.my-class { content: "/*\\\\a"; }', '.my-class{content:"/*\\\\a";}'],
        ['.my-class { content: "/*\\"a"; }', '.my-class{content:"/*\\"a";}'],
        ['.my-class { content: "hello }', '.my-class { content: "hello }'],
        ['.my-class { content: "hello" }', '.my-class{content:"hello"}'],
      ];

      for (const [full, minified] of pairs) {
        assert.equal(
          computeCSSTokenLength(full),
          minified.length,
          `did not handle ${full} properly`
        );
      }
    });

    it('should handle comment edge cases', () => {
      const full = `
        /* here is a cool "string I found" */
        .my-class {
          content: "/*";
        }
      `;

      const minified = '.my-class{content:"/*";}';
      assert.equal(computeCSSTokenLength(full), minified.length);
    });

    it('should handle license comments', () => {
      const full = `
        /*!
         * @LICENSE
         * Apache 2.0
         */
        .my-class {
          width: 100px;
        }
      `;

      const minified = `/*!
         * @LICENSE
         * Apache 2.0
         */.my-class{width:100px;}`;
      assert.equal(computeCSSTokenLength(full), minified.length);
    });

    it('should handle unbalanced comments', () => {
      const full = `
        /*
        .my-class {
          width: 100px;
        }
      `;

      assert.equal(computeCSSTokenLength(full), full.length);
    });

    it('should handle data URIs', () => {
      const uri = 'data:image/jpeg;base64,asdfadiosgjwiojasfaasd';
      const full = `
        .my-other-class {
          background: data("${uri}");
          height: 100px;
        }
     `;

      const minified = `.my-other-class{background:data("${uri}");height:100px;}`;
      assert.equal(computeCSSTokenLength(full), minified.length);
    });

    it('should handle reeally long strings', () => {
      let hugeCss = '';
      for (let i = 0; i < 10000; i++) {
        hugeCss += `.my-class-${i} { width: 100px; height: 100px; }\n`;
      }

      assert.ok(computeCSSTokenLength(hugeCss) < 0.9 * hugeCss.length);
    });
  });

  describe('JS', () => {
    it('should compute the length of tokens', () => {
      const js = `
        const foo = 1;
        const bar = 2;
        console.log(foo + bar);
      `;

      const tokensOnly = 'constfoo=1;constbar=2;console.log(foo+bar);';
      assert.equal(computeJSTokenLength(js), tokensOnly.length);
    });

    it('should handle single-line comments', () => {
      const js = `
        // ignore me
        12345
      `;

      assert.equal(computeJSTokenLength(js), 5);
    });

    it('should handle multi-line comments', () => {
      const js = `
        /* ignore
         * me
         * too
         */
        12345
      `;

      assert.equal(computeJSTokenLength(js), 5);
    });

    it('should handle strings', () => {
      const pairs = [
        [`'//123' // ignored`, 7], // single quotes
        [`"//123" // ignored`, 7], // double quotes
        [`'     ' // ignored`, 7], // whitespace in strings count
        [`"\\" // not ignored"`, 19], // escaped quotes handled
      ];

      for (const [js, len] of pairs) {
        assert.equal(computeJSTokenLength(js), len, `expected '${js}' to have token length ${len}`);
      }
    });

    it('should handle template literals', () => {
      const js = `
        \`/* don't ignore this */\` // 25 characters
        12345
      `;

      assert.equal(computeJSTokenLength(js), 25 + 5);
    });

    it('should handle regular expressions', () => {
      const js = `
        /regex '/ // this should be in comment not string 123456789
      `;

      assert.equal(computeJSTokenLength(js), 9);
    });

    it('should distinguish regex from divide', () => {
      const js = `
        return 1 / 2 // hello
      `;

      assert.equal(computeJSTokenLength(js), 9);
    });
  });
})
