import { languageDetection } from '../../utils/languageDetection';

describe('languageDetection', () => {
	test('detects English', () => {
		expect(languageDetection('Hello')).toBe('English');
	});

	test('detects Spanish', () => {
		expect(languageDetection('Hola')).toBe('Spanish');
	});

	test('detects French', () => {
		expect(languageDetection('Bonjour')).toBe('French');
	});

	test('returns unknown for unsupported language', () => {
		expect(languageDetection('')).toBe('Unknown');
	});
});