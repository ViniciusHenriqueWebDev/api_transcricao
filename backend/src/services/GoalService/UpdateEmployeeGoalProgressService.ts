import AppError from "../../errors/AppError";
import Goal from "../../models/Goal";
import EmployeeGoal from "../../models/EmployeeGoal";
import Employee from "../../models/Employee";
import sequelize from "../../database";

interface Request {
  goalId: string | number;
  employeeId: number;
  employeeGoalId?: number; // Para metas de produto, identifica qual produto específico
  progress: number;
  individualCurrent?: number;  // Valor opcional para definir diretamente o valor atual
  companyId: number;
}

const UpdateEmployeeGoalProgressService = async ({
  goalId,
  employeeId,
  employeeGoalId,
  progress,
  individualCurrent,
  companyId
}: Request): Promise<Goal> => {
  if (progress < 0 || progress > 100) {
    throw new AppError("O progresso deve estar entre 0 e 100");
  }

  // Verificar se a meta existe
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

  // Iniciar transação para garantir consistência
  const transaction = await sequelize.transaction();

  try {
    // Para metas do tipo produto, precisamos do ID específico da relação empregado-meta-produto
    if (goal.metricType === 'produto') {
      if (!employeeGoalId) {
        throw new AppError("Para metas do tipo produto, é necessário especificar o employeeGoalId");
      }

      // Buscar a relação específica para este produto
      const employeeGoal = await EmployeeGoal.findOne({
        where: { 
          id: employeeGoalId, 
          goalId, 
          employeeId 
        },
        transaction
      });

      if (!employeeGoal) {
        throw new AppError("Produto não encontrado para este funcionário e meta", 404);
      }

      // Atualizar o progresso e o valor atual do funcionário para este produto
      const newIndividualCurrent = individualCurrent !== undefined 
        ? individualCurrent 
        : Math.floor((progress / 100) * employeeGoal.individualTarget);

      await employeeGoal.update({
        progress,
        individualCurrent: newIndividualCurrent
      }, { transaction });

      // Calcular o progresso total da meta somando todos os valores atuais
      const allEmployeeGoals = await EmployeeGoal.findAll({
        where: { goalId },
        transaction
      });

      // Somar todos os valores atuais de todos os produtos de todos os funcionários
      const totalCurrent = allEmployeeGoals.reduce(
        (sum, eg) => sum + (eg.individualCurrent || 0),
        0
      );

      // Atualizar o valor atual da meta
      await goal.update({ current: totalCurrent }, { transaction });
    } else {
      // Para outros tipos de meta
      const employeeGoal = await EmployeeGoal.findOne({
        where: { goalId, employeeId },
        transaction
      });

      if (!employeeGoal) {
        throw new AppError("Funcionário não está associado a esta meta", 404);
      }

      // Calcular o valor atual baseado no progresso
      const newIndividualCurrent = individualCurrent !== undefined 
        ? individualCurrent 
        : Math.floor((progress / 100) * employeeGoal.individualTarget);

      // Atualizar o progresso e o valor atual do funcionário
      await employeeGoal.update({
        progress,
        individualCurrent: newIndividualCurrent
      }, { transaction });

      // Se a meta for dividida, recalcular o progresso geral da meta
      if (goal.dividedGoal) {
        // Buscar todos os funcionários associados à meta
        const allEmployeeGoals = await EmployeeGoal.findAll({
          where: { goalId },
          transaction
        });

        // Calcular a soma dos valores atuais de cada funcionário
        const totalCurrent = allEmployeeGoals.reduce(
          (sum, eg) => sum + (eg.individualCurrent || 0),
          0
        );

        // Atualizar o valor atual da meta
        await goal.update({ current: totalCurrent }, { transaction });
      } else {
        // Se não for dividida, usar o maior progresso entre os funcionários
        const highestProgress = await EmployeeGoal.findOne({
          where: { goalId },
          order: [['progress', 'DESC']],
          limit: 1,
          transaction
        });

        if (highestProgress) {
          const currentValue = Math.floor((highestProgress.progress / 100) * goal.target);
          await goal.update({ current: currentValue }, { transaction });
        }
      }
    }

    // Commit da transação
    await transaction.commit();

    // Buscar a meta atualizada com todos os relacionamentos
    const updatedGoal = await Goal.findByPk(goalId, {
      include: [
        {
          model: EmployeeGoal,
          include: [
            {
              model: Employee,
              attributes: ["id", "name", "position", "department"]
            }
          ]
        }
      ]
    });

    return updatedGoal;
  } catch (error) {
    // Rollback em caso de erro
    await transaction.rollback();
    throw new AppError(`Erro ao atualizar progresso: ${error.message}`);
  }
};

export default UpdateEmployeeGoalProgressService;