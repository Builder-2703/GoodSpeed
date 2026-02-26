import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ContactModal from './ContactModal'

describe('ContactModal', () => {
  const defaultProps = {
    open: true,
    source: 'quote' as const,
    selectionId: 'sel-1',
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  }

  it('renders title when open', () => {
    render(<ContactModal {...defaultProps} />)
    expect(screen.getByText('Request a Quote')).toBeDefined()
  })

  it('shows help title when source is help', () => {
    render(<ContactModal {...defaultProps} source="help" />)
    expect(screen.getByText('Need help choosing?')).toBeDefined()
  })

  it('shows validation errors for empty submit', () => {
    render(<ContactModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Submit'))
    expect(screen.getByText('Name is required')).toBeDefined()
    expect(screen.getByText('Enter a valid email address')).toBeDefined()
  })

  it('validates email format', () => {
    render(<ContactModal {...defaultProps} />)
    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'not-an-email' } })
    fireEvent.click(screen.getByText('Submit'))
    expect(screen.getByText('Enter a valid email address')).toBeDefined()
  })

  it('validates phone format', () => {
    render(<ContactModal {...defaultProps} />)
    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'John' } })
    fireEvent.click(screen.getByLabelText('Phone'))
    fireEvent.change(screen.getByLabelText('Phone number *'), { target: { value: '123' } })
    fireEvent.click(screen.getByText('Submit'))
    expect(screen.getByText('Enter a valid phone number')).toBeDefined()
  })

  it('calls onSubmit with valid email data', () => {
    const onSubmit = vi.fn()
    render(<ContactModal {...defaultProps} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'John Doe' } })
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'john@example.com' } })
    fireEvent.click(screen.getByText('Submit'))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const quote = onSubmit.mock.calls[0]![0]
    expect(quote.name).toBe('John Doe')
    expect(quote.contactMethod).toBe('email')
    expect(quote.contactValue).toBe('john@example.com')
    expect(quote.selectionId).toBe('sel-1')
  })

  it('calls onSubmit with valid phone data', () => {
    const onSubmit = vi.fn()
    render(<ContactModal {...defaultProps} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'Jane' } })
    fireEvent.click(screen.getByLabelText('Phone'))
    fireEvent.change(screen.getByLabelText('Phone number *'), { target: { value: '+1 (555) 123-4567' } })
    fireEvent.click(screen.getByText('Submit'))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const quote = onSubmit.mock.calls[0]![0]
    expect(quote.contactMethod).toBe('phone')
    expect(quote.contactValue).toBe('+1 (555) 123-4567')
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(<ContactModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('switches contact field when method changes', () => {
    render(<ContactModal {...defaultProps} />)
    // Default is email — email input should be present
    expect(screen.getByLabelText('Email *')).toBeDefined()
    // Switch to phone
    fireEvent.click(screen.getByLabelText('Phone'))
    expect(screen.getByLabelText('Phone number *')).toBeDefined()
    // Email input should be gone
    expect(screen.queryByLabelText('Email *')).toBeNull()
  })

  it('does not render when open is false', () => {
    const { container } = render(<ContactModal {...defaultProps} open={false} />)
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })
})
