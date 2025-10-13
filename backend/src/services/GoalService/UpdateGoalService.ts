import * as Yup from "yup";
import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Goal from "../../models/Goal";
import EmployeeGoal from "../../models/EmployeeGoal";
import Employee from "../../models/Employee";
import PerformanceCampaign from "../../models/PerformanceCampaign";
import sequelize from "../../database";

interface ProductItem {
  productName: string;
  individualTarget: number;
}

interface EmployeeProductConfig {
  products: ProductItem[];
}

interface ProductConfig {
  [employeeId: string]: EmployeeProductConfig;
}

interface GoalData {
  name?: string;
  description?: string;
  metricType?: string;
  target?: number;
  startDate?: Date;
  endDate?: Date;
  employeeIds?: number[];
  dividedGoal?: boolean;
  performanceCampaignId?: number;
  reward?: string;
  rewardValue?: number;
  rewardStatus?: string;
  productConfig?: ProductConfig;
}

interface Request {
  goalData: GoalData;
  goalId: string | number;
  companyId: number;
}

const UpdateGoalService = async ({
  goalData,
  goalId,
  companyId
}: Request): Promise<Goal> => {
  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    description: Yup.string(),
    metricType: Yup.string().oneOf(['quantidade', 'valor', 'percentual', 'produto']),
    target: Yup.number().positive(),
    startDate: Yup.date(),
    endDate: Yup.date().min(
      Yup.ref('startDate'),
      "Data de término deve ser posterior à data de início"
    ),
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
  } catch (err) {
    throw new AppError(err.message);
  }

  // Buscar a meta existente
  const goal = await Goal.findOne({
    where: { id: goalId, companyId },
    include: [
      {
        model: EmployeeGoal,
        include: [{ model: Employee }]
      }
    ]
  });

  if (!goal) {
    throw new AppError("Meta não encontrada", 404);
  }

  // Verificar se a nova configuração de métrica é compatível com o estado atual
  if (goalData.metricType && goalData.metricType !== goal.metricType) {
    // Se estiver mudando para ou de "produto", verificar se os dados necessários estão presentes
    if (goalData.metricType === 'produto' && (!goalData.productConfig || !goalData.employeeIds)) {
      throw new AppError("Ao mudar para o tipo 'produto', é necessário fornecer productConfig e employeeIds");
    }
  }

  // Se estiver atualizando a campanha, verificar se ela existe
  if (goalData.performanceCampaignId) {
    const campaignExists = await PerformanceCampaign.findOne({
      where: { id: goalData.performanceCampaignId, companyId }
    });

    if (!campaignExists) {
      throw new AppError("Campanha não encontrada ou não pertence à empresa");
    }
  }

  // Iniciar transação
  const transaction = await sequelize.transaction();

  try {
    // Validar configuração de produtos quando atualizar para o tipo de métrica "produto"
    const newMetricType = goalData.metricType || goal.metricType;
    if (newMetricType === 'produto' && goalData.productConfig && goalData.employeeIds) {
      // Verificar se a soma das metas individuais não ultrapassa a meta total
      let totalIndividualTargets = 0;
      
      // Verificar a configuração de produtos para cada funcionário
      for (const employeeId of goalData.employeeIds) {
        const empConfig = goalData.productConfig[employeeId] as EmployeeProductConfig;
        
        if (!empConfig || !empConfig.products || !Array.isArray(empConfig.products) || empConfig.products.length === 0) {
          throw new AppError(`Configuração de produtos não encontrada para o funcionário ${employeeId}`);
        }
        
        for (const product of empConfig.products) {
          totalIndividualTargets += Number(product.individualTarget) || 0;
        }
      }
      
      const newTarget = goalData.target || goal.target;
      if (totalIndividualTargets > newTarget) {
        throw new AppError(`A soma das metas individuais (${totalIndividualTargets}) não pode ultrapassar a meta total (${newTarget})`);
      }
    }

    // Se estiver atualizando os funcionários, processar as alterações
    if (goalData.employeeIds && goalData.employeeIds.length > 0) {
      // Verificar se todos os funcionários existem e pertencem à empresa
      for (const employeeId of goalData.employeeIds) {
        const employeeExists = await Employee.findOne({
          where: { id: employeeId, companyId },
          transaction
        });

        if (!employeeExists) {
          throw new AppError(`Funcionário com ID ${employeeId} não encontrado ou não pertence à empresa`);
        }
      }

      // Obter os IDs dos funcionários já associados à meta
      const existingEmployeeIds = goal.employeeGoals.map(eg => eg.employeeId);

      // Identificar funcionários a serem removidos e adicionados
      const employeeIdsToRemove = existingEmployeeIds.filter(id => !goalData.employeeIds.includes(id));
      const employeeIdsToAdd = goalData.employeeIds.filter(id => !existingEmployeeIds.includes(id));

      // Remover associações de funcionários
      if (employeeIdsToRemove.length > 0) {
        await EmployeeGoal.destroy({
          where: {
            goalId: goal.id,
            employeeId: { [Op.in]: employeeIdsToRemove }
          },
          transaction
        });
      }

      // Para metas do tipo produto, atualizar produtos existentes e criar novos
      if (newMetricType === 'produto' && goalData.productConfig) {
        // Para os funcionários que permaneceram, remover os produtos existentes
        const remainingEmployeeIds = existingEmployeeIds.filter(id => goalData.employeeIds.includes(id));
        
        // Remover todas as associações existentes para estes funcionários
        await EmployeeGoal.destroy({
          where: {
            goalId: goal.id,
            employeeId: { [Op.in]: remainingEmployeeIds }
          },
          transaction
        });
        
        // Adicionar as novas configurações de produtos para todos os funcionários
        for (const employeeId of goalData.employeeIds) {
          const empConfig = goalData.productConfig[employeeId] as EmployeeProductConfig;
          
          for (const product of empConfig.products) {
            await EmployeeGoal.create({
              goalId: goal.id,
              employeeId,
              individualTarget: product.individualTarget,
              individualCurrent: 0,
              progress: 0,
              productName: product.productName
            }, { transaction });
          }
        }
      } else if (newMetricType !== 'produto') {
        // Para outros tipos de meta, adicionar novas associações de funcionários
        if (employeeIdsToAdd.length > 0) {
          // Calcular target individual baseado na configuração de meta dividida
          const isDividedGoal = typeof goalData.dividedGoal !== 'undefined' ? goalData.dividedGoal : goal.dividedGoal;
          const targetValue = goalData.target || goal.target;
          const individualTarget = isDividedGoal
            ? Math.ceil(targetValue / goalData.employeeIds.length)
            : targetValue;

          for (const employeeId of employeeIdsToAdd) {
            await EmployeeGoal.create({
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
          await EmployeeGoal.update(
            { individualTarget },
            { 
              where: { goalId: goal.id },
              transaction 
            }
          );
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
    const updatedGoal = await Goal.findByPk(goal.id, {
      include: [
        {
          model: EmployeeGoal,
          include: [
            {
              model: Employee,
              attributes: ["id", "name", "position", "department"]
            }
          ]
        },
        {
          model: PerformanceCampaign,
          attributes: ["id", "name", "startDate", "endDate"]
        }
      ]
    });

    return updatedGoal;
  } catch (error) {
    // Rollback em caso de erro
    await transaction.rollback();
    throw new AppError(`Erro ao atualizar meta: ${error.message}`);
  }
};

export default UpdateGoalService;