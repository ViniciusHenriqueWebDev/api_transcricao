"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const PerformanceCampaign_1 = __importDefault(require("../../models/PerformanceCampaign"));
const Goal_1 = __importDefault(require("../../models/Goal"));
const EmployeeGoal_1 = __importDefault(require("../../models/EmployeeGoal"));
const Employee_1 = __importDefault(require("../../models/Employee"));
const GetCampaignSummaryService = async ({ campaignId, companyId }) => {
    // Buscar a campanha com todas as metas associadas
    const campaign = await PerformanceCampaign_1.default.findOne({
        where: { id: campaignId, companyId },
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
        throw new Error("Campanha não encontrada");
    }
    // Calcular estatísticas da campanha
    const goals = campaign.goals || [];
    const totalGoals = goals.length;
    const completedGoals = goals.filter(goal => goal.current >= goal.target).length;
    const progressPercentage = totalGoals > 0
        ? Math.round((completedGoals / totalGoals) * 100)
        : 0;
    // Calcular desempenho por funcionário
    const employeePerformance = new Map();
    // Processar todas as metas e associações com funcionários
    goals.forEach(goal => {
        (goal.employeeGoals || []).forEach(employeeGoal => {
            const employee = employeeGoal.employee;
            const employeeId = employee.id;
            if (!employeePerformance.has(employeeId)) {
                employeePerformance.set(employeeId, {
                    employeeId,
                    name: employee.name,
                    position: employee.position,
                    totalGoals: 0,
                    completedGoals: 0,
                    totalProgress: 0
                });
            }
            const performance = employeePerformance.get(employeeId);
            performance.totalGoals += 1;
            // Considerar uma meta completa se o progresso for >= 100%
            if (employeeGoal.progress >= 100) {
                performance.completedGoals += 1;
            }
            performance.totalProgress += employeeGoal.progress || 0;
        });
    });
    // Calcular a média de progresso e ordenar por desempenho
    const topPerformers = Array.from(employeePerformance.values())
        .map(perf => ({
        ...perf,
        averageProgress: perf.totalGoals > 0
            ? Math.round(perf.totalProgress / perf.totalGoals)
            : 0
    }))
        .sort((a, b) => b.averageProgress - a.averageProgress)
        .slice(0, 5); // Top 5 performers
    return {
        campaign,
        totalGoals,
        completedGoals,
        progressPercentage,
        topPerformers
    };
};
exports.default = GetCampaignSummaryService;
