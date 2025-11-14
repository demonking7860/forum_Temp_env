// Custom Hook for Ticket Management Logic
import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  listTicketsAdmin,
  getTicketAdmin,
  getTicketMessagesAdmin,
  addAdminTicketMessage,
  updateTicketStatusAdmin,
} from "../../api/graphqlClient";
import { filterTickets } from "./TicketUtils";
import { addOptimisticMessage, confirmOptimisticMessage, failOptimisticMessage } from "./OptimisticMessages";

export const useTicketManagement = (props) => {
  // State
  const [statusFilter, setStatusFilter] = useState("ANY");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [tickets, setTickets] = useState([]);
  const [nextToken, setNextToken] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [adminEmail, setAdminEmail] = useState(null);

  // Debounced query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Get admin email
  useEffect(() => {
    (async () => {
      try {
        const session = await fetchAuthSession();
        const email = session?.tokens?.idToken?.payload?.email || null;
        setAdminEmail(email);
      } catch (e) {
        console.error("Failed to get admin email", e);
      }
    })();
  }, []);

  // Handle responsive design
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pre-load top tickets
  const preloadTopTickets = useCallback(async (tickets) => {
    if (!tickets || tickets.length === 0) return;

    const top3Tickets = tickets.slice(0, 3);
    console.log(`🚀 Admin pre-loading top ${top3Tickets.length} tickets:`, top3Tickets.map(t => t.ticketId));
    
    Promise.allSettled(
      top3Tickets.map(async (ticket) => {
        const ticketId = ticket.ticketId;
        if (props.ticketCache.has(ticketId)) {
          console.log(`✅ Admin ticket ${ticketId} already cached - skipping preload`);
          return;
        }

        console.log(`📡 Admin pre-loading ticket ${ticketId}`);
        try {
          const [ticket, messages] = await Promise.all([
            getTicketAdmin(ticketId),
            getTicketMessagesAdmin(ticketId)
          ]);
          props.setTicketCache(prev => new Map(prev).set(ticketId, {
            messages: messages || [],
            ticketDetail: ticket,
            timestamp: Date.now()
          }));
          console.log(`💾 Admin cached ticket ${ticketId} with ${messages?.length || 0} messages and ticket detail`);
        } catch (e) {
          console.debug(`Pre-load failed for ticket ${ticketId}:`, e.message);
        }
      })
    );
  }, [props.ticketCache, props.setTicketCache]);

  // Load tickets
  const loadTickets = useCallback(async ({ reset = false } = {}) => {
    try {
      if (reset) {
        setTickets([]);
        setNextToken(null);
      }
      setLoadingList(true);
      setListError("");
      
      const resp = await listTicketsAdmin({
        status: statusFilter,
        limit: 20,
        nextToken: reset ? null : nextToken,
      });
      
      const newItems = resp?.items || [];
      setTickets((prev) => {
        const updated = reset ? newItems : [...prev, ...newItems];
        if (updated.length > 0) {
          console.log(`🎯 Admin triggering preload for ${updated.length} tickets`);
          preloadTopTickets(updated);
        }
        return updated;
      });
      setNextToken(resp?.nextToken || null);
    } catch (e) {
      console.error(e);
      setListError(e?.message || "Failed to load tickets");
    } finally {
      setLoadingList(false);
    }
  }, [statusFilter, nextToken, preloadTopTickets]);

  // Load ticket detail
  const loadDetail = useCallback(async (id, forceRefresh = false) => {
    if (!id) return;

    // Check cache first
    if (!forceRefresh && props.ticketCache.has(id)) {
      const cached = props.ticketCache.get(id);
      console.log(`🔄 Admin cache hit for ticket ${id} - loading from cache`);

      setMessages(cached.messages || []);
      if (cached.ticketDetail) {
        setTicketDetail(cached.ticketDetail);
      }
      setLoadingDetail(false);

      // Background refresh for stale data
      if (Date.now() - cached.timestamp > 300000) {
        console.log(`🔄 Background refresh for stale ticket ${id}`);
        try {
          const [ticket, messages] = await Promise.all([
            getTicketAdmin(id),
            getTicketMessagesAdmin(id)
          ]);
          props.setTicketCache(prev => new Map(prev).set(id, {
            messages: messages || [],
            ticketDetail: ticket,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.debug(`Background refresh failed for ticket ${id}:`, e.message);
        }
      }
      return;
    }

    console.log(`📡 Admin fetching fresh data for ticket ${id}`);

    // Prevent duplicate requests
    props.setActiveRequests(prev => {
      if (prev.has(id) && !forceRefresh) return prev;
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });

    try {
      setLoadingDetail(true);
      setDetailError("");

      const [t, msg] = await Promise.all([getTicketAdmin(id), getTicketMessagesAdmin(id)]);

      props.setTicketCache(prev => {
        const newCache = new Map(prev).set(id, {
          messages: msg || [],
          ticketDetail: t,
          timestamp: Date.now()
        });
        console.log(`💾 Cached ticket ${id} with ${msg?.length || 0} messages and title: ${t?.title || 'Unknown'}`);
        return newCache;
      });

      setTicketDetail(t);
      setMessages(msg || []);
    } catch (e) {
      console.error(e);
      setDetailError(e?.message || "Failed to load ticket");
    } finally {
      setLoadingDetail(false);
      props.setActiveRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  }, [props.ticketCache, props.setTicketCache, props.setActiveRequests]);

  // Send reply
  const onSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedId || !adminEmail) return;

    const messageText = replyText.trim();
    setReplyText("");

    const optimisticMsg = addOptimisticMessage(messages, setMessages, messageText, adminEmail);
    setSendingReply(true);

    try {
      const currentStatus = ticketDetail?.status;
      const isFirstAdminReply = currentStatus === "OPEN" &&
        !messages.some(msg => msg.senderType === "ADMIN");
      const isReopeningTicket = (currentStatus === "RESOLVED" || currentStatus === "CLOSED");

      let newStatus = null;
      if (isFirstAdminReply || isReopeningTicket) {
        newStatus = "IN_PROGRESS";
      }

      const sent = await addAdminTicketMessage(selectedId, messageText);

      if (newStatus && newStatus !== currentStatus) {
        try {
          console.log(`🔄 Auto-changing ticket ${selectedId} status from ${currentStatus} to ${newStatus}`);
          await updateTicketStatusAdmin(selectedId, newStatus);
          setTicketDetail(prev => prev ? { ...prev, status: newStatus } : null);
        } catch (statusError) {
          console.warn(`Failed to auto-update status to ${newStatus}:`, statusError);
        }
      }

      confirmOptimisticMessage(messages, setMessages, optimisticMsg.id, sent);

      if (props.onMessageSent) {
        setTimeout(() => props.onMessageSent(), 100);
      }
    } catch (e) {
      console.error("Failed to send admin reply", e);
      failOptimisticMessage(messages, setMessages, optimisticMsg.id);
    } finally {
      setSendingReply(false);
    }
  };

  // Change status
  const onChangeStatus = async (newStatus) => {
    if (!selectedId || !ticketDetail || ticketDetail.status === newStatus) return;

    const originalStatus = ticketDetail.status;

    try {
      setUpdatingStatus(true);
      setTicketDetail(prev => prev ? { ...prev, status: newStatus } : null);

      // Update cache immediately
      props.setTicketCache(prev => {
        const newCache = new Map(prev);
        if (newCache.has(selectedId)) {
          const cached = newCache.get(selectedId);
          newCache.set(selectedId, {
            ...cached,
            ticketDetail: { ...cached.ticketDetail, status: newStatus },
            timestamp: Date.now()
          });
        }
        return newCache;
      });

      await updateTicketStatusAdmin(selectedId, newStatus);

      if (props.onStatusChanged) {
        props.onStatusChanged(selectedId, newStatus);
      }

      console.log(`✅ Status successfully updated to ${newStatus} for ticket ${selectedId}`);
    } catch (e) {
      console.error(`❌ Failed to update status to ${newStatus}:`, e);
      
      // Revert optimistic updates
      setTicketDetail(prev => prev ? { ...prev, status: originalStatus } : null);
      props.setTicketCache(prev => {
        const newCache = new Map(prev);
        if (newCache.has(selectedId)) {
          const cached = newCache.get(selectedId);
          newCache.set(selectedId, {
            ...cached,
            ticketDetail: { ...cached.ticketDetail, status: originalStatus },
            timestamp: Date.now()
          });
        }
        return newCache;
      });
      
      alert(e?.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Load tickets on filter change
  useEffect(() => {
    loadTickets({ reset: true });
  }, [statusFilter]);

  // Load tickets on refresh key change
  useEffect(() => {
    if (props.refreshKey > 0) {
      console.log('🔄 Refreshing ticket list due to parent refreshKey change');
      loadTickets({ reset: true });
    }
  }, [props.refreshKey]);

  // Load detail when selectedId changes
  useEffect(() => {
    if (selectedId) {
      if (props.ticketCache.has(selectedId)) {
        const cached = props.ticketCache.get(selectedId);
        console.log(`🔄 Restoring cached data for ticket ${selectedId} on component mount`);

        if (cached.messages) {
          setMessages(cached.messages);
          setLoadingDetail(false);
        }

        if (cached.ticketDetail) {
          setTicketDetail(cached.ticketDetail);
          console.log(`✅ Restored ticket detail for ${selectedId}:`, cached.ticketDetail.title);
        } else {
          console.log(`⚠️ Ticket detail missing from cache for ${selectedId}, fetching...`);
          loadDetail(selectedId, true);
          return;
        }

        // Background refresh for stale data
        if (Date.now() - cached.timestamp > 300000) {
          console.log(`🔄 Background refresh for stale ticket ${selectedId}`);
          loadDetail(selectedId, true);
        }
        return;
      }

      loadDetail(selectedId);
    }
  }, [selectedId, loadDetail, props.ticketCache]);

  // Filtered and sorted tickets
  const displayTickets = useMemo(() => {
    return filterTickets(tickets, debouncedQuery, statusFilter);
  }, [tickets, debouncedQuery, statusFilter]);

  return {
    // State
    statusFilter,
    setStatusFilter,
    query,
    setQuery,
    tickets: displayTickets,
    loadingList,
    listError,
    selectedId,
    setSelectedId,
    ticketDetail,
    messages,
    setMessages,
    loadingDetail,
    detailError,
    replyText,
    setReplyText,
    sendingReply,
    updatingStatus,
    isMobile,
    adminEmail,
    
    // Actions
    onSendReply,
    onChangeStatus,
  };
};
