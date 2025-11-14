import React, { Suspense } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminComponent from './AdminComponent';

// Mock lazy-loaded components
jest.mock('./UniversityManagement', () => () => <div>University Management Content</div>);
jest.mock('./SchoolManagement', () => () => <div>School Management Content</div>);
jest.mock('./ProgramManagement', () => () => <div>Program Management Content</div>);

describe('AdminComponent', () => {
  const renderAdminComponent = () => {
    return render(
      <Suspense fallback={<div>Loading...</div>}>
        <AdminComponent />
      </Suspense>
    );
  };

  test('renders all tabs', () => {
    renderAdminComponent();
    expect(screen.getByText('Universities')).toBeInTheDocument();
    expect(screen.getByText('Schools')).toBeInTheDocument();
    expect(screen.getByText('Programs')).toBeInTheDocument();
    expect(screen.getByText('Documentation')).toBeInTheDocument();
    expect(screen.getByText('Config')).toBeInTheDocument();
  });

  test('Universities tab is active by default and shows its content', async () => {
    renderAdminComponent();
    expect(screen.getByText('Universities')).toHaveClass('active');
    await waitFor(() => {
      expect(screen.getByText('University Management Content')).toBeInTheDocument();
    });
  });

  test('clicking on Schools tab makes it active and shows its content', async () => {
    renderAdminComponent();
    fireEvent.click(screen.getByText('Schools'));
    
    expect(screen.getByText('Schools')).toHaveClass('active');
    expect(screen.getByText('Universities')).not.toHaveClass('active');
    
    await waitFor(() => {
      expect(screen.getByText('School Management Content')).toBeInTheDocument();
    });
  });

  test('clicking on Documentation tab shows its content', async () => {
    renderAdminComponent();
    fireEvent.click(screen.getByText('Documentation'));

    expect(screen.getByText('Documentation')).toHaveClass('active');
    await waitFor(() => {
      expect(screen.getByText('This section is for documentation.')).toBeInTheDocument();
    });
  });

  test('clicking on Config tab shows its content', async () => {
    renderAdminComponent();
    fireEvent.click(screen.getByText('Config'));

    expect(screen.getByText('Config')).toHaveClass('active');
    await waitFor(() => {
      expect(screen.getByText('This section is for application configuration.')).toBeInTheDocument();
    });
  });
});
