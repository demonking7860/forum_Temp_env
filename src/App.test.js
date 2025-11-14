import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import App from './App';
import * as Auth from '@aws-amplify/ui-react';

// Mock useAuthenticator
jest.mock('@aws-amplify/ui-react', () => ({
  ...jest.requireActual('@aws-amplify/ui-react'),
  useAuthenticator: jest.fn(),
  Authenticator: () => <div>Authenticator Mock</div>, // Mock the component itself
}));

// Mock fetchAuthSession from aws-amplify/auth
jest.mock('aws-amplify/auth', () => ({
  fetchAuthSession: jest.fn(),
}));


const queryClient = new QueryClient();

const renderApp = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
};

describe('App Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    Auth.useAuthenticator.mockReturnValue({ user: null, signOut: jest.fn() });
    require('aws-amplify/auth').fetchAuthSession.mockResolvedValue({});
    // Mock fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ results: [], totalMatches: 0 }),
      })
    );
  });

  test('renders Header and main content', () => {
    renderApp();
    expect(screen.getByText(/PandainUniv/i)).toBeInTheDocument();
    expect(screen.getByText(/Placement/i)).toBeInTheDocument();
  });

  test('renders Search, Compare, and Reverse Search tabs', () => {
    renderApp();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Compare')).toBeInTheDocument();
    expect(screen.getByText('Reverse Search')).toBeInTheDocument();
  });

  test('shows Sign In button when not logged in', () => {
    renderApp();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  test('shows Sign Out and Admin button when logged in as admin', async () => {
    Auth.useAuthenticator.mockReturnValue({ 
      user: { signInDetails: { loginId: 'admin@test.com' } }, 
      signOut: jest.fn() 
    });
    require('aws-amplify/auth').fetchAuthSession.mockResolvedValue({
      tokens: {
        accessToken: {
          payload: {
            'cognito:groups': ['Admin']
          }
        }
      }
    });

    renderApp();
    
    expect(await screen.findByText('Sign Out')).toBeInTheDocument();
    expect(await screen.findByText('Admin')).toBeInTheDocument();
  });

  test('switches to Admin view when Admin button is clicked', async () => {
    Auth.useAuthenticator.mockReturnValue({ 
      user: { signInDetails: { loginId: 'admin@test.com' } }, 
      signOut: jest.fn() 
    });
    require('aws-amplify/auth').fetchAuthSession.mockResolvedValue({
      tokens: {
        accessToken: {
          payload: {
            'cognito:groups': ['Admin']
          }
        }
      }
    });

    renderApp();
    
    const adminButton = await screen.findByText('Admin');
    fireEvent.click(adminButton);

    // In Admin view, we expect to see the admin tabs
    await waitFor(() => {
      expect(screen.getByText('Universities')).toBeInTheDocument();
      expect(screen.getByText('Schools')).toBeInTheDocument();
      expect(screen.getByText('Programs')).toBeInTheDocument();
    });
  });
});
