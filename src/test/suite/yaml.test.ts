import * as assert from 'assert';
import { hasYamlFrontmatter, extractYamlFrontmatter, parseYamlFrontmatter } from '../../compilation_tools/yamlHandler';

suite('YAML Frontmatter Tests', () => {
    
    suite('hasYamlFrontmatter', () => {
        test('detects valid frontmatter', () => {
            const text = '---\ntitle: Test\n---\nContent';
            assert.strictEqual(hasYamlFrontmatter(text), true);
        });

        test('returns false when no frontmatter', () => {
            const text = 'Just regular content';
            assert.strictEqual(hasYamlFrontmatter(text), false);
        });

        test('handles leading whitespace', () => {
            const text = '  \n\n---\ntitle: Test\n---';
            assert.strictEqual(hasYamlFrontmatter(text), true);
        });

        test('returns false for --- not at start', () => {
            const text = 'Some text\n---\ntitle: Test\n---';
            assert.strictEqual(hasYamlFrontmatter(text), false);
        });
    });

    suite('extractYamlFrontmatter', () => {
        test('extracts valid frontmatter', () => {
            const text = '---\ntitle: Test\nauthor: Me\n---\nContent';
            const expected = 'title: Test\nauthor: Me';
            assert.strictEqual(extractYamlFrontmatter(text), expected);
        });

        test('returns null when no frontmatter', () => {
            const text = 'Just regular content';
            assert.strictEqual(extractYamlFrontmatter(text), null);
        });

        test('returns null when closing --- missing', () => {
            const text = '---\ntitle: Test\nNo closing';
            assert.strictEqual(extractYamlFrontmatter(text), null);
        });

        test('handles empty frontmatter', () => {
            const text = '---\n---\nContent';
            assert.strictEqual(extractYamlFrontmatter(text), '');
        });

        test('extracts with leading whitespace', () => {
            const text = '  \n---\ntitle: Test\n---';
            assert.strictEqual(extractYamlFrontmatter(text), 'title: Test');
        });

        test('handles --- in content after frontmatter', () => {
            const text = '---\ntitle: Test\n---\nContent with --- in it';
            const expected = 'title: Test';
            assert.strictEqual(extractYamlFrontmatter(text), expected);
        });

        test('ignores extra spaces around closing ---', () => {
            const text = '---\ntitle: Test\n---  \nContent';
            assert.strictEqual(extractYamlFrontmatter(text), 'title: Test');
        });
    });

    suite('parseYamlFrontmatter', () => {
        test('parses simple YAML', () => {
            const text = '---\ntitle: Test Document\nauthor: John Doe\n---\nContent';
            const result = parseYamlFrontmatter(text);
            assert.strictEqual(result.title, 'Test Document');
            assert.strictEqual(result.author, 'John Doe');
        });

        test('parses nested YAML', () => {
            const text = '---\nmetadata:\n  title: Test\n  tags:\n    - research\n    - science\n---';
            const result = parseYamlFrontmatter(text);
            assert.strictEqual(result.metadata.title, 'Test');
            assert.strictEqual(result.metadata.tags.length, 2);
            assert.strictEqual(result.metadata.tags[0], 'research');
        });

        test('returns null for no frontmatter', () => {
            const text = 'Just content';
            assert.strictEqual(parseYamlFrontmatter(text), null);
        });

        test('returns null for malformed YAML', () => {
            const text = '---\ntitle: Test\n  bad: indentation:\n---';
            const result = parseYamlFrontmatter(text);
            assert.strictEqual(result, null);
        });

        test('handles empty frontmatter', () => {
            const text = '---\n---\nContent';
            const result = parseYamlFrontmatter(text);
            // Empty YAML can parse as null or undefined depending on js-yaml version
            assert.ok(result === null || result === undefined);
        });

        test('parses arrays', () => {
            const text = '---\ntags:\n  - markdown\n  - research\n  - writing\n---';
            const result = parseYamlFrontmatter(text);
            assert.ok(Array.isArray(result.tags));
            assert.strictEqual(result.tags.length, 3);
        });

        test('parses booleans and numbers', () => {
            const text = '---\npublished: true\nversion: 2\npriority: 3.14\n---';
            const result = parseYamlFrontmatter(text);
            assert.strictEqual(result.published, true);
            assert.strictEqual(result.version, 2);
            assert.strictEqual(result.priority, 3.14);
        });

        test('handles dates', () => {
            const text = '---\ndate: 2024-12-03\n---';
            const result = parseYamlFrontmatter(text);
            assert.ok(result.date instanceof Date);
        });
    });
});