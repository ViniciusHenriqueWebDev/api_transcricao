import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CreateEmployeeService from "../services/EmployeeService/CreateEmployeeService";
import ListEmployeesService from "../services/EmployeeService/ListEmployeesService";
import ShowEmployeeService from "../services/EmployeeService/ShowEmployeeService";
import UpdateEmployeeService from "../services/EmployeeService/UpdateEmployeeService";
import DeleteEmployeeService from "../services/EmployeeService/DeleteEmployeeService";
import ListEmployeeDepartmentsService from "../services/EmployeeService/ListEmployeeDepartmentsService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber, department, status } = req.query as {
    searchParam?: string;
    pageNumber?: string;
    department?: string;
    status?: string;
  };
  
  const { companyId } = req.user;

  const { employees, count, hasMore } = await ListEmployeesService({
    searchParam,
    pageNumber,
    companyId,
    department,
    status
  });

  return res.status(200).json({ employees, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const employeeData = req.body;
  const { companyId } = req.user;

  const employee = await CreateEmployeeService({
    ...employeeData,
    companyId
  });

  const io = getIO();
  io.emit("employee", {
    action: "create",
    employee
  });

  return res.status(200).json(employee);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  const employee = await ShowEmployeeService({ id, companyId });

  return res.status(200).json(employee);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const employeeData = req.body;
  const { id } = req.params;
  const { companyId } = req.user;

  const employee = await UpdateEmployeeService({
    employeeData,
    employeeId: id,
    companyId
  });

  const io = getIO();
  io.emit("employee", {
    action: "update",
    employee
  });

  return res.status(200).json(employee);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  await DeleteEmployeeService(id, companyId);

  const io = getIO();
  io.emit("employee", {
    action: "delete",
    employeeId: id
  });

  return res.status(200).json({ message: "Funcionário excluído com sucesso" });
};

export const listDepartments = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const departments = await ListEmployeeDepartmentsService({ companyId });

  return res.status(200).json({ departments });
};