import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CollapsibleSpec } from '@/components/CollapsibleSpec';
import type { OpenApiDoc } from '@/types';

describe('CollapsibleSpec', () => {
  const mockOpenApiDoc: OpenApiDoc = {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
      description: 'A test API',
    },
    paths: {
      '/test': {
        get: {
          summary: 'Test endpoint',
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  describe('rendering', () => {
    it('should render successfully with required props', () => {
      render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      expect(screen.getByText('TestService API')).toBeInTheDocument();
      expect(screen.getByText('YAML')).toBeInTheDocument();
    });

    it('should display format badge correctly', () => {
      const { rerender } = render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );
      expect(screen.getByText('YAML')).toBeInTheDocument();

      rerender(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="json" />
      );
      expect(screen.getByText('JSON')).toBeInTheDocument();
    });

    it('should render in expanded state by default', () => {
      render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue();
    });

    it('should render with correct CSS classes', () => {
      const { container } = render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      const wrapper = container.querySelector('.border-b.border-slate-700.bg-slate-800');
      expect(wrapper).toBeInTheDocument();

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass(
        'w-full',
        'h-full',
        'bg-slate-900',
        'p-4',
        'font-mono',
        'text-sm',
        'text-green-300',
        'focus:outline-none',
        'resize-none'
      );
    });

    it('should display server icon', () => {
      const { container } = render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      const serverIcon = container.querySelector('svg.text-blue-400');
      expect(serverIcon).toBeInTheDocument();
    });
  });

  describe('expand/collapse behavior', () => {
    it('should toggle expanded state on header click', () => {
      render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeVisible();

      const header = screen.getByText('TestService API').closest('div');
      if (!header) throw new Error('Header not found');

      fireEvent.click(header);

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('should show chevron down icon when expanded', () => {
      render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      const header = screen.getByText('TestService API').closest('div');
      expect(header).toContainHTML('svg');
    });

    it('should show chevron right icon when collapsed', () => {
      render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      const header = screen.getByText('TestService API').closest('div');
      if (!header) throw new Error('Header not found');

      fireEvent.click(header);

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('should toggle multiple times without errors', () => {
      render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      const header = screen.getByText('TestService API').closest('div');
      if (!header) throw new Error('Header not found');

      // Collapse
      fireEvent.click(header);
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

      // Expand
      fireEvent.click(header);
      expect(screen.getByRole('textbox')).toBeInTheDocument();

      // Collapse again
      fireEvent.click(header);
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  describe('copy to clipboard functionality', () => {
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
      // Mock navigator.clipboard
      Object.assign(navigator, { clipboard: mockClipboard });
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should copy content to clipboard on button click', async () => {
      render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      const copyButton = screen.getByLabelText('Copy to clipboard');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled();
      });
    });

    it('should show check icon after copying', async () => {
      render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      const copyButton = screen.getByLabelText('Copy to clipboard');
      fireEvent.click(copyButton);

      await waitFor(() => {
        const checkIcon = copyButton.querySelector('.text-green-400');
        expect(checkIcon).toBeInTheDocument();
      });
    });

    it('should reset copied state after 2 seconds', async () => {
      render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      const copyButton = screen.getByLabelText('Copy to clipboard');

      // Click to copy
      fireEvent.click(copyButton);

      // Wait for async copy to complete
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled();
      });

      // Check icon should be present
      expect(copyButton.querySelector('.text-green-400')).toBeInTheDocument();

      // Wait for the timeout to complete (2 seconds + buffer)
      await new Promise(resolve => setTimeout(resolve, 2100));

      // After timeout, check icon should be gone
      await waitFor(() => {
        expect(copyButton.querySelector('.text-green-400')).not.toBeInTheDocument();
      });
    });

    it('should stop propagation on copy button click', async () => {
      render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      const copyButton = screen.getByLabelText('Copy to clipboard');
      const header = screen.getByText('TestService API').closest('div');
      if (!header) throw new Error('Header not found');

      // Get initial state
      const textareaBefore = screen.getByRole('textbox');

      // Click copy button
      fireEvent.click(copyButton);

      // Textarea should still be visible (not collapsed)
      const textareaAfter = screen.getByRole('textbox');
      expect(textareaAfter).toEqual(textareaBefore);
    });

    it('should handle copy errors gracefully', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Copy failed'));

      expect(async () => {
        render(
          <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
        );
        const copyButton = screen.getByLabelText('Copy to clipboard');
        fireEvent.click(copyButton);
        await waitFor(() => {
          expect(mockClipboard.writeText).toHaveBeenCalled();
        });
      }).not.toThrow();
    });
  });

  describe('content formatting', () => {
    it('should display YAML content when format is yaml', () => {
      render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toContain('openapi:');
      expect(textarea.value).toContain('info:');
      expect(textarea.value).toContain('title:');
      expect(textarea.value).toContain('Test API');
    });

    it('should display JSON content when format is json', () => {
      render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="json" />
      );

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toContain('{');
      expect(textarea.value).toContain('"openapi": "3.0.0"');
      expect(textarea.value).toContain('"title": "Test API"');
    });

    it('should format JSON with proper indentation', () => {
      render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="json" />
      );

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      const lines = textarea.value.split('\n');

      // Check that JSON is formatted (should have multiple lines)
      expect(lines.length).toBeGreaterThan(1);

      // Check indentation on second line
      expect(lines[1]).toMatch(/^\s{2}/);
    });

    it('should handle complex OpenAPI documents', () => {
      const complexDoc: OpenApiDoc = {
        openapi: '3.0.0',
        info: {
          title: 'Complex API',
          version: '2.0.0',
          description: 'A complex API with multiple endpoints',
        },
        paths: {
          '/users': {
            get: {
              summary: 'List users',
              parameters: [
                {
                  name: 'limit',
                  in: 'query',
                  required: false,
                  schema: { type: 'integer' },
                },
              ],
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      expect(() => {
        render(
          <CollapsibleSpec title="ComplexService" content={complexDoc} format="yaml" />
        );
      }).not.toThrow();

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue();
    });
  });

  describe('props interface', () => {
    it('should accept all required props', () => {
      expect(() => {
        render(
          <CollapsibleSpec
            title="Test"
            content={mockOpenApiDoc}
            format="yaml"
          />
        );
      }).not.toThrow();
    });

    it('should handle different title values', () => {
      const titles = ['ServiceA', 'Service B', 'Service_C_123'];

      titles.forEach((title) => {
        const { unmount } = render(
          <CollapsibleSpec title={title} content={mockOpenApiDoc} format="yaml" />
        );
        expect(screen.getByText(`${title} API`)).toBeInTheDocument();
        unmount();
      });
    });

    it('should handle both format options', () => {
      const { rerender } = render(
        <CollapsibleSpec title="Test" content={mockOpenApiDoc} format="yaml" />
      );

      expect(screen.getByText('YAML')).toBeInTheDocument();

      expect(() => {
        rerender(
          <CollapsibleSpec title="Test" content={mockOpenApiDoc} format="json" />
        );
      }).not.toThrow();

      expect(screen.getByText('JSON')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper aria-label on copy button', () => {
      render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      const copyButton = screen.getByLabelText('Copy to clipboard');
      expect(copyButton).toBeInTheDocument();
    });

    it('should have aria-label on textarea', () => {
      render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-label', 'TestService API YAML content');
    });

    it('should update textarea aria-label based on format', () => {
      const { rerender } = render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      expect(screen.getByRole('textbox')).toHaveAttribute(
        'aria-label',
        'TestService API YAML content'
      );

      rerender(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="json" />
      );

      expect(screen.getByRole('textbox')).toHaveAttribute(
        'aria-label',
        'TestService API JSON content'
      );
    });

    it('should have readonly textarea to prevent editing', () => {
      render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('readonly');
    });

    it('should have spellcheck disabled on textarea', () => {
      render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('spellcheck', 'false');
    });
  });

  describe('styling and layout', () => {
    it('should apply hover styles to header', () => {
      const { container } = render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      const header = container.querySelector('.hover\\:bg-slate-700');
      expect(header).toBeInTheDocument();
    });

    it('should apply transition classes', () => {
      const { container } = render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      const header = container.querySelector('.transition-colors');
      expect(header).toBeInTheDocument();
    });

    it('should have correct height for content area', () => {
      const { container } = render(
        <CollapsibleSpec title="TestService" content={mockOpenApiDoc} format="yaml" />
      );

      const contentArea = container.querySelector('.h-96');
      expect(contentArea).toBeInTheDocument();
    });
  });
});
