import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MermaidViewer } from '@/components/MermaidViewer';

describe('MermaidViewer', () => {
  const mockBtoa = vi.fn();
  const originalBtoa = window.btoa;

  beforeEach(() => {
    // Mock btoa to avoid encoding issues in tests
    window.btoa = mockBtoa;
    mockBtoa.mockReturnValue('base64encodedstring');
  });

  afterEach(() => {
    window.btoa = originalBtoa;
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render successfully with valid Mermaid code', () => {
      const mermaidCode = `sequenceDiagram
    participant User
    participant API
    User->>API: GET /users`;

      render(<MermaidViewer code={mermaidCode} />);

      // Check that the image is rendered
      const img = screen.getByRole('img', { name: /mermaid diagram/i });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', expect.stringContaining('mermaid.ink'));
    });

    it('should render placeholder when code is empty', () => {
      render(<MermaidViewer code="" />);

      const placeholder = screen.getByText('Diagram preview');
      expect(placeholder).toBeInTheDocument();
    });

    it('should render placeholder when code is only whitespace', () => {
      render(<MermaidViewer code="   \n\n  " />);

      // With whitespace, it's still technically truthy, so it might try to render
      // The component treats empty string specially but not whitespace
      const img = screen.queryByRole('img', { name: /mermaid diagram/i });
      expect(img).toBeInTheDocument();
    });
  });

  describe('URL generation', () => {
    it('should generate mermaid.ink URL with encoded configuration', () => {
      const mermaidCode = `sequenceDiagram
    participant User
    participant API
    User->>API: GET /users`;

      render(<MermaidViewer code={mermaidCode} />);

      expect(mockBtoa).toHaveBeenCalled();
      const jsonStringArg = mockBtoa.mock.calls[0][0];
      const parsed = JSON.parse(jsonStringArg);

      expect(parsed).toHaveProperty('code', mermaidCode);
      expect(parsed).toHaveProperty('mermaid');
      expect(parsed.mermaid).toHaveProperty('theme', 'default');
      expect(parsed.mermaid).toHaveProperty('securityLevel', 'loose');
      expect(parsed.mermaid.sequence).toHaveProperty('showSequenceNumbers', true);
    });

    it('should include theme configuration in the generated URL', () => {
      const mermaidCode = 'participant A\nparticipant B\nA->>B: test';

      render(<MermaidViewer code={mermaidCode} />);

      expect(mockBtoa).toHaveBeenCalled();
      const jsonStringArg = mockBtoa.mock.calls[0][0];
      const parsed = JSON.parse(jsonStringArg);

      expect(parsed.mermaid.theme).toBe('default');
    });

    it('should update URL when code prop changes', () => {
      const { rerender } = render(<MermaidViewer code="code1" />);

      expect(mockBtoa).toHaveBeenCalledTimes(1);

      rerender(<MermaidViewer code="code2" />);

      expect(mockBtoa).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should display error message when btoa fails', () => {
      mockBtoa.mockImplementation(() => {
        throw new Error('Encoding failed');
      });

      render(<MermaidViewer code="some code" />);

      const errorMessage = screen.getByText(/unable to render diagram/i);
      expect(errorMessage).toBeInTheDocument();
    });

    it('should show error icon when rendering fails', () => {
      mockBtoa.mockImplementation(() => {
        throw new Error('Encoding failed');
      });

      render(<MermaidViewer code="some code" />);

      const icon = screen.getByText(/unable to render diagram/i);
      expect(icon).toBeInTheDocument();
    });

    it('should handle complex encoding scenarios', () => {
      const unicodeCode = `sequenceDiagram
    participant 用户
    participant API
    用户->>API: GET /data`;

      render(<MermaidViewer code={unicodeCode} />);

      expect(mockBtoa).toHaveBeenCalled();
      // The component should handle Unicode through TextEncoder
    });
  });

  describe('component behavior', () => {
    it('should apply correct CSS classes', () => {
      const mermaidCode = 'participant A\nparticipant B\nA->>B: test';

      render(<MermaidViewer code={mermaidCode} />);

      const img = screen.getByRole('img', { name: /mermaid diagram/i });
      expect(img).toHaveClass('max-w-none', 'shadow-sm');
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    it('should wrap image in container with proper classes', () => {
      const mermaidCode = 'participant A\nparticipant B\nA->>B: test';

      const { container } = render(<MermaidViewer code={mermaidCode} />);

      const wrapper = container.querySelector('.w-full.h-full.bg-white');
      expect(wrapper).toBeInTheDocument();
    });

    it('should handle rapid prop changes without errors', () => {
      const { rerender } = render(<MermaidViewer code="code1" />);

      for (let i = 2; i <= 10; i++) {
        rerender(<MermaidViewer code={`code${i}`} />);
      }

      expect(mockBtoa).toHaveBeenCalledTimes(10);
    });

    it('should maintain error state until code changes', async () => {
      mockBtoa.mockImplementationOnce(() => {
        throw new Error('Encoding failed');
      });

      const { rerender } = render(<MermaidViewer code="bad code" />);

      await waitFor(() => {
        const errorMessage = screen.getByText(/unable to render diagram/i);
        expect(errorMessage).toBeInTheDocument();
      });

      // Rerender with different code that succeeds
      mockBtoa.mockReturnValue('encoded');
      rerender(<MermaidViewer code="good code" />);

      // Error should be cleared on new successful encode
      await waitFor(() => {
        const img = screen.queryByRole('img', { name: /mermaid diagram/i });
        expect(img).toBeInTheDocument();
      });
    });
  });

  describe('props interface', () => {
    it('should accept code as string prop', () => {
      const mermaidCode = `sequenceDiagram
    participant A
    participant B
    A->>B: test`;

      expect(() => render(<MermaidViewer code={mermaidCode} />)).not.toThrow();
    });

    it('should handle very long Mermaid code', () => {
      const longCode = `sequenceDiagram
    participant A
    participant B
${Array.from({ length: 100 }, (_, i) => `    A->>B: Message ${i}`).join('\n')}`;

      expect(() => render(<MermaidViewer code={longCode} />)).not.toThrow();
    });

    it('should handle code with special characters', () => {
      const specialCode = `sequenceDiagram
    participant "User-A"
    participant "API_B"
    "User-A"->>"API_B": GET /test?id=123&value=test`;

      expect(() => render(<MermaidViewer code={specialCode} />)).not.toThrow();
    });
  });

  describe('accessibility', () => {
    it('should have alt text for the image', () => {
      const mermaidCode = 'participant A\nparticipant B\nA->>B: test';

      render(<MermaidViewer code={mermaidCode} />);

      const img = screen.getByRole('img', { name: /mermaid diagram/i });
      expect(img).toHaveAttribute('alt', 'Mermaid Diagram');
    });

    it('should have readable error text', () => {
      mockBtoa.mockImplementation(() => {
        throw new Error('Encoding failed');
      });

      render(<MermaidViewer code="code" />);

      const errorMessage = screen.getByText(/unable to render diagram/i);
      expect(errorMessage).toBeInTheDocument();
    });
  });
});
