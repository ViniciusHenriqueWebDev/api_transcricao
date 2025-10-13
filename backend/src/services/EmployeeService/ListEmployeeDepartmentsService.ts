import { Sequelize } from "sequelize";
import { Op } from 'sequelize';
import Employee from "../../models/Employee";

interface Request {
  companyId: number;
}

const ListEmployeeDepartmentsService = async ({ companyId }: Request): Promise<string[]> => {
  const departments = await Employee.findAll({
    attributes: [
      [Sequelize.fn("DISTINCT", Sequelize.col("department")), "department"]
    ],
    where: { 
      companyId,
      department: { [Op.ne]: null } 
    },
    raw: true
  });

  return departments.map(d => d.department).filter(Boolean);
};

export default ListEmployeeDepartmentsService;