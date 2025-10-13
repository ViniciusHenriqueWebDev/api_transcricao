"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ActionPlan_1 = __importDefault(require("../../models/ActionPlan"));
const UpdateActionPlanService = async (id, companyId, data) => {
    const actionPlan = await ActionPlan_1.default.findOne({ where: { id, companyId } });
    if (!actionPlan) {
        throw new Error("Plano de ação não encontrado");
    }
    await actionPlan.update(data);
    return actionPlan;
};
exports.default = UpdateActionPlanService;
