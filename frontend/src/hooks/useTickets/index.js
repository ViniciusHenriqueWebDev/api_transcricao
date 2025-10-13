import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import toastError from "../../errors/toastError";
import api from "../../services/api";

const useTickets = ({
  searchParam,
  tags,
  users,
  pageNumber,
  status,
  date,
  updatedAt,
  showAll,
  queueIds,
  withUnreadMessages,
  onSearchComplete
}) => {
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [count, setCount] = useState(0); // ✅ ADICIONAR COUNT
  const [searchDone, setSearchDone] = useState(false);
  const [error, setError] = useState(null);
  
  // Referência para cancelar requisições
  const abortControllerRef = useRef(null);
  const lastRequestIdRef = useRef(0);
  const previousStatusRef = useRef(status);

  // Memoizar parâmetros para evitar comparações desnecessárias
  const params = useMemo(() => ({
    searchParam: searchParam || "",
    tags: tags || "",
    users: users || "",
    pageNumber: pageNumber || 1,
    status: status || "",
    date: date || "",
    updatedAt: updatedAt || "",
    showAll: showAll || false,
    queueIds: queueIds || "",
    // ✅ GARANTIR QUE withUnreadMessages SEJA STRING
    withUnreadMessages: withUnreadMessages === "true" || withUnreadMessages === true ? "true" : "false"
  }), [
    searchParam,
    tags, 
    users,
    pageNumber,
    status,
    date,
    updatedAt,
    showAll,
    queueIds,
    withUnreadMessages
  ]);

  // Verificar se o status mudou
  const statusChanged = useMemo(() => {
    const changed = previousStatusRef.current !== status;
    if (changed) {
      previousStatusRef.current = status;
    }
    return changed;
  }, [status]);

  // Função de busca memoizada
  const fetchTickets = useCallback(async (isAppend = false) => {
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Criar novo AbortController
    abortControllerRef.current = new AbortController();
    const requestId = ++lastRequestIdRef.current;

    console.log("🎫 Buscando tickets com parâmetros:", { 
      ...params,
      isAppend,
      requestId
    });
    
    // Só mostrar loading se não for append (paginação)
    if (!isAppend) {
      setLoading(true);
      setError(null);
    }
    
    try {
      const { data } = await api.get("/tickets", {
        params,
        signal: abortControllerRef.current.signal
      });
      
      // Verificar se esta ainda é a requisição mais recente
      if (requestId !== lastRequestIdRef.current) {
        console.log("⚠️ Requisição descartada - não é a mais recente");
        return;
      }
      
      console.log("📥 Dados recebidos do backend:", {
        totalTickets: data.tickets?.length || 0,
        hasMore: data.hasMore,
        count: data.count,
        withUnreadMessages: params.withUnreadMessages
      });
      
      // ✅ FILTRAR NO FRONTEND TAMBÉM COMO BACKUP
      let filteredTickets = data.tickets || [];
      
      if (params.withUnreadMessages === "true") {
        const originalCount = filteredTickets.length;
        filteredTickets = filteredTickets.filter(ticket => {
          const hasUnread = ticket.unreadMessages && ticket.unreadMessages > 0;
          if (!hasUnread) {
            console.log("🔍 Ticket sem mensagens não lidas filtrado:", {
              ticketId: ticket.id,
              unreadMessages: ticket.unreadMessages,
              status: ticket.status
            });
          }
          return hasUnread;
        });
        
        console.log("✅ Filtro withUnreadMessages aplicado:", {
          original: originalCount,
          filtered: filteredTickets.length,
          removed: originalCount - filteredTickets.length
        });
      }
      
      console.log("📊 Tickets após filtro:", {
        total: filteredTickets.length,
        ticketsWithUnread: filteredTickets.map(t => ({ 
          id: t.id, 
          unreadMessages: t.unreadMessages,
          status: t.status 
        }))
      });
      
      // Atualizar tickets baseado no tipo de operação
      if (isAppend && pageNumber > 1) {
        // Paginação: adicionar aos tickets existentes
        setTickets(prevTickets => {
          const existingIds = new Set(prevTickets.map(t => t.id));
          const newTickets = filteredTickets.filter(t => !existingIds.has(t.id));
          const combined = [...prevTickets, ...newTickets];
          
          console.log("📝 Tickets após paginação:", {
            existentes: prevTickets.length,
            novos: newTickets.length,
            total: combined.length
          });
          
          return combined;
        });
      } else {
        // Nova pesquisa: substituir todos os tickets
        console.log("🔄 Substituindo todos os tickets:", filteredTickets.length);
        setTickets(filteredTickets);
      }
      
      setHasMore(data.hasMore || false);
      setCount(data.count || filteredTickets.length); // ✅ ATUALIZAR COUNT
      setSearchDone(true);
      setLoading(false);
      
      // Chamar callback apenas uma vez por pesquisa
      if (onSearchComplete && !isAppend) {
        console.log("📞 Chamando onSearchComplete");
        onSearchComplete();
      }
      
      return data;
    } catch (err) {
      // Ignorar erros de cancelamento
      if (err.name === 'AbortError') {
        console.log("🚫 Requisição cancelada");
        return;
      }

      // Verificar se esta ainda é a requisição mais recente
      if (requestId !== lastRequestIdRef.current) {
        return;
      }
      
      console.error("❌ Erro ao buscar tickets:", err);
      setError(err);
      setLoading(false);
      setSearchDone(true);
      toastError(err);
      
      if (onSearchComplete && !isAppend) {
        onSearchComplete();
      }
      
      return { tickets: [], count: 0, hasMore: false };
    }
  }, [params, pageNumber, onSearchComplete]);

  // Effect para buscar tickets quando os parâmetros mudam
  useEffect(() => {
    console.log("🔄 Effect disparado - params mudaram:", { 
      status, 
      pageNumber, 
      statusChanged,
      withUnreadMessages: params.withUnreadMessages
    });
    fetchTickets(pageNumber > 1);
  }, [fetchTickets, pageNumber]);

  // Effect para resetar tickets quando status muda
  useEffect(() => {
    if (statusChanged) {
      console.log("📋 Status mudou, resetando tickets:", { novoStatus: status });
      setTickets([]);
      setCount(0); // ✅ RESETAR COUNT
      setSearchDone(false);
      setError(null);
    }
  }, [statusChanged, status]);

  // Effect para resetar tickets quando outros filtros mudam (exceto pageNumber e status)
  useEffect(() => {
    if (pageNumber === 1) {
      console.log("🔍 Filtros mudaram, resetando tickets");
      setTickets([]);
      setCount(0); // ✅ RESETAR COUNT
      setSearchDone(false);
      setError(null);
    }
  }, [
    params.searchParam,
    params.tags,
    params.users,
    params.date,
    params.updatedAt,
    params.showAll,
    params.queueIds,
    params.withUnreadMessages,
  ]);

  // Cleanup ao desmontar o componente
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Função para recarregar tickets manualmente
  const refetch = useCallback(() => {
    console.log("🔄 Refetch solicitado");
    setTickets([]);
    setCount(0); // ✅ RESETAR COUNT
    setSearchDone(false);
    setError(null);
    fetchTickets(false);
  }, [fetchTickets]);

  // Função para carregar próxima página
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      console.log("📄 Carregando mais tickets");
      fetchTickets(true);
    }
  }, [loading, hasMore, fetchTickets]);

  return { 
    tickets, 
    loading, 
    hasMore, 
    count, // ✅ EXPORTAR COUNT
    searchDone,
    error,
    refetch,
    loadMore
  };
};

export default useTickets;