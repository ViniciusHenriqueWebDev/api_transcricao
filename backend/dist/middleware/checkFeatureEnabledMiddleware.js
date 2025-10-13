"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../errors/AppError"));
const User_1 = __importDefault(require("../models/User"));
const FeatureServices_1 = require("../services/FeatureServices");
/**
 * Middleware para verificar se uma feature específica está habilitada para a empresa.
 * @param featureName - Nome da feature a ser verificada ou array de nomes de features (qualquer uma válida)
 */
const checkFeatureEnabledMiddleware = (featureName) => {
    return async (req, res, next) => {
        const { id: userId, companyId } = req.user;
        try {
            // Verificar se o usuário é super admin (sempre tem acesso)
            const user = await User_1.default.findByPk(userId);
            if (user?.super) {
                return next();
            }
            // Verificar o tipo do parâmetro featureName
            if (typeof featureName === 'string') {
                // Caso simples - verificar uma única feature
                const isEnabled = await (0, FeatureServices_1.checkFeatureEnabled)(companyId, featureName);
                if (!isEnabled) {
                    throw new AppError_1.default(`Sua empresa não tem acesso à feature: ${featureName}. Entre em contato com o administrador.`, 403);
                }
            }
            else if (Array.isArray(featureName)) {
                // Verificar múltiplas features - qualquer uma válida permite acesso
                const enabledPromises = featureName.map(feature => (0, FeatureServices_1.checkFeatureEnabled)(companyId, feature));
                const results = await Promise.all(enabledPromises);
                const hasAnyEnabled = results.some(result => result === true);
                if (!hasAnyEnabled) {
                    throw new AppError_1.default(`Sua empresa não tem acesso a nenhuma das features necessárias: [${featureName.join(', ')}]. Entre em contato com o administrador.`, 403);
                }
            }
            next();
        }
        catch (error) {
            if (error instanceof AppError_1.default) {
                throw error;
            }
            throw new AppError_1.default("Erro ao verificar acesso à feature", 500);
        }
    };
};
exports.default = checkFeatureEnabledMiddleware;
