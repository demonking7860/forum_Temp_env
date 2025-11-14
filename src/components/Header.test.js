import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from './Header';

describe('Header Component', () => {
  const onPlacementClick = jest.fn();
  const onAdminClick = jest.fn();
  const onSignInClick = jest.fn();
  const onSignOutClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders logo and title', () => {
    render(<Header />);
    expect(screen.getByAltText('PhD Placement Logo')).toBeInTheDocument();
    expect(screen.getByText('PandainUniv')).toBeInTheDocument();
  });

  test('renders Placement button and it is clickable', () => {
    render(<Header onPlacementClick={onPlacementClick} />);
    const placementButton = screen.getByText('Placement');
    expect(placementButton).toBeInTheDocument();
    fireEvent.click(placementButton);
    expect(onPlacementClick).toHaveBeenCalledTimes(1);
  });

  test('does not render Admin button if not admin', () => {
    render(<Header isAdmin={false} />);
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  test('renders Admin button if admin and it is clickable', () => {
    render(<Header isAdmin={true} onAdminClick={onAdminClick} />);
    const adminButton = screen.getByText('Admin');
    expect(adminButton).toBeInTheDocument();
    fireEvent.click(adminButton);
    expect(onAdminClick).toHaveBeenCalledTimes(1);
  });

  test('renders Sign In button when not logged in', () => {
    render(<Header userId={null} onSignInClick={onSignInClick} />);
    const signInButton = screen.getByText('Sign In');
    expect(signInButton).toBeInTheDocument();
    fireEvent.click(signInButton);
    expect(onSignInClick).toHaveBeenCalledTimes(1);
  });

  test('renders Sign Out button when logged in', () => {
    render(<Header userId="test-user" onSignOutClick={onSignOutClick} />);
    const signOutButton = screen.getByText('Sign Out');
    expect(signOutButton).toBeInTheDocument();
    fireEvent.click(signOutButton);
    expect(onSignOutClick).toHaveBeenCalledTimes(1);
  });

  test('applies active class to current view button', () => {
    const { rerender } = render(<Header currentView="main" isAdmin={true} />);
    expect(screen.getByText('Placement')).toHaveClass('active');
    expect(screen.getByText('Admin')).not.toHaveClass('active');

    rerender(<Header currentView="admin" isAdmin={true} />);
    expect(screen.getByText('Placement')).not.toHaveClass('active');
    expect(screen.getByText('Admin')).toHaveClass('active');
  });
});
