import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminTable from './AdminTable';
import { QueryClient, QueryClientProvider } from 'react-query';

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
  ToastContainer: () => <div />,
}));

const queryClient = new QueryClient();

const mockUniversityData = [
  { id: '1', name: 'HARVARD UNIVERSITY', country: 'USA', url: 'http://harvard.edu', schoolCount: 10 },
  { id: '2', name: 'STANFORD UNIVERSITY', country: 'USA', url: 'http://stanford.edu', schoolCount: 8 },
];

const mockSchoolData = [
  { id: 's1', university: 'HARVARD UNIVERSITY', name: 'HARVARD BUSINESS SCHOOL', url: 'http://hbs.edu' },
  { id: 's2', university: 'STANFORD UNIVERSITY', name: 'GRADUATE SCHOOL OF BUSINESS', url: 'http://gsb.stanford.edu' },
];

const renderAdminTable = (props) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <table>
        <tbody>
          <AdminTable {...props} />
        </tbody>
      </table>
    </QueryClientProvider>
  );
};

describe('AdminTable Component', () => {
  describe('University Table', () => {
    const defaultProps = {
      data: mockUniversityData,
      type: 'university',
      onCellUpdate: jest.fn(),
      onSort: jest.fn(),
      sortConfig: { key: 'name', direction: 'ascending' },
      headers: ['ID', 'University Name', 'Country', 'School Count', 'University URL', 'Actions'],
      sortableColumns: {
        university: {
          'University Name': 'name',
          'Country': 'country',
          'School Count': 'schoolCount',
          'University URL': 'url',
        },
      },
    };

    test('renders university data correctly', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <AdminTable {...defaultProps} />
        </QueryClientProvider>
      );
      expect(screen.getByText(/HARVARD UNIVERSITY/)).toBeInTheDocument();
      // Multiple 'USA' texts might exist, so we check for at least one
      expect(screen.getAllByText('USA').length).toBeGreaterThan(0);
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('http://harvard.edu')).toBeInTheDocument();
    });
  });

  describe('School Table', () => {
    const defaultProps = {
      data: mockSchoolData,
      type: 'school',
      universitiesData: mockUniversityData,
      onCellUpdate: jest.fn(),
      onSort: jest.fn(),
      sortConfig: { key: 'university', direction: 'ascending' },
      headers: ['ID', 'University', 'School Name', 'School URL', 'Actions'],
      sortableColumns: {
        school: {
          'University': 'university',
          'School Name': 'name',
          'School URL': 'url',
        },
      },
    };

    test('renders school data correctly', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <AdminTable {...defaultProps} />
        </QueryClientProvider>
      );
      expect(screen.getByText(/HARVARD UNIVERSITY/)).toBeInTheDocument();
      expect(screen.getByText('HARVARD BUSINESS SCHOOL')).toBeInTheDocument();
      expect(screen.getByText('http://hbs.edu')).toBeInTheDocument();
    });
  });
});
