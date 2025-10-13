"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSummary = exports.remove = exports.update = exports.show = exports.store = exports.index = void 0;
const socket_1 = require("../libs/socket");
const CreatePerformanceCampaignService_1 = __importDefault(require("../services/PerformanceCampaignService/CreatePerformanceCampaignService"));
const ListPerformanceCampaignsService_1 = __importDefault(require("../services/PerformanceCampaignService/ListPerformanceCampaignsService"));
const ShowPerformanceCampaignService_1 = __importDefault(require("../services/PerformanceCampaignService/ShowPerformanceCampaignService"));
const UpdatePerformanceCampaignService_1 = __importDefault(require("../services/PerformanceCampaignService/UpdatePerformanceCampaignService"));
const DeletePerformanceCampaignService_1 = __importDefault(require("../services/PerformanceCampaignService/DeletePerformanceCampaignService"));
const GetCampaignSummaryService_1 = __importDefault(require("../services/PerformanceCampaignService/GetCampaignSummaryService"));
const index = async (req, res) => {
    try {
        const { searchParam, pageNumber, status, startDate, endDate } = req.query;
        const { companyId } = req.user;
        const { campaigns, count, hasMore } = await (0, ListPerformanceCampaignsService_1.default)({
            searchParam,
            pageNumber,
            companyId,
            status,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined
        });
        return res.status(200).json({ campaigns, count, hasMore });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};
exports.index = index;
const store = async (req, res) => {
    try {
        const campaignData = req.body;
        const { companyId } = req.user;
        const campaign = await (0, CreatePerformanceCampaignService_1.default)({
            ...campaignData,
            companyId
        });
        const io = (0, socket_1.getIO)();
        io.emit("performanceCampaign", {
            action: "create",
            campaign
        });
        return res.status(201).json(campaign);
    }
    catch (err) {
        console.error(err);
        return res.status(err.statusCode || 400).json({ error: err.message });
    }
};
exports.store = store;
const show = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId } = req.user;
        const campaign = await (0, ShowPerformanceCampaignService_1.default)({ id, companyId });
        return res.status(200).json(campaign);
    }
    catch (err) {
        console.error(err);
        return res.status(err.statusCode || 400).json({ error: err.message });
    }
};
exports.show = show;
const update = async (req, res) => {
    try {
        const campaignData = req.body;
        const { id } = req.params;
        const { companyId } = req.user;
        const campaign = await (0, UpdatePerformanceCampaignService_1.default)({
            campaignData,
            campaignId: id,
            companyId
        });
        const io = (0, socket_1.getIO)();
        io.emit("performanceCampaign", {
            action: "update",
            campaign
        });
        return res.status(200).json(campaign);
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
        await (0, DeletePerformanceCampaignService_1.default)(id, companyId);
        const io = (0, socket_1.getIO)();
        io.emit("performanceCampaign", {
            action: "delete",
            campaignId: id
        });
        return res.status(200).json({ message: "Campanha excluída com sucesso" });
    }
    catch (err) {
        console.error(err);
        return res.status(err.statusCode || 400).json({ error: err.message });
    }
};
exports.remove = remove;
const getSummary = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId } = req.user;
        const summary = await (0, GetCampaignSummaryService_1.default)({
            campaignId: id,
            companyId
        });
        return res.status(200).json(summary);
    }
    catch (err) {
        console.error(err);
        return res.status(err.statusCode || 400).json({ error: err.message });
    }
};
exports.getSummary = getSummary;
