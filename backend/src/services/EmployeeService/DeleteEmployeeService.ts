import AppError from "../../errors/AppError";
import Employee from "../../models/Employee";

const DeleteEmployeeService = async (id: string | number, companyId: number): Promise<void> => {
  const employee = await Employee.findOne({
    where: { id, companyId }
  });

  if (!employee) {
    throw new AppError("Funcionário não encontrado", 404);
  }

  await employee.destroy();
};

export default DeleteEmployeeService;