import { useState, useEffect } from "react"; 
import api from "../../services/api"; 
import { useLocalStorage } from "../useLocalStorage";

const useSignature = () => {
  // Se a configuração global está habilitada (switch disponível)
  const [signatureEnabled, setSignatureEnabled] = useState(true); 
  // Preferência do usuário salva no localStorage
  const [signMessage, setSignMessage] = useLocalStorage("signOption", true); 

  useEffect(() => {
    const fetchSignatureConfig = async () => {
      try {
        const { data } = await api.get("/settings"); 
        const signatureConfig = data.find(s => s.key === "signatureMessage"); 
        
        if (signatureConfig && signatureConfig.value === "disabled") {
          // Switch está desabilitado (assinatura obrigatória)
          setSignatureEnabled(false);
          // Forçar assinatura sempre ativa quando desabilitado nas configurações
          setSignMessage(true); 
        } else {
          // Switch está habilitado (assinatura opcional)
          setSignatureEnabled(true); 
          // Não altera a preferência do usuário
        }
      } catch (error) {
        console.error("Erro ao buscar configuração de assinatura: ", error)
      }
    }; 
    
    fetchSignatureConfig(); 
  }, [setSignMessage]); 
  
  // Aplica assinatura na mensagem
  const applySignature = (message, userName, isEditing = false) => {
    if (isEditing) return message; // Não aplica em edições
    
    // Se o switch está desabilitado (obrigatório) OU 
    // se está habilitado E o usuário optou por usar assinatura
    if (!signatureEnabled || (signatureEnabled && signMessage)) {
      return `*${userName}:*\n${message}`;
    }
    
    return message;
  }

  // Função para controlar a alteração do switch
  const toggleSignature = (value) => {
    // Só permite alterar se o switch estiver habilitado nas configurações
    if (signatureEnabled) {
      setSignMessage(value);
    }
  }

  return {
    signatureEnabled,   // Se o switch está habilitado nas configurações
    signMessage,        // Se o usuário escolheu usar assinatura
    setSignMessage: toggleSignature,  // Função para alterar a assinatura
    applySignature      // Função para aplicar a assinatura
  };
}

export default useSignature;