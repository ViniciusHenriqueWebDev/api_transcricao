import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Employee from "../../models/Employee";
import { Op } from 'sequelize';

interface EmployeeData {
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  status?: boolean;
}

interface Request {
  employeeData: EmployeeData;
  employeeId: string | number;
  companyId: number;
}

const UpdateEmployeeService = async ({
  employeeData,
  employeeId,
  companyId
}: Request): Promise<Employee> => {
  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    email: Yup.string().email(),
    phone: Yup.string(),
    position: Yup.string(),
    department: Yup.string(),
    status: Yup.boolean()
  });

  try {
    await schema.validate(employeeData);
  } catch (err) {
    throw new AppError(err.message);
  }

  const employee = await Employee.findOne({
    where: { id: employeeId, companyId }
  });

  if (!employee) {
    throw new AppError("Funcionário não encontrado", 404);
  }

  // Se estiver alterando o e-mail, verificar se já existe outro funcionário com este e-mail
  if (employeeData.email && employeeData.email !== employee.email) {
    const emailExists = await Employee.findOne({
      where: { email: employeeData.email, companyId, id: { [Op.ne]: employeeId } }
    });

    if (emailExists) {
      throw new AppError("Já existe outro funcionário com este e-mail.");
    }
  }

  await employee.update(employeeData);

  return employee;
};

export default UpdateEmployeeService;