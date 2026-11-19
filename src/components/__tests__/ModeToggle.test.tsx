/**
 * ModeToggle Component Unit Tests
 * Header Simple/Full mode toggle
 * 
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ModeToggle from '@/components/ModeToggle'

describe('ModeToggle Component', () => {
  beforeEach(() => {
    // Reset localStorage before each test
    localStorage.clear()
  })

  it('renders the toggle button in the header', () => {
    render(<ModeToggle />)
    const toggleButton = screen.getByRole('checkbox', { name: /simple mode/i })
    expect(toggleButton).toBeInTheDocument()
  })

  it('toggles mode when clicked', async () => {
    render(<ModeToggle />)
    const toggleButton = screen.getByRole('checkbox', { name: /simple mode/i })
    const user = userEvent.setup()
    await user.click(toggleButton)
    
    // After click, mode should be 'simple' or 'full'
    const mode = screen.getByTestId('mode-display')
    expect(mode).toBeInTheDocument()
  })

  it('persists mode in localStorage after toggle', async () => {
    render(<ModeToggle />)
    const toggleButton = screen.getByRole('checkbox', { name: /simple mode/i })
    const user = userEvent.setup()
    await user.click(toggleButton)
    
    // Check localStorage was updated
    const storedMode = localStorage.getItem('simpleMode')
    expect(storedMode).toBe('simple')
  })

  it('initial mode is "full" by default', () => {
    render(<ModeToggle />)
    const mode = screen.getByTestId('mode-display')
    // Default should be full mode
    expect(mode).toHaveTextContent('full')
  })
})