import AppError from "../../errors/AppError";
import Employee from "../../models/Employee";
import GoalEmployee from "../../models/EmployeeGoal";
import Goal from "../../models/Goal";
import PerformanceCampaign from "../../models/PerformanceCampaign";

interface Request {
  id: string | number;
  companyId: number;
}

const ShowEmployeeService = async ({ id, companyId }: Request): Promise<Employee> => {
  const employee = await Employee.findOne({
    where: { id, companyId },
    include: [{
      model: GoalEmployee,
      include: [{
        model: Goal,
        include: [PerformanceCampaign]
      }]
    }]
  });

  if (!employee) {
    throw new AppError("Funcionário não encontrado", 404);
  }

  return employee;
};

export default ShowEmployeeService;