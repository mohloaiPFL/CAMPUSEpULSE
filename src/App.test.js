import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { getFirebaseErrorMessage } from './services/requestService';

test('renders the student service portal', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /student services, made simple/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /explore services/i })).toHaveAttribute('href', '/services');
});

test('shows the searchable service catalogue', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('link', { name: 'Services' }));
  expect(screen.getByRole('heading', { name: /what do you need a hand with/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Academic Transcript' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Technical Support' })).toBeInTheDocument();
});

test('shows validation messages for an incomplete request', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('link', { name: /make a request/i }));
  fireEvent.click(screen.getByRole('button', { name: /send my request/i }));
  expect(screen.getByText('Please enter your full name.')).toBeInTheDocument();
  expect(screen.getByText('Please enter your student ID.')).toBeInTheDocument();
  expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
  expect(screen.getByText('Please choose a service.')).toBeInTheDocument();
  expect(screen.getByText('Please add at least 10 characters so we can help.')).toBeInTheDocument();
});

test('requires a name made of letters and limits it to 20 characters', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('link', { name: /make a request/i }));
  const name = screen.getByPlaceholderText('e.g. Mpho Ndlovu');
  expect(name).toHaveAttribute('maxLength', '20');
  fireEvent.change(name, { target: { value: 'Mpho2 Ndlovu' } });
  expect(name).toHaveValue('Mpho Ndlovu');
  expect(screen.getByText('Numbers are not allowed in the name field.')).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText('Up to 9 digits'), { target: { value: '12345' } });
  fireEvent.change(screen.getByPlaceholderText('you@university.edu'), { target: { value: 'student@example.com' } });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'transcript' } });
  fireEvent.change(screen.getByPlaceholderText('Share any details that will help us understand your request...'), { target: { value: 'I need an official transcript.' } });

  fireEvent.change(name, { target: { value: 'A'.repeat(21) } });
  expect(name).toHaveValue('A'.repeat(20));
});

test('requires a student ID containing one to nine digits', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('link', { name: /make a request/i }));
  const studentId = screen.getByPlaceholderText('Up to 9 digits');
  expect(studentId).toHaveAttribute('maxLength', '9');
  expect(studentId).toHaveAttribute('inputMode', 'numeric');
  fireEvent.change(screen.getByPlaceholderText('e.g. Mpho Ndlovu'), { target: { value: 'Mpho Ndlovu' } });
  fireEvent.change(studentId, { target: { value: '12345A' } });
  expect(studentId).toHaveValue('12345');
  expect(screen.getByText('Student ID can contain numbers only; letters are not allowed.')).toBeInTheDocument();
  fireEvent.change(studentId, { target: { value: '1234567890' } });
  expect(studentId).toHaveValue('1234567890');
  fireEvent.change(screen.getByPlaceholderText('you@university.edu'), { target: { value: 'student@example.com' } });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'transcript' } });
  fireEvent.change(screen.getByPlaceholderText('Share any details that will help us understand your request...'), { target: { value: 'I need an official transcript.' } });
  fireEvent.click(screen.getByRole('button', { name: /send my request/i }));
  expect(screen.getByText('Student ID can contain numbers only; use 1 to 9 digits.')).toBeInTheDocument();

  fireEvent.change(studentId, { target: { value: '12A45' } });
  expect(studentId).toHaveValue('1245');
});

test('explains how to fix Firebase Authentication configuration errors', () => {
  expect(getFirebaseErrorMessage({ code: 'auth/configuration-not-found' })).toMatch(/enable Anonymous/i);
  expect(getFirebaseErrorMessage({ code: 'auth/operation-not-allowed' })).toMatch(/same Firebase project as Firestore/i);
  expect(getFirebaseErrorMessage({ code: 'auth/unauthorized-domain' })).toMatch(/add localhost/i);
});
