// Optimistic Message Update Utilities
import { addAdminTicketMessage } from "../../api/graphqlClient";

// Add optimistic message to UI
export const addOptimisticMessage = (messages, setMessages, messageText, adminEmail) => {
  const optimisticMessage = {
    sender: adminEmail,
    senderType: "ADMIN",
    text: messageText,
    createdAt: new Date().toISOString(),
    status: "sending",
    id: `temp-${Date.now()}`,
  };

  setMessages(prev => [...prev, optimisticMessage]);
  return optimisticMessage;
};

// Confirm/replace optimistic message with real one
export const confirmOptimisticMessage = (messages, setMessages, tempId, realMessage) => {
  setMessages(prev =>
    prev.map(msg =>
      msg.id === tempId
        ? { ...realMessage, status: "sent" }
        : msg
    )
  );
};

// Mark message as failed
export const failOptimisticMessage = (messages, setMessages, tempId) => {
  setMessages(prev =>
    prev.map(msg =>
      msg.id === tempId
        ? { ...msg, status: "failed" }
        : msg
    )
  );
};

// Retry failed message
export const retryFailedMessage = async (messages, setMessages, messageId, ticketId, adminEmail) => {
  const messageToRetry = messages.find(m => m.id === messageId);
  if (!messageToRetry || messageToRetry.status !== "failed") return;

  // Mark as sending again
  setMessages(prev =>
    prev.map(msg =>
      msg.id === messageId
        ? { ...msg, status: "sending" }
        : msg
    )
  );

  try {
    const sent = await addAdminTicketMessage(ticketId, messageToRetry.text);

    // Replace with successful message
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...sent, status: "sent" }
          : msg
      )
    );
  } catch (e) {
    console.error("Failed to retry message", e);
    // Keep as failed
  }
};
