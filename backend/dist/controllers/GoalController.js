"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEmployeeProgress = exports.updateRewardStatus = exports.updateProgress = exports.remove = exports.update = exports.show = exports.store = exports.index = void 0;
const socket_1 = require("../libs/socket");
const CreateGoalService_1 = __importDefault(require("../services/GoalService/CreateGoalService"));
const ListGoalService_1 = __importDefault(require("../services/GoalService/ListGoalService"));
const ShowGoalService_1 = __importDefault(require("../services/GoalService/ShowGoalService"));
const UpdateGoalService_1 = __importDefault(require("../services/GoalService/UpdateGoalService"));
const DeleteGoalService_1 = __importDefault(require("../services/GoalService/DeleteGoalService"));
const UpdateGoalProgressService_1 = __importDefault(require("../services/GoalService/UpdateGoalProgressService"));
const UpdateGoalRewardStatusService_1 = __importDefault(require("../services/GoalService/UpdateGoalRewardStatusService"));
const UpdateEmployeeGoalProgressService_1 = __importDefault(require("../services/GoalService/UpdateEmployeeGoalProgressService"));
const index = async (req, res) => {
    try {
        const { searchParam, pageNumber, employeeId, performanceCampaignId, startDate, endDate, status } = req.query;
        const { companyId } = req.user;
        const { goals, count, hasMore } = await (0, ListGoalService_1.default)({
            searchParam,
            pageNumber,
            companyId,
            employeeId: employeeId ? parseInt(employeeId) : undefined,
            performanceCampaignId: performanceCampaignId ? parseInt(performanceCampaignId) : undefined,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            status
        });
        return res.status(200).json({ goals, count, hasMore });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};
exports.index = index;
const store = async (req, res) => {
    try {
        const goalData = req.body;
        // Certifique-se de que o companyId está definido a partir do usuário logado
        if (!req.user || !req.user.companyId) {
            return res.status(401).json({ error: "Usuário não autorizado ou companyId não encontrado" });
        }
        const { companyId } = req.user;
        console.log("CompanyId do usuário:", companyId); // Log para debug
        // Pré-processamento dos dados para garantir que os campos numéricos sejam convertidos corretamente
        if (goalData.productConfig) {
            // Converter individualTarget para número em todos os produtos
            Object.keys(goalData.productConfig).forEach(employeeId => {
                const employeeConfig = goalData.productConfig[employeeId];
                if (employeeConfig && employeeConfig.products) {
                    employeeConfig.products.forEach(product => {
                        if (product.individualTarget) {
                            product.individualTarget = Number(product.individualTarget);
                        }
                    });
                }
            });
        }
        const goal = await (0, CreateGoalService_1.default)({
            ...goalData,
            companyId: companyId
        });
        const io = (0, socket_1.getIO)();
        io.emit("goal", {
            action: "create",
            goal
        });
        return res.status(201).json(goal);
    }
    catch (err) {
        console.error("Erro ao criar meta:", err);
        return res.status(err.statusCode || 400).json({ error: err.message });
    }
};
exports.store = store;
const show = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId } = req.user;
        const goal = await (0, ShowGoalService_1.default)({ id, companyId });
        return res.status(200).json(goal);
    }
    catch (err) {
        console.error(err);
        return res.status(err.statusCode || 400).json({ error: err.message });
    }
};
exports.show = show;
const update = async (req, res) => {
    try {
        const goalData = req.body;
        const { id } = req.params;
        const { companyId } = req.user;
        // Pré-processamento dos dados para garantir que os campos numéricos sejam convertidos corretamente
        if (goalData.productConfig) {
            // Converter individualTarget para número em todos os produtos
            Object.keys(goalData.productConfig).forEach(employeeId => {
                const employeeConfig = goalData.productConfig[employeeId];
                if (employeeConfig && employeeConfig.products) {
                    employeeConfig.products.forEach(product => {
                        if (product.individualTarget) {
                            product.individualTarget = Number(product.individualTarget);
                        }
                    });
                }
            });
        }
        const goal = await (0, UpdateGoalService_1.default)({
            goalData,
            goalId: id,
            companyId
        });
        const io = (0, socket_1.getIO)();
        io.emit("goal", {
            action: "update",
            goal
        });
        return res.status(200).json(goal);
    }
    catch (err) {
        console.error(err);
        return res.status(err.statusCode || 400).json({ error: err.message });
    }
};
exports.update = update;
const remove = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId } = req.user;
        await (0, DeleteGoalService_1.default)(id, companyId);
        const io = (0, socket_1.getIO)();
        io.emit("goal", {
            action: "delete",
            goalId: id
        });
        return res.status(200).json({ message: "Meta excluída com sucesso" });
    }
    catch (err) {
        console.error(err);
        return res.status(err.statusCode || 400).json({ error: err.message });
    }
};
exports.remove = remove;
const updateProgress = async (req, res) => {
    try {
        const { goalId, currentValue } = req.body; // Adicionando currentValue aqui
        const { companyId } = req.user;
        if (currentValue === undefined) {
            return res.status(400).json({ error: "O valor atual da meta é obrigatório" });
        }
        // Atualizar para usar o service correto
        const goal = await (0, UpdateGoalProgressService_1.default)({
            goalId,
            currentValue,
            companyId
        });
        const io = (0, socket_1.getIO)();
        io.emit("goal", {
            action: "update",
            goal
        });
        return res.status(200).json(goal);
    }
    catch (err) {
        console.error(err);
        return res.status(err.statusCode || 400).json({ error: err.message });
    }
};
exports.updateProgress = updateProgress;
const updateRewardStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { rewardStatus } = req.body;
        const { companyId } = req.user;
        if (!rewardStatus || !["pendente", "aprovada", "entregue"].includes(rewardStatus)) {
            return res.status(400).json({ error: "Status de recompensa inválido" });
        }
        const goal = await (0, UpdateGoalRewardStatusService_1.default)({
            goalId: id,
            rewardStatus,
            companyId
        });
        const io = (0, socket_1.getIO)();
        io.emit("goal", {
            action: "update",
            goal
        });
        return res.status(200).json(goal);
    }
    catch (err) {
        console.error(err);
        return res.status(err.statusCode || 400).json({ error: err.message });
    }
};
exports.updateRewardStatus = updateRewardStatus;
const updateEmployeeProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const { employeeId, progress } = req.body;
        const { companyId } = req.user;
        if (employeeId === undefined || progress === undefined) {
            return res.status(400).json({
                error: "ID do funcionário e progresso são obrigatórios"
            });
        }
        const goal = await (0, UpdateEmployeeGoalProgressService_1.default)({
            goalId: id,
            employeeId,
            progress,
            companyId
        });
        const io = (0, socket_1.getIO)();
        io.emit("goal", {
            action: "update",
            goal
        });
        return res.status(200).json(goal);
    }
    catch (err) {
        console.error(err);
        return res.status(err.statusCode || 400).json({ error: err.message });
    }
};
exports.updateEmployeeProgress = updateEmployeeProgress;
