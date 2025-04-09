import React from 'react';
import { render, screen } from '@testing-library/react';
import LanguageSelector from '../../components/LanguageSelector';

test('renders LanguageSelector component', () => {
  render(<LanguageSelector />);
  const selectElement = screen.getByRole('combobox');
  expect(selectElement).toBeInTheDocument();
});