import { generateClient } from 'aws-amplify/api';

const client = generateClient();

/**
 * 🚀 Ultra-fast avatar lookup for existing users
 * Only fetches avatar data for maximum performance
 */
export const getUserAvatarFast = async (email) => {
  try {
    const result = await client.graphql({
      query: `
        query GetUserAvatarFast($email: String!) {
          getUserAvatarFast(email: $email) {
            avatar
            exists
          }
        }
      `,
      variables: { email },
      timeout: 1000 // Fast timeout
    });

    return result.data.getUserAvatarFast;
  } catch (error) {
    console.warn('Fast avatar lookup failed:', error);
    return { avatar: null, exists: false };
  }
};
