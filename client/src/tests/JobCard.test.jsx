import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import JobCard from '../components/JobCard'

// Mock Assets
vi.mock('../assets/assets', () => ({
  assets: {
    location_icon: 'loc.svg',
    person_icon: 'person.svg',
    money_icon: 'money.svg'
  }
}))

const mockJob = {
  _id: '123',
  title: 'Full Stack Engineer',
  location: 'San Francisco',
  level: 'Senior',
  salary: 150000,
  companyId: {
    name: 'TechCorp',
    image: 'logo.png'
  }
}

describe('JobCard Component', () => {
  it('renders job details correctly', () => {
    render(
      <BrowserRouter>
        <JobCard job={mockJob} />
      </BrowserRouter>
    )

    expect(screen.getByText('Full Stack Engineer')).toBeInTheDocument()
    expect(screen.getByText('TechCorp')).toBeInTheDocument()
    expect(screen.getByText('San Francisco')).toBeInTheDocument()
    expect(screen.getByText('Senior')).toBeInTheDocument()
  })

  it('navigates to job details on click', () => {
    render(
      <BrowserRouter>
        <JobCard job={mockJob} />
      </BrowserRouter>
    )

    const applyBtn = screen.getByText('Apply Now')
    expect(applyBtn).toBeInTheDocument()
    
    // Smooth scroll check or just existence
    fireEvent.click(applyBtn)
    expect(window.location.pathname).toBe('/apply-job/123')
  })
})
