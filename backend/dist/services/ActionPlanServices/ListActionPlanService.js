"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ActionPlan_1 = __importDefault(require("../../models/ActionPlan"));
const ListActionPlanService = async ({ companyId }) => {
    const actionPlans = await ActionPlan_1.default.findAll({
        where: { companyId },
        order: [["createdAt", "DESC"]]
    });
    return {
        plans: actionPlans,
        count: actionPlans.length,
        hasMore: false // ajuste se tiver paginação
    };
};
exports.default = ListActionPlanService;
