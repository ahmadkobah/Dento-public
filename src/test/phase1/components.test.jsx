import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { LanguageProvider } from '../../context/LanguageContext'

// Simple component rendering tests
describe('App Components', () => {
  const renderWithProviders = (ui) => {
    return render(
      <BrowserRouter>
        <LanguageProvider>
          {ui}
        </LanguageProvider>
      </BrowserRouter>
    )
  }

  describe('LanguageProvider', () => {
    it('should render children', () => {
      renderWithProviders(<div data-testid="test-child">Test</div>)
      expect(screen.getByTestId('test-child')).toBeInTheDocument()
    })
  })
})

describe('Utility Functions', () => {
  describe('Phone validation', () => {
    const isValidEgyptPhone = (phone) => {
      // Egyptian phone: +20 1x xxx xxxx or 01x xxx xxxx
      const regex = /^(\+?20)?0?1[0-9]{9}$/
      return regex.test(phone.replace(/\s/g, ''))
    }

    it('should validate Egyptian phone numbers', () => {
      expect(isValidEgyptPhone('+201000000021')).toBe(true)
      expect(isValidEgyptPhone('01144848521')).toBe(true)
      expect(isValidEgyptPhone('201144848521')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      expect(isValidEgyptPhone('123')).toBe(false)
      expect(isValidEgyptPhone('abc')).toBe(false)
    })
  })

  describe('Email validation', () => {
    const isValidEmail = (email) => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return regex.test(email)
    }

    it('should validate email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('no@domain')).toBe(false)
      expect(isValidEmail('@nodomain.com')).toBe(false)
    })
  })
})

describe('Date Utilities', () => {
  it('should format dates correctly', () => {
    const date = new Date('2026-01-29T10:30:00')
    const formatted = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    expect(formatted).toBe('January 29, 2026')
  })

  it('should calculate age from date of birth', () => {
    const calculateAge = (dob) => {
      const today = new Date('2026-01-29')
      const birthDate = new Date(dob)
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      return age
    }

    expect(calculateAge('1990-01-29')).toBe(36)
    expect(calculateAge('2000-06-15')).toBe(25)
  })
})
