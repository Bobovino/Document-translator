test('phoneticTranscription should return correct phonetic representation', () => {
	expect(phoneticTranscription('hello')).toBe('həˈloʊ');
	expect(phoneticTranscription('world')).toBe('wɜrld');
	expect(phoneticTranscription('test')).toBe('tɛst');
});