"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const PerformanceCampaign_1 = __importDefault(require("../../models/PerformanceCampaign"));
const Goal_1 = __importDefault(require("../../models/Goal"));
const EmployeeGoal_1 = __importDefault(require("../../models/EmployeeGoal"));
const Employee_1 = __importDefault(require("../../models/Employee"));
const ShowPerformanceCampaignService = async ({ id, companyId }) => {
    const campaign = await PerformanceCampaign_1.default.findOne({
        where: { id, companyId },
        include: [
            {
                model: Goal_1.default,
                include: [
                    {
                        model: EmployeeGoal_1.default,
                        include: [
                            {
                                model: Employee_1.default,
                                attributes: ["id", "name", "position", "department"]
                            }
                        ]
                    }
                ]
            }
        ]
    });
    if (!campaign) {
        throw new AppError_1.default("Campanha não encontrada", 404);
    }
    return campaign;
};
exports.default = ShowPerformanceCampaignService;
