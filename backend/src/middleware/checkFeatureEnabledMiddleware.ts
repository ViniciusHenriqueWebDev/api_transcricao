import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";
import User from "../models/User";
import { checkFeatureEnabled } from "../services/FeatureServices";

/**
 * Middleware para verificar se uma feature específica está habilitada para a empresa.
 * @param featureName - Nome da feature a ser verificada ou array de nomes de features (qualquer uma válida)
 */
const checkFeatureEnabledMiddleware = (featureName: string | string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id: userId, companyId } = req.user;

    try {
      // Verificar se o usuário é super admin (sempre tem acesso)
      const user = await User.findByPk(userId);
      if (user?.super) {
        return next();
      }

      // Verificar o tipo do parâmetro featureName
      if (typeof featureName === 'string') {
        // Caso simples - verificar uma única feature
        const isEnabled = await checkFeatureEnabled(companyId, featureName);
        
        if (!isEnabled) {
          throw new AppError(
            `Sua empresa não tem acesso à feature: ${featureName}. Entre em contato com o administrador.`,
            403
          );
        }
      } else if (Array.isArray(featureName)) {
        // Verificar múltiplas features - qualquer uma válida permite acesso
        const enabledPromises = featureName.map(feature => 
          checkFeatureEnabled(companyId, feature)
        );
        
        const results = await Promise.all(enabledPromises);
        const hasAnyEnabled = results.some(result => result === true);
        
        if (!hasAnyEnabled) {
          throw new AppError(
            `Sua empresa não tem acesso a nenhuma das features necessárias: [${featureName.join(', ')}]. Entre em contato com o administrador.`,
            403
          );
        }
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Erro ao verificar acesso à feature", 500);
    }
  };
};

export default checkFeatureEnabledMiddleware;