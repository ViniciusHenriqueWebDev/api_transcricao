import AppError from "../../errors/AppError";
import Goal from "../../models/Goal";
import Employee from "../../models/Employee";
import EmployeeGoal from "../../models/EmployeeGoal";
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
  name: string;
  description?: string;
  metricType: string;
  target: number;
  current?: number;
  startDate: Date;
  endDate: Date;
  employeeIds: number[];
  multiEmployee?: boolean;
  dividedGoal?: boolean;
  performanceCampaignId?: number;
  reward?: string;
  rewardValue?: number;
  productConfig?: ProductConfig;
  companyId: number;
}

const validateGoalData = (goalData: GoalData): void => {
  // Validações básicas
  if (!goalData.name || goalData.name.trim() === '') {
    throw new AppError("Nome é obrigatório");
  }

  if (!goalData.metricType) {
    throw new AppError("Tipo de métrica é obrigatório");
  }

  const validMetricTypes = ['quantidade', 'valor', 'percentual', 'produto'];
  if (!validMetricTypes.includes(goalData.metricType)) {
    throw new AppError(`Tipo de métrica inválido. Deve ser um dos seguintes: ${validMetricTypes.join(', ')}`);
  }

  if (typeof goalData.target !== 'number' || goalData.target <= 0) {
    throw new AppError("Meta deve ser um número positivo");
  }

  if (!goalData.startDate) {
    throw new AppError("Data de início é obrigatória");
  }

  if (!goalData.endDate) {
    throw new AppError("Data de término é obrigatória");
  }

  const startDate = new Date(goalData.startDate);
  const endDate = new Date(goalData.endDate);
  
  if (endDate < startDate) {
    throw new AppError("Data de término deve ser posterior à data de início");
  }

  if (!goalData.employeeIds || !Array.isArray(goalData.employeeIds) || goalData.employeeIds.length === 0) {
    throw new AppError("Pelo menos um funcionário deve ser selecionado");
  }

  // Validar rewardValue se fornecido
  if (goalData.rewardValue !== null && goalData.rewardValue !== undefined) {
    if (typeof goalData.rewardValue !== 'number' || goalData.rewardValue < 0) {
      throw new AppError("Valor da recompensa deve ser um número não negativo");
    }
  }

  // Validar productConfig para metas do tipo produto
  if (goalData.metricType === 'produto') {
    if (!goalData.productConfig) {
      throw new AppError("Para metas do tipo produto, é necessário fornecer a configuração de produtos");
    }
  }
};

const CreateGoalService = async (goalData: GoalData): Promise<Goal> => {
  if (!goalData.companyId) {
    throw new AppError("CompanyId é obrigatório para criar uma meta");
  }

  // Validação manual dos dados
  validateGoalData(goalData);

  // Verificar se a campanha existe, caso tenha sido informada
  if (goalData.performanceCampaignId) {
    const campaignExists = await PerformanceCampaign.findByPk(goalData.performanceCampaignId);
    if (!campaignExists) {
      throw new AppError("Campanha não encontrada");
    }
  }

  // Verificar se os funcionários existem
  for (const employeeId of goalData.employeeIds) {
    const employeeExists = await Employee.findByPk(employeeId);
    if (!employeeExists) {
      throw new AppError(`Funcionário com ID ${employeeId} não encontrado`);
    }
  }

  // Para metas do tipo produto, validar a configuração de produtos
  if (goalData.metricType === 'produto' && goalData.productConfig) {
    let totalIndividualTargets = 0;
    
    // Verificar se todos os funcionários têm configuração de produtos
    for (const employeeId of goalData.employeeIds) {
      const strEmployeeId = employeeId.toString();
      const empConfig = goalData.productConfig[strEmployeeId];
      
      if (!empConfig || !empConfig.products || !Array.isArray(empConfig.products) || empConfig.products.length === 0) {
        throw new AppError(`Configuração de produtos não encontrada para o funcionário ${employeeId}`);
      }
      
      for (const product of empConfig.products) {
        if (!product.productName || product.productName.trim() === '') {
          throw new AppError(`Nome do produto é obrigatório para o funcionário ${employeeId}`);
        }
        
        // Garantir que individualTarget seja um número
        const targetValue = typeof product.individualTarget === 'string' 
          ? Number(product.individualTarget) 
          : product.individualTarget;
          
        if (isNaN(targetValue) || targetValue <= 0) {
          throw new AppError(`Meta individual inválida para o produto ${product.productName}`);
        }
        
        totalIndividualTargets += targetValue;
      }
    }
    
    // Verificar se a soma das metas individuais não ultrapassa a meta total
    if (totalIndividualTargets > goalData.target) {
      throw new AppError(`A soma das metas individuais (${totalIndividualTargets}) não pode ultrapassar a meta total (${goalData.target})`);
    }
  }

  const transaction = await sequelize.transaction();

  try {
    // Criar a meta principal
    const goal = await Goal.create({
      name: goalData.name,
      description: goalData.description,
      metricType: goalData.metricType,
      target: goalData.target,
      originalTarget: goalData.target,
      current: goalData.current || 0,
      startDate: goalData.startDate,
      endDate: goalData.endDate,
      multiEmployee: goalData.employeeIds.length > 1,
      dividedGoal: goalData.dividedGoal || false,
      performanceCampaignId: goalData.performanceCampaignId,
      totalEmployees: goalData.employeeIds.length,
      reward: goalData.reward,
      rewardValue: goalData.rewardValue,
      rewardStatus: 'pendente',
      productConfig: goalData.metricType === 'produto' ? JSON.stringify(goalData.productConfig) : null,
      companyId: goalData.companyId
    }, { transaction });

    // Se a meta for do tipo produto, criar uma associação para cada produto de cada funcionário
    if (goalData.metricType === 'produto' && goalData.productConfig) {
      for (const employeeId of goalData.employeeIds) {
        const strEmployeeId = employeeId.toString();
        const empConfig = goalData.productConfig[strEmployeeId];
        
        if (empConfig && empConfig.products) {
          for (const product of empConfig.products) {
            await EmployeeGoal.create({
              goalId: goal.id,
              employeeId,
              individualTarget: Number(product.individualTarget),
              individualCurrent: 0,
              progress: 0,
              productName: product.productName
            }, { transaction });
          }
        }
      }
    } else {
      // Para outros tipos de meta, criar associações simples com os funcionários
      // Calcular o target individual se a meta for dividida
      const individualTarget = goalData.dividedGoal
        ? Math.ceil(goalData.target / goalData.employeeIds.length)
        : goalData.target;

      // Criar associações com os funcionários
      for (const employeeId of goalData.employeeIds) {
        await EmployeeGoal.create({
          goalId: goal.id,
          employeeId,
          individualTarget,
          individualCurrent: 0,
          progress: 0
        }, { transaction });
      }
    }

    await transaction.commit();

    // Buscar a meta com todas as relações
    const createdGoal = await Goal.findByPk(goal.id, {
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

    return createdGoal;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Erro ao criar meta: ${error.message}`);
  }
};

export default CreateGoalService;