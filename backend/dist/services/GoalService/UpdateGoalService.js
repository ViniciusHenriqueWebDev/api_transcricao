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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Yup = __importStar(require("yup"));
const sequelize_1 = require("sequelize");
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Goal_1 = __importDefault(require("../../models/Goal"));
const EmployeeGoal_1 = __importDefault(require("../../models/EmployeeGoal"));
const Employee_1 = __importDefault(require("../../models/Employee"));
const PerformanceCampaign_1 = __importDefault(require("../../models/PerformanceCampaign"));
const database_1 = __importDefault(require("../../database"));
const UpdateGoalService = async ({ goalData, goalId, companyId }) => {
    const schema = Yup.object().shape({
        name: Yup.string().min(2),
        description: Yup.string(),
        metricType: Yup.string().oneOf(['quantidade', 'valor', 'percentual', 'produto']),
        target: Yup.number().positive(),
        startDate: Yup.date(),
        endDate: Yup.date().min(Yup.ref('startDate'), "Data de término deve ser posterior à data de início"),
        employeeIds: Yup.array().of(Yup.number()),
        dividedGoal: Yup.boolean(),
        performanceCampaignId: Yup.number().nullable(),
        reward: Yup.string(),
        rewardValue: Yup.number().min(0).nullable(),
        rewardStatus: Yup.string().oneOf(['pendente', 'aprovada', 'entregue']),
        productConfig: Yup.object().nullable().when('metricType', {
            is: 'produto',
            then: Yup.object().nullable()
        })
    });
    try {
        await schema.validate(goalData);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    // Buscar a meta existente
    const goal = await Goal_1.default.findOne({
        where: { id: goalId, companyId },
        include: [
            {
                model: EmployeeGoal_1.default,
                include: [{ model: Employee_1.default }]
            }
        ]
    });
    if (!goal) {
        throw new AppError_1.default("Meta não encontrada", 404);
    }
    // Verificar se a nova configuração de métrica é compatível com o estado atual
    if (goalData.metricType && goalData.metricType !== goal.metricType) {
        // Se estiver mudando para ou de "produto", verificar se os dados necessários estão presentes
        if (goalData.metricType === 'produto' && (!goalData.productConfig || !goalData.employeeIds)) {
            throw new AppError_1.default("Ao mudar para o tipo 'produto', é necessário fornecer productConfig e employeeIds");
        }
    }
    // Se estiver atualizando a campanha, verificar se ela existe
    if (goalData.performanceCampaignId) {
        const campaignExists = await PerformanceCampaign_1.default.findOne({
            where: { id: goalData.performanceCampaignId, companyId }
        });
        if (!campaignExists) {
            throw new AppError_1.default("Campanha não encontrada ou não pertence à empresa");
        }
    }
    // Iniciar transação
    const transaction = await database_1.default.transaction();
    try {
        // Validar configuração de produtos quando atualizar para o tipo de métrica "produto"
        const newMetricType = goalData.metricType || goal.metricType;
        if (newMetricType === 'produto' && goalData.productConfig && goalData.employeeIds) {
            // Verificar se a soma das metas individuais não ultrapassa a meta total
            let totalIndividualTargets = 0;
            // Verificar a configuração de produtos para cada funcionário
            for (const employeeId of goalData.employeeIds) {
                const empConfig = goalData.productConfig[employeeId];
                if (!empConfig || !empConfig.products || !Array.isArray(empConfig.products) || empConfig.products.length === 0) {
                    throw new AppError_1.default(`Configuração de produtos não encontrada para o funcionário ${employeeId}`);
                }
                for (const product of empConfig.products) {
                    totalIndividualTargets += Number(product.individualTarget) || 0;
                }
            }
            const newTarget = goalData.target || goal.target;
            if (totalIndividualTargets > newTarget) {
                throw new AppError_1.default(`A soma das metas individuais (${totalIndividualTargets}) não pode ultrapassar a meta total (${newTarget})`);
            }
        }
        // Se estiver atualizando os funcionários, processar as alterações
        if (goalData.employeeIds && goalData.employeeIds.length > 0) {
            // Verificar se todos os funcionários existem e pertencem à empresa
            for (const employeeId of goalData.employeeIds) {
                const employeeExists = await Employee_1.default.findOne({
                    where: { id: employeeId, companyId },
                    transaction
                });
                if (!employeeExists) {
                    throw new AppError_1.default(`Funcionário com ID ${employeeId} não encontrado ou não pertence à empresa`);
                }
            }
            // Obter os IDs dos funcionários já associados à meta
            const existingEmployeeIds = goal.employeeGoals.map(eg => eg.employeeId);
            // Identificar funcionários a serem removidos e adicionados
            const employeeIdsToRemove = existingEmployeeIds.filter(id => !goalData.employeeIds.includes(id));
            const employeeIdsToAdd = goalData.employeeIds.filter(id => !existingEmployeeIds.includes(id));
            // Remover associações de funcionários
            if (employeeIdsToRemove.length > 0) {
                await EmployeeGoal_1.default.destroy({
                    where: {
                        goalId: goal.id,
                        employeeId: { [sequelize_1.Op.in]: employeeIdsToRemove }
                    },
                    transaction
                });
            }
            // Para metas do tipo produto, atualizar produtos existentes e criar novos
            if (newMetricType === 'produto' && goalData.productConfig) {
                // Para os funcionários que permaneceram, remover os produtos existentes
                const remainingEmployeeIds = existingEmployeeIds.filter(id => goalData.employeeIds.includes(id));
                // Remover todas as associações existentes para estes funcionários
                await EmployeeGoal_1.default.destroy({
                    where: {
                        goalId: goal.id,
                        employeeId: { [sequelize_1.Op.in]: remainingEmployeeIds }
                    },
                    transaction
                });
                // Adicionar as novas configurações de produtos para todos os funcionários
                for (const employeeId of goalData.employeeIds) {
                    const empConfig = goalData.productConfig[employeeId];
                    for (const product of empConfig.products) {
                        await EmployeeGoal_1.default.create({
                            goalId: goal.id,
                            employeeId,
                            individualTarget: product.individualTarget,
                            individualCurrent: 0,
                            progress: 0,
                            productName: product.productName
                        }, { transaction });
                    }
                }
            }
            else if (newMetricType !== 'produto') {
                // Para outros tipos de meta, adicionar novas associações de funcionários
                if (employeeIdsToAdd.length > 0) {
                    // Calcular target individual baseado na configuração de meta dividida
                    const isDividedGoal = typeof goalData.dividedGoal !== 'undefined' ? goalData.dividedGoal : goal.dividedGoal;
                    const targetValue = goalData.target || goal.target;
                    const individualTarget = isDividedGoal
                        ? Math.ceil(targetValue / goalData.employeeIds.length)
                        : targetValue;
                    for (const employeeId of employeeIdsToAdd) {
                        await EmployeeGoal_1.default.create({
                            goalId: goal.id,
                            employeeId,
                            individualTarget,
                            individualCurrent: 0,
                            progress: 0
                        }, { transaction });
                    }
                }
                // Se a meta é dividida, atualizar o target individual para todos os funcionários
                if (goalData.dividedGoal || (goalData.dividedGoal === undefined && goal.dividedGoal)) {
                    const updatedTarget = goalData.target || goal.target;
                    const totalEmployees = goalData.employeeIds.length;
                    const individualTarget = Math.ceil(updatedTarget / totalEmployees);
                    // Atualizar o target individual para todos os funcionários associados
                    await EmployeeGoal_1.default.update({ individualTarget }, {
                        where: { goalId: goal.id },
                        transaction
                    });
                }
            }
        }
        // Atualizar os dados da meta
        await goal.update({
            ...goalData,
            multiEmployee: goalData.employeeIds ? goalData.employeeIds.length > 1 : goal.multiEmployee,
            originalTarget: goalData.target || goal.originalTarget,
            totalEmployees: goalData.employeeIds ? goalData.employeeIds.length : goal.totalEmployees,
            productConfig: (newMetricType === 'produto' && goalData.productConfig)
                ? JSON.stringify(goalData.productConfig)
                : (newMetricType === 'produto' ? goal.productConfig : null)
        }, { transaction });
        // Commit da transação
        await transaction.commit();
        // Buscar a meta atualizada com todos os relacionamentos
        const updatedGoal = await Goal_1.default.findByPk(goal.id, {
            include: [
                {
                    model: EmployeeGoal_1.default,
                    include: [
                        {
                            model: Employee_1.default,
                            attributes: ["id", "name", "position", "department"]
                        }
                    ]
                },
                {
                    model: PerformanceCampaign_1.default,
                    attributes: ["id", "name", "startDate", "endDate"]
                }
            ]
        });
        return updatedGoal;
    }
    catch (error) {
        // Rollback em caso de erro
        await transaction.rollback();
        throw new AppError_1.default(`Erro ao atualizar meta: ${error.message}`);
    }
};
exports.default = UpdateGoalService;
