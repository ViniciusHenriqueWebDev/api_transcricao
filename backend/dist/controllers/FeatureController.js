"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.check = exports.update = exports.listCompanyFeatures = exports.index = void 0;
const FeatureService = __importStar(require("../services/FeatureServices"));
const index = async (req, res) => {
    // Retorna todas as features disponíveis para serem ativadas
    const features = FeatureService.getAllAvailableFeatures();
    return res.status(200).json(features);
};
exports.index = index;
const listCompanyFeatures = async (req, res) => {
    const { companyId } = req.params;
    // Retorna features existentes e as que estão faltando
    const result = await FeatureService.getCompanyFeaturesWithMissing(Number(companyId));
    return res.status(200).json(result);
};
exports.listCompanyFeatures = listCompanyFeatures;
const update = async (req, res) => {
    const { companyId } = req.params;
    const { name, status } = req.body;
    console.log(`Atualizando feature ${name} para empresa ${companyId} com status: ${status}`);
    const feature = await FeatureService.createOrUpdateFeature({
        name,
        status,
        companyId: Number(companyId)
    });
    return res.status(200).json(feature);
};
exports.update = update;
const check = async (req, res) => {
    const { companyId } = req.params;
    const { name } = req.query;
    if (!name || typeof name !== "string") {
        return res.status(400).json({ error: "Nome da feature não fornecido" });
    }
    const isEnabled = await FeatureService.checkFeatureEnabled(Number(companyId), name);
    return res.status(200).json({ enabled: isEnabled });
};
exports.check = check;
