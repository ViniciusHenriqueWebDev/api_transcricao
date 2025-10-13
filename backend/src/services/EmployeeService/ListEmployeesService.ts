import { Op, Sequelize } from "sequelize";
import Employee from "../../models/Employee";
import GoalEmployee from "../../models/EmployeeGoal";
import Goal from "../../models/Goal";

interface ListParams {
  searchParam?: string;
  pageNumber?: string;
  companyId: number;
  department?: string;
  status?: string;
}

interface EmployeeListReturn {
  employees: Employee[];
  count: number;
  hasMore: boolean;
}

const ListEmployeesService = async ({
  searchParam = "",
  pageNumber = "1",
  companyId,
  department,
  status
}: ListParams): Promise<EmployeeListReturn> => {
  const limit = 50;
  const offset = (parseInt(pageNumber, 10) - 1) * limit;

  // Construir as condições de pesquisa
  let where: any = {
    companyId
  };

  if (searchParam) {
    where = {
      ...where,
      [Op.or]: [
        { name: { [Op.iLike]: `%${searchParam}%` } },
        { email: { [Op.iLike]: `%${searchParam}%` } },
        { position: { [Op.iLike]: `%${searchParam}%` } }
      ]
    };
  }

  if (department) {
    where.department = department;
  }

  if (status) {
    where.status = status === "true";
  }

  const { count, rows: employees } = await Employee.findAndCountAll({
    where,
    limit,
    offset,
    order: [["name", "ASC"]],
    include: [{
      model: GoalEmployee,
      attributes: ["id", "progress", "individualTarget", "individualCurrent"],
      include: [{
        model: Goal,
        attributes: ["id", "name", "metricType", "target", "current", "startDate", "endDate"]
      }]
    }]
  });

  const hasMore = count > offset + employees.length;

  return {
    employees,
    count,
    hasMore
  };
};

export default ListEmployeesService;