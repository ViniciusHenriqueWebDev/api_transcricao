import * as Yup from "yup";
import AppError from "../../errors/AppError";
import EmployeeGoal from "../../models/EmployeeGoal";
import Goal from "../../models/Goal";
import Employee from "../../models/Employee";

interface EmployeeGoalData {
  employeeId: number;
  goalId: number;
  individualTarget: number;
  individualCurrent: number;
  companyId: number;
}

const CreateEmployeeGoalService = async ({
  employeeId,
  goalId,
  individualTarget,
  individualCurrent,
  companyId
}: EmployeeGoalData): Promise<EmployeeGoal> => {
  const schema = Yup.object().shape({
    employeeId: Yup.number().required("Employee ID is required"),
    goalId: Yup.number().required("Goal ID is required"),
    individualTarget: Yup.number().required("Individual target is required"),
  });

  try {
    await schema.validate({ employeeId, goalId, individualTarget });
  } catch (error) {
    throw new AppError(error.message);
  }

  // Verificar se o goal pertence à empresa
  const goal = await Goal.findByPk(goalId);
  if (!goal) {
    throw new AppError("Goal not found", 404);
  }

  if (goal.companyId !== companyId) {
    throw new AppError("Goal doesn't belong to this company", 403);
  }

  // Verificar se o employee pertence à empresa
  const employee = await Employee.findByPk(employeeId);
  if (!employee) {
    throw new AppError("Employee not found", 404);
  }

  if (employee.companyId !== companyId) {
    throw new AppError("Employee doesn't belong to this company", 403);
  }

  // Verificar se já existe um registro para esse employee nesse goal
  const existingEmployeeGoal = await EmployeeGoal.findOne({
    where: {
      employeeId,
      goalId
    }
  });

  if (existingEmployeeGoal) {
    throw new AppError("This employee is already assigned to this goal");
  }

  // Criar o employee goal
  const employeeGoal = await EmployeeGoal.create({
    employeeId,
    goalId,
    individualTarget,
    individualCurrent: individualCurrent || 0
  });

  return employeeGoal;
};

export default CreateEmployeeGoalService;