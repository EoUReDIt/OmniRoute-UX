/**
 * Advanced Banner Component Unit Tests
 * "This is an advanced screen" banner with action buttons
 * 
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdvancedBanner from '@/components/AdvancedBanner'

describe('Advanced Banner Component Unit Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  it('renders the advanced banner', () => {
    render(<AdvancedBanner />)
    const banner = screen.getByRole('alert', { name: /this is an advanced screen/i })
    expect(banner).toBeInTheDocument()
  })

  it('displays the warning text', () => {
    render(<AdvancedBanner />)
    const warningText = screen.getByText(/this is an advanced screen/i)
    expect(warningText).toBeInTheDocument()
  })

  it('has "Back to Home" button', () => {
    render(<AdvancedBanner />)
    const backButton = screen.getByRole('button', { name: /back to home/i })
    expect(backButton).toBeInTheDocument()
  })

  it('has "Open in Full View" button', () => {
    render(<AdvancedBanner />)
    const fullViewButton = screen.getByRole('button', { name: /open in full view/i })
    expect(fullViewButton).toBeInTheDocument()
  })

  it('clicking "Open in Full View" stores "original" in localStorage', async () => {
    render(<AdvancedBanner />)
    const fullViewButton = screen.getByRole('button', { name: /open in full view/i })
    const user = userEvent.setup()
    await user.click(fullViewButton)
    
    // Should store "original" in localStorage
    const storedValue = localStorage.getItem('mode')
    expect(storedValue).toBe('original')
  })
})