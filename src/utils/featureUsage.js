import { generateClient } from 'aws-amplify/api';
import { getUserItem } from '../graphql/queries';
import { createUserItem, updateUserItem } from '../graphql/mutations';

const client = generateClient();

export const trackFeatureUsage = async (userId, feature) => {
  const pk = `USER#${userId}`;
  const sk = `FEATURE#${feature}`;
  const now = new Date().toISOString();

  try {
    const res = await client.graphql({
      query: getUserItem,
      variables: { pk, sk }
    });

    const existing = res?.data?.getUserItem;

    if (!existing) {
      await client.graphql({
        query: createUserItem,
        variables: {
          input: {
            pk,
            sk,
            typename: "FEATURE_USAGE",
            featureName: feature,
            usageCount: 1,
            lastUsed: now,
          }
        }
      });
      console.log(`✅ Created usage log for ${feature}`);
    } else {
      await client.graphql({
        query: updateUserItem,
        variables: {
          input: {
            pk,
            sk,
            typename: "FEATURE_USAGE",
            usageCount: (existing.usageCount || 0) + 1,
            lastUsed: now,
          }
        }
      });
      console.log(`✅ Updated usage count for ${feature}`);
    }
  } catch (err) {
    console.error(`❌ Error tracking usage for ${feature}:`, err);
  }
};
