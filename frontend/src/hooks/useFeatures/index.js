import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import useAuth from '../useAuth.js';

const useFeatures = () => {
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { user } = useAuth();

  // Modificação para garantir que cada feature seja independente
  const fetchFeatures = useCallback(async () => {
    if (!user || !user.companyId) {
      setFeatures({});
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(false);
    
    try {
      console.log("Buscando features para companyId:", user.companyId);
      const { data } = await api.get(`/companies/${user.companyId}/features`);
      console.log("Features recebidas do backend:", data);
      
      // Converter para um objeto para fácil verificação
      const featuresMap = {};
      
      // Processar features existentes
      if (data.existingFeatures && Array.isArray(data.existingFeatures)) {
        data.existingFeatures.forEach(feature => {
          console.log(`Processando feature ${feature.name}: status=${feature.status}`);
          // Usar comparação estrita para garantir que apenas true é considerado ativado
          featuresMap[feature.name] = feature.status === true;
        });
      }
      
      // Processar features ausentes
      if (data.missingFeatures && Array.isArray(data.missingFeatures)) {
        data.missingFeatures.forEach(feature => {
          featuresMap[feature.name] = false;
        });
      }
      
      console.log("Features processadas:", featuresMap);
      setFeatures(featuresMap);
    } catch (err) {
      console.error("Erro ao carregar features:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Carrega features ao inicializar o hook
  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  // Implementação direta de isEnabled
  const isEnabled = useCallback((featureName) => {
    // Super admin tem acesso a tudo
    if (user?.super === true) {
      console.log(`Feature ${featureName}: habilitada (super admin)`);
      return true;
    }
    
    // Verificação explícita do status da feature
    const enabled = features[featureName] === true;
    console.log(`Feature ${featureName}: ${enabled ? 'habilitada' : 'desabilitada'}`);
    return enabled;
  }, [features, user]);

  return {
    loading,
    features,
    isEnabled,
    error,
    reloadFeatures: fetchFeatures
  };
};

export default useFeatures;