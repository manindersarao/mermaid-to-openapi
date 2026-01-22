import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { GuideSection } from '../../../src/components/GuideSection';

describe('GuideSection Component', () => {
  const mockProps = {
    title: 'Test Guide',
    description: 'This is a test description',
    code: 'sequenceDiagram\n  User->>API: GET /test',
    onApply: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component successfully', () => {
      render(<GuideSection {...mockProps} />);
      expect(screen.getByText('Test Guide')).toBeInTheDocument();
    });

    it('should render the title', () => {
      render(<GuideSection {...mockProps} />);
      expect(screen.getByText('Test Guide')).toBeInTheDocument();
    });

    it('should render the description', () => {
      render(<GuideSection {...mockProps} />);
      expect(screen.getByText('This is a test description')).toBeInTheDocument();
    });

    it('should render the code in a code element', () => {
      render(<GuideSection {...mockProps} />);
      const codeElement = screen.getByText(/sequenceDiagram/);
      expect(codeElement).toBeInTheDocument();
      expect(codeElement.tagName.toLowerCase()).toBe('code');
    });

    it('should render the "Try this" button', () => {
      render(<GuideSection {...mockProps} />);
      expect(screen.getByText('Try this')).toBeInTheDocument();
    });

    it('should render with proper CSS classes', () => {
      const { container } = render(<GuideSection {...mockProps} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('border', 'border-slate-200', 'rounded-lg', 'overflow-hidden', 'bg-white', 'shadow-sm');
    });
  });

  describe('Interaction', () => {
    it('should call onApply with the code when "Try this" button is clicked', () => {
      render(<GuideSection {...mockProps} />);

      const button = screen.getByText('Try this');
      fireEvent.click(button);

      expect(mockProps.onApply).toHaveBeenCalledTimes(1);
      expect(mockProps.onApply).toHaveBeenCalledWith(mockProps.code);
    });

    it('should pass the exact code string to onApply handler', () => {
      const complexCode = `sequenceDiagram
    participant User
    participant API

    User->>API: POST /data
    API-->>User: 200 OK`;

      const props = {
        ...mockProps,
        code: complexCode,
      };

      render(<GuideSection {...props} />);

      const button = screen.getByText('Try this');
      fireEvent.click(button);

      expect(props.onApply).toHaveBeenCalledWith(complexCode);
    });
  });

  describe('Content Display', () => {
    it('should display multi-line code correctly', () => {
      const multiLineCode = `sequenceDiagram
    User->>API: GET /test
    API-->>User: 200 OK`;

      const props = {
        ...mockProps,
        code: multiLineCode,
      };

      render(<GuideSection {...props} />);

      const codeElement = screen.getByText((content) => {
        return content.includes('User->>API: GET /test') && content.includes('API-->>User: 200 OK');
      });

      expect(codeElement).toBeInTheDocument();
    });

    it('should preserve code formatting with whitespace', () => {
      const formattedCode = `sequenceDiagram
    participant A
    participant B`;

      const props = {
        ...mockProps,
        code: formattedCode,
      };

      render(<GuideSection {...props} />);

      expect(screen.getByText(/participant A/)).toBeInTheDocument();
      expect(screen.getByText(/participant B/)).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should have a header section with title and button', () => {
      const { container } = render(<GuideSection {...mockProps} />);

      const header = container.querySelector('.bg-slate-50');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('px-4', 'py-3', 'border-b', 'border-slate-200', 'flex', 'justify-between', 'items-center');
    });

    it('should have a content section with description and code', () => {
      const { container } = render(<GuideSection {...mockProps} />);

      const contentSection = container.querySelectorAll('.p-4');
      expect(contentSection.length).toBeGreaterThan(0);
    });

    it('should display code in a dark-themed container', () => {
      const { container } = render(<GuideSection {...mockProps} />);

      const codeContainer = container.querySelector('.bg-slate-900');
      expect(codeContainer).toBeInTheDocument();
      expect(codeContainer).toHaveClass('rounded-md', 'p-3', 'relative', 'group');
    });
  });

  describe('Different Content Variations', () => {
    it('should render correctly with simple content', () => {
      const simpleProps = {
        title: 'Simple Guide',
        description: 'Simple description',
        code: 'A->>B: Test',
        onApply: vi.fn(),
      };

      render(<GuideSection {...simpleProps} />);
      expect(screen.getByText('Simple Guide')).toBeInTheDocument();
      expect(screen.getByText('Simple description')).toBeInTheDocument();
    });

    it('should render correctly with complex mermaid diagram', () => {
      const complexProps = {
        title: 'Complex Diagram',
        description: 'Complex multi-participant diagram',
        code: `sequenceDiagram
    participant Client
    participant Gateway
    participant Service
    participant Database

    Client->>Gateway: GET /api/users
    Gateway->>Service: GET /users
    Service->>Database: SELECT * FROM users
    Database-->>Service: {"users": []}
    Service-->>Gateway: 200 OK
    Gateway-->>Client: 200 OK`,
        onApply: vi.fn(),
      };

      render(<GuideSection {...complexProps} />);

      expect(screen.getByText('Complex Diagram')).toBeInTheDocument();
      expect(screen.getByText(/GET \/api\/users/)).toBeInTheDocument();
    });

    it('should render with special characters in code', () => {
      const specialCharProps = {
        title: 'Special Characters',
        description: 'Code with special characters',
        code: 'User->>API: GET /test?param={value}&filter=true',
        onApply: vi.fn(),
      };

      render(<GuideSection {...specialCharProps} />);

      expect(screen.getByText(/GET \/test\?param=/)).toBeInTheDocument();
    });
  });
});
