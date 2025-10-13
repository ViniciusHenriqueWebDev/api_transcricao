import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Employee from "../../models/Employee";

interface EmployeeData {
  name: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  status?: boolean;
  companyId: number;
}

const CreateEmployeeService = async (employeeData: EmployeeData): Promise<Employee> => {
  const schema = Yup.object().shape({
    name: Yup.string().required().min(2),
    email: Yup.string().email().required(),
    phone: Yup.string(),
    position: Yup.string(),
    department: Yup.string(),
    status: Yup.boolean().default(true)
  });

  try {
    await schema.validate(employeeData);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { email } = employeeData;

  const employeeExists = await Employee.findOne({
    where: { email, companyId: employeeData.companyId }
  });

  if (employeeExists) {
    throw new AppError("Já existe um funcionário com este e-mail.");
  }

  const employee = await Employee.create({
    ...employeeData,
    status: employeeData.status !== undefined ? employeeData.status : true
  });

  return employee;
};

export default CreateEmployeeService;