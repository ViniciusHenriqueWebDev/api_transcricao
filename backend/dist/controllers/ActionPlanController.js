"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.store = exports.show = exports.index = void 0;
const socket_1 = require("../libs/socket");
const ListActionPlanService_1 = __importDefault(require("../services/ActionPlanServices/ListActionPlanService"));
const CreateActionPlanService_1 = __importDefault(require("../services/ActionPlanServices/CreateActionPlanService"));
const ShowActionPlanService_1 = __importDefault(require("../services/ActionPlanServices/ShowActionPlanService"));
const UpdateActionPlanService_1 = __importDefault(require("../services/ActionPlanServices/UpdateActionPlanService"));
const DeleteActionPlanService_1 = __importDefault(require("../services/ActionPlanServices/DeleteActionPlanService"));
const index = async (req, res) => {
    const companyId = req.user.companyId;
    if (companyId == null)
        return res.status(400).json({ error: "Empresa não encontrada" });
    const { plans, count, hasMore } = await (0, ListActionPlanService_1.default)({ companyId });
    return res.json({ plans, count, hasMore });
};
exports.index = index;
const show = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;
    if (companyId == null)
        return res.status(400).json({ error: "Empresa não encontrada" });
    const plan = await (0, ShowActionPlanService_1.default)(Number(id), companyId);
    if (!plan)
        return res.status(404).json({ error: "Plano de ação não encontrado" });
    return res.json(plan);
};
exports.show = show;
const store = async (req, res) => {
    const companyId = req.user.companyId;
    if (companyId == null)
        return res.status(400).json({ error: "Empresa não encontrada" });
    const data = req.body;
    const plan = await (0, CreateActionPlanService_1.default)({ ...data, companyId });
    const io = (0, socket_1.getIO)();
    io.to(`company-${companyId}-mainchannel`).emit("actionPlan", { action: "create", plan });
    return res.status(201).json(plan);
};
exports.store = store;
const update = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;
    if (companyId == null)
        return res.status(400).json({ error: "Empresa não encontrada" });
    const data = req.body;
    const plan = await (0, UpdateActionPlanService_1.default)(Number(id), companyId, data);
    const io = (0, socket_1.getIO)();
    io.to(`company-${companyId}-mainchannel`).emit("actionPlan", { action: "update", plan });
    return res.json(plan);
};
exports.update = update;
const remove = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;
    if (companyId == null)
        return res.status(400).json({ error: "Empresa não encontrada" });
    await (0, DeleteActionPlanService_1.default)(Number(id), companyId);
    const io = (0, socket_1.getIO)();
    io.to(`company-${companyId}-mainchannel`).emit("actionPlan", { action: "delete", id });
    return res.status(200).json({ message: "Plano de ação excluído com sucesso" });
};
exports.remove = remove;
