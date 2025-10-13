"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ActionPlan_1 = __importDefault(require("../../models/ActionPlan"));
const CreateActionPlanService = async (data) => {
    const metas = Array.isArray(data.metas) ? data.metas : [];
    const actionPlan = await ActionPlan_1.default.create({ ...data, metas });
    return actionPlan;
};
exports.default = CreateActionPlanService;
