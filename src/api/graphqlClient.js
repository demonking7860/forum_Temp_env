// src/api/graphqlClient.js
import { generateClient } from "aws-amplify/api";
import { fetchAuthSession } from "aws-amplify/auth";

/**
 * Force using the **ID token** for all GraphQL calls
 * so Lambda resolvers see `identity.claims.email`.
 */
const baseClient = generateClient();

/* ------------ Utilities ------------ */

function logError(error, context = "") {
  console.error(`[GraphQL:${context}]`, error);
}

/**
 * Always send Cognito User Pools ID token with GraphQL requests.
 */
async function gqlWithIdToken(options) {
  const session = await fetchAuthSession();
  const idToken = session.tokens?.idToken?.toString();

  if (!idToken) {
    console.error("❌ No ID token available in session.");
    throw new Error("Not authenticated: missing ID token");
  }

  return baseClient.graphql({
    authMode: "userPool",
    authToken: idToken,
    ...options,
  });
}


/* ------------ Helpers ------------ */

export const TicketStatus = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
  values: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
  isValid(v) {
    return this.values.includes(v);
  },
};

export async function logCurrentSession() {
  try {
    const session = await fetchAuthSession();
    console.log("🧩 Access Token? ->", !!session.tokens?.accessToken?.toString());
    console.log("🧩 ID Token?     ->", !!session.tokens?.idToken?.toString());
    console.log("🔑 ID Token Payload:", session.tokens?.idToken?.payload);
  } catch (err) {
    console.error("❌ Failed to fetch session", err);
  }
}

/* ====================================================================== */
/*                            USER-FACING API                             */
/* ====================================================================== */

/**
 * 1) Create a ticket
 */
export async function createTicket(title, text) {
  try {
    const result = await gqlWithIdToken({
      query: `
        mutation CreateMyTicket($title: String!, $text: String!) {
          createMyTicket(title: $title, text: $text) {
            ticketId
            title
            status
            updatedAt
          }
        }
      `,
      variables: { title, text },
    });
    return result.data?.createMyTicket;
  } catch (error) {
    logError(error, "createTicket");
    throw error;
  }
}

/**
 * 2) Add a message to a ticket
 */
export async function addMessageToTicket(ticketId, text) {
  try {
    const result = await gqlWithIdToken({
      query: `
        mutation AddMyTicketMessage($ticketId: ID!, $text: String!) {
          addMyTicketMessage(ticketId: $ticketId, text: $text) {
            text
            sender
            createdAt
          }
        }
      `,
      variables: { ticketId, text },
    });
    return result.data?.addMyTicketMessage;
  } catch (error) {
    logError(error, "addMessageToTicket");
    throw error;
  }
}

/**
 * 3) List tickets for the signed-in user
 */
export async function listMyTickets() {
  try {
    const result = await gqlWithIdToken({
      query: `
        query ListMyTickets {
          listMyTickets {
            ticketId
            title
            status
            lastMessageSnippet
            updatedAt
          }
        }
      `,
    });
    return result.data?.listMyTickets || [];
  } catch (error) {
    logError(error, "listMyTickets");
    throw error;
  }
}

/**
 * 4) Get all messages in a ticket (user)
 */
export async function getMyTicketMessages(ticketId) {
  try {
    const result = await gqlWithIdToken({
      query: `
        query GetMyTicketMessages($ticketId: ID!) {
          getMyTicketMessages(ticketId: $ticketId) {
            sender
            text
            createdAt
            senderType
          }
        }
      `,
      variables: { ticketId },
    });
    return result.data?.getMyTicketMessages || [];
  } catch (error) {
    logError(error, "getMyTicketMessages");
    throw error;
  }
}

/**
 * 5) Search messages across user's tickets
 */
export async function searchMessagesByUser(keyword) {
  try {
    const result = await gqlWithIdToken({
      query: `
        query SearchMyTicketMessages($keyword: String!) {
          searchMyTicketMessages(keyword: $keyword) {
            ticketId
            ticketSubject
            snippet
            createdAt
          }
        }
      `,
      variables: { keyword },
    });
    return result.data?.searchMyTicketMessages || [];
  } catch (error) {
    logError(error, "searchMessagesByUser");
    throw error;
  }
}


/* ---------------------------------------------------------------------- */
/* Backwards-compat alias for older code expecting `getTicketMessages`    */
/* ---------------------------------------------------------------------- */
export async function getTicketMessages(ticketId) {
  return getMyTicketMessages(ticketId);
}

/* ====================================================================== */
/*                           ADMIN-FACING API                             */
/* ====================================================================== */

/**
 * List tickets (admin)
 */
export async function listTicketsAdmin(statusOrOptions = "ANY", limitOrNull = 20, nextToken = null) {
  let status = "ANY";
  let limit = 20;
  let token = null;

  if (typeof statusOrOptions === "object" && statusOrOptions !== null) {
    const opts = statusOrOptions;
    status = opts.status ?? "ANY";
    limit = opts.limit ?? 20;
    token = opts.nextToken ?? null;
  } else {
    status = statusOrOptions ?? "ANY";
    limit = typeof limitOrNull === "number" ? limitOrNull : 20;
    token = nextToken ?? null;
  }

  try {
    const result = await gqlWithIdToken({
      query: `
        query ListTicketsAdmin($status: String, $limit: Int, $nextToken: AWSJSON) {
          listTicketsAdmin(status: $status, limit: $limit, nextToken: $nextToken) {
            items {
              ticketId
              title
              status
              lastMessageSnippet
              updatedAt
              email
            }
            nextToken
          }
        }
      `,
      variables: { status, limit, nextToken: token },
    });

    const payload = result.data?.listTicketsAdmin || { items: [], nextToken: null };
    return {
      items: payload.items || [],
      nextToken: payload.nextToken || null,
    };
  } catch (error) {
    logError(error, "listTicketsAdmin");
    throw error;
  }
}

/**
 * Get a single ticket by ID (admin)
 */
export async function getTicketAdmin(ticketId) {
  try {
    const result = await gqlWithIdToken({
      query: `
        query GetTicketAdmin($ticketId: ID!) {
          getTicketAdmin(ticketId: $ticketId) {
            ticketId
            title
            status
            lastMessageSnippet
            updatedAt
            createdAt
            email
            username
            avatar
          }
        }
      `,
      variables: { ticketId },
    });
    return result.data?.getTicketAdmin || null;
  } catch (error) {
    logError(error, "getTicketAdmin");
    throw error;
  }
}

/**
 * Get messages for a ticket (admin)
 */
export async function getTicketMessagesAdmin(ticketId) {
  try {
    const result = await gqlWithIdToken({
      query: `
        query GetTicketMessagesAdmin($ticketId: ID!) {
          getTicketMessagesAdmin(ticketId: $ticketId) {
            ticketRef
            sender
            text
            attachments
            senderType
            createdAt
            updatedAt
          }
        }
      `,
      variables: { ticketId },
    });
    return result.data?.getTicketMessagesAdmin || [];
  } catch (error) {
    logError(error, "getTicketMessagesAdmin");
    throw error;
  }
}

/**
 * Admin adds a message to a ticket
 */
export async function addAdminTicketMessage(ticketId, text) {
  try {
    const result = await gqlWithIdToken({
      query: `
        mutation AddAdminTicketMessage($ticketId: ID!, $text: String!) {
          addAdminTicketMessage(ticketId: $ticketId, text: $text) {
            ticketRef
            sender
            senderType
            text
            createdAt
            updatedAt
          }
        }
      `,
      variables: { ticketId, text },
    });
    return result.data?.addAdminTicketMessage;
  } catch (error) {
    logError(error, "addAdminTicketMessage");
    throw error;
  }
}

/**
 * Update ticket status (admin)
 */
export async function updateTicketStatusAdmin(ticketId, status) {
  try {
    const normalized = String(status || "").toUpperCase();
    if (!TicketStatus.isValid(normalized)) {
      throw new Error(`Invalid status '${status}'. Use one of: ${TicketStatus.values.join(", ")}`);
    }

    const result = await gqlWithIdToken({
      query: `
        mutation UpdateTicketStatusAdmin($ticketId: ID!, $status: String!) {
          updateTicketStatusAdmin(ticketId: $ticketId, status: $status) {
            ticketId
            title
            status
            lastMessageSnippet
            updatedAt
            createdAt
            email
            username
            avatar
          }
        }
      `,
      variables: { ticketId, status: normalized },
    });
    return result.data?.updateTicketStatusAdmin;
  } catch (error) {
    logError(error, "updateTicketStatusAdmin");
    throw error;
  }
}

/* ---------------------------------------------------------------------- */
/* Backwards-compat aliases for AdminTickets.js                            */
/* ---------------------------------------------------------------------- */
export const adminListTickets = listTicketsAdmin;
export const adminGetTicketMessages = getTicketMessagesAdmin;
export const adminAddTicketMessage = addAdminTicketMessage;
export const adminUpdateTicketStatus = updateTicketStatusAdmin;

/* ====================================================================== */
/*                        RATE LIMITING CONFIGURATION                     */
/* ====================================================================== */

/**
 * Update rate limit configuration
 */
export async function updateRateLimitConfig(input) {
  try {
    const result = await gqlWithIdToken({
      query: `
        mutation UpdateRateLimitConfig($input: RateLimitConfigInput!) {
          updateRateLimitConfig(input: $input) {
            success
            message
            config {
              pk
              sk
              typename
              configName
              limit
              windowMinutes
              enabled
              description
              updatedBy
              createdAt
              updatedAt
              __typename
            }
            __typename
          }
        }
      `,
      variables: { input },
    });
    return result.data?.updateRateLimitConfig;
  } catch (error) {
    logError(error, "updateRateLimitConfig");
    throw error;
  }
}

/**
 * Initialize default rate limit configurations
 */
export async function initializeRateLimitConfigs() {
  try {
    const result = await gqlWithIdToken({
      query: `
        mutation InitializeRateLimitConfigs {
          initializeRateLimitConfigs {
            success
            message
            config {
              pk
              sk
              typename
              configName
              limit
              windowMinutes
              enabled
              description
              updatedBy
              createdAt
              updatedAt
              __typename
            }
            __typename
          }
        }
      `,
    });
    return result.data?.initializeRateLimitConfigs;
  } catch (error) {
    logError(error, "initializeRateLimitConfigs");
    throw error;
  }
}

/**
 * List all rate limit configurations
 */
export async function listRateLimitConfigs() {
  try {
    const result = await gqlWithIdToken({
      query: `
        query ListRateLimitConfigs {
          listRateLimitConfigs {
            pk
            sk
            typename
            configName
            limit
            windowMinutes
            enabled
            description
            updatedBy
            createdAt
            updatedAt
            __typename
          }
        }
      `,
    });
    return result.data?.listRateLimitConfigs || [];
  } catch (error) {
    logError(error, "listRateLimitConfigs");
    throw error;
  }
}

/**
 * Get a specific rate limit configuration
 */
export async function getRateLimitConfig(configName) {
  try {
    const result = await gqlWithIdToken({
      query: `
        query GetRateLimitConfig($configName: String!) {
          getRateLimitConfig(configName: $configName) {
            pk
            sk
            typename
            configName
            limit
            windowMinutes
            enabled
            description
            updatedBy
            createdAt
            updatedAt
            __typename
          }
        }
      `,
      variables: { configName },
    });
    return result.data?.getRateLimitConfig;
  } catch (error) {
    logError(error, "getRateLimitConfig");
    throw error;
  }
}